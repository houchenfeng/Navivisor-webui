import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { CodexProcessManager } from '../codex/codex-process-manager.service';
import type { ServerNotification } from '../codex/codex-schema';
import { DRIZZLE_DB, type AppDatabase } from '../database/database.constants';
import { researchAgentInvocations, researchRuns } from '../database/schema';
import { ResearchWorkflowService } from './research-workflow.service';

@Injectable()
export class ResearchRunEventsService implements OnModuleInit {
  private readonly logger = new Logger(ResearchRunEventsService.name);

  constructor(
    private readonly processManager: CodexProcessManager,
    @Inject(DRIZZLE_DB) private readonly db: AppDatabase,
    private readonly workflow: ResearchWorkflowService,
  ) {}

  onModuleInit(): void {
    this.processManager.addListener(
      'notification',
      (notification: ServerNotification) => {
        if (notification.method === 'turn/completed') {
          void this.handleTurnCompleted(
            notification.params.threadId,
            notification.params.turn.id,
            notification.params.turn.status,
            notification.params.turn.error,
          );
        }
      },
    );
    this.processManager.addLifecycleListener((event) => {
      if (event.type === 'appServerUnavailable') {
        void this.markActiveRunsUnavailable(event.message);
      }
    });
  }

  private async handleTurnCompleted(
    threadId: string,
    turnId: string,
    status: 'completed' | 'interrupted' | 'failed' | 'inProgress',
    error: unknown,
  ): Promise<void> {
    const invocation = this.db
      .select()
      .from(researchAgentInvocations)
      .where(
        and(
          eq(researchAgentInvocations.threadId, threadId),
          eq(researchAgentInvocations.turnId, turnId),
        ),
      )
      .get();
    if (!invocation) return;
    const run = this.workflow.getRun(invocation.runId);
    if (run.status !== 'running') return;
    try {
      if (status === 'completed') {
        await this.workflow.finalizeAgentResult(run.runId);
      } else if (status === 'interrupted') {
        await this.workflow.transitionRun(run.runId, 'cancelled');
      } else {
        await this.workflow.transitionRun(run.runId, 'failed', {
          error: {
            code: 'CODEX_TURN_FAILED',
            message: this.errorMessage(error),
          },
        });
      }
    } catch (caught) {
      this.logger.warn(
        `Could not complete research run ${run.runId}: ${this.errorMessage(caught)}`,
      );
    }
  }

  private async markActiveRunsUnavailable(message: string): Promise<void> {
    const active = this.db
      .select()
      .from(researchRuns)
      .where(
        inArray(researchRuns.status, [
          'running',
          'waiting_for_approval',
          'waiting_for_input',
        ]),
      )
      .all();
    for (const run of active) {
      try {
        await this.workflow.transitionRun(run.runId, 'unavailable', {
          warning: message,
        });
      } catch (error) {
        this.logger.warn(
          `Could not mark research run ${run.runId} unavailable: ${this.errorMessage(error)}`,
        );
      }
    }
  }

  private errorMessage(value: unknown): string {
    if (value instanceof Error) return value.message;
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return 'Unknown Codex turn error';
    }
  }
}
