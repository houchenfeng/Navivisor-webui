/** REST endpoints for archive browsing and read-only entry streaming. */
import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { BusinessException } from '../common/business.exception';
import { ErrorCode } from '../common/error-codes';
import { ApiErrorResponseDto } from '../common/dto/api-responses.dto';
import {
  guessMimeType,
  sendRangedStream,
  singleHeaderValue,
} from '../preview/file-response';
import { ArchiveService } from './archive.service';
import { ArchiveListResponseDto } from './dto/archive.dto';

@ApiTags('files')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@ApiBadRequestResponse({ type: ApiErrorResponseDto })
@Controller('files/archive')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  /** Lists archive contents as a sanitized directory tree without extracting to disk. */
  @Get('list')
  @ApiOperation({ summary: 'List archive contents' })
  @ApiQuery({ name: 'path', required: true })
  @ApiOkResponse({ type: ArchiveListResponseDto })
  async listArchive(
    @Query('path') archivePath: string,
  ): Promise<ArchiveListResponseDto> {
    if (!archivePath) {
      throw BusinessException.badRequest(
        ErrorCode.files.pathRequired,
        'path is required',
      );
    }
    const result = await this.archiveService.listArchive(archivePath);
    return { path: result.path, entries: result.entries };
  }

  /** Streams a single archive entry, supporting byte ranges for preview clients. */
  @Get('entry')
  @ApiOperation({
    summary: 'Read one archive entry without extracting to disk',
  })
  @ApiQuery({ name: 'path', required: true })
  @ApiQuery({ name: 'entry', required: true })
  @ApiProduces('application/octet-stream')
  async readEntry(
    @Query('path') archivePath: string,
    @Query('entry') entryPath: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    if (!archivePath || !entryPath) {
      throw BusinessException.badRequest(
        ErrorCode.archive.invalidEntryPath,
        'path and entry are required',
      );
    }

    const entry = await this.archiveService.openEntry(archivePath, entryPath);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header(
      'Content-Security-Policy',
      "sandbox; default-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:; style-src 'unsafe-inline'",
    );
    reply.header('Cache-Control', 'private, no-store');
    return sendRangedStream(reply, {
      filename: entry.filename,
      inline: true,
      mimeType: guessMimeType(entry.filename),
      rangeHeader: singleHeaderValue(request.headers.range),
      size: entry.size,
      openStream: (range) => entry.openStream(range),
    });
  }
}
