import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE_DB, type AppDatabase } from '../database/database.constants';
import { researchAgentSessions } from '../database/schema';
import { ThreadsService } from '../threads/threads.service';
import type { ResearchModule } from './research-contracts';
import { ResearchPathsService } from './research-paths.service';
import { ResearchWorkflowService } from './research-workflow.service';

@Injectable()
export class ResearchAgentSessionService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDatabase,
    private readonly paths: ResearchPathsService,
    private readonly threads: ThreadsService,
    private readonly workflow: ResearchWorkflowService,
  ) {}

  async getOrCreate(projectId: string, module: ResearchModule) {
    const existing = this.db
      .select()
      .from(researchAgentSessions)
      .where(
        and(
          eq(researchAgentSessions.projectId, projectId),
          eq(researchAgentSessions.module, module),
        ),
      )
      .get();
    if (existing) return existing;

    const project = this.workflow.getProject(projectId);
    const cwd = this.paths.project(projectId);
    const response = await this.threads.startThread({
      cwd,
      serviceName: 'research-workflow',
    });
    await this.threads.setThreadName(
      response.thread.id,
      `${project.name} · ${module}`,
    );
    const now = Date.now();
    const row = {
      sessionId: randomUUID(),
      projectId,
      module,
      threadId: response.thread.id,
      cwd,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(researchAgentSessions).values(row).run();
    return row;
  }
}
