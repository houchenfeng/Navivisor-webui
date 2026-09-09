/** 7z adapter: 7zip-min lists entries, host 7za streams selected entry contents. */
import { Injectable } from '@nestjs/common';
import { BusinessException } from '../../common/business.exception';
import { ErrorCode } from '../../common/error-codes';
import { spawn, spawnSync } from 'node:child_process';
import { PassThrough, type Readable } from 'node:stream';
import sevenZip from '7zip-min';
import { archiveEntryName, normalizeArchiveEntryPath } from '../archive-path';
import type { ArchiveAdapter, ArchiveEntry } from '../archive.types';

interface SevenZipListItem {
  name: string;
  size?: string | number;
  attr?: string;
  encrypted?: string;
}

@Injectable()
export class SevenZipArchiveAdapter implements ArchiveAdapter {
  readonly label = '7z';
  private sevenZaChecked = false;
  private sevenZaAvailable = false;

  /** Returns true for 7z archives. */
  supports(archivePath: string): boolean {
    return archivePath.toLowerCase().endsWith('.7z');
  }

  /** Lists 7z entries using 7zip-min metadata parsing. */
  async list(archivePath: string): Promise<ArchiveEntry[]> {
    this.assert7zaAvailable();
    const items = (await sevenZip.list(archivePath)) as SevenZipListItem[];
    return items
      .map((item) => this.toEntry(item))
      .filter((entry): entry is ArchiveEntry => entry !== null);
  }

  /** Streams one 7z entry via host `7za x -so`, never extracting to disk. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async openEntryStream(
    archivePath: string,
    entryPath: string,
  ): Promise<Readable> {
    this.assert7zaAvailable();
    const output = new PassThrough();
    // -spd disables wildcard matching so entry names with * or ? are treated literally
    const child = spawn(
      '7za',
      ['x', '-so', '-y', '-spd', '--', archivePath, entryPath],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let childDone = false;
    const killChild = () => {
      if (!childDone && !child.killed) child.kill();
    };
    child.stderr.resume();
    child.stdout.once('end', () => {
      childDone = true;
    });
    output.once('close', killChild);
    child.stdout.pipe(output);
    child.on('error', (error) => output.destroy(error));
    child.on('close', (code) => {
      childDone = true;
      output.off('close', killChild);
      if (code !== 0) {
        output.destroy(
          BusinessException.badRequest(
            ErrorCode.archive.entryUnsupported,
            'Unable to stream archive entry',
          ),
        );
      }
    });
    return output;
  }

  /** Converts 7zip-min list output to the shared archive entry shape. */
  private toEntry(item: SevenZipListItem): ArchiveEntry | null {
    const normalized = normalizeArchiveEntryPath(item.name);
    if (!normalized) return null;
    const attr = item.attr ?? '';
    const isDirectory = attr.includes('D') || item.name.endsWith('/');
    const size =
      typeof item.size === 'number' ? item.size : Number(item.size ?? 0);
    return {
      name: archiveEntryName(normalized),
      path: normalized,
      type: isDirectory ? 'directory' : 'file',
      size: isDirectory || !Number.isFinite(size) ? undefined : size,
      encrypted: item.encrypted === '+' || item.encrypted === 'true',
    };
  }

  /** Fails fast with a clear message when host 7za is not installed (cached after first check). */
  private assert7zaAvailable(): void {
    if (this.sevenZaChecked) {
      if (!this.sevenZaAvailable) {
        throw BusinessException.badRequest(
          ErrorCode.archive.sevenZipUnavailable,
          '7za binary is not available on the host',
        );
      }
      return;
    }
    const result = spawnSync('7za', ['i'], { stdio: 'ignore' });
    this.sevenZaChecked = true;
    this.sevenZaAvailable = !result.error && result.status === 0;
    if (!this.sevenZaAvailable) {
      throw BusinessException.badRequest(
        ErrorCode.archive.sevenZipUnavailable,
        '7za binary is not available on the host',
      );
    }
  }
}
