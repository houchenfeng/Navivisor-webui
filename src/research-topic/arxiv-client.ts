/**
 * Minimal arXiv API client.
 *
 * The Atom feed is parsed with regular expressions rather than an XML library:
 * the subset arXiv emits is small and stable, and the topic module is otherwise
 * dependency-free for network access.
 *
 * arXiv asks callers to space requests out, so requests are serialised behind a
 * module-level gate with a minimum interval.
 */

const API_BASE = 'http://export.arxiv.org/api/query';
const MIN_INTERVAL_MS = 3_000;
const MAX_ATTEMPTS = 3;

export type ArxivPaper = {
  /** Full entry id URL, e.g. http://arxiv.org/abs/2401.01234v1 */
  id: string;
  /** Bare arXiv id, e.g. 2401.01234 */
  arxivId: string;
  title: string;
  abstract: string;
  /** ISO date of the first submission. */
  published: string;
  updated?: string;
  authors: string[];
  /** Absolute PDF URL when the feed provides one. */
  pdfUrl?: string;
  primaryCategory?: string;
};

export type ArxivFetchOptions = {
  maxResults?: number;
  start?: number;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable sleep for tests. */
  sleepImpl?: (ms: number) => Promise<void>;
};

/** Serialises requests so we never exceed arXiv's requested rate. */
let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function respectRateLimit(sleep: (ms: number) => Promise<void>): Promise<void> {
  const waitFor = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (waitFor > 0) await sleep(waitFor);
  lastRequestAt = Date.now();
}

/** Decodes the handful of XML entities arXiv actually uses. */
function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Collapses the whitespace arXiv wraps titles and abstracts with. */
function normalizeText(value: string): string {
  return decodeEntities(value).replace(/\s+/g, ' ').trim();
}

function firstMatch(source: string, pattern: RegExp): string | undefined {
  const match = source.match(pattern);
  return match ? normalizeText(match[1]) : undefined;
}

/** Parses an arXiv Atom feed into papers. Exported for unit testing. */
export function parseArxivFeed(xml: string): ArxivPaper[] {
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/g) ?? [];
  const papers: ArxivPaper[] = [];

  for (const entry of entries) {
    const rawId = firstMatch(entry, /<id>\s*([\s\S]*?)\s*<\/id>/) ?? '';
    if (!rawId) continue;

    const arxivIdMatch = rawId.match(/abs\/([^v\s]+)(?:v\d+)?$/);
    const authors = [...entry.matchAll(/<author>\s*<name>\s*([\s\S]*?)\s*<\/name>/g)].map(
      (match) => normalizeText(match[1]),
    );
    const pdfMatch = entry.match(
      /<link[^>]*title="pdf"[^>]*href="([^"]+)"/,
    );

    papers.push({
      id: rawId,
      arxivId: arxivIdMatch ? arxivIdMatch[1] : rawId,
      title: firstMatch(entry, /<title>\s*([\s\S]*?)\s*<\/title>/) ?? '',
      abstract: firstMatch(entry, /<summary>\s*([\s\S]*?)\s*<\/summary>/) ?? '',
      published: firstMatch(entry, /<published>\s*([\s\S]*?)\s*<\/published>/) ?? '',
      updated: firstMatch(entry, /<updated>\s*([\s\S]*?)\s*<\/updated>/),
      authors,
      pdfUrl: pdfMatch ? decodeEntities(pdfMatch[1]) : undefined,
      primaryCategory: entry.match(/<arxiv:primary_category[^>]*term="([^"]+)"/)?.[1],
    });
  }

  return papers;
}

/**
 * Runs one arXiv search. Retries 429/5xx with linear backoff.
 *
 * Throws on the final failure so callers can decide whether to degrade — this
 * client never returns an empty list to hide an error.
 */
export async function searchArxiv(
  query: string,
  options: ArxivFetchOptions = {},
): Promise<ArxivPaper[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleepImpl ?? defaultSleep;
  const maxResults = options.maxResults ?? 100;
  const start = options.start ?? 0;

  const url =
    `${API_BASE}?search_query=${encodeURIComponent(trimmed)}` +
    `&start=${start}&max_results=${maxResults}` +
    `&sortBy=submittedDate&sortOrder=descending`;

  let lastError = 'UNKNOWN';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    // The gate is module-level, so concurrent callers queue behind each other.
    const run = queue.then(async () => {
      await respectRateLimit(sleep);
      return fetchImpl(url, { headers: { Accept: 'application/atom+xml' } });
    });
    queue = run.catch(() => undefined);

    try {
      const response = await run;
      if (response.ok) {
        return parseArxivFeed(await response.text());
      }
      lastError = `HTTP_${response.status}`;
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastError = (error as Error).message || 'NETWORK_ERROR';
    }

    if (attempt < MAX_ATTEMPTS) await sleep(1_000 * attempt);
  }

  throw new Error(`arXiv 检索失败（${lastError}）。`);
}
