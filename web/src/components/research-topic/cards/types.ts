/**
 * Payload shapes for the first-search stage cards.
 *
 * These mirror the backend stage payloads (src/research-topic/*.ts). They are
 * declared locally rather than generated because the backend emits them as
 * opaque `data` on a generic StageSnapshot; keeping a narrow, documented view
 * here means a backend change surfaces as a type error in the card that reads
 * it, instead of silently rendering `undefined`.
 */

export type QueryPlanArtifact = {
  concepts: { A: string[]; B: string[]; C: string[] };
  openalex: { versionA: string; versionB: string };
  arxiv: { versionA: string; versionB: string };
  scopus: { versionA: string; versionB: string };
  exclusions: string[];
  rationale: string;
  provider: 'codex' | 'http';
  fallbackUsed: boolean;
  openalexOql: string;
  arxivQuery: string;
};

export type SearchStageData = {
  openalex: number;
  arxiv: number;
  merged: number;
  yearFrom: number;
  yearTo: number;
};

export type RelevanceCheck = {
  round: number;
  sampleSize: number;
  relevantRatio: number;
  irrelevantSamples: Array<{ title: string; reason: string }>;
  refinedQueryPlan?: QueryPlanArtifact;
};

export type VenueTiering = {
  tiers: Array<{ tier: 1 | 2 | 3; name: string; count: number }>;
  topVenueRatio: number;
  note: string;
};

export type Landscape = {
  diagnosis: string;
  conceptDictionary: string;
  trendMatrix: string;
  venuePreference: string;
  combinationMatrix: string;
  signals: string;
};

export type ResearchGaps = {
  crowded: string[];
  crossGaps: string[];
  zeroCooccurrence: string[];
  redteam: string[];
};

export type CandidateTopic = {
  label: '偏可行' | '偏创新' | '较平衡';
  title: string;
  oneSentenceDefinition: string;
  researchDesign: string;
  expectedInnovation: string;
  rationale: string;
};

/** One combination tried during core-literature retrieval (T29). */
export type CoreCombinationHit = {
  id: 'A+B+C' | 'A+B' | 'A+C' | 'B+C' | 'A';
  reason: string;
  oql: string;
  found: number;
  accepted: number;
};

export type SeedPaper = {
  refId: string;
  title: string;
  venue: string;
  year: number | null;
  citedByCount: number;
  openalexWorkId: string | null;
};

export type ReverseCitationHit = {
  seedWorkId: string;
  title: string;
  venue: string;
  year: number | null;
};

export type PaperScore = {
  refId: string;
  title: string;
  score: 0 | 1 | 2 | 3 | 4 | 5;
  relevant: boolean;
  reason: string;
  transferable: boolean;
  baselineCandidate: boolean;
};

export type FallbackAttempt = {
  index: number;
  kind: 'combination' | 'year-window' | 'document-type' | 'score-threshold';
  label: string;
  found: number;
  accepted: number;
  stopped: boolean;
};

export type BaselineCandidate = {
  title: string;
  method: string;
  metrics: string;
  dataset: string;
  codeUrl: string;
  whyTransferable: string;
  /** True when this came from the mechanical citation-count pick. */
  fallback: boolean;
};

export type PdfDownloadReport = {
  succeeded: number;
  failed: number;
  failures: Array<{ refId: string; reason: string }>;
};

export type BatchPrepSummary = {
  totalPapers: number;
  batchSize: number;
  batchCount: number;
  firstRefId: string;
  lastRefId: string;
};

export type BatchAnalysisEntry = {
  index: number;
  /**
   * Optional because the backend reports batches by name before the ref-id
   * range is known. A missing range must render as "unknown", never as a
   * dangling separator.
   */
  refIdRange?: string;
  name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  error?: string;
  /** Optional preview extracted from the matrix artifact. */
  matrixPreview?: string;
};

/** Narrows an opaque stage payload without throwing on a shape mismatch. */
export function asStageData<T>(value: unknown): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as T;
}

/** Formats a 0..1 ratio as a percentage, tolerating an out-of-range value. */
export function formatRatio(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${(Math.min(1, Math.max(0, value)) * 100).toFixed(1)}%`;
}
