/** Shared utilities for parsing unified diff patches. */

/** Removes git's a/ and b/ prefixes while preserving /dev/null markers. */
export function stripGitPathPrefix(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const unquoted = trimmed.startsWith('"') && trimmed.endsWith('"')
    ? trimmed.slice(1, -1)
    : trimmed;
  if (unquoted === '/dev/null') return unquoted;
  return unquoted.replace(/^[ab]\//, '');
}

/**
 * Ensures a diff string has proper unified diff headers (--- / +++).
 * Codex app-server sometimes returns bare hunk content without file headers.
 * @git-diff-view/react requires a complete unified diff to parse.
 */
export function ensureDiffHeaders(diff: string, filePath?: string): string {
  if (!diff.trim()) return diff;
  // Already has headers — return as-is.
  if (diff.includes('\n--- ') || diff.startsWith('--- ')) return diff;
  // Bare hunk starting with @@ — prepend synthetic headers.
  const name = filePath ?? 'file';
  return `--- a/${name}\n+++ b/${name}\n${diff}`;
}
