import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE_DB, type AppDatabase } from '../database/database.constants';
import {
  researchArtifacts,
  researchProjects,
  researchRuns,
} from '../database/schema';
import type {
  ResearchArtifact,
  ResearchArtifactRole,
  ResearchRunManifest,
  ResearchRunMode,
  ResearchRunStatus,
  ResearchStage,
} from './research-contracts';
import { moduleForStage } from './research-contracts';
import { ResearchPathsService } from './research-paths.service';
import { ResearchResultValidatorService } from './research-result-validator.service';

const ALLOWED_TRANSITIONS: Record<ResearchRunStatus, ResearchRunStatus[]> = {
  queued: ['running', 'cancelled', 'unavailable', 'failed'],
  running: [
    'waiting_for_approval',
    'waiting_for_input',
    'validating',
    'cancelled',
    'unavailable',
    'needs_credentials',
    'failed',
  ],
  waiting_for_approval: ['running', 'cancelled', 'unavailable', 'failed'],
  waiting_for_input: ['running', 'cancelled', 'unavailable', 'failed'],
  validating: ['completed', 'failed'],
  completed: [],
  failed: [],
  cancelled: [],
  unavailable: ['running', 'cancelled', 'failed'],
  needs_credentials: ['running', 'cancelled', 'failed'],
};

