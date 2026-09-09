/** File type classification utilities for viewer routing. */

export type FileCategory =
  | 'image'
  | 'code'
  | 'pdf'
  | 'video'
  | 'audio'
  | 'font'
  | 'archive'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'binary';

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'avif',
]);

const PDF_EXTENSIONS = new Set(['pdf']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'm4v', 'webm', 'mov', 'ogv']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'oga', 'flac', 'm4a']);
const FONT_EXTENSIONS = new Set(['ttf', 'otf', 'woff', 'woff2']);
const ARCHIVE_EXTENSIONS = new Set(['zip', 'tar', 'tgz', 'tbz2', 'txz', 'rar', '7z']);
const ARCHIVE_COMPOUND_EXTENSIONS = new Set(['tar.gz', 'tar.bz2', 'tar.xz']);
const CODE_EXTENSIONS = new Set([
  'txt', 'md', 'mdx', 'json', 'jsonc', 'yaml', 'yml', 'toml', 'ini', 'env',
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'css', 'scss', 'sass', 'less',
  'html', 'htm', 'xml', 'svg', 'py', 'rs', 'go', 'java', 'kt', 'kts', 'c',
  'h', 'cpp', 'hpp', 'cs', 'php', 'rb', 'swift', 'sql', 'sh', 'bash', 'zsh',
  'fish', 'dockerfile', 'gitignore', 'gitattributes', 'csv', 'log',
]);

/** Returns the lowercase file extension without the dot. */
export function getExtension(filePath: string): string {
  const name = filePath.split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** Returns a supported compound extension such as tar.gz when present. */
export function getCompoundExtension(filePath: string): string {
  const name = (filePath.split('/').pop() ?? '').toLowerCase();
  for (const ext of ARCHIVE_COMPOUND_EXTENSIONS) {
    if (name.endsWith(`.${ext}`)) return ext;
  }
  return getExtension(filePath);
}

/** Detects file type category from extension. */
export function getFileCategory(filePath: string): FileCategory {
  const ext = getExtension(filePath);
  const compoundExt = getCompoundExtension(filePath);
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (PDF_EXTENSIONS.has(ext)) return 'pdf';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (FONT_EXTENSIONS.has(ext)) return 'font';
  if (ARCHIVE_COMPOUND_EXTENSIONS.has(compoundExt) || ARCHIVE_EXTENSIONS.has(ext)) return 'archive';
  if (ext === 'docx') return 'docx';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'pptx') return 'pptx';
  if (!ext || CODE_EXTENSIONS.has(ext)) return 'code';
  return 'binary';
}

/** Returns true for viewers that fetch or load their content inline after shell render. */
export function isInlineLoadingCategory(category: FileCategory): boolean {
  return category !== 'code' && category !== 'binary';
}
