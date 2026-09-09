/** Shared MIME detection and byte-range response helpers for file previews. */
import type { FastifyReply } from 'fastify';
import type { ReadStream } from 'node:fs';
import type { Readable } from 'node:stream';

export interface ByteRange {
  start: number;
  end: number;
}

export interface RangedStreamOptions {
  filename: string;
  inline: boolean;
  mimeType: string;
  rangeHeader: string | null;
  size: number;
  openStream: (range?: ByteRange) => Promise<Readable> | ReadStream | Readable;
}

const MIME_MAP: Record<string, string> = {
  // Images
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  avif: 'image/avif',
  // Documents
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text / code
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  cjs: 'text/javascript',
  ts: 'text/typescript',
  tsx: 'text/tsx',
  jsx: 'text/jsx',
  json: 'application/json',
  xml: 'application/xml',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  yaml: 'text/yaml',
  yml: 'text/yaml',
  // Media
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  ogv: 'video/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  // Archives
  zip: 'application/zip',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  tar: 'application/x-tar',
  bz2: 'application/x-bzip2',
  xz: 'application/x-xz',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  // Fonts
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

/** Returns a scalar HTTP header value from Fastify's string-or-array shape. */
export function singleHeaderValue(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Maps file extension to MIME type for inline serving. */
export function guessMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return MIME_MAP.tgz;
  if (lower.endsWith('.tar.bz2') || lower.endsWith('.tbz2'))
    return MIME_MAP.bz2;
  if (lower.endsWith('.tar.xz') || lower.endsWith('.txz')) return MIME_MAP.xz;
  const ext = lower.split('.').pop() ?? '';
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

/** Builds a safe Content-Disposition header value for inline or attachment responses. */
export function buildContentDisposition(
  filename: string,
  inline: boolean,
): string {
  const fallback = filename.replace(/[\r\n"\\]/g, '_');
  const disposition = inline ? 'inline' : 'attachment';
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** Parses a single RFC 9110 bytes range header, returning null for absent and 'invalid' for unsatisfiable values. */
export function parseRangeHeader(
  rangeHeader: string | null,
  size: number,
): ByteRange | 'invalid' | null {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || size < 0) return 'invalid';

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return 'invalid';

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0)
      return 'invalid';
    if (size === 0) return 'invalid';
    const start = Math.max(0, size - suffixLength);
    return { start, end: size - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return 'invalid';
  }

  return { start, end: Math.min(end, size - 1) };
}

/** Sends a full or partial byte-range stream with consistent preview headers. */
export async function sendRangedStream(
  reply: FastifyReply,
  options: RangedStreamOptions,
) {
  const range = parseRangeHeader(options.rangeHeader, options.size);
  reply.header('Accept-Ranges', 'bytes');
  reply.header('Content-Type', options.mimeType);
  reply.header(
    'Content-Disposition',
    buildContentDisposition(options.filename, options.inline),
  );

  if (range === 'invalid') {
    reply.code(416);
    reply.header('Content-Range', `bytes */${options.size}`);
    return reply.send();
  }

  if (range) {
    reply.code(206);
    reply.header(
      'Content-Range',
      `bytes ${range.start}-${range.end}/${options.size}`,
    );
    reply.header('Content-Length', range.end - range.start + 1);
    return reply.send(await options.openStream(range));
  }

  reply.header('Content-Length', options.size);
  return reply.send(await options.openStream());
}