@Injectable()
export class ResearchWorkflowService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDatabase,
    private readonly paths: ResearchPathsService,
    private readonly resultValidator: ResearchResultValidatorService,
  ) {}

  async createProject(name: string) {
    const projectId = randomUUID();
    const rootPath = this.paths.project(projectId);
    const now = Date.now();
    await mkdir(join(rootPath, 'runs'), { recursive: true });
    await mkdir(join(rootPath, 'uploads'), { recursive: true });
    const row = { projectId, name, rootPath, createdAt: now, updatedAt: now };
    this.db.insert(researchProjects).values(row).run();
    await this.atomicJson(join(rootPath, 'project.json'), {
      schemaVersion: 1,
      projectId,
      name,
      createdAt: new Date(now).toISOString(),
    });
    return this.publicProject(row);
  }

  listProjects() {
    return this.db
      .select()
      .from(researchProjects)
      .orderBy(desc(researchProjects.updatedAt))
      .all()
      .map((row) => this.publicProject(row));
  }

  getProject(projectId: string) {
    const row = this.db
      .select()
      .from(researchProjects)
      .where(eq(researchProjects.projectId, projectId))
      .get();
    if (!row) throw new NotFoundException('Research project not found');
    return this.publicProject(row);
  }

  async createRun(
    projectId: string,
    stage: ResearchStage,
    mode: ResearchRunMode,
    inputArtifactIds: string[] = [],
    retryOfRunId: string | null = null,
  ) {
    this.getProject(projectId);
    const inputs = inputArtifactIds.map((artifactId) => {
      const artifact = this.db
        .select()
        .from(researchArtifacts)
        .where(eq(researchArtifacts.artifactId, artifactId))
        .get();
      if (!artifact || artifact.projectId !== projectId)
        throw new NotFoundException(`Input artifact not found: ${artifactId}`);
      return {
        artifactId,
        producerRunId: artifact.runId,
        role: artifact.role as ResearchArtifactRole,
        sha256: artifact.sha256,
      };
    });
    const runId = randomUUID();
    const now = Date.now();
    const manifestPath = this.paths.relativeToProject(
      projectId,
      this.paths.manifest(projectId, runId),
    );
    const row = {
      runId,
      projectId,
      module: moduleForStage(stage),
      stage,
      status: 'queued',
      mode,
      manifestPath,
      retryOfRunId,
      createdAt: now,
      updatedAt: now,
    };
    await mkdir(this.paths.temp(projectId, runId), { recursive: true });
    await mkdir(this.paths.artifacts(projectId, runId), { recursive: true });
    this.db.insert(researchRuns).values(row).run();
    await this.writeManifest({
      schemaVersion: 1,
      projectId,
      runId,
      module: row.module,
      stage,
      status: 'queued',
      mode,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      inputs,
      artifacts: [],
      warnings: [],
      errors: [],
      provenance: {},
    });
    return row;
  }

  getRun(runId: string) {
    const row = this.db
      .select()
      .from(researchRuns)
      .where(eq(researchRuns.runId, runId))
      .get();
    if (!row) throw new NotFoundException('Research run not found');
    return row;
  }

  async retryRun(runId: string) {
    const previous = this.getRun(runId);
    const manifest = await this.readManifest(previous.projectId, runId);
    return this.createRun(
      previous.projectId,
      previous.stage as ResearchStage,
      previous.mode as ResearchRunMode,
      manifest.inputs.map((input) => input.artifactId),
      runId,
    );
  }

  async transitionRun(
    runId: string,
    next: ResearchRunStatus,
    options: {
      warning?: string;
      error?: { code: string; message: string };
      provenance?: Record<string, unknown>;
    } = {},
  ) {
    const run = this.getRun(runId);
    const current = run.status as ResearchRunStatus;
    if (!ALLOWED_TRANSITIONS[current]?.includes(next)) {
      throw new Error(`Invalid research run transition: ${current} -> ${next}`);
    }
    const now = Date.now();
    const manifest = await this.readManifest(run.projectId, runId);
    await this.writeManifest({
      ...manifest,
      status: next,
      updatedAt: new Date(now).toISOString(),
      warnings: options.warning
        ? [...manifest.warnings, options.warning]
        : manifest.warnings,
      errors: options.error
        ? [...manifest.errors, options.error]
        : manifest.errors,
      provenance: { ...manifest.provenance, ...options.provenance },
    });
    this.db
      .update(researchRuns)
      .set({ status: next, updatedAt: now })
      .where(eq(researchRuns.runId, runId))
      .run();
    return { ...run, status: next, updatedAt: now };
  }

  async finalizeAgentResult(runId: string): Promise<ResearchArtifact[]> {
    const run = this.getRun(runId);
    if (run.status !== 'running') {
      throw new Error('Only a running research run can be finalized');
    }
    await this.transitionRun(runId, 'validating');
    try {
      const validated = await this.resultValidator.validate(
        run.projectId,
        runId,
        run.stage as ResearchStage,
      );
      const artifacts: ResearchArtifact[] = [];
      for (const output of validated.outputs) {
        artifacts.push(
          await this.createArtifact(
            runId,
            output.role,
            basename(output.path),
            output.mediaType,
            await readFile(output.absolutePath),
            output.simulated,
            output.metadata,
          ),
        );
      }
      await this.transitionRun(runId, 'completed', {
        provenance: { resultSchemaVersion: validated.result.schemaVersion },
        ...(validated.result.warnings.length > 0 && {
          warning: validated.result.warnings.join('\n'),
        }),
      });
      return artifacts;
    } catch (error) {
      await this.transitionRun(runId, 'failed', {
        error: {
          code: 'RESULT_VALIDATION_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  listRuns(projectId: string) {
    this.getProject(projectId);
    return this.db
      .select()
      .from(researchRuns)
      .where(eq(researchRuns.projectId, projectId))
      .orderBy(desc(researchRuns.createdAt))
      .all();
  }

  listArtifacts(projectId: string) {
    this.getProject(projectId);
    return this.db
      .select()
      .from(researchArtifacts)
      .where(eq(researchArtifacts.projectId, projectId))
      .orderBy(desc(researchArtifacts.createdAt))
      .all()
      .map((row) => this.publicArtifact(row));
  }

  getArtifact(projectId: string, artifactId: string) {
    const row = this.db
      .select()
      .from(researchArtifacts)
      .where(eq(researchArtifacts.artifactId, artifactId))
      .get();
    if (!row || row.projectId !== projectId)
      throw new NotFoundException('Research artifact not found');
    return this.publicArtifact(row);
  }

  async createArtifact(
    runId: string,
    role: ResearchArtifactRole,
    name: string,
    mediaType: string,
    content: Buffer | string,
    simulated: boolean,
    metadata?: Record<string, unknown>,
  ): Promise<ResearchArtifact> {
    const run = this.getRun(runId);
    const safeName = basename(name);
    if (!safeName || safeName !== name || name === '.' || name === '..')
      throw new Error('Invalid artifact name');
    const artifactId = randomUUID();
    const bytes = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content, 'utf8');
    const finalPath = join(
      this.paths.artifacts(run.projectId, runId),
      `${artifactId}-${safeName}`,
    );
    const tempPath = join(
      this.paths.temp(run.projectId, runId),
      `${artifactId}.part`,
    );
    await writeFile(tempPath, bytes, { flag: 'wx' });
    await rename(tempPath, finalPath);
    const createdAt = Date.now();
    const row = {
      artifactId,
      projectId: run.projectId,
      runId,
      role,
      name: safeName,
      path: this.paths.relativeToProject(run.projectId, finalPath),
      mediaType,
      size: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      simulated,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
      createdAt,
    };
    this.db.insert(researchArtifacts).values(row).run();
    const artifact: ResearchArtifact = {
      artifactId: row.artifactId,
      projectId: row.projectId,
      runId: row.runId,
      role,
      name: row.name,
      path: row.path,
      mediaType: row.mediaType,
      size: row.size,
      sha256: row.sha256,
      simulated,
      ...(metadata && { metadata }),
      createdAt: new Date(createdAt).toISOString(),
    };
    const manifest = await this.readManifest(run.projectId, runId);
    await this.writeManifest({
      ...manifest,
      updatedAt: new Date(createdAt).toISOString(),
      artifacts: [...manifest.artifacts, artifact],
    });
    return artifact;
  }

  artifactAbsolutePath(projectId: string, artifactId: string): string {
    return this.paths.resolveProjectRelative(
      projectId,
      this.getArtifact(projectId, artifactId).path,
    );
  }

  private async writeManifest(manifest: ResearchRunManifest): Promise<void> {
    await this.atomicJson(
      this.paths.manifest(manifest.projectId, manifest.runId),
      manifest,
    );
  }

  async readManifest(
    projectId: string,
    runId: string,
  ): Promise<ResearchRunManifest> {
    const value = JSON.parse(
      await readFile(this.paths.manifest(projectId, runId), 'utf8'),
    ) as ResearchRunManifest;
    if (value.projectId !== projectId || value.runId !== runId) {
      throw new Error('Research manifest identity mismatch');
    }
    return value;
  }

  private async atomicJson(path: string, value: unknown): Promise<void> {
    const temp = `${path}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(value, null, 2), {
      encoding: 'utf8',
      flag: 'wx',
    });
    await rename(temp, path);
  }

  private publicProject(row: typeof researchProjects.$inferSelect) {
    return {
      projectId: row.projectId,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private publicArtifact(row: typeof researchArtifacts.$inferSelect) {
    let metadata: Record<string, unknown> | undefined;
    if (row.metadataJson) {
      try {
        metadata = JSON.parse(row.metadataJson) as Record<string, unknown>;
      } catch {
        metadata = { invalidMetadata: true };
      }
    }
    const { metadataJson: _metadataJson, ...artifact } = row;
    void _metadataJson;
    return { ...artifact, ...(metadata && { metadata }) };
  }
}
