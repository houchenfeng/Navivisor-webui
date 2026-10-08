export type ResearchTopicTaskStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ResearchTopicPaper = {
  openalexId: string;
  title: string;
  authors: string[];
  institutions: string[];
  source: string;
  publicationYear: number | null;
  citedByCount: number;
  abstract: string;
  doi: string;
  landingUrl: string;
  sourceStatus: 'openalex_public_api';
  isOpenAccess?: boolean;
  pdfUrl?: string;
};
export type ResearchTopicFile = {
  name: string;
  path: string;
  kind: 'csv' | 'markdown' | 'manifest' | 'json';
};

export type ResearchTopicManifest = {
  runId: string;
  stage: 'first-search';
  status: 'completed' | 'failed';
  files: ResearchTopicFile[];
  counts: ResearchTopicCounts;
  errors: Array<{ code?: string; message: string }>;
  warnings?: string[];
  sourceQueries: Array<Record<string, unknown>>;
  createdAt: string;
};

export type FirstSearchInput = {
  researchInterest: string;
  context?: string;
  yearRange?: { from?: number; to?: number };
  targetCount: number;
};

export type ResearchTopicCounts = {
  papers: number;
  requested: number;
  returned: number;
  deduplicated: number;
  previewed: number;
  targetReached: boolean;
};

export type ResearchTopicTask = {
  runId: string;
  projectId?: string;
  researchInterest?: string;
  researchContext?: string;
  status: ResearchTopicTaskStatus;
  files: ResearchTopicFile[];
  errors: Array<{ code?: string; message: string }>;
  papers: ResearchTopicPaper[];
  counts: ResearchTopicCounts;
  createdAt: string;
  updatedAt: string;
  cancelRequested: boolean;
  candidateStatus: 'idle' | 'queued' | 'running' | 'completed' | 'failed';
  candidates?: ResearchTopicCandidate[];
  candidateError?: string;
  coreStatus?: 'idle' | 'queued' | 'running' | 'completed' | 'partial' | 'failed';
  coreRunId?: string;
  coreManifest?: Record<string, unknown>;
  coreError?: string;
  /** Per-stage state for the first-search pipeline (T20). */
  stages: Record<FirstSearchStage, StageState<unknown>>;
  /** Machine-readable warnings, e.g. 'insufficient_results'. */
  warnings: string[];
};

export type ResearchTopicCandidate = {
  label: '偏可行' | '偏创新' | '较平衡';
  title: string;
  oneSentenceDefinition: string;
  researchDesign: string;
  expectedInnovation: string;
  rationale: string;
};

/** Stages of the first-search pipeline, in execution order. */
export type FirstSearchStage =
  | 'query-plan'
  | 'search'
  | 'relevance-check'
  | 'venue-tiering'
  | 'landscape'
  | 'research-gaps'
  | 'candidates';

export const FIRST_SEARCH_STAGES: FirstSearchStage[] = [
  'query-plan',
  'search',
  'relevance-check',
  'venue-tiering',
  'landscape',
  'research-gaps',
  'candidates',
];

/**
 * Per-stage state. `provider` / `fallbackUsed` are only set by stages that
 * called an AI provider, so the UI can show which model actually answered.
 */
export type StageState<T> = {
  status: 'idle' | 'queued' | 'running' | 'completed' | 'failed';
  data?: T;
  error?: string;
  provider?: 'codex' | 'http';
  fallbackUsed?: boolean;
  startedAt?: string;
  finishedAt?: string;
};

export type QueryPlanArtifact = {
  concepts: { A: string[]; B: string[]; C: string[] };
  openalex: { versionA: string; versionB: string };
  arxiv: { versionA: string; versionB: string };
  scopus: { versionA: string; versionB: string };
  exclusions: string[];
  rationale: string;
  provider: 'codex' | 'http';
  fallbackUsed: boolean;
  /** Rendered OQL actually sent to OpenAlex. */
  openalexOql: string;
  /** Rendered arXiv query actually sent to arXiv. */
  arxivQuery: string;
};

export type RelevanceCheck = {
  round: number;
  sampleSize: number;
  /** 0..1 */
  relevantRatio: number;
  irrelevantSamples: Array<{ title: string; reason: string }>;
  refinedQueryPlan?: QueryPlanArtifact;
};

export type VenueTier = {
  /** 1 = highest. */
  tier: 1 | 2 | 3;
  name: string;
  count: number;
};

export type VenueTiering = {
  tiers: VenueTier[];
  /** Share of papers published in tier-1 venues, 0..1. */
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
  /** Combinations with no title-level co-occurrence evidence. */
  zeroCooccurrence: string[];
  redteam: string[];
};

/** Warnings the pipeline can attach to a run. */
export const TOPIC_WARNINGS = {
  insufficientResults: 'insufficient_results',
  yearWindowRelaxed: 'year_window_relaxed',
  queryPlanFallback: 'query_plan_fallback',
  aiFallbackUsed: 'ai_fallback_used',
} as const;

export type TopicWarning = (typeof TOPIC_WARNINGS)[keyof typeof TOPIC_WARNINGS];
