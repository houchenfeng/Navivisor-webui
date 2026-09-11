import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
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
  ResearchStage,
} from './research-contracts';
import { moduleForStage } from './research-contracts';
import { ResearchPathsService } from './research-paths.service';

@Injectable()
export class ResearchWorkflowService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDatabase,
    private readonly paths: ResearchPathsService,
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
      retryOfRunId: null,
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
      .all();
  }

  getArtifact(projectId: string, artifactId: string) {
    const row = this.db
      .select()
      .from(researchArtifacts)
      .where(eq(researchArtifacts.artifactId, artifactId))
      .get();
    if (!row || row.projectId !== projectId)
      throw new NotFoundException('Research artifact not found');
    return row;
  }

  async createArtifact(
    runId: string,
    role: ResearchArtifactRole,
    name: string,
    mediaType: string,
    content: Buffer | string,
    simulated: boolean,
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
      createdAt,
    };
    this.db.insert(researchArtifacts).values(row).run();
    return {
      ...row,
      createdAt: new Date(createdAt).toISOString(),
    } as ResearchArtifact;
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

  private async atomicJson(path: string, value: unknown): Promise<void> {
    const temp = `${path}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(value, null, 2), {
      encoding: 'utf8',
      flag: 'wx',
    });
    await rename(temp, path);
  }

  private publicProject(row: typeof researchProjects.$inferSelect) {
    const { rootPath: _rootPath, ...project } = row;
    return project;
  }
}
