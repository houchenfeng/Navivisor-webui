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
  researchInterest?: string;
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
};

export type ResearchTopicCandidate = {
  label: '偏可行' | '偏创新' | '较平衡';
  title: string;
  oneSentenceDefinition: string;
  researchDesign: string;
  expectedInnovation: string;
  rationale: string;
};
