/** Archive browsing service with zip-slip checks and decompression bomb limits. */
import { Injectable } from '@nestjs/common';
import { BusinessException } from '../common/business.exception';
import { ErrorCode } from '../common/error-codes';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { FilesService } from '../files/files.service';
import type { ByteRange } from '../preview/file-response';
import { archiveEntryName, normalizeArchiveEntryPath } from './archive-path';
import type {
  ArchiveAdapter,
  ArchiveEntry,
  ArchiveTreeEntry,
} from './archive.types';
import { RarArchiveAdapter } from './adapters/rar-archive.adapter';
import { SevenZipArchiveAdapter } from './adapters/sevenzip-archive.adapter';
import { TarArchiveAdapter } from './adapters/tar-archive.adapter';
import { ZipArchiveAdapter } from './adapters/zip-archive.adapter';

const MAX_ARCHIVE_ENTRIES = 20_000;
const MAX_ARCHIVE_ENTRY_BYTES = 50 * 1024 * 1024;
const MAX_ARCHIVE_TOTAL_BYTES = 1024 * 1024 * 1024;

export interface ArchiveListResult {
  path: string;
  entries: ArchiveTreeEntry[];
}

export interface ArchiveOpenEntryResult {
  filename: string;
  size: number;
  openStream: (range?: ByteRange) => Promise<Readable> | Readable;
}

@Injectable()
export class ArchiveService {
  private readonly adapters: ArchiveAdapter[];

  constructor(
    private readonly filesService: FilesService,
    zipAdapter: ZipArchiveAdapter,
    tarAdapter: TarArchiveAdapter,
    rarAdapter: RarArchiveAdapter,
    sevenZipAdapter: SevenZipArchiveAdapter,
  ) {
    this.adapters = [zipAdapter, tarAdapter, rarAdapter, sevenZipAdapter];
  }

  /** Lists supported archive contents as a tree after validating global archive limits. */
  async listArchive(archivePath: string): Promise<ArchiveListResult> {
    const resolved = await this.resolveArchiveFile(archivePath);
    const adapter = this.getAdapter(resolved);
    const entries = await adapter.list(resolved);
    this.validateArchiveEntries(entries);
    return { path: resolved, entries: this.buildTree(entries) };
  }

  /** Opens one sanitized archive entry as a range-capable read-only stream. */
  async openEntry(
    archivePath: string,
    entryPath: string,
  ): Promise<ArchiveOpenEntryResult> {
    const resolved = await this.resolveArchiveFile(archivePath);
    const adapter = this.getAdapter(resolved);
    const normalizedEntryPath = normalizeArchiveEntryPath(entryPath);
    if (!normalizedEntryPath) {
      throw BusinessException.badRequest(
        ErrorCode.archive.invalidEntryPath,
        'Invalid archive entry path',
      );
    }

    const entries = await adapter.list(resolved);
    this.validateArchiveEntries(entries);
    const entry = entries.find(
      (candidate) => candidate.path === normalizedEntryPath,
    );
    if (!entry) {
      throw BusinessException.notFound(
        ErrorCode.archive.entryNotFound,
        'Archive entry not found',
      );
    }
    if (entry.type !== 'file') {
      throw BusinessException.badRequest(
        ErrorCode.archive.entryNotFile,
        'Archive entry is not a file',
      );
    }
    if (entry.encrypted) {
      throw BusinessException.badRequest(
        ErrorCode.archive.entryEncrypted,
        'Encrypted files are not supported',
      );
    }
    if (entry.unsupported) {
      throw BusinessException.badRequest(
        ErrorCode.archive.entryUnsupported,
        'Archive entry type is not supported',
      );
    }
    if (entry.size === undefined) {
      throw BusinessException.badRequest(
        ErrorCode.archive.entrySizeUnknown,
        'Archive entry size is unknown',
      );
    }
    if (entry.size > MAX_ARCHIVE_ENTRY_BYTES) {
      throw BusinessException.payloadTooLarge(
        ErrorCode.archive.entryTooLarge,
        'Archive entry exceeds the 50 MB preview limit',
        { limit: '50 MB' },
      );
    }

    return {
      filename: archiveEntryName(entry.path),
      size: entry.size,
      openStream: async (range?: ByteRange) => {
        const stream = await adapter.openEntryStream(resolved, entry.path);
        return range ? this.sliceStream(stream, range) : stream;
      },
    };
  }

