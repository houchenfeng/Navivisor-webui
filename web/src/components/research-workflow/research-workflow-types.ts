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
      missing: Array<string | DemoMissingItem>;
    };
    modules: Record<
      ResearchModule,
      {
        status: 'empty' | 'partial' | 'ready' | 'external_modified';
        currentFiles: Array<{
          path: string;
          role?: string;
          sha256?: string;
          artifactId?: string;
          externalModified?: boolean;
        }>;
      }
    >;
    artifacts?: Array<{
      artifactId: string;
      role?: string;
      path: string;
      sha256?: string;
      simulated?: boolean;
    }>;
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

export interface DemoMissingItem {
  path: string;
  reason: string;
  requiredBy: string[];
  optional: boolean;
  detail?: string;
  sourceUrl?: string | null;
}

export interface DemoDefinition {
  id: string;
  rootPath: string;
  title: string;
  description: string;
  version: string;
  simulated: boolean;
  complete: boolean;
  missing: DemoMissingItem[];
}

export interface ActivateDemoResult {
  workspace: ResearchWorkspace;
  load: LoadDemoResult;
}

/** UI summary cards from `.navivisor/conversations/ui-events.jsonl` (not Codex turns). */
export interface ResearchUiEvent {
  eventId: string;
  projectId: string;
  kind: 'ui.demo-loaded' | 'ui.save' | 'ui.generate' | (string & {});
  module?: ResearchModule | string;
  summary: string;
  artifactIds?: string[];
  runId?: string;
  createdAt: string;
}

export interface ResearchUiEventsPage {
  events: ResearchUiEvent[];
  nextBefore?: string;
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
