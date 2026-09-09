/** Archive-internal path normalization and zip-slip protection helpers. */

/** Normalizes archive entry paths and rejects traversal, absolute paths, and NUL bytes. */
export function normalizeArchiveEntryPath(entryPath: string): string | null {
  if (!entryPath || entryPath.includes('\0')) return null;
  const normalized = entryPath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized))
    return null;

  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.some((part) => part === '.' || part === '..')) return null;
  return parts.join('/');
}

/** Returns the display basename from an archive-internal normalized path. */
export function archiveEntryName(entryPath: string): string {
  return entryPath.split('/').pop() ?? entryPath;
}
