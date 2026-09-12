export const RESEARCH_MODULES = [
  'topic',
  'experiment',
  'writing',
  'submission',
] as const;
export type ResearchModule = (typeof RESEARCH_MODULES)[number];

export const RESEARCH_STAGES = [
  'topic.intake',
  'topic.first-search',
  'topic.candidates',
  'topic.confirmation',
  'topic.core-literature',
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
  'project-intake',
  'search-strategy',
  'search-iterations',
  'candidate-papers',
  'screening-log',
  'topic-landscape',
  'candidate-topics',
  'confirmed-topic',
  'core-references',
  'literature-bib',
  'paper-manifest',
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
  'dataset-manifest',
  'experiment-config',
  'venue-requirements',
  'submission-package',
  'review-round1',
  'rebuttal',
  'submission-decision',
  'diagnostics',
  'workspace-index',
  'demo-manifest',
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
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export const RESEARCH_STAGE_OUTPUT_ROLES: Record<
  ResearchStage,
  readonly ResearchArtifactRole[]
> = {
  'topic.intake': ['project-intake', 'diagnostics'],
  'topic.first-search': [
    'search-strategy',
    'search-iterations',
    'candidate-papers',
    'screening-log',
    'diagnostics',
  ],
  'topic.candidates': ['topic-landscape', 'candidate-topics', 'diagnostics'],
  'topic.confirmation': ['confirmed-topic', 'diagnostics'],
  'topic.core-literature': [
    'core-references',
    'literature-bib',
    'paper-manifest',
    'literature-handoff',
    'diagnostics',
  ],
  'experiment.plan': [
    'experiment-plan',
    'experiment-config',
    'dataset-manifest',
    'diagnostics',
  ],
  'experiment.run': [
    'experiment-results',
    'method-architecture',
    'paper-figure',
    'diagnostics',
  ],
  'writing.outline': ['paper-outline', 'diagnostics'],
  'writing.draft': [
    'paper-source',
    'paper-metadata',
    'paper-figure',
    'paper-translation',
    'diagnostics',
  ],
  'writing.final': [
    'paper-source',
    'paper-metadata',
    'paper-figure',
    'paper-translation',
    'paper-pdf',
    'diagnostics',
  ],
  'submission.prepare': [
    'venue-requirements',
    'submission-package',
    'diagnostics',
  ],
  'submission.review.round1': ['review-round1', 'diagnostics'],
  'submission.rebuttal': ['rebuttal', 'diagnostics'],
  'submission.decision': ['submission-decision', 'diagnostics'],
};

/** Allowed stage progression for topic module (acyclic). */
export const TOPIC_STAGE_ORDER: readonly ResearchStage[] = [
  'topic.intake',
  'topic.first-search',
  'topic.candidates',
  'topic.confirmation',
  'topic.core-literature',
] as const;

export function isOutputRoleAllowedForStage(
  stage: ResearchStage,
  role: ResearchArtifactRole,
): boolean {
  return RESEARCH_STAGE_OUTPUT_ROLES[stage].includes(role);
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

export interface WorkspaceProjectJson {
  schemaVersion: 2;
  projectId: string;
  title: string;
  description?: string;
  language?: string;
  directories: {
    topic: string;
    experiment: string;
    writing: string;
    submission: string;
  };
  demo?: { id: string; version: string; simulated: boolean };
  createdAt: string;
}

export const DEMO_MISSING_REASON_CODES = [
  'file_missing',
  'generation_unavailable',
  'needs_credentials',
  'not_applicable',
  'invalid_content',
] as const;
export type DemoMissingReasonCode = (typeof DEMO_MISSING_REASON_CODES)[number];

export interface DemoManifestFile {
  key: string;
  path: string;
  role: ResearchArtifactRole;
  mediaType: string;
  sha256: string;
  required: boolean;
  placeholder?: boolean;
}

export interface DemoManifestNode {
  key: string;
  stage: ResearchStage;
  inputs: string[];
  files: DemoManifestFile[];
}

export interface DemoManifestMissing {
  path: string;
  reason: DemoMissingReasonCode;
  requiredBy: string[];
  optional: boolean;
}

export interface DemoManifestV3 {
  schemaVersion: 3;
  demoId: string;
  version: string;
  simulated: boolean;
  nodes: DemoManifestNode[];
  missing: DemoManifestMissing[];
}

/** Persisted UI summary cards (not Codex turns). Stored in ui-events.jsonl. */
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

export interface PortableProjectIndex {
  schemaVersion: 2;
  projectId: string;
  title: string;
  rootRelativeHint?: string;
  updatedAt: string;
  directories: WorkspaceProjectJson['directories'];
  modules: Record<
    ResearchModule,
    {
      status: 'empty' | 'partial' | 'ready' | 'external_modified';
      currentFiles: Array<{
        path: string;
        role?: ResearchArtifactRole;
        sha256?: string;
        artifactId?: string;
        externalModified?: boolean;
      }>;
    }
  >;
  runs: Array<{
    runId: string;
    stage: ResearchStage;
    status: ResearchRunStatus;
    mode: ResearchRunMode;
  }>;
  artifacts: Array<{
    artifactId: string;
    role: ResearchArtifactRole;
    path: string;
    sha256: string;
    simulated: boolean;
  }>;
  demo?: {
    demoId: string;
    version: string;
    manifestSha256: string;
    loadedAt: string;
    complete: boolean;
    /** Relative paths and/or structured missing entries from Demo v3. */
    missing: Array<string | DemoManifestMissing>;
  };
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
