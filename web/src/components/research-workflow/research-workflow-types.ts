export type ResearchModule = 'topic' | 'experiment' | 'writing' | 'submission';
export type ResearchRunMode = 'simulated' | 'real';
export type ResearchRunStatus =
  | 'queued'
  | 'running'
  | 'waiting_for_approval'
  | 'waiting_for_input'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'unavailable'
  | 'needs_credentials';

export interface ResearchProject {
  projectId: string;
  name: string;
  rootPath?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ResearchWorkspace {
  projectId: string;
  name: string;
  title: string;
  description: string;
  rootPath: string;
  directories: {
    topic: string;
    experiment: string;
    writing: string;
    submission: string;
  };
  demo: { id: string; version: string; simulated: boolean } | null;
  index: {
    schemaVersion: number;
    projectId: string;
    title: string;
    updatedAt: string;
    demo?: {
      demoId: string;
      version: string;
      manifestSha256: string;
      loadedAt: string;
      complete: boolean;
      missing: string[];
    };
    modules: Record<
      ResearchModule,
      {
        status: 'empty' | 'partial' | 'ready' | 'external_modified';
        currentFiles: Array<{ path: string; externalModified?: boolean }>;
      }
    >;
  };
  createdAt: number;
  updatedAt: number;
  reused?: boolean;
}

export interface LoadDemoResult {
  projectId: string;
  demoId: string;
  version: string;
  manifestSha256: string;
  idempotent: boolean;
  complete: boolean;
  loadedFiles: number;
  missing: string[];
  runIds: string[];
  warnings: string[];
}

export interface ResearchRun {
  runId: string;
  projectId: string;
  module: ResearchModule;
  stage: string;
  status: ResearchRunStatus;
  mode: ResearchRunMode;
  retryOfRunId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ResearchArtifact {
  artifactId: string;
  runId: string;
  projectId: string;
  role: string;
  name: string;
  path: string;
  mediaType: string;
  size: number;
  sha256: string;
  simulated: boolean;
  metadata?: Record<string, unknown>;
  createdAt: number | string;
}

export interface StartedResearchRun {
  runId: string;
  threadId: string;
  turnId: string;
}

/** Capability matrix for W10 — real features must show evidence status. */
export const RESEARCH_CAPABILITIES = {
  openAlexSearch: 'available',
  realTrainingRunner: 'unavailable',
  gptImageGeneration: 'needs_credentials',
  latexCompileWorker: 'unavailable',
  citationVerification: 'partial',
  openReviewSubmit: 'unavailable',
} as const;
