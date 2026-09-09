import { normalizeArchiveEntryPath } from './archive-path';

describe('normalizeArchiveEntryPath', () => {
  it('normalizes safe relative archive paths', () => {
    expect(normalizeArchiveEntryPath('./dir/file.txt')).toBe('dir/file.txt');
    expect(normalizeArchiveEntryPath('dir/sub/file.txt')).toBe(
      'dir/sub/file.txt',
    );
  });

  it('rejects traversal, absolute paths, and null bytes', () => {
    expect(normalizeArchiveEntryPath('../secret.txt')).toBeNull();
    expect(normalizeArchiveEntryPath('/etc/passwd')).toBeNull();
    expect(normalizeArchiveEntryPath('C:/Windows/win.ini')).toBeNull();
    expect(normalizeArchiveEntryPath('safe/\0bad')).toBeNull();
  });
});
