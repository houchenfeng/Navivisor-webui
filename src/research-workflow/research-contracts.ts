export const RESEARCH_MODULES = [
  'topic',
  'experiment',
  'writing',
  'submission',
] as const;
export type ResearchModule = (typeof RESEARCH_MODULES)[number];

export const RESEARCH_STAGES = [
  'topic.first-search',
  'topic.core-literature',
  'topic.confirmation',
  'experiment.plan',
  'experiment.run',
  'writing.outline',
  'writing.draft',
  'writing.final',
  'submission.prepare',
  'submission.review.round1',
  'submission.rebuttal',
  'submission.decision',
] as const;
export type ResearchStage = (typeof RESEARCH_STAGES)[number];

export const RESEARCH_RUN_STATUSES = [
  'queued',
  'running',
  'waiting_for_approval',
  'waiting_for_input',
  'validating',
  'completed',
  'failed',
  'cancelled',
  'unavailable',
  'needs_credentials',
] as const;
export type ResearchRunStatus = (typeof RESEARCH_RUN_STATUSES)[number];
export type ResearchRunMode = 'simulated' | 'real';

export const RESEARCH_ARTIFACT_ROLES = [
  'candidate-papers',
  'candidate-topics',
  'confirmed-topic',
  'core-references',
  'literature-handoff',
  'experiment-plan',
  'experiment-results',
  'method-architecture',
  'paper-outline',
  'paper-metadata',
  'paper-source',
  'paper-pdf',
  'paper-figure',
  'paper-translation',
  'project-intake',
  'dataset-manifest',
  'experiment-config',
  'venue-requirements',
  'submission-package',
  'review-round1',
  'rebuttal',
  'submission-decision',
  'diagnostics',
] as const;
export type ResearchArtifactRole = (typeof RESEARCH_ARTIFACT_ROLES)[number];

export interface ResearchArtifact {
  artifactId: string;
  projectId: string;
  runId: string;
  role: ResearchArtifactRole;
  name: string;
  path: string;
  mediaType: string;
  size: number;
  sha256: string;
  simulated: boolean;
  createdAt: string;
}

export interface ResearchRunManifest {
  schemaVersion: 1;
  projectId: string;
  runId: string;
  module: ResearchModule;
  stage: ResearchStage;
  status: ResearchRunStatus;
  mode: ResearchRunMode;
  createdAt: string;
  updatedAt: string;
  inputs: Array<{
    artifactId: string;
    producerRunId: string;
    role: ResearchArtifactRole;
    sha256: string;
  }>;
  artifacts: ResearchArtifact[];
  warnings: string[];
  errors: Array<{ code: string; message: string }>;
  provenance: Record<string, unknown>;
}

export interface ResearchAgentResultOutput {
  path: string;
  role: ResearchArtifactRole;
  mediaType: string;
  simulated: boolean;
  metadata?: Record<string, unknown>;
}

export interface ResearchAgentResult {
  schemaVersion: 1;
  runId: string;
  stage: ResearchStage;
  status: 'completed';
  outputs: ResearchAgentResultOutput[];
  warnings: string[];
}

export function moduleForStage(stage: ResearchStage): ResearchModule {
  return stage.split('.')[0] as ResearchModule;
}

export function isResearchStage(value: unknown): value is ResearchStage {
  return (
    typeof value === 'string' &&
    (RESEARCH_STAGES as readonly string[]).includes(value)
  );
}

export function isResearchRunMode(value: unknown): value is ResearchRunMode {
  return value === 'simulated' || value === 'real';
}

export function isResearchArtifactRole(
  value: unknown,
): value is ResearchArtifactRole {
  return (
    typeof value === 'string' &&
    (RESEARCH_ARTIFACT_ROLES as readonly string[]).includes(value)
  );
}
