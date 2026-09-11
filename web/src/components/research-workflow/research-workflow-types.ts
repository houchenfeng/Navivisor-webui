export type ResearchModule = 'topic' | 'experiment' | 'writing' | 'submission';
export type ResearchRunMode = 'simulated' | 'real';
export type ResearchRunStatus =
  | 'queued' | 'running' | 'waiting_for_approval' | 'waiting_for_input'
  | 'validating' | 'completed' | 'failed' | 'cancelled' | 'unavailable'
  | 'needs_credentials';

export interface ResearchProject {
  projectId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
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
