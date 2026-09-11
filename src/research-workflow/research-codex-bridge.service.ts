import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB, type AppDatabase } from '../database/database.constants';
import { researchAgentInvocations, researchRuns } from '../database/schema';
import { ThreadsService } from '../threads/threads.service';
import type { ResearchRunMode, ResearchStage } from './research-contracts';
import { ResearchAgentSessionService } from './research-agent-session.service';
import { ResearchPathsService } from './research-paths.service';
import { ResearchSkillRegistryService } from './research-skill-registry.service';
import { ResearchWorkflowService } from './research-workflow.service';

const PROMPT_VERSION = 'research-run/v1';

export interface StartResearchAgentRunOptions {
  projectId: string;
  stage: ResearchStage;
  mode: ResearchRunMode;
  inputArtifactIds?: string[];
  instructions: string;
  model?: string;
  effort?: 'low' | 'medium' | 'high' | 'xhigh';
}

@Injectable()
export class ResearchCodexBridgeService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDatabase,
    private readonly paths: ResearchPathsService,
    private readonly sessions: ResearchAgentSessionService,
    private readonly skills: ResearchSkillRegistryService,
    private readonly threads: ThreadsService,
    private readonly workflow: ResearchWorkflowService,
  ) {}

  async start(options: StartResearchAgentRunOptions) {
    const run = await this.workflow.createRun(
      options.projectId,
      options.stage,
      options.mode,
      options.inputArtifactIds,
    );
    const session = await this.sessions.getOrCreate(
      options.projectId,
      run.module,
    );
    const skill = await this.skills.resolveForStage(session.cwd, options.stage);
    const prompt = this.buildPrompt(run.runId, options);

    try {
      const response = await this.threads.startTurn({
        threadId: session.threadId,
        cwd: session.cwd,
        model: options.model,
        effort: options.effort,
        turnTrigger: 'research-workflow',
        input: [
          {
            type: 'text',
            text: `$${skill.name}\n\n${prompt}`,
            text_elements: [],
          },
          { type: 'skill', name: skill.name, path: String(skill.path) },
        ],
      });
      const now = Date.now();
      this.db
        .insert(researchAgentInvocations)
        .values({
          runId: run.runId,
          sessionId: session.sessionId,
          threadId: session.threadId,
          turnId: response.turn.id,
          model: options.model ?? null,
          effort: options.effort ?? null,
          serviceTier: null,
          skillName: skill.name,
          skillPath: String(skill.path),
          skillSha256: skill.sha256,
          promptVersion: PROMPT_VERSION,
          createdAt: now,
        })
        .run();
      this.db
        .update(researchRuns)
        .set({ status: 'running', updatedAt: now })
        .where(eq(researchRuns.runId, run.runId))
        .run();
      return {
        runId: run.runId,
        threadId: session.threadId,
        turnId: response.turn.id,
      };
    } catch (error) {
      this.db
        .update(researchRuns)
        .set({ status: 'failed', updatedAt: Date.now() })
        .where(eq(researchRuns.runId, run.runId))
        .run();
      throw error;
    }
  }

  private buildPrompt(
    runId: string,
    options: StartResearchAgentRunOptions,
  ): string {
    const inputIds = options.inputArtifactIds ?? [];
    return [
      `Prompt contract: ${PROMPT_VERSION}`,
      `Project ID: ${options.projectId}`,
      `Run ID: ${runId}`,
      `Stage: ${options.stage}`,
      `Mode: ${options.mode}`,
      `Input artifact IDs: ${inputIds.join(', ') || '(none)'}`,
      `Temporary output directory: ${this.paths.temp(options.projectId, runId)}`,
      'Write result.json and all declared outputs only in that temporary directory.',
      'Do not finalize artifacts; the workflow service validates and moves them.',
      '',
      options.instructions,
    ].join('\n');
  }
}
