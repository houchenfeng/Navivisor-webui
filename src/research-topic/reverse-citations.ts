/**
 * Reverse-citation retrieval (T31).
 *
 * Walks forward from the classic seeds: who cited them in the last six months?
 * That is where a field's current work sits, and it is the signal the course
 * workflow uses to distinguish "still active" from "was active in 2019".
 */
import type { ResearchTopicPaper } from './research-topic.types';
import { toOpenAlexWorkId } from './seed-papers';

const OPENALEX_WORKS_URL = 'https://api.openalex.org/works';
/** Window the plan specifies. */
export const RECENT_MONTHS = 6;
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 15_000;
const PER_PAGE = 100;
const SELECT = 'id,doi,title,publication_year,authorships,primary_location,best_oa_location,open_access,content_urls,abstract_inverted_index,cited_by_count';

export type ReverseCitationHit = {
  /** The seed whose citation list produced this hit. */
  seedWorkId: string;
  /** The citing work. */
  paper: ResearchTopicPaper;
};

/** ISO date `months` before `from`, used for the `from_publication_date` filter. */
export function monthsAgo(from: Date, months: number): string {
  const date = new Date(from.getTime());
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

/** Builds the OpenAlex URL for "works citing this seed since `since`". */
export function buildReverseCitationUrl(
  seedWorkId: string,
  since: string,
  cursor = '*',
): string {
  const params = new URLSearchParams({
    filter: `cites:${seedWorkId},from_publication_date:${since}`,
    'per-page': String(PER_PAGE),
    select: SELECT,
    cursor,
  });
  return `${OPENALEX_WORKS_URL}?${params.toString()}`;
}

type OpenAlexPayload = {
  meta?: { count?: number; next_cursor?: string | null };
  results?: Array<Record<string, unknown>>;
};

export type ReverseCitationOptions = {
  /** How many seeds to walk; defaults to all provided. */
  maxSeeds?: number;
  /** Injectable clock for deterministic tests. */
  now?: Date;
  fetchImpl?: typeof fetch;
  /** Injected so this module does not import the service's normalizer. */
  normalize: (work: Record<string, unknown>) => ResearchTopicPaper;
  sleepImpl?: (ms: number) => Promise<void>;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Collects recent citing works for each seed.
 *
 * Failures are per-seed: one seed whose request fails does not abort the
 * others, and the caller receives `failures` so the gap is visible rather than
 * looking like "this seed has no recent citations".
 */
export async function fetchReverseCitations(
  seeds: ResearchTopicPaper[],
  options: ReverseCitationOptions,
): Promise<{
  hits: ReverseCitationHit[];
  failures: Array<{ seedWorkId: string; reason: string }>;
}> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleepImpl ?? defaultSleep;
  const since = monthsAgo(options.now ?? new Date(), RECENT_MONTHS);
  const limited = options.maxSeeds ? seeds.slice(0, options.maxSeeds) : seeds;

  const hits: ReverseCitationHit[] = [];
  const failures: Array<{ seedWorkId: string; reason: string }> = [];

  for (const seed of limited) {
    const workId = toOpenAlexWorkId(seed);
    if (!workId) continue;

    let cursor: string | null | undefined = '*';
    let succeeded = false;
    let lastError = 'UNKNOWN';

    while (cursor) {
      const url = buildReverseCitationUrl(workId, since, cursor);
      let payload: OpenAlexPayload | null = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
          const response = await fetchImpl(url, { signal: controller.signal });
          if (response.ok) {
            payload = (await response.json()) as OpenAlexPayload;
            break;
          }
          lastError = `HTTP_${response.status}`;
          if (response.status !== 429 && response.status < 500) break;
        } catch (error) {
          lastError = (error as Error).message || 'NETWORK_ERROR';
        } finally {
          clearTimeout(timer);
        }
        if (attempt < MAX_ATTEMPTS) await sleep(300 * attempt);
      }

      if (!payload) break;

      succeeded = true;
      for (const raw of payload.results ?? []) {
        const paper = options.normalize(raw);
        if (!paper.title || !paper.openalexId) continue;
        hits.push({ seedWorkId: workId, paper });
      }
      cursor = payload.meta?.next_cursor ?? null;
    }

    if (!succeeded) failures.push({ seedWorkId: workId, reason: lastError });
  }

  return { hits, failures };
}

/** Deduplicates hits by DOI/OpenAlex id, preserving first-seen order. */
export function dedupeHits(hits: ReverseCitationHit[]): ReverseCitationHit[] {
  const seen = new Set<string>();
  const unique: ReverseCitationHit[] = [];
  for (const hit of hits) {
    const key =
      hit.paper.doi?.trim().toLowerCase() ||
      hit.paper.openalexId.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(hit);
  }
  return unique;
}

export function renderReverseCitationsMarkdown(
  hits: ReverseCitationHit[],
  failures: Array<{ seedWorkId: string; reason: string }>,
  direction = '',
): string {
  const lines = [
    `# 反向引用（近 ${RECENT_MONTHS} 个月） · ${direction}`,
    '',
    `共 ${hits.length} 篇近期引用者。`,
    '',
    ...hits.map((hit) => {
      const year = hit.paper.publicationYear ?? '未知';
      const venue = hit.paper.source?.trim() || '未标注来源';
      return `- [引用 ${hit.seedWorkId}] ${hit.paper.title}（${venue} · ${year}）`;
    }),
  ];

  if (failures.length) {
    lines.push(
      '',
      '## 检索失败的种子（不代表该种子没有近期引用）',
      '',
      ...failures.map((failure) => `- ${failure.seedWorkId}：${failure.reason}`),
    );
  }

  return lines.join('\n');
}
