/**
 * OnlyOffice Docs integration: editor config generation with JWT signing,
 * and save callback endpoint for writing edits back to workspace files.
 */
import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { BusinessException } from '../common/business.exception';
import { ErrorCode } from '../common/error-codes';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream, promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { sign, verify } from 'jsonwebtoken';
import { ApiErrorResponseDto } from '../common/dto/api-responses.dto';
import { FilesService } from '../files/files.service';
import { Public } from '../auth/public.decorator';
import { GENERAL_SETTING_KEYS } from '../settings/settings.definitions';
import { SettingsService } from '../settings/settings.service';
import {
  OnlyOfficeCallbackDto,
  OnlyOfficeConfigResponseDto,
} from './dto/onlyoffice.dto';

type OnlyOfficeDocumentType = 'word' | 'cell' | 'slide';

interface OnlyOfficeEditorConfig {
  document: {
    fileType: string;
    key: string;
    permissions: Record<string, boolean>;
    title: string;
    url: string;
  };
  documentType: OnlyOfficeDocumentType;
  editorConfig: {
    callbackUrl: string;
    mode: 'edit' | 'view';
    customization: Record<string, boolean>;
  };
  height: string;
  token?: string;
  type: 'desktop' | 'embedded';
  width: string;
}

/** Timeout for downloading saved document from OnlyOffice server (60s). */
const SAVE_TIMEOUT_MS = 60_000;

@ApiTags('onlyoffice')
@Controller('onlyoffice')
export class OnlyOfficeController {
  private readonly logger = new Logger(OnlyOfficeController.name);

  constructor(
    private readonly filesService: FilesService,
    private readonly settingsService: SettingsService,
  ) {}

  // ── Config endpoint ─────────────────────────────────────────────────

  /**
   * Builds an OnlyOffice editor config for a workspace document.
   * Edit mode (default) requires `general.onlyofficeJwtSecret` to be configured
   * so the save callback can be securely verified.
   */
  @Get('config')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiOperation({ summary: 'Build OnlyOffice editor config for a file' })
  @ApiQuery({ name: 'path', required: true })
  @ApiQuery({ name: 'mode', required: false, enum: ['edit', 'view'] })
  @ApiOkResponse({ type: OnlyOfficeConfigResponseDto })
  async getConfig(
    @Query('path') filePath: string,
    @Query('mode') mode?: string,
    @Req() request?: FastifyRequest,
  ): Promise<OnlyOfficeConfigResponseDto> {
    const onlyofficeUrl = this.requireOnlyOfficeUrl();
    const normalizedUrl = this.normalizeHttpBaseUrl(
      onlyofficeUrl,
      'general.onlyofficeUrl',
    );
    const secret = this.settingsService.getStringSetting(
      GENERAL_SETTING_KEYS.onlyofficeJwtSecret,
    );
    const editorMode = mode === 'view' ? 'view' : 'edit';

    // Edit mode requires JWT secret for secure save callback verification
    if (editorMode === 'edit' && !secret) {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.jwtRequired,
        'OnlyOffice edit mode requires general.onlyofficeJwtSecret to be configured',
      );
    }