  /** Resolves a workspace-safe archive file path and rejects directories. */
  private async resolveArchiveFile(archivePath: string): Promise<string> {
    const resolved = await this.filesService.resolveSafePath(archivePath);
    const metadata = await this.filesService.getMetadata(resolved);
    if (metadata.type !== 'file') {
      throw BusinessException.badRequest(
        ErrorCode.archive.pathNotFile,
        'Archive path must be a file',
      );
    }
    return resolved;
  }

  /** Selects the first adapter that supports the archive extension. */
  private getAdapter(archivePath: string): ArchiveAdapter {
    const adapter = this.adapters.find((candidate) =>
      candidate.supports(archivePath),
    );
    if (!adapter) {
      throw BusinessException.badRequest(
        ErrorCode.archive.unsupportedFormat,
        'Unsupported archive format',
      );
    }
    return adapter;
  }

  /** Enforces entry count, total uncompressed size, and zip-slip path validation. */
  private validateArchiveEntries(entries: readonly ArchiveEntry[]): void {
    if (entries.length > MAX_ARCHIVE_ENTRIES) {
      throw BusinessException.badRequest(
        ErrorCode.archive.tooManyEntries,
        'Archive exceeds the 20,000 entry limit',
      );
    }

    let totalSize = 0;
    for (const entry of entries) {
      if (!normalizeArchiveEntryPath(entry.path)) {
        throw BusinessException.badRequest(
          ErrorCode.archive.unsafeEntryPath,
          'Archive contains an unsafe entry path',
        );
      }
      if (entry.size !== undefined) {
        totalSize += entry.size;
        if (totalSize > MAX_ARCHIVE_TOTAL_BYTES) {
          throw BusinessException.payloadTooLarge(
            ErrorCode.archive.totalSizeTooLarge,
            'Archive exceeds the 1 GB uncompressed preview limit',
            { limit: '1 GB' },
          );
        }
      }
    }
  }

  /** Builds a nested directory tree from flat normalized archive entries. */
  private buildTree(entries: readonly ArchiveEntry[]): ArchiveTreeEntry[] {
    const roots: ArchiveTreeEntry[] = [];
    const directories = new Map<string, ArchiveTreeEntry>();

    const ensureDirectory = (dirPath: string): ArchiveTreeEntry => {
      const existing = directories.get(dirPath);
      if (existing) return existing;
      const parentPath = path.posix.dirname(dirPath);
      const node: ArchiveTreeEntry = {
        name: archiveEntryName(dirPath),
        path: dirPath,
        type: 'directory',
        children: [],
      };
      directories.set(dirPath, node);
      if (!parentPath || parentPath === '.') {
        roots.push(node);
      } else {
        ensureDirectory(parentPath).children?.push(node);
      }
      return node;
    };

    for (const entry of [...entries].sort((a, b) =>
      a.path.localeCompare(b.path),
    )) {
      const parentPath = path.posix.dirname(entry.path);
      const parent =
        !parentPath || parentPath === '.' ? null : ensureDirectory(parentPath);
      const node: ArchiveTreeEntry = { ...entry };
      if (node.type === 'directory') node.children = node.children ?? [];
      if (parent) parent.children?.push(node);
      else roots.push(node);
      if (node.type === 'directory') directories.set(node.path, node);
    }

    const sortTree = (nodes: ArchiveTreeEntry[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      for (const node of nodes) sortTree(node.children ?? []);
    };
    sortTree(roots);
    return roots;
  }

  /** Returns a Readable that emits only the requested range from a decompressed entry stream. */
  private sliceStream(source: Readable, range: ByteRange): Readable {
    async function* iterate() {
      let offset = 0;
      try {
        for await (const chunk of source) {
          const buffer = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk as ArrayBuffer);
          const chunkStart = offset;
          const chunkEnd = offset + buffer.length - 1;
          offset += buffer.length;
          if (chunkEnd < range.start) continue;
          if (chunkStart > range.end) break;
          const start = Math.max(0, range.start - chunkStart);
          const end = Math.min(buffer.length, range.end - chunkStart + 1);
          yield buffer.subarray(start, end);
          if (chunkEnd >= range.end) break;
        }
      } finally {
        source.destroy();
      }
    }
    return Readable.from(iterate());
  }
}
