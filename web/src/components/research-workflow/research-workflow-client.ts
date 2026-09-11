import {
  researchWorkflowCancelRun,
  researchWorkflowCreateProject,
  researchWorkflowGetRun,
  researchWorkflowListArtifacts,
  researchWorkflowListProjects,
  researchWorkflowListRuns,
  researchWorkflowStartAgentRun,
} from '@/generated/api/sdk.gen';
import type {
  ResearchArtifact,
  ResearchProject,
  ResearchRun,
  ResearchRunMode,
  StartedResearchRun,
} from './research-workflow-types';

function dataOf<T>(response: { data?: unknown; error?: unknown }): T {
  if (response.error !== undefined) throw response.error;
  return response.data as T;
}

export const researchWorkflowClient = {
  async listProjects(): Promise<ResearchProject[]> {
    return dataOf(await researchWorkflowListProjects({ throwOnError: true }));
  },
  async createProject(name: string): Promise<ResearchProject> {
    return dataOf(await researchWorkflowCreateProject({ body: { name }, throwOnError: true }));
  },
  async listRuns(projectId: string): Promise<ResearchRun[]> {
    return dataOf(await researchWorkflowListRuns({ path: { projectId }, throwOnError: true }));
  },
  async getRun(projectId: string, runId: string): Promise<ResearchRun> {
    return dataOf(await researchWorkflowGetRun({ path: { projectId, runId }, throwOnError: true }));
  },
  async listArtifacts(projectId: string): Promise<ResearchArtifact[]> {
    return dataOf(await researchWorkflowListArtifacts({ path: { projectId }, throwOnError: true }));
  },
  async startAgentRun(input: {
    projectId: string;
    stage: string;
    mode: ResearchRunMode;
    inputArtifactIds: string[];
    instructions: string;
  }): Promise<StartedResearchRun> {
    return dataOf(await researchWorkflowStartAgentRun({
      path: { projectId: input.projectId },
      body: {
        stage: input.stage,
        mode: input.mode,
        inputArtifactIds: input.inputArtifactIds,
        instructions: input.instructions,
      },
      throwOnError: true,
    }));
  },
  async cancelRun(projectId: string, runId: string): Promise<void> {
    await researchWorkflowCancelRun({ path: { projectId, runId }, throwOnError: true });
  },
};
