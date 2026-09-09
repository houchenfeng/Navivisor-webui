/** REST controller for chat-specific attachment helpers. */
import { Controller, Post, Req } from '@nestjs/common';
import { BusinessException } from '../common/business.exception';
import { ErrorCode } from '../common/error-codes';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { Readable } from 'node:stream';
import { ApiErrorResponseDto } from '../common/dto/api-responses.dto';
import { ChatUploadService } from './chat-upload.service';
import { ChatUploadResponseDto } from './dto/chat.dto';

interface MultipartFilePart {
  filename: string;
  mimetype?: string;
  file: Readable & { truncated?: boolean };
}

interface MultipartFileOptions {
  limits?: {
    files?: number;
    fileSize?: number;
  };
}

interface MultipartFileRequest {
  file: (
    options?: MultipartFileOptions,
  ) => Promise<MultipartFilePart | undefined>;
}

@ApiTags('chat')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@Controller('chat')
export class ChatController {
  constructor(private readonly chatUploadService: ChatUploadService) {}

  /** Uploads one browser attachment into a Codex-readable temporary directory. */
  @Post('upload')
  @ApiOperation({ summary: 'Upload one chat attachment for rich user input' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: ChatUploadResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  async uploadAttachment(
    @Req() request: FastifyRequest,
  ): Promise<ChatUploadResponseDto> {
    const file = await this.readSingleFile(request);
    return this.chatUploadService.saveUploadedFile({
      filename: file.filename,
      mimeType: file.mimetype,
      stream: file.file,
    });
  }

  /** Reads exactly one file part using Fastify multipart streaming APIs. */
  private async readSingleFile(
    request: FastifyRequest,
  ): Promise<MultipartFilePart> {
    const multipartRequest = request as MultipartFileRequest;
    if (typeof multipartRequest.file !== 'function') {
      throw BusinessException.badRequest(
        ErrorCode.chat.multipartUnavailable,
        'multipart file upload is not available',
      );
    }

    try {
      const file = await multipartRequest.file({
        limits: {
          files: 1,
          fileSize: this.chatUploadService.getUploadMaxBytes(),
        },
      });
      if (!file) {
        throw BusinessException.badRequest(
          ErrorCode.chat.fileRequired,
          'file is required',
        );
      }
      return file;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.rethrowMultipartError(error);
    }
  }

  /** Converts multipart parser failures into stable API errors. */
  private rethrowMultipartError(error: unknown): never {
    if (this.isFileSizeLimitError(error)) {
      throw BusinessException.payloadTooLarge(
        ErrorCode.files.uploadTooLarge,
        'Uploaded file exceeds maximum size',
      );
    }
    throw BusinessException.badRequest(
      ErrorCode.chat.fileInvalid,
      'Invalid upload',
    );
  }

  /** Checks if Fastify multipart rejected the upload because of size limits. */
  private isFileSizeLimitError(error: unknown): boolean {
    const code = this.getErrorCode(error);
    if (code === 'FST_REQ_FILE_TOO_LARGE') {
      return true;
    }
    if (!(error instanceof Error)) {
      return false;
    }
    return (
      error.name.includes('FileTooLarge') ||
      error.message.toLowerCase().includes('file size')
    );
  }

  /** Extracts Fastify-style error codes from unknown parser errors. */
  private getErrorCode(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return undefined;
    }
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
}
