import { Inject, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DRIZZLE_DB, type AppDatabase } from '../database/database.constants';
import { eq } from 'drizzle-orm';
import { researchAgentInvocations } from '../database/schema';
import { ThreadsService } from '../threads/threads.service';
import type { ResearchRunMode, ResearchStage } from './research-contracts';
import { ResearchAgentSessionService } from './research-agent-session.service';
import { ResearchPathsService } from './research-paths.service';
import { ResearchSkillRegistryService } from './research-skill-registry.service';
import { ResearchWorkflowService } from './research-workflow.service';

const PROMPT_VERSION = 'research-run/v2';

export interface StartResearchAgentRunOptions {
  projectId: string;
  stage: ResearchStage;
  mode: ResearchRunMode;
  inputArtifactIds?: string[];
  instructions: string;
  model?: string;
  effort?: 'low' | 'medium' | 'high' | 'xhigh';
  retryOfRunId?: string;
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
      options.retryOfRunId ?? null,
    );
    const session = await this.sessions.getOrCreate(
      options.projectId,
      run.module,
    );
    const skill = await this.skills.resolveForStage(session.cwd, options.stage);
    const prompt = await this.buildPrompt(run.runId, options);

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
      await this.workflow.transitionRun(run.runId, 'running', {
        provenance: {
          threadId: session.threadId,
          turnId: response.turn.id,
          model: options.model ?? null,
          effort: options.effort ?? null,
          skillName: skill.name,
          skillPath: String(skill.path),
          skillSha256: skill.sha256,
          promptVersion: PROMPT_VERSION,
        },
      });
      return {
        runId: run.runId,
        threadId: session.threadId,
        turnId: response.turn.id,
      };
    } catch (error) {
      await this.workflow.transitionRun(run.runId, 'failed', {
        error: {
          code: 'CODEX_TURN_START_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  async cancel(runId: string): Promise<void> {
    const run = this.workflow.getRun(runId);
    if (
      ![
        'queued',
        'running',
        'waiting_for_approval',
        'waiting_for_input',
      ].includes(run.status)
    ) {
      throw new Error(`Research run cannot be cancelled from ${run.status}`);
    }
    const invocation = this.db
      .select()
      .from(researchAgentInvocations)
      .where(eq(researchAgentInvocations.runId, runId))
      .get();
    if (invocation && run.status !== 'queued') {
      await this.threads.interruptTurn(invocation.threadId, invocation.turnId);
    }
    await this.workflow.transitionRun(runId, 'cancelled');
  }

  async retry(
    runId: string,
    instructions: string,
    overrides: Pick<StartResearchAgentRunOptions, 'model' | 'effort'> = {},
  ) {
    const previous = this.workflow.getRun(runId);
    const manifest = await this.workflow.readManifest(
      previous.projectId,
      runId,
    );
    return this.start({
      projectId: previous.projectId,
      stage: previous.stage as ResearchStage,
      mode: previous.mode as ResearchRunMode,
      inputArtifactIds: manifest.inputs.map((input) => input.artifactId),
      instructions,
      retryOfRunId: runId,
      ...overrides,
    });
  }

  private async buildPrompt(
    runId: string,
    options: StartResearchAgentRunOptions,
  ): Promise<string> {
    const inputIds = options.inputArtifactIds ?? [];
    const inputs: Array<Record<string, unknown>> = [];
    for (const artifactId of inputIds) {
      try {
        const artifact = this.workflow.getArtifact(
          options.projectId,
          artifactId,
        );
        inputs.push({
          artifactId: artifact.artifactId,
          role: artifact.role,
          name: artifact.name,
          path: artifact.path,
          sha256: artifact.sha256,
          simulated: artifact.simulated,
          absolutePath: this.workflow.artifactAbsolutePath(
            options.projectId,
            artifactId,
          ),
        });
      } catch {
        inputs.push({ artifactId, missing: true });
      }
    }
    const contextPath = this.paths.context(options.projectId, runId);
    await mkdir(dirname(contextPath), { recursive: true });
    await writeFile(
      contextPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          projectId: options.projectId,
          runId,
          stage: options.stage,
          mode: options.mode,
          inputs,
          writtenAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );

    return [
      `Prompt contract: ${PROMPT_VERSION}`,
      `Project ID: ${options.projectId}`,
      `Run ID: ${runId}`,
      `Stage: ${options.stage}`,
      `Mode: ${options.mode}`,
      `Persisted input manifest: ${contextPath}`,
      `Input artifact IDs: ${inputIds.join(', ') || '(none)'}`,
      'Read only the files listed in the persisted input manifest for this project.',
      'Do not read other research projects or invent artifact contents.',
      `Temporary output directory: ${this.paths.temp(options.projectId, runId)}`,
      'Write result.json and all declared outputs only in that temporary directory.',
      'Do not finalize artifacts; the workflow service validates and moves them.',
      '',
      options.instructions,
    ].join('\n');
  }
}