    const metadata = await this.filesService.getMetadata(filePath);
    if (metadata.type !== 'file') {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.fileRequired,
        'OnlyOffice requires a file path',
      );
    }

    const fileType = this.getSupportedFileType(metadata.name);
    const documentType = this.getDocumentType(fileType);
    const documentKey = this.buildDocumentKey(
      metadata.path,
      metadata.mtime,
      metadata.size,
    );
    const baseUrl = this.resolveBaseUrl(request);
    const documentUrl = this.buildDocumentUrl(baseUrl, metadata.path, request);
    const callbackUrl = this.buildCallbackUrl(
      baseUrl,
      metadata.path,
      documentKey,
      secret,
    );

    const config: OnlyOfficeEditorConfig = {
      type: 'desktop',
      width: '100%',
      height: '100%',
      documentType,
      document: {
        fileType,
        key: documentKey,
        title: metadata.name,
        url: documentUrl,
        permissions: {
          comment: editorMode === 'edit',
          copy: true,
          download: true,
          edit: editorMode === 'edit',
          print: true,
          review: false,
        },
      },
      editorConfig: {
        callbackUrl,
        mode: editorMode,
        customization: {
          compactToolbar: true,
          hideRightMenu: editorMode === 'view',
        },
      },
    };

    if (secret) {
      config.token = sign(config, secret, { algorithm: 'HS256' });
    }

    return {
      scriptUrl: this.joinUrl(
        normalizedUrl,
        '/web-apps/apps/api/documents/api.js',
      ),
      config: config as unknown as Record<string, unknown>,
    };
  }

  // ── Save callback endpoint ──────────────────────────────────────────

  /**
   * OnlyOffice save callback — receives document status updates from the Document Server.
   * When status=2 (ready to save) or status=6 (force save), downloads the modified file
   * and atomically writes it back to the workspace.
   *
   * Security model (all required for save to proceed):
   * 1. JWT secret must be configured (edit mode enforces this)
   * 2. Callback state token (signed path+key in callbackUrl query) verified
   * 3. OnlyOffice callback JWT (body.token or Authorization header) verified
   * 4. Download URL origin must match configured OnlyOffice server
   * 5. File path validated against workspace roots (resolveSafePath)
   * 6. Atomic write via temp file + rename (no partial corruption)
   * 7. Download size limit + timeout
   */
  @Post('callback')
  @Public()
  @ApiOperation({ summary: 'OnlyOffice document save callback' })
  @ApiQuery({
    name: 'path',
    type: String,
    required: true,
    description: 'Workspace file path',
  })
  @ApiQuery({
    name: 'state',
    type: String,
    required: false,
    description: 'Signed callback state token',
  })
  @ApiBody({ type: OnlyOfficeCallbackDto })
  @ApiOkResponse({
    description: 'Acknowledged',
    schema: { properties: { error: { type: 'number' } } },
  })
  async handleCallback(
    @Query('path') filePath: string,
    @Query('state') stateToken: string | undefined,
    @Body() body: OnlyOfficeCallbackDto,
    @Req() request: FastifyRequest,
  ): Promise<{ error: number }> {
    // Acknowledge non-save statuses (editing, closed without changes, etc.)
    if (body.status !== 2 && body.status !== 6) {
      return { error: 0 };
    }

    if (!filePath) {
      this.logger.warn('OnlyOffice callback missing file path');
      return { error: 1 };
    }

    if (!body.url) {
      this.logger.warn(
        { key: body.key },
        'OnlyOffice save callback missing download URL',
      );
      return { error: 1 };
    }

    try {
      // 1. Require JWT secret
      const secret = this.settingsService.getStringSetting(
        GENERAL_SETTING_KEYS.onlyofficeJwtSecret,
      );
      if (!secret) {
        this.logger.warn(
          { path: filePath },
          'Rejected OnlyOffice callback: JWT secret not configured',
        );
        return { error: 1 };
      }

      // 2. Verify callback state token (signed path + key)
      const state = this.verifyCallbackState(stateToken, secret);
      if (state.path !== filePath) {
        this.logger.warn(
          { path: filePath, statePath: state.path },
          'OnlyOffice callback path mismatch',
        );
        return { error: 1 };
      }
      if (body.key && state.key !== body.key) {
        this.logger.warn(
          { path: filePath, key: body.key, stateKey: state.key },
          'OnlyOffice callback key mismatch',
        );
        return { error: 1 };
      }

      // 3. Verify OnlyOffice callback JWT (body.token or Authorization header)
      this.verifyOnlyOfficeToken(body, request, secret);

      // 4. Validate download URL origin matches configured OnlyOffice server
      const downloadUrl = this.validateDownloadUrl(body.url);

      // 5. Validate file path against workspace roots
      const resolved = await this.filesService.resolveSafePath(filePath);

      // 6. Download with timeout + size limit, write atomically
      const maxBytes = this.settingsService.getNumberSetting(
        GENERAL_SETTING_KEYS.onlyofficeSaveMaxBytes,
      );
      const response = await this.fetchWithTimeout(downloadUrl);
      if (!response.ok || !response.body) {
        this.logger.error(
          { path: filePath, status: response.status },
          'Failed to download from OnlyOffice',
        );
        return { error: 1 };
      }

      await this.writeAtomically(response, resolved, maxBytes);
      this.logger.log(
        { path: filePath, status: body.status },
        'OnlyOffice document saved',
      );
      return { error: 0 };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { path: filePath, error: msg },
        'OnlyOffice callback failed',
      );
      return { error: 1 };
    }
  }

  // ── Callback security helpers ───────────────────────────────────────

  /** Verifies the signed state token embedded in the callbackUrl query param. */
  private verifyCallbackState(
    stateToken: string | undefined,
    secret: string,
  ): { path: string; key: string } {
    if (!stateToken) {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.missingCallbackState,
        'Missing OnlyOffice callback state token',
      );
    }
    const payload = verify(stateToken, secret, { algorithms: ['HS256'] });
    if (!payload || typeof payload !== 'object') {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.invalidCallbackState,
        'Invalid OnlyOffice callback state token',
      );
    }
    const record = payload as Record<string, unknown>;
    if (typeof record.path !== 'string' || typeof record.key !== 'string') {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.invalidCallbackStatePayload,
        'Invalid OnlyOffice callback state token payload',
      );
    }
    return { path: record.path, key: record.key };
  }

  /** Verifies the OnlyOffice outgoing callback JWT (body.token or Authorization header). */
  private verifyOnlyOfficeToken(
    body: OnlyOfficeCallbackDto,
    request: FastifyRequest,
    secret: string,
  ): void {
    const token =
      body.token ?? this.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.missingCallbackJwt,
        'Missing OnlyOffice callback JWT',
      );
    }
    const payload = verify(token, secret, { algorithms: ['HS256'] });
    if (!payload || typeof payload !== 'object') {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.invalidCallbackJwt,
        'Invalid OnlyOffice callback JWT',
      );
    }
  }

  /** Validates the download URL against the configured OnlyOffice origin to prevent SSRF. */
  private validateDownloadUrl(rawUrl: string): URL {
    let downloadUrl: URL;
    try {
      downloadUrl = new URL(rawUrl);
    } catch {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.invalidDownloadUrl,
        'Invalid OnlyOffice download URL',
      );
    }
    if (downloadUrl.protocol !== 'http:' && downloadUrl.protocol !== 'https:') {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.downloadUrlNotHttps,
        'OnlyOffice download URL must use HTTP(S)',
      );
    }
    // Origin must match the configured OnlyOffice server
    const onlyofficeUrl = this.requireOnlyOfficeUrl();
    const allowedOrigin = new URL(
      this.normalizeHttpBaseUrl(onlyofficeUrl, 'general.onlyofficeUrl'),
    ).origin;
    if (downloadUrl.origin !== allowedOrigin) {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.downloadUrlOriginMismatch,
        'OnlyOffice download URL origin does not match configured server',
      );
    }
    return downloadUrl;
  }

  // ── Atomic save helpers ─────────────────────────────────────────────

  /** Downloads from OnlyOffice with a timeout. */
  private async fetchWithTimeout(url: URL): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Writes response body to a temp file then atomically renames to target, with size limit. */
  private async writeAtomically(
    response: Response,
    targetPath: string,
    maxBytes: number,
  ): Promise<void> {
    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > maxBytes) {
      throw BusinessException.payloadTooLarge(
        ErrorCode.onlyoffice.saveTooLarge,
        'OnlyOffice save payload exceeds size limit',
      );
    }
    if (!response.body) {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.saveNoBody,
        'OnlyOffice save response has no body',
      );
    }

    const tmpPath = join(
      dirname(targetPath),
      `.onlyoffice-${randomUUID()}.tmp`,
    );
    const nodeStream = Readable.fromWeb(
      response.body as import('node:stream/web').ReadableStream,
    );

    try {
      await pipeline(
        nodeStream,
        this.createByteLimitTransform(maxBytes),
        createWriteStream(tmpPath, { flags: 'wx' }),
      );
      await fs.rename(tmpPath, targetPath);
    } catch (error) {
      await fs.unlink(tmpPath).catch(() => undefined);
      throw error;
    }
  }

  /** Creates a Transform stream that enforces the given save size limit. */
  private createByteLimitTransform(maxBytes: number): Transform {
    let totalBytes = 0;
    return new Transform({
      transform(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (error?: Error | null, data?: Buffer) => void,
      ) {
        totalBytes += chunk.length;
        if (totalBytes > maxBytes) {
          callback(
            BusinessException.payloadTooLarge(
              ErrorCode.onlyoffice.saveTooLarge,
              'OnlyOffice save payload exceeds size limit',
            ),
          );
          return;
        }
        callback(null, chunk);
      },
    });
  }

  // ── Config helpers ──────────────────────────────────────────────────

  /** Returns the configured OnlyOffice URL or throws. */
  private requireOnlyOfficeUrl(): string {
    const url = this.settingsService.getStringSetting(
      GENERAL_SETTING_KEYS.onlyofficeUrl,
    );
    if (!url) {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.notConfigured,
        'OnlyOffice is not configured',
      );
    }
    return url;
  }

  /** Validates supported Office extensions and returns the lowercase file type. */
  private getSupportedFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'docx' || ext === 'xlsx' || ext === 'pptx') return ext;
    throw BusinessException.badRequest(
      ErrorCode.onlyoffice.unsupportedFormat,
      'OnlyOffice supports DOCX, XLSX, and PPTX files',
    );
  }

  /** Maps a supported extension to OnlyOffice's documentType field. */
  private getDocumentType(fileType: string): OnlyOfficeDocumentType {
    if (fileType === 'docx') return 'word';
    if (fileType === 'xlsx') return 'cell';
    return 'slide';
  }

  /** Builds a stable cache key within OnlyOffice's 128-character limit. */
  private buildDocumentKey(
    filePath: string,
    mtime: number,
    size: number,
  ): string {
    return createHash('sha256')
      .update(`${filePath}:${mtime}:${size}`)
      .digest('hex')
      .slice(0, 48);
  }

  /** Resolves the public base URL from setting or request headers. */
  private resolveBaseUrl(request?: FastifyRequest): string {
    const publicBaseUrl = this.settingsService.getStringSetting(
      GENERAL_SETTING_KEYS.publicBaseUrl,
    );
    if (publicBaseUrl) {
      return this.normalizeHttpBaseUrl(publicBaseUrl, 'general.publicBaseUrl');
    }
    if (!request) {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.publicHostRequired,
        'Cannot determine public host. Configure general.publicBaseUrl in Settings.',
      );
    }
    const proto =
      this.firstHeaderValue(request.headers['x-forwarded-proto']) ?? 'http';
    const host =
      this.firstHeaderValue(request.headers['x-forwarded-host']) ??
      this.firstHeaderValue(request.headers.host);
    if (!host) {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.publicHostRequired,
        'Cannot determine public host for OnlyOffice. Configure general.publicBaseUrl in Settings.',
      );
    }
    return this.normalizeHttpBaseUrl(
      `${proto}://${host}`,
      'request host headers',
    );
  }

  /** Builds an absolute file-serving URL reachable by the OnlyOffice Document Server. */
  private buildDocumentUrl(
    baseUrl: string,
    filePath: string,
    request?: FastifyRequest,
  ): string {
    const params = new URLSearchParams({ path: filePath });
    const token = request
      ? this.extractBearerToken(request.headers.authorization)
      : null;
    if (token) params.set('access_token', token);
    return this.joinUrl(baseUrl, `/api/files/serve?${params.toString()}`);
  }

  /** Builds the callback URL with a signed state token encoding path + document key. */
  private buildCallbackUrl(
    baseUrl: string,
    filePath: string,
    documentKey: string,
    secret: string | null,
  ): string {
    const params = new URLSearchParams({ path: filePath });
    if (secret) {
      params.set(
        'state',
        sign({ path: filePath, key: documentKey }, secret, {
          algorithm: 'HS256',
          expiresIn: '24h',
        }),
      );
    }
    return this.joinUrl(
      baseUrl,
      `/api/onlyoffice/callback?${params.toString()}`,
    );
  }

  // ── URL/header helpers ──────────────────────────────────────────────

  /** Extracts the first comma-delimited proxy header value. */
  private firstHeaderValue(
    value: string | string[] | undefined,
  ): string | null {
    const raw = this.singleHeader(value);
    return raw?.split(',')[0]?.trim() || null;
  }

  /** Extracts a scalar header value from Fastify's string-or-array header shape. */
  private singleHeader(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }

  /** Normalizes configured/inferred URLs and rejects non-http(s) schemes. */
  private normalizeHttpBaseUrl(rawUrl: string, label: string): string {
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('unsupported protocol');
      }
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/+$/, '');
    } catch {
      throw BusinessException.badRequest(
        ErrorCode.onlyoffice.invalidUrl,
        `${label} must be a valid http(s) URL`,
        { label },
      );
    }
  }

  /** Extracts a bearer token from Authorization header. */
  private extractBearerToken(authorization: string | undefined): string | null {
    const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
    return match?.[1] ?? null;
  }

  /** Joins a base URL and path without double slashes. */
  private joinUrl(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }
}
