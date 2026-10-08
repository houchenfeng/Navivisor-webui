/**
 * Core-literature collection helpers (T32, T36).
 *
 * T32 — recent arXiv papers for the concept groups.
 * T36 — map the final ranked list into the shape `core_pack.py` consumes.
 */
import { searchArxiv, type ArxivPaper } from './arxiv-client';
import { toArxivQuery } from './query-renderers';
import { RECENT_MONTHS, monthsAgo } from './reverse-citations';
import type { ConceptGroups } from './core-query';
import type { ResearchTopicPaper } from './research-topic.types';

export type ArxivLatestResult = {
  papers: ArxivPaper[];
  /** True when the request failed; the caller records it rather than hiding it. */
  failed: boolean;
  reason?: string;
};

/**
 * Fetches the newest arXiv submissions for the concept groups.
 *
 * Results are filtered to the last `RECENT_MONTHS` locally because arXiv's API
 * has no date filter — `sortBy=submittedDate` only orders, it does not restrict.
 */
export async function fetchArxivLatest(
  groups: ConceptGroups,
  options: {
    maxResults?: number;
    now?: Date;
    fetchImpl?: typeof fetch;
    sleepImpl?: (ms: number) => Promise<void>;
  } = {},
): Promise<ArxivLatestResult> {
  const query = toArxivQuery({ concepts: groups, exclusions: [] });
  if (!query) return { papers: [], failed: false };

  const cutoff = monthsAgo(options.now ?? new Date(), RECENT_MONTHS);
  try {
    const papers = await searchArxiv(query, {
      maxResults: options.maxResults ?? 100,
      fetchImpl: options.fetchImpl,
      sleepImpl: options.sleepImpl,
    });
    return {
      papers: papers.filter(
        (paper) => paper.published && paper.published.slice(0, 10) >= cutoff,
      ),
      failed: false,
    };
  } catch (error) {
    // A failed arXiv call must not read as "arXiv has nothing recent".
    return { papers: [], failed: true, reason: (error as Error).message };
  }
}

/** The paper shape `core_pack.py` reads from `normalized-input/papers.json`. */
export type PythonCorePaper = {
  refId: string;
  title: string;
  doi: string;
  year: number | null;
  sourceUrl: string;
  openAccessUrl: string;
  isOpenAccess: boolean;
  pdfUrl: string;
};

/**
 * Maps a topic paper onto the Python contract.
 *
 * `sourceUrl` falls back to the landing page and `openAccessUrl` to the PDF:
 * the packer tries them in that order, and leaving both empty would silently
 * drop the paper from the download queue.
 */
export function toPythonCorePaper(
  paper: ResearchTopicPaper,
  refId: string,
): PythonCorePaper {
  return {
    refId,
    title: paper.title,
    doi: paper.doi ?? '',
    year: paper.publicationYear ?? null,
    sourceUrl: paper.landingUrl || paper.pdfUrl || '',
    openAccessUrl: paper.pdfUrl || '',
    isOpenAccess: Boolean(paper.isOpenAccess || paper.pdfUrl),
    pdfUrl: paper.pdfUrl ?? '',
  };
}

/** The `input.json` the packer reads, trimmed to the fields it validates. */
export type CorePackInput = {
  runId: string;
  confirmedTopic: string;
  selection: { targetCount: number; rankingRule: string };
  pdfPolicy: {
    allowedPdfHosts: string[];
    maxBytes: number;
  };
  downloadPolicy: {
    targetSuccessfulPdfs: number;
    maxCandidatesToAttempt: number;
    maxWorkers: number;
    maxWorkersPerHost: number;
  };
  sourcePolicy: { allowedHosts: string[] };
  queries: Array<Record<string, unknown>>;
};

export const DEFAULT_ALLOWED_PDF_HOSTS = [
  'content.openalex.org',
  'arxiv.org',
  'europepmc.org',
  'pmc.ncbi.nlm.nih.gov',
];

export const DEFAULT_MAX_PDF_BYTES = 25 * 1024 * 1024;

/**
 * Builds the packer config.
 *
 * `targetCount` is the *actual* number of selected papers, not the original
 * request — asking the packer for more than we selected is what previously made
 * the pipeline look like it was falling short of its target.
 */
export function buildCorePackInput(input: {
  runId: string;
  confirmedTopic: string;
  paperCount: number;
  sourceQueries: Array<Record<string, unknown>>;
  /** Caps how many PDFs the packer attempts; defaults to the paper count. */
  maxCandidatesToAttempt?: number;
}): CorePackInput {
  const target = Math.max(0, input.paperCount);
  return {
    runId: input.runId,
    confirmedTopic: input.confirmedTopic,
    selection: { targetCount: target, rankingRule: 'AI relevance score, then citation count' },
    pdfPolicy: {
      allowedPdfHosts: DEFAULT_ALLOWED_PDF_HOSTS,
      maxBytes: DEFAULT_MAX_PDF_BYTES,
    },
    downloadPolicy: {
      targetSuccessfulPdfs: target,
      maxCandidatesToAttempt: Math.min(
        input.maxCandidatesToAttempt ?? target,
        target,
      ),
      maxWorkers: 4,
      maxWorkersPerHost: 2,
    },
    sourcePolicy: { allowedHosts: ['api.openalex.org', 'export.arxiv.org'] },
    queries: input.sourceQueries,
  };
}
