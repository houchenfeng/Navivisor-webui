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
  status: ResearchTopicTaskStatus;
  files: ResearchTopicFile[];
  counts: { papers: number };
  errors: Array<{ code?: string; message: string }>;
  sourceQueries: Array<Record<string, unknown>>;
  createdAt: string;
};

export type FirstSearchInput = {
  researchInterest: string;
  context?: string;
  yearRange?: { from?: number; to?: number };
  maxItems?: number;
};

export type ResearchTopicTask = {
  runId: string;
  status: ResearchTopicTaskStatus;
  files: ResearchTopicFile[];
  errors: Array<{ code?: string; message: string }>;
  papers: ResearchTopicPaper[];
  counts: { papers: number };
  createdAt: string;
  updatedAt: string;
  cancelRequested: boolean;
};
