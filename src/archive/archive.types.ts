/** Shared archive preview types and adapter contract. */
import type { Readable } from 'node:stream';

export type ArchiveEntryType = 'file' | 'directory';

export interface ArchiveEntry {
  name: string;
  path: string;
  type: ArchiveEntryType;
  size?: number;
  compressedSize?: number;
  mtime?: number;
  encrypted?: boolean;
  unsupported?: boolean;
}

export interface ArchiveTreeEntry extends ArchiveEntry {
  children?: ArchiveTreeEntry[];
}

export interface ArchiveAdapter {
  readonly label: string;
  supports(archivePath: string): boolean;
  list(archivePath: string): Promise<ArchiveEntry[]>;
  openEntryStream(archivePath: string, entryPath: string): Promise<Readable>;
}
