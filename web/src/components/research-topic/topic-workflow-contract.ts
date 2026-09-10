export type ResearchTaskStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'unavailable';

export interface ResearchTaskSnapshot {
  runId: string;
  stage: 'first-search' | 'core-literature' | 'paper-thinking' | 'experiment-plan';
  status: ResearchTaskStatus;
  files: Array<{
    name: string;
    path: string;
    kind: 'csv' | 'bib' | 'pdf' | 'markdown' | 'manifest';
  }>;
  errors: Array<{ code?: string; message: string }>;
  updatedAt?: string;
}

export interface TopicWorkflowClient {
  startFirstSearch(input: { topic: string; context: string }): Promise<ResearchTaskSnapshot>;
  getTask(runId: string): Promise<ResearchTaskSnapshot>;
  subscribeTask?(runId: string, onUpdate: (snapshot: ResearchTaskSnapshot) => void): () => void;
  cancelTask?(runId: string): Promise<void>;
  startPaperThinking?(input: { confirmedTopic: string; evidenceRunId?: string }): Promise<ResearchTaskSnapshot>;
  startExperimentPlan?(input: { confirmedTopic: string; evidenceRunId?: string }): Promise<ResearchTaskSnapshot>;
}

/**
 * Deliberately unavailable adapter. It makes the integration boundary explicit
 * without calling a local server, CLI, search API, or pretending a task ran.
 */
export const unavailableTopicWorkflowClient: TopicWorkflowClient = {
  async startFirstSearch() {
    return unavailableSnapshot('first-search');
  },
  async getTask() {
    return unavailableSnapshot('first-search');
  },
};

function unavailableSnapshot(stage: ResearchTaskSnapshot['stage']): ResearchTaskSnapshot {
  return {
    runId: 'unavailable',
    stage,
    status: 'unavailable',
    files: [],
    errors: [{ code: 'SERVICE_NOT_CONNECTED', message: '本地检索服务尚未接入。' }],
  };
}

export type TopicHandoff = {
  confirmedTopic: string;
  boundary: string;
  candidateEvidenceStatus: '待核验';
  evidenceRunId?: string;
  next: {
    experiment: '消费 confirmedTopic、用户边界/资源、候选方向依据和相关 runId';
    writing: '消费 confirmedTopic、来源状态和核心文献包';
    submission: '不从开题直接消费，仅消费后续论文草稿与教学模拟状态';
  };
};
