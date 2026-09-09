/**
 * Utilities for processing @ file mentions in user message text.
 * Spaces in paths are escaped as `\ ` (backslash-space).
 */

/** Escape spaces in a file path for use in @mention text. */
export function escapeMentionPath(path: string): string {
  return path.replace(/ /g, '\\ ');
}

/** Unescape `\ ` back to spaces to get the real file path. */
export function unescapeMentionPath(escaped: string): string {
  return escaped.replace(/\\ /g, ' ');
}

/**
 * Matches ` @/absolute/path` including escaped spaces (`\ `).
 * A mention token is `@` followed by non-whitespace chars, where `\ ` counts as non-whitespace.
 */
const ABSOLUTE_MENTION_RE = /(?<=\s|^)@(\/(?:\\ |[^\s])+)/g;

/**
 * Converts absolute @paths back to relative @paths based on thread cwd.
 * Handles escaped spaces in both the path and cwd prefix.
 */
export function normalizeMessageMentions(text: string, cwd: string | null): string {
  if (!cwd) return text;
  const prefix = cwd + '/';
  const escapedPrefix = escapeMentionPath(prefix);
  return text.replace(ABSOLUTE_MENTION_RE, (match, absPath: string) => {
    // Try both raw and escaped prefix
    if (absPath.startsWith(prefix)) {
      return `@${absPath.slice(prefix.length)}`;
    }
    if (absPath.startsWith(escapedPrefix)) {
      return `@${absPath.slice(escapedPrefix.length)}`;
    }
    return match;
  });
}

/** Matches ` @path` including escaped spaces. */
const MENTION_SPLIT_RE = /((?:^|\s)@(?:\\ |[^\s])+)/g;

export interface MentionSegment {
  type: 'text' | 'mention';
  /** For mentions: the display text including @. Escaped spaces are unescaped for display. */
  value: string;
}

/**
 * Splits text into plain text and @mention segments for styled rendering.
 * Escaped spaces (`\ `) in mentions are treated as part of the path.
 */
export function splitMentionSegments(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MENTION_SPLIT_RE)) {
    const matchIndex = match.index!;
    const raw = match[1];
    const leadingSpace = raw.startsWith(' ') || raw.startsWith('\n') ? raw[0] : '';
    const mention = leadingSpace ? raw.slice(1) : raw;
    const textBeforeEnd = matchIndex + (leadingSpace ? 1 : 0);

    if (textBeforeEnd > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, textBeforeEnd) });
    }
    // Unescape `\ ` for display
    segments.push({ type: 'mention', value: unescapeMentionPath(mention) });
    lastIndex = matchIndex + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}
