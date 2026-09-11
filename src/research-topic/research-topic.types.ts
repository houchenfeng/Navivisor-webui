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
  status: ResearchTopicTaskStatus;
  files: ResearchTopicFile[];
  errors: Array<{ code?: string; message: string }>;
  papers: ResearchTopicPaper[];
  counts: ResearchTopicCounts;
  createdAt: string;
  updatedAt: string;
  cancelRequested: boolean;
};
