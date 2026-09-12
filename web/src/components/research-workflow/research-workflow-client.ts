import { getAuthorizationHeader } from '@/auth-token';
import {
  researchWorkflowCancelRun,
  researchWorkflowCreateProject,
  researchWorkflowGetArtifactContent,
  researchWorkflowGetRun,
  researchWorkflowListArtifacts,
  researchWorkflowListProjects,
  researchWorkflowListRuns,
  researchWorkflowStartAgentRun,
} from '@/generated/api/sdk.gen';
import type {
  LoadDemoResult,
  ResearchArtifact,
  ResearchProject,
  ResearchRun,
  ResearchRunMode,
  ResearchRunStatus,
  ResearchUiEventsPage,
  ResearchWorkspace,
  StartedResearchRun,
} from './research-workflow-types';

function dataOf<T>(response: { data?: unknown; error?: unknown }): T {
  if (response.error !== undefined) throw response.error;
  return response.data as T;
}

const TERMINAL_RUN_STATUSES: ResearchRunStatus[] = [
  'completed',
  'failed',
  'cancelled',
  'unavailable',
  'needs_credentials',
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const authorization = getAuthorizationHeader();
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join('; ');
      else if (body.message) message = body.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const researchWorkflowClient = {
  async listProjects(): Promise<ResearchProject[]> {
    return dataOf(await researchWorkflowListProjects({ throwOnError: true }));
  },
  async createProject(name: string): Promise<ResearchProject> {
    return dataOf(
      await researchWorkflowCreateProject({ body: { name }, throwOnError: true }),
    );
  },
  async registerWorkspace(input: {
    absolutePath: string;
    title?: string;
    createIfMissing?: boolean;
  }): Promise<ResearchWorkspace & { reused: boolean }> {
    return apiJson('/api/research/workspaces/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  async getWorkspace(projectId: string): Promise<ResearchWorkspace> {
    return apiJson(
      `/api/research/projects/${encodeURIComponent(projectId)}/workspace`,
    );
  },
  async scanWorkspace(projectId: string) {
    return apiJson(
      `/api/research/projects/${encodeURIComponent(projectId)}/workspace/scan`,
      { method: 'POST', body: '{}' },
    );
  },
  async loadWorkspaceDemo(projectId: string): Promise<LoadDemoResult> {
    return apiJson(
      `/api/research/projects/${encodeURIComponent(projectId)}/demo/load`,
      { method: 'POST', body: '{}' },
    );
  },
  async listUiEvents(
    projectId: string,
    options?: { limit?: number; before?: string },
  ): Promise<ResearchUiEventsPage> {
    const params = new URLSearchParams();
    if (options?.limit != null) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', options.before);
    const qs = params.toString();
    return apiJson(
      `/api/research/projects/${encodeURIComponent(projectId)}/conversations/ui-events${qs ? `?${qs}` : ''}`,
    );
  },
  async listRuns(projectId: string): Promise<ResearchRun[]> {
    return dataOf(
      await researchWorkflowListRuns({ path: { projectId }, throwOnError: true }),
    );
  },
  async getRun(projectId: string, runId: string): Promise<ResearchRun> {
    return dataOf(
      await researchWorkflowGetRun({
        path: { projectId, runId },
        throwOnError: true,
      }),
    );
  },
  async listArtifacts(projectId: string): Promise<ResearchArtifact[]> {
    return dataOf(
      await researchWorkflowListArtifacts({
        path: { projectId },
        throwOnError: true,
      }),
    );
  },
  async getArtifactContent(
    projectId: string,
    artifactId: string,
  ): Promise<string> {
    const response = await researchWorkflowGetArtifactContent({
      path: { projectId, artifactId },
      parseAs: 'text',
      throwOnError: true,
    });
    return String(response.data ?? '');
  },
  /** Binary-safe fetch for previews (PNG/PDF); do not inject into chat timeline. */
  async getArtifactBlob(projectId: string, artifactId: string): Promise<Blob> {
    const authorization = getAuthorizationHeader();
    const response = await fetch(
      `/api/research/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(artifactId)}/content`,
      {
        headers: authorization ? { Authorization: authorization } : {},
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to load artifact content (${response.status})`);
    }
    return response.blob();
  },
  async startAgentRun(input: {
    projectId: string;
    stage: string;
    mode: ResearchRunMode;
    inputArtifactIds?: string[];
    instructions: string;
    model?: string;
    effort?: 'low' | 'medium' | 'high' | 'xhigh';
  }): Promise<StartedResearchRun> {
    return dataOf(
      await researchWorkflowStartAgentRun({
        path: { projectId: input.projectId },
        body: {
          stage: input.stage,
          mode: input.mode,
          inputArtifactIds: input.inputArtifactIds ?? [],
          instructions: input.instructions,
          ...(input.model ? { model: input.model } : {}),
          ...(input.effort ? { effort: input.effort } : {}),
        },
        throwOnError: true,
      }),
    );
  },
  async cancelRun(projectId: string, runId: string): Promise<void> {
    await researchWorkflowCancelRun({
      path: { projectId, runId },
      throwOnError: true,
    });
  },
  async waitForRun(
    projectId: string,
    runId: string,
    options?: { timeoutMs?: number; intervalMs?: number },
  ): Promise<ResearchRun> {
    const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000;
    const intervalMs = options?.intervalMs ?? 2000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const run = await this.getRun(projectId, runId);
      if (TERMINAL_RUN_STATUSES.includes(run.status)) return run;
      await sleep(intervalMs);
    }

    throw new Error('Research run timed out while waiting for Codex to finish');
  },
};
