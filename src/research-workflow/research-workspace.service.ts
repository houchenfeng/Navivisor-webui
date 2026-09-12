import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB, type AppDatabase } from '../database/database.constants';
import {
  researchArtifacts,
  researchProjects,
  researchRuns,
} from '../database/schema';
import { FilesService } from '../files/files.service';
import type {
  PortableProjectIndex,
  ResearchArtifactRole,
  ResearchModule,
  ResearchRunMode,
  ResearchStage,
  ResearchUiEvent,
  WorkspaceProjectJson,
  DemoManifestV3,
  DemoManifestMissing,
} from './research-contracts';
import {
  RESEARCH_MODULES,
  isResearchArtifactRole,
  isResearchStage,
  moduleForStage,
} from './research-contracts';
import { ResearchPathsService } from './research-paths.service';
import { validateFileForRole } from './research-result-validator.service';
import { ResearchWorkflowService } from './research-workflow.service';

const DEFAULT_DIRS: Record<ResearchModule, string> = {
  topic: 'topic',
  experiment: 'experiment',
  writing: 'writing',
  submission: 'submission',
};

export interface RegisterWorkspaceInput {
  absolutePath: string;
  title?: string;
  directories?: Partial<Record<ResearchModule, string>>;
  createIfMissing?: boolean;
}

export interface DemoManifestNodeFile {
  key: string;
  path: string;
  role: ResearchArtifactRole;
  mediaType: string;
  sha256: string;
  placeholder?: boolean;
  required?: boolean;
}

export interface DemoManifestNode {
  key: string;
  stage: ResearchStage;
  files: DemoManifestNodeFile[];
  inputs: string[];
}

export interface DemoManifestV2 {
  schemaVersion: 2;
  demoId: string;
  version: string;
  simulated: boolean;
  nodes: DemoManifestNode[];
  missing: string[];
}
type DemoManifest = DemoManifestV2 | DemoManifestV3;

export interface LoadDemoResult {
  projectId: string;
  demoId: string;
  version: string;
  manifestSha256: string;
  idempotent: boolean;
  complete: boolean;
  loadedFiles: number;
  missing: string[];
  runIds: string[];
  warnings: string[];
}

const DEMO_DEFINITIONS = [
  { id: 'camera-vad-scene-memory', packageDir: 'camera-vad-scene-memory' },
  { id: 'evivad-surveillance-demo', packageDir: 'evivad-surveillance-demo' },
] as const;

@Injectable()
export class ResearchWorkspaceService {
  private readonly demoLoads = new Map<string, Promise<LoadDemoResult>>();
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDatabase,
    private readonly paths: ResearchPathsService,
    private readonly files: FilesService,
    private readonly workflow: ResearchWorkflowService,
  ) {}

  async listDemoDefinitions() {
    return Promise.all(
      DEMO_DEFINITIONS.map(async (definition) => {
        const packageRoot = this.demoPackageRoot(definition.packageDir);
        const project = JSON.parse(
          await readFile(join(packageRoot, 'project.json'), 'utf8'),
        ) as WorkspaceProjectJson;
        const manifest = this.parseDemoManifest(
          JSON.parse(
            await readFile(
              join(packageRoot, 'demo', 'demo-manifest.json'),
              'utf8',
            ),
          ) as unknown,
        );
        const missing = this.normalizeManifestMissing(manifest);
          return {
            id: definition.id,
            rootPath: packageRoot,
          title: project.title,
          description: project.description ?? '',
          version: manifest.version,
          simulated: manifest.simulated,
          complete: missing.length === 0,
          missing,
        };
      }),
    );
  }

  async activateDemo(demoId: string, absolutePath?: string) {
    const definition = DEMO_DEFINITIONS.find((item) => item.id === demoId);
    if (!definition) throw new NotFoundException('Unknown Demo package');
    const sourceRoot = this.demoPackageRoot(definition.packageDir);
    if (absolutePath && resolve(absolutePath) !== resolve(sourceRoot)) {
      throw new BadRequestException(
        'Demo path does not match the selected registered package',
      );
    }
    const sourceManifest = await readFile(
      join(sourceRoot, 'demo', 'demo-manifest.json'),
    );
    const packageRevision = sha256Buffer(sourceManifest).slice(0, 12);
    const destination = join(
      this.paths.managedRoot,
      'demo-workspaces',
      `${definition.id}-${packageRevision}`,
    );
    try {
      const info = await stat(destination);
      if (!info.isDirectory()) {
        throw new ConflictException(
          'Managed Demo destination is not a directory',
        );
      }
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const staging = `${destination}.staging-${randomUUID()}`;
      await mkdir(dirname(destination), { recursive: true });
      try {
        await cp(sourceRoot, staging, { recursive: true, errorOnExist: true });
        const projectPath = join(staging, 'project.json');
        const project = JSON.parse(
          await readFile(projectPath, 'utf8'),
        ) as WorkspaceProjectJson;
        project.projectId = randomUUID();
        project.createdAt = new Date().toISOString();
        await this.atomicJson(projectPath, project);
        await rename(staging, destination);
      } catch (error) {
        await rm(staging, { recursive: true, force: true });
        try {
          const concurrent = await stat(destination);
          if (!concurrent.isDirectory()) throw error;
        } catch {
          throw error;
        }
      }
    }
    const workspace = await this.registerWorkspace({
      absolutePath: destination,
      createIfMissing: false,
    });
    const load = await this.loadDemoFromWorkspace(workspace.projectId);
    return { workspace: await this.getWorkspace(workspace.projectId), load };
  }

  async registerWorkspace(input: RegisterWorkspaceInput) {
    const absolutePath = await this.assertAllowedDirectory(
      input.absolutePath,
      input.createIfMissing ?? true,
    );
    const existing = this.db
      .select()
      .from(researchProjects)
      .where(eq(researchProjects.rootPath, absolutePath))
      .get();
    if (existing) {
      this.paths.bind(existing.projectId, existing.rootPath);
      return {
        ...(await this.getWorkspace(existing.projectId)),
        reused: true as const,
      };
    }

    const projectJsonPath = join(absolutePath, 'project.json');
    let projectJson: WorkspaceProjectJson | null = null;
    try {
      projectJson = JSON.parse(
        await readFile(projectJsonPath, 'utf8'),
      ) as WorkspaceProjectJson;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new BadRequestException(
          'project.json is invalid; original file was preserved',
        );
      }
    }
    if (projectJson) this.assertProjectJson(projectJson);

    let projectId = projectJson?.projectId;
    if (projectId) {
      const conflict = this.db
        .select()
        .from(researchProjects)
        .where(eq(researchProjects.projectId, projectId))
        .get();
      if (conflict && conflict.rootPath !== absolutePath) {
        throw new ConflictException(
          'project.json projectId already registered at another path; choose Move original or Copy as new project',
        );
      }
    } else {
      projectId = randomUUID();
    }

    const title =
      input.title?.trim() ||
      projectJson?.title ||
      basename(absolutePath) ||
      'Untitled research paper';
    const directories = {
      ...DEFAULT_DIRS,
      ...projectJson?.directories,
      ...input.directories,
    };
    this.assertRelativeDirs(directories);

    const now = Date.now();
    this.paths.bind(projectId, absolutePath);
    await this.ensureWorkspaceLayout(projectId, directories);

    const written: WorkspaceProjectJson = {
      schemaVersion: 2,
      projectId,
      title,
      description: projectJson?.description ?? '',
      language: projectJson?.language ?? 'zh-CN',
      directories,
      ...(projectJson?.demo ? { demo: projectJson.demo } : {}),
      createdAt: projectJson?.createdAt ?? new Date(now).toISOString(),
    };
    await this.atomicJson(projectJsonPath, written);

    const byId = this.db
      .select()
      .from(researchProjects)
      .where(eq(researchProjects.projectId, projectId))
      .get();
    if (!byId) {
      this.db
        .insert(researchProjects)
        .values({
          projectId,
          name: title,
          rootPath: absolutePath,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    } else {
      this.db
        .update(researchProjects)
        .set({ name: title, rootPath: absolutePath, updatedAt: now })
        .where(eq(researchProjects.projectId, projectId))
        .run();
    }

    await this.rebuildPortableIndex(projectId);
    return {
      ...(await this.getWorkspace(projectId)),
      reused: false as const,
    };
  }

  async getWorkspace(projectId: string) {
    const row = this.requireProject(projectId);
    this.paths.bind(row.projectId, row.rootPath);
    await this.recoverIncompleteDemoLoads(projectId);
    const projectJson = await this.readProjectJson(projectId);
    const index = await this.readOrRebuildIndex(projectId);
    return {
      projectId: row.projectId,
      name: row.name,
      title: projectJson.title,
      description: projectJson.description ?? '',
      rootPath: row.rootPath,
      directories: projectJson.directories,
      demo: projectJson.demo ?? null,
      index,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async scanWorkspace(projectId: string) {
    const workspace = await this.getWorkspace(projectId);
    const index = await this.rebuildPortableIndex(projectId);
    const recognized: string[] = [];
    const externalModified: string[] = [];
    for (const module of RESEARCH_MODULES) {
      for (const file of index.modules[module].currentFiles) {
        recognized.push(file.path);
        if (file.externalModified) externalModified.push(file.path);
      }
    }
    return {
      projectId,
      rootPath: workspace.rootPath,
      recognized,
      externalModified,
      missingDemo: index.demo?.missing ?? [],
      index,
    };
  }

  /**
   * Read UI conversation cards from `.navivisor/conversations/ui-events.jsonl`.
   * Dedupes by eventId (keeps earliest), returns chronological ascending pages.
   */
  async listUiEvents(
    projectId: string,
    options?: { limit?: number; before?: string },
  ): Promise<{ events: ResearchUiEvent[]; nextBefore?: string }> {
    this.requireProject(projectId);
    const path = join(
      this.paths.conversationsDir(projectId),
      'ui-events.jsonl',
    );
    let raw = '';
    try {
      raw = await readFile(path, 'utf8');
    } catch {
      return { events: [] };
    }

    const seen = new Set<string>();
    const events: ResearchUiEvent[] = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (!parsed || typeof parsed !== 'object') continue;
      const row = parsed as Record<string, unknown>;
      const eventId = typeof row.eventId === 'string' ? row.eventId.trim() : '';
      const summary = typeof row.summary === 'string' ? row.summary.trim() : '';
      const kind = typeof row.kind === 'string' ? row.kind.trim() : '';
      const createdAt =
        typeof row.createdAt === 'string' && row.createdAt
          ? row.createdAt
          : new Date(0).toISOString();
      if (!eventId || !summary || !kind) continue;
      if (seen.has(eventId)) continue;
      seen.add(eventId);

      const event: ResearchUiEvent = {
        eventId,
        projectId:
          typeof row.projectId === 'string' && row.projectId
            ? row.projectId
            : projectId,
        kind,
        summary,
        createdAt,
      };
      if (typeof row.module === 'string' && row.module) {
        event.module = row.module;
      }
      if (Array.isArray(row.artifactIds)) {
        event.artifactIds = row.artifactIds.filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        );
      }
      if (typeof row.runId === 'string' && row.runId) {
        event.runId = row.runId;
      }
      events.push(event);
    }

    events.sort((a, b) => {
      const byTime = a.createdAt.localeCompare(b.createdAt);
      if (byTime !== 0) return byTime;
      return a.eventId.localeCompare(b.eventId);
    });

    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
    const before = options?.before?.trim();
    let endExclusive = events.length;
    if (before) {
      const byIdOrTime = events.findIndex(
        (event) => event.eventId === before || event.createdAt === before,
      );
      if (byIdOrTime >= 0) {
        endExclusive = byIdOrTime;
      } else {
        const byThreshold = events.findIndex(
          (event) => event.createdAt >= before,
        );
        endExclusive = byThreshold >= 0 ? byThreshold : events.length;
      }
    }

    const start = Math.max(0, endExclusive - limit);
    const page = events.slice(start, endExclusive);
    const nextBefore =
      start > 0 ? (page[0]?.createdAt ?? page[0]?.eventId) : undefined;
    return nextBefore ? { events: page, nextBefore } : { events: page };
  }

  async saveVersion(
    projectId: string,
    relativePath: string,
    role: ResearchArtifactRole,
    options: {
      stage: ResearchStage;
      mode?: ResearchRunMode;
      simulated?: boolean;
    },
  ) {
    this.requireProject(projectId);
    if (!isResearchStage(options.stage) || !isResearchArtifactRole(role)) {
      throw new BadRequestException('Invalid stage or role');
    }
    const absolute = this.paths.resolveProjectRelative(projectId, relativePath);
    const bytes = await readFile(absolute);
    validateFileForRole(role, guessMediaType(relativePath), bytes);
    const run = await this.workflow.createRun(
      projectId,
      options.stage,
      options.mode ?? 'simulated',
    );
    await this.workflow.transitionRun(run.runId, 'running');
    const artifact = await this.workflow.createArtifact(
      run.runId,
      role,
      basename(relativePath),
      guessMediaType(relativePath),
      bytes,
      options.simulated ?? options.mode === 'simulated',
      { sourcePath: relativePath.replaceAll('\\', '/') },
    );
    // Project current-file projection: keep user-facing file, snapshot already stored.
    await this.workflow.transitionRun(run.runId, 'validating');
    await this.workflow.transitionRun(run.runId, 'completed', {
      provenance: { saveVersion: true, sourcePath: relativePath },
    });
    await this.publishCurrentProjection(
      projectId,
      relativePath.replaceAll('\\', '/'),
      artifact.artifactId,
    );
    await this.rebuildPortableIndex(projectId);
    await this.appendConversationCard(projectId, {
      eventId: randomUUID(),
      projectId,
      kind: 'ui.save',
      module: moduleForStage(options.stage),
      summary: `已保存版本：${relativePath.replaceAll('\\', '/')}`,
      artifactIds: [artifact.artifactId],
      runId: run.runId,
      createdAt: new Date().toISOString(),
    });
    return artifact;
  }

  async loadDemoFromWorkspace(projectId: string): Promise<LoadDemoResult> {
    const active = this.demoLoads.get(projectId);
    if (active) return active;
    const operation = this.loadDemoUnlocked(projectId).finally(() => {
      if (this.demoLoads.get(projectId) === operation)
        this.demoLoads.delete(projectId);
    });
    this.demoLoads.set(projectId, operation);
    return operation;
  }

  private async loadDemoUnlocked(projectId: string): Promise<LoadDemoResult> {
    const workspace = await this.getWorkspace(projectId);
    const manifestPath = join(workspace.rootPath, 'demo', 'demo-manifest.json');
    let raw: string;
    try {
      raw = await readFile(manifestPath, 'utf8');
    } catch {
      throw new NotFoundException(
        'demo/demo-manifest.json not found in workspace',
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('demo-manifest.json is not valid JSON');
    }
    const manifest = this.parseDemoManifest(parsed);
    const manifestSha256 = sha256Buffer(Buffer.from(raw, 'utf8'));
    const index = await this.readOrRebuildIndex(projectId);
    if (
      index.demo &&
      index.demo.demoId === manifest.demoId &&
      index.demo.version === manifest.version &&
      index.demo.manifestSha256 === manifestSha256 &&
      (await this.manifestFilesStillMatch(projectId, manifest))
    ) {
      return {
        projectId,
        demoId: manifest.demoId,
        version: manifest.version,
        manifestSha256,
        idempotent: true,
        complete: index.demo.complete,
        loadedFiles: index.artifacts.length,
        missing: index.demo.missing.map((item) =>
          typeof item === 'string' ? item : item.path,
        ),
        runIds: index.runs.map((r) => r.runId),
        warnings: ['Demo already loaded with identical manifest hash'],
      };
    }

    const orderedNodes = this.validateAndSortManifest(manifest);
    const warnings: string[] = [];
    const runIds: string[] = [];
    const fileKeyToArtifact = new Map<string, string>();
    let loadedFiles = 0;

    const recoveryId = randomUUID();
    const recoveryPath = join(
      this.paths.recoveryDir(projectId),
      `${recoveryId}.json`,
    );
    await mkdir(dirname(recoveryPath), { recursive: true });
    await this.atomicJson(recoveryPath, {
      type: 'demo-load',
      startedAt: new Date().toISOString(),
      demoId: manifest.demoId,
      version: manifest.version,
      manifestSha256,
      status: 'running',
    });

    try {
      const dynamicMissing: DemoManifestMissing[] = [];
      for (const node of orderedNodes) {
        if (!isResearchStage(node.stage)) {
          throw new BadRequestException(`Unknown demo stage: ${node.stage}`);
        }
        for (const inputKey of node.inputs) {
          if (
            !fileKeyToArtifact.has(inputKey) &&
            !this.findFileKey(manifest, inputKey)
          ) {
            throw new BadRequestException(
              `Demo node ${node.key} references unknown input ${inputKey}`,
            );
          }
        }

        const unresolvedInputs = node.inputs.filter(
          (key) => !fileKeyToArtifact.has(key),
        );
        if (unresolvedInputs.length) {
          warnings.push(
            `Blocked ${node.key}: missing required inputs ${unresolvedInputs.join(', ')}`,
          );
          dynamicMissing.push(
            ...unresolvedInputs.map((key) => ({
              path: key,
              reason: 'file_missing' as const,
              requiredBy: [node.key],
              optional: false,
            })),
          );
          continue;
        }
        const inputArtifactIds = node.inputs.map(
          (key) => fileKeyToArtifact.get(key)!,
        );

        const presentFiles: DemoManifestNodeFile[] = [];
        for (const file of node.files) {
          const abs = this.paths.resolveProjectRelative(projectId, file.path);
          try {
            const safeAbs = await this.paths.resolveExistingFile(
              projectId,
              file.path,
            );
            const info = await stat(safeAbs);
            if (info.size > 50 * 1024 * 1024)
              throw new BadRequestException(
                `Demo file exceeds size limit: ${file.path}`,
              );
            const bytes = await readFile(safeAbs);
            const digest = sha256Buffer(bytes);
            if (digest !== file.sha256.toLowerCase()) {
              throw new BadRequestException(
                `Checksum mismatch for ${file.path}: expected ${file.sha256}, got ${digest}`,
              );
            }
            if (file.placeholder) {
              warnings.push(`Placeholder isolated: ${file.path}`);
              if (file.required !== false)
                dynamicMissing.push({
                  path: file.path,
                  reason: 'invalid_content',
                  requiredBy: [node.key],
                  optional: false,
                });
            } else presentFiles.push(file);
          } catch (error) {
            if (error instanceof BadRequestException) throw error;
            warnings.push(`Missing demo file skipped: ${file.path}`);
            dynamicMissing.push({
              path: file.path,
              reason: 'file_missing',
              requiredBy: [node.key],
              optional: file.required === false,
            });
          }
        }

        const missingRequired = node.files.some(
          (file) => file.required !== false && !presentFiles.includes(file),
        );
        const requiresPaperPdf =
          node.stage === 'writing.final' || node.stage === 'submission.prepare';
        const presentHasPaperPdf = presentFiles.some(
          (file) => file.role === 'paper-pdf',
        );
        const inputHasPaperPdf = inputArtifactIds.some((artifactId) => {
          try {
            return (
              this.workflow.getArtifact(projectId, artifactId).role ===
              'paper-pdf'
            );
          } catch {
            return false;
          }
        });
        if (
          presentFiles.length === 0 ||
          missingRequired ||
          (requiresPaperPdf && !presentHasPaperPdf && !inputHasPaperPdf)
        ) {
          warnings.push(
            requiresPaperPdf && !presentHasPaperPdf && !inputHasPaperPdf
              ? `Stage ${node.stage} missing usable paper-pdf; not marking completed`
              : `Stage ${node.stage} has no present files; not marking completed`,
          );
          continue;
        }

        const run = await this.workflow.createRun(
          projectId,
          node.stage,
          manifest.simulated ? 'simulated' : 'real',
          inputArtifactIds,
        );
        runIds.push(run.runId);
        await this.workflow.transitionRun(run.runId, 'running', {
          provenance: {
            demoImport: true,
            demoId: manifest.demoId,
            demoVersion: manifest.version,
            nodeKey: node.key,
          },
        });

        for (const file of presentFiles) {
          const abs = await this.paths.resolveExistingFile(
            projectId,
            file.path,
          );
          const bytes = await readFile(abs);
          validateFileForRole(file.role, file.mediaType, bytes, {
            placeholder: Boolean(file.placeholder),
          });
          const artifact = await this.workflow.createArtifact(
            run.runId,
            file.role,
            basename(file.path),
            file.mediaType,
            bytes,
            manifest.simulated,
            {
              demoKey: file.key,
              sourcePath: file.path,
              placeholder: Boolean(file.placeholder),
            },
          );
          await this.publishCurrentProjection(
            projectId,
            file.path,
            artifact.artifactId,
          );
          fileKeyToArtifact.set(file.key, artifact.artifactId);
          loadedFiles += 1;
        }

        await this.workflow.transitionRun(run.runId, 'validating');
        await this.workflow.transitionRun(run.runId, 'completed', {
          provenance: {
            demoImport: true,
            demoId: manifest.demoId,
            nodeKey: node.key,
          },
        });
      }

      const declaredMissing =
        manifest.schemaVersion === 2
          ? manifest.missing.map((path) => ({
              path,
              reason: 'file_missing' as const,
              requiredBy: [],
              optional: false,
            }))
          : manifest.missing;
      const missing = [
        ...new Map(
          [...declaredMissing, ...dynamicMissing].map((item) => [
            item.path,
            item,
          ]),
        ).values(),
      ];
      const complete = missing.length === 0 && warnings.length === 0;
      const projectJson = await this.readProjectJson(projectId);
      projectJson.demo = {
        id: manifest.demoId,
        version: manifest.version,
        simulated: manifest.simulated,
      };
      await this.atomicJson(
        join(this.paths.project(projectId), 'project.json'),
        projectJson,
      );

      const rebuilt = await this.rebuildPortableIndex(projectId, {
        demoId: manifest.demoId,
        version: manifest.version,
        manifestSha256,
        complete,
        missing: missing.map((item) => item.path),
      });

      await this.appendConversationCard(projectId, {
        eventId: randomUUID(),
        projectId,
        module: 'topic',
        summary: complete
          ? `已载入完整 Demo「${projectJson.title}」（${manifest.demoId}@${manifest.version}）。`
          : `已部分载入 Demo「${projectJson.title}」：已有 ${loadedFiles} 项，待补 ${missing.length} 项。`,
        artifactIds: rebuilt.artifacts.map((a) => a.artifactId),
        createdAt: new Date().toISOString(),
        kind: 'ui.demo-loaded',
      });

      await this.atomicJson(recoveryPath, {
        type: 'demo-load',
        finishedAt: new Date().toISOString(),
        status: 'completed',
        demoId: manifest.demoId,
        version: manifest.version,
        manifestSha256,
        runIds,
      });

      return {
        projectId,
        demoId: manifest.demoId,
        version: manifest.version,
        manifestSha256,
        idempotent: false,
        complete,
        loadedFiles,
        missing: missing.map((item) => item.path),
        runIds,
        warnings,
      };
    } catch (error) {
      await this.atomicJson(recoveryPath, {
        type: 'demo-load',
        finishedAt: new Date().toISOString(),
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async moveWorkspace(projectId: string, newAbsolutePath: string) {
    const row = this.requireProject(projectId);
    const dest = await this.prepareEmptyDestination(newAbsolutePath);
    if (this.sameFsPath(row.rootPath, dest)) {
      return this.getWorkspace(projectId);
    }
    const conflict = this.db
      .select()
      .from(researchProjects)
      .where(eq(researchProjects.rootPath, dest))
      .get();
    if (conflict && conflict.projectId !== projectId) {
      throw new ConflictException(
        'Destination path is already registered to another project',
      );
    }

    const oldRoot = row.rootPath;
    try {
      await rename(oldRoot, dest);
    } catch {
      await cp(oldRoot, dest, { recursive: true, dereference: false });
      await rm(oldRoot, { recursive: true, force: true });
    }

    try {
      this.files.addWorkspaceRoot(dest);
    } catch {
      // Parent workspace root already covers this path.
    }
    this.paths.unbind(projectId);
    this.paths.bind(projectId, dest);
    const now = Date.now();
    this.db
      .update(researchProjects)
      .set({ rootPath: dest, updatedAt: now })
      .where(eq(researchProjects.projectId, projectId))
      .run();
    await this.rebuildPortableIndex(projectId);
    return this.getWorkspace(projectId);
  }

  async copyWorkspaceAsNew(
    projectId: string,
    newAbsolutePath: string,
    title?: string,
  ) {
    const row = this.requireProject(projectId);
    const dest = await this.prepareEmptyDestination(newAbsolutePath);
    if (this.sameFsPath(row.rootPath, dest)) {
      throw new BadRequestException(
        'Copy destination must differ from the source workspace',
      );
    }
    const conflict = this.db
      .select()
      .from(researchProjects)
      .where(eq(researchProjects.rootPath, dest))
      .get();
    if (conflict) {
      throw new ConflictException(
        'Destination path is already registered to another project',
      );
    }

    await cp(row.rootPath, dest, { recursive: true, dereference: false });
    const newProjectId = randomUUID();
    const now = Date.now();
    const sourceJson = await this.readProjectJson(projectId);
    const nextTitle = title?.trim() || `${sourceJson.title || row.name} (copy)`;
    const written: WorkspaceProjectJson = {
      ...sourceJson,
      projectId: newProjectId,
      title: nextTitle,
      createdAt: new Date(now).toISOString(),
    };
    this.assertProjectJson(written);
    await this.atomicJson(join(dest, 'project.json'), written);

    try {
      this.files.addWorkspaceRoot(dest);
    } catch {
      // covered by parent
    }
    this.paths.bind(newProjectId, dest);
    this.db
      .insert(researchProjects)
      .values({
        projectId: newProjectId,
        name: nextTitle,
        rootPath: dest,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Fresh DB rows for the copy: runs/artifacts start empty; index rebuilt from files.
    const indexPath = join(dest, '.navivisor', 'project-index.json');
    try {
      await rm(indexPath, { force: true });
    } catch {
      // ignore
    }
    await this.rebuildPortableIndex(newProjectId);
    return this.getWorkspace(newProjectId);
  }

  async rebuildDatabaseFromWorkspace(absolutePath: string) {
    const resolved = await this.assertAllowedDirectory(absolutePath, false);
    const projectJsonPath = join(resolved, 'project.json');
    let projectJson: WorkspaceProjectJson;
    try {
      projectJson = JSON.parse(
        await readFile(projectJsonPath, 'utf8'),
      ) as WorkspaceProjectJson;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new BadRequestException(
          'project.json is required to rebuild the database',
        );
      }
      throw new BadRequestException(
        'project.json is invalid; original file was preserved',
      );
    }
    this.assertProjectJson(projectJson);

    const projectId = projectJson.projectId;
    const existing = this.db
      .select()
      .from(researchProjects)
      .where(eq(researchProjects.projectId, projectId))
      .get();
    if (existing && !this.sameFsPath(existing.rootPath, resolved)) {
      throw new ConflictException(
        'projectId already registered at another path; move or copy instead',
      );
    }
    const byPath = this.db
      .select()
      .from(researchProjects)
      .where(eq(researchProjects.rootPath, resolved))
      .get();
    if (byPath && byPath.projectId !== projectId) {
      throw new ConflictException(
        'Path already registered under a different projectId',
      );
    }

    this.paths.bind(projectId, resolved);
    const now = Date.now();
    if (!existing) {
      this.db
        .insert(researchProjects)
        .values({
          projectId,
          name: projectJson.title,
          rootPath: resolved,
          createdAt: Date.parse(projectJson.createdAt) || now,
          updatedAt: now,
        })
        .run();
    } else {
      this.db
        .update(researchProjects)
        .set({
          name: projectJson.title,
          rootPath: resolved,
          updatedAt: now,
        })
        .where(eq(researchProjects.projectId, projectId))
        .run();
    }

    // Rebuild index rows for this project without wiping workspace files.
    const priorArtifacts = this.db
      .select()
      .from(researchArtifacts)
      .where(eq(researchArtifacts.projectId, projectId))
      .all();
    for (const artifact of priorArtifacts) {
      this.db
        .delete(researchArtifacts)
        .where(eq(researchArtifacts.artifactId, artifact.artifactId))
        .run();
    }
    const priorRuns = this.db
      .select()
      .from(researchRuns)
      .where(eq(researchRuns.projectId, projectId))
      .all();
    for (const run of priorRuns) {
      this.db
        .delete(researchRuns)
        .where(eq(researchRuns.runId, run.runId))
        .run();
    }

    await this.importRunsFromManifests(projectId);
    await this.rebuildPortableIndex(projectId);
    return this.getWorkspace(projectId);
  }

  private async importRunsFromManifests(projectId: string): Promise<void> {
    const runsDir = join(this.paths.navivisor(projectId), 'runs');
    let entries: string[] = [];
    try {
      entries = await readdir(runsDir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const manifestPath = join(runsDir, entry, 'manifest.json');
      let raw: string;
      try {
        raw = await readFile(manifestPath, 'utf8');
      } catch {
        continue;
      }
      let manifest: {
        projectId?: string;
        runId?: string;
        module?: string;
        stage?: string;
        status?: string;
        mode?: string;
        createdAt?: string;
        updatedAt?: string;
        artifacts?: Array<{
          artifactId: string;
          runId: string;
          projectId: string;
          role: string;
          name: string;
          path: string;
          mediaType: string;
          size: number;
          sha256: string;
          simulated: boolean;
          metadata?: Record<string, unknown>;
          createdAt: string;
        }>;
      };
      try {
        manifest = JSON.parse(raw);
      } catch {
        continue;
      }
      if (
        !manifest.runId ||
        manifest.projectId !== projectId ||
        !manifest.stage ||
        !manifest.status ||
        !manifest.mode ||
        !manifest.module
      ) {
        continue;
      }
      const createdAt = Date.parse(manifest.createdAt ?? '') || Date.now();
      const updatedAt = Date.parse(manifest.updatedAt ?? '') || createdAt;
      this.db
        .insert(researchRuns)
        .values({
          runId: manifest.runId,
          projectId,
          module: manifest.module,
          stage: manifest.stage,
          status: manifest.status,
          mode: manifest.mode,
          manifestPath: this.paths.relativeToProject(projectId, manifestPath),
          retryOfRunId: null,
          createdAt,
          updatedAt,
        })
        .run();
      for (const artifact of manifest.artifacts ?? []) {
        if (!artifact?.artifactId || artifact.projectId !== projectId) continue;
        this.db
          .insert(researchArtifacts)
          .values({
            artifactId: artifact.artifactId,
            runId: artifact.runId || manifest.runId,
            projectId,
            role: artifact.role,
            name: artifact.name,
            path: artifact.path,
            mediaType: artifact.mediaType,
            size: artifact.size,
            sha256: artifact.sha256,
            simulated: Boolean(artifact.simulated),
            metadataJson: artifact.metadata
              ? JSON.stringify(artifact.metadata)
              : null,
            createdAt: Date.parse(artifact.createdAt) || createdAt,
          })
          .run();
      }
    }
  }

  private async prepareEmptyDestination(absolutePath: string): Promise<string> {
    const parentSafe = await this.files.resolveSafeTargetPath(absolutePath, {
      recursiveParent: true,
    });
    const dest = this.paths.normalizeRoot(parentSafe);
    try {
      const info = await stat(dest);
      if (!info.isDirectory()) {
        throw new BadRequestException('Destination must be a directory');
      }
      const entries = await readdir(dest);
      if (entries.length > 0) {
        throw new ConflictException('Destination directory is not empty');
      }
      await rm(dest, { recursive: true, force: true });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    try {
      this.files.addWorkspaceRoot(dirname(dest));
    } catch {
      // parent already allowed
    }
    return dest;
  }

  private sameFsPath(a: string, b: string): boolean {
    const na = resolve(a).replace(/[/\\]+$/, '');
    const nb = resolve(b).replace(/[/\\]+$/, '');
    if (process.platform === 'win32') {
      return na.toLowerCase() === nb.toLowerCase();
    }
    return na === nb;
  }

  private parseDemoManifest(value: unknown): DemoManifest {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new BadRequestException('Invalid demo-manifest.json');
    const candidate = value as Record<string, unknown>;
    if (
      (candidate.schemaVersion !== 2 && candidate.schemaVersion !== 3) ||
      typeof candidate.demoId !== 'string' ||
      !candidate.demoId ||
      typeof candidate.version !== 'string' ||
      typeof candidate.simulated !== 'boolean' ||
      !Array.isArray(candidate.nodes) ||
      !Array.isArray(candidate.missing)
    )
      throw new BadRequestException('Invalid demo-manifest.json');
    return candidate as unknown as DemoManifest;
  }

  private validateAndSortManifest(manifest: DemoManifest): DemoManifestNode[] {
    const nodeKeys = new Set<string>();
    const fileToNode = new Map<string, string>();
    const nodes = manifest.nodes as DemoManifestNode[];
    for (const node of nodes) {
      if (!node || nodeKeys.has(node.key))
        throw new BadRequestException(`Duplicate demo node key: ${node?.key}`);
      nodeKeys.add(node.key);
      if (
        !isResearchStage(node.stage) ||
        !Array.isArray(node.inputs) ||
        !Array.isArray(node.files)
      )
        throw new BadRequestException(`Invalid demo node: ${node.key}`);
      for (const file of node.files) {
        if (!file.key || fileToNode.has(file.key))
          throw new BadRequestException(`Duplicate demo file key: ${file.key}`);
        if (
          !isResearchArtifactRole(file.role) ||
          !/^[0-9a-f]{64}$/i.test(file.sha256) ||
          !file.path ||
          !file.mediaType
        )
          throw new BadRequestException(`Invalid demo file: ${file.key}`);
        if (manifest.schemaVersion === 3 && typeof file.required !== 'boolean')
          throw new BadRequestException(
            `Demo v3 file required flag missing: ${file.key}`,
          );
        fileToNode.set(file.key, node.key);
      }
    }
    const indegree = new Map<string, number>(nodes.map((n) => [n.key, 0]));
    const edges = new Map<string, Set<string>>();
    for (const node of nodes)
      for (const input of node.inputs) {
        const producer = fileToNode.get(input);
        if (!producer)
          throw new BadRequestException(
            `Demo node ${node.key} references unknown input ${input}`,
          );
        if (producer === node.key)
          throw new BadRequestException(
            `Demo node ${node.key} has self reference ${input}`,
          );
        const set = edges.get(producer) ?? new Set<string>();
        if (!set.has(node.key)) {
          set.add(node.key);
          edges.set(producer, set);
          indegree.set(node.key, (indegree.get(node.key) ?? 0) + 1);
        }
      }
    const queue = nodes.filter((n) => indegree.get(n.key) === 0);
    const result: DemoManifestNode[] = [];
    while (queue.length) {
      const node = queue.shift()!;
      result.push(node);
      for (const next of edges.get(node.key) ?? []) {
        indegree.set(next, (indegree.get(next) ?? 0) - 1);
        if (indegree.get(next) === 0) {
          const nextNode = nodes.find((n) => n.key === next);
          if (nextNode) queue.push(nextNode);
        }
      }
    }
    if (result.length !== nodes.length)
      throw new BadRequestException('Demo manifest has a dependency cycle');
    return result;
  }

  private async manifestFilesStillMatch(
    projectId: string,
    manifest: DemoManifest,
  ): Promise<boolean> {
    for (const node of manifest.nodes)
      for (const file of node.files) {
        if (file.placeholder || file.required === false) continue;
        try {
          if (
            sha256Buffer(
              await readFile(
                await this.paths.resolveExistingFile(projectId, file.path),
              ),
            ) !== file.sha256.toLowerCase()
          )
            return false;
        } catch {
          return false;
        }
      }
    return true;
  }

  private assertProjectJson(value: WorkspaceProjectJson): void {
    if (
      value.schemaVersion !== 2 ||
      typeof value.projectId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(value.projectId) ||
      typeof value.title !== 'string' ||
      !value.title.trim() ||
      !value.directories ||
      typeof value.createdAt !== 'string' ||
      Number.isNaN(Date.parse(value.createdAt))
    )
      throw new BadRequestException('project.json schema is invalid');
    this.assertRelativeDirs(value.directories);
  }

  async rebuildPortableIndex(
    projectId: string,
    demoOverride?: {
      demoId: string;
      version: string;
      manifestSha256: string;
      complete: boolean;
      missing: Array<string | DemoManifestMissing>;
    },
  ): Promise<PortableProjectIndex> {
    const row = this.requireProject(projectId);
    this.paths.bind(row.projectId, row.rootPath);
    const projectJson = await this.readProjectJson(projectId);
    const runs = this.db
      .select()
      .from(researchRuns)
      .where(eq(researchRuns.projectId, projectId))
      .all();
    const artifacts = this.db
      .select()
      .from(researchArtifacts)
      .where(eq(researchArtifacts.projectId, projectId))
      .all();

    const modules = {} as PortableProjectIndex['modules'];
    for (const module of RESEARCH_MODULES) {
      const dirName = projectJson.directories[module];
      const moduleDir = join(row.rootPath, dirName);
      const currentFiles: PortableProjectIndex['modules'][ResearchModule]['currentFiles'] =
        [];
      try {
        await this.walkFiles(moduleDir, async (abs) => {
          const rel = relative(row.rootPath, abs).replaceAll('\\', '/');
          const digest = sha256Buffer(await readFile(abs));
          const matched = this.matchArtifactForCurrentFile(artifacts, rel);
          const externalModified = Boolean(
            matched && matched.sha256 !== digest,
          );
          currentFiles.push({
            path: rel,
            role: matched ? (matched.role as ResearchArtifactRole) : undefined,
            sha256: digest,
            artifactId: matched?.artifactId,
            externalModified,
          });
        });
      } catch {
        // module directory may be empty
      }
      const status = currentFiles.length
        ? currentFiles.some((f) => f.externalModified)
          ? 'external_modified'
          : 'ready'
        : 'empty';
      modules[module] = { status, currentFiles };
    }

    const previous = await this.tryReadIndex(projectId);
    const index: PortableProjectIndex = {
      schemaVersion: 2,
      projectId,
      title: projectJson.title,
      updatedAt: new Date().toISOString(),
      directories: projectJson.directories,
      modules,
      runs: runs.map((r) => ({
        runId: r.runId,
        stage: r.stage as ResearchStage,
        status: r.status as PortableProjectIndex['runs'][number]['status'],
        mode: r.mode as ResearchRunMode,
      })),
      artifacts: artifacts.map((a) => ({
        artifactId: a.artifactId,
        role: a.role as ResearchArtifactRole,
        path: a.path,
        sha256: a.sha256,
        simulated: Boolean(a.simulated),
      })),
      demo: demoOverride
        ? {
            demoId: demoOverride.demoId,
            version: demoOverride.version,
            manifestSha256: demoOverride.manifestSha256,
            loadedAt: new Date().toISOString(),
            complete: demoOverride.complete,
            missing: demoOverride.missing,
          }
        : previous?.demo,
    };
    await mkdir(this.paths.navivisor(projectId), { recursive: true });
    await this.atomicJson(this.paths.projectIndex(projectId), index);
    return index;
  }

  private matchArtifactForCurrentFile(
    artifacts: Array<{
      artifactId: string;
      role: string;
      path: string;
      sha256: string;
      metadataJson: string | null;
      createdAt: number;
    }>,
    relativePath: string,
  ) {
    const rel = relativePath.replaceAll('\\', '/');
    const matches = artifacts.filter((artifact) => {
      const artifactPath = artifact.path.replaceAll('\\', '/');
      let sourcePath: string | undefined;
      if (artifact.metadataJson) {
        try {
          const meta = JSON.parse(artifact.metadataJson) as {
            sourcePath?: unknown;
          };
          if (typeof meta.sourcePath === 'string') {
            sourcePath = meta.sourcePath.replaceAll('\\', '/');
          }
        } catch {
          sourcePath = undefined;
        }
      }
      if (sourcePath && sourcePath === rel) return true;
      if (artifactPath === rel) return true;
      if (
        sourcePath &&
        (rel.endsWith(`/${sourcePath}`) || sourcePath.endsWith(`/${rel}`))
      ) {
        return true;
      }
      return false;
    });
    if (!matches.length) return undefined;
    return matches.reduce((latest, item) =>
      item.createdAt > latest.createdAt ? item : latest,
    );
  }

  private findFileKey(manifest: DemoManifest, key: string): boolean {
    return manifest.nodes.some((n) => n.files.some((f) => f.key === key));
  }

  private assertAcyclic(nodes: DemoManifestNode[]): void {
    const fileToNode = new Map<string, string>();
    for (const node of nodes) {
      for (const file of node.files) {
        if (fileToNode.has(file.key)) {
          throw new BadRequestException(`Duplicate demo file key: ${file.key}`);
        }
        fileToNode.set(file.key, node.key);
      }
    }
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const adj = new Map<string, string[]>();
    for (const node of nodes) {
      adj.set(
        node.key,
        node.inputs
          .map((input) => fileToNode.get(input))
          .filter((k): k is string => Boolean(k) && k !== node.key),
      );
    }
    const dfs = (key: string) => {
      if (visited.has(key)) return;
      if (visiting.has(key)) {
        throw new BadRequestException(
          `Demo manifest has a dependency cycle at ${key}`,
        );
      }
      visiting.add(key);
      for (const next of adj.get(key) ?? []) dfs(next);
      visiting.delete(key);
      visited.add(key);
    };
    for (const node of nodes) dfs(node.key);
  }

  private async ensureWorkspaceLayout(
    projectId: string,
    directories: Record<ResearchModule, string>,
  ) {
    const root = this.paths.project(projectId);
    await mkdir(root, { recursive: true });
    for (const dir of Object.values(directories)) {
      await mkdir(join(root, dir), { recursive: true });
    }
    await mkdir(join(root, 'demo'), { recursive: true });
    await mkdir(this.paths.navivisor(projectId), { recursive: true });
    await mkdir(this.paths.recoveryDir(projectId), { recursive: true });
    await mkdir(this.paths.conversationsDir(projectId), { recursive: true });
    await mkdir(join(this.paths.navivisor(projectId), 'runs'), {
      recursive: true,
    });
    await mkdir(join(this.paths.navivisor(projectId), 'artifacts'), {
      recursive: true,
    });
  }

  private async publishCurrentProjection(
    projectId: string,
    relativePath: string,
    artifactId: string,
  ) {
    const snapshot = this.workflow.artifactAbsolutePath(projectId, artifactId);
    await this.projectCurrentFile(projectId, relativePath, snapshot);
  }

  private async projectCurrentFile(
    projectId: string,
    relativePath: string,
    sourceAbsolute: string,
  ) {
    const target = this.paths.resolveProjectRelative(projectId, relativePath);
    const sourceResolved = resolve(sourceAbsolute);
    const targetResolved = resolve(target);
    if (this.sameFsPath(sourceResolved, targetResolved)) {
      const sourceBytes = await readFile(sourceResolved);
      const targetBytes = await readFile(targetResolved);
      if (
        sourceBytes.byteLength === targetBytes.byteLength &&
        sourceBytes.equals(targetBytes)
      ) {
        return;
      }
      throw new BadRequestException(
        `Current file projection mismatch for ${relativePath}`,
      );
    }
    await mkdir(dirname(target), { recursive: true });
    const temp = `${target}.${randomUUID()}.tmp`;
    await copyFile(sourceAbsolute, temp);
    await rename(temp, target);
  }

  async recoverIncompleteDemoLoads(projectId: string): Promise<number> {
    this.requireProject(projectId);
    const recoveryDir = this.paths.recoveryDir(projectId);
    let files: string[] = [];
    try {
      files = (await readdir(recoveryDir)).filter((name) =>
        name.endsWith('.json'),
      );
    } catch {
      return 0;
    }
    let recovered = 0;
    for (const name of files) {
      const path = join(recoveryDir, name);
      let raw: string;
      try {
        raw = await readFile(path, 'utf8');
      } catch {
        continue;
      }
      let journal: { type?: string; status?: string };
      try {
        journal = JSON.parse(raw) as { type?: string; status?: string };
      } catch {
        continue;
      }
      if (journal.type !== 'demo-load' || journal.status !== 'running')
        continue;
      await this.atomicJson(path, {
        ...journal,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: 'Recovered incomplete demo load after restart',
        recovered: true,
      });
      recovered += 1;
    }
    return recovered;
  }

  private async appendConversationCard(
    projectId: string,
    card: Record<string, unknown>,
  ) {
    const eventId = typeof card.eventId === 'string' ? card.eventId.trim() : '';
    const kind = typeof card.kind === 'string' ? card.kind.trim() : '';
    const summary = typeof card.summary === 'string' ? card.summary.trim() : '';
    if (!eventId || !kind || !summary) {
      throw new BadRequestException(
        'Conversation card requires eventId, kind, and summary',
      );
    }
    const normalized: ResearchUiEvent = {
      eventId,
      projectId,
      kind,
      summary,
      createdAt:
        typeof card.createdAt === 'string' && card.createdAt
          ? card.createdAt
          : new Date().toISOString(),
    };
    if (typeof card.module === 'string' && card.module) {
      normalized.module = card.module;
    }
    if (Array.isArray(card.artifactIds)) {
      normalized.artifactIds = card.artifactIds.filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      );
    }
    if (typeof card.runId === 'string' && card.runId) {
      normalized.runId = card.runId;
    }
    const path = join(
      this.paths.conversationsDir(projectId),
      'ui-events.jsonl',
    );
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(normalized)}\n`, { flag: 'a' });
  }

  private async readProjectJson(
    projectId: string,
  ): Promise<WorkspaceProjectJson> {
    const root = this.paths.project(projectId);
    try {
      return JSON.parse(
        await readFile(join(root, 'project.json'), 'utf8'),
      ) as WorkspaceProjectJson;
    } catch {
      const row = this.requireProject(projectId);
      return {
        schemaVersion: 2,
        projectId,
        title: row.name,
        directories: { ...DEFAULT_DIRS },
        createdAt: new Date(row.createdAt).toISOString(),
      };
    }
  }

  private async readOrRebuildIndex(
    projectId: string,
  ): Promise<PortableProjectIndex> {
    const existing = await this.tryReadIndex(projectId);
    if (existing) return existing;
    return this.rebuildPortableIndex(projectId);
  }

  private async tryReadIndex(
    projectId: string,
  ): Promise<PortableProjectIndex | null> {
    try {
      return JSON.parse(
        await readFile(this.paths.projectIndex(projectId), 'utf8'),
      ) as PortableProjectIndex;
    } catch {
      return null;
    }
  }

  private requireProject(projectId: string) {
    const row = this.db
      .select()
      .from(researchProjects)
      .where(eq(researchProjects.projectId, projectId))
      .get();
    if (!row) throw new NotFoundException('Research project not found');
    this.paths.bind(row.projectId, row.rootPath);
    return row;
  }

  private async assertAllowedDirectory(
    inputPath: string,
    createIfMissing: boolean,
  ): Promise<string> {
    const normalizedInput = this.paths.normalizeRoot(inputPath);
    const managedRelative = relative(this.paths.managedRoot, normalizedInput);
    const isManaged =
      managedRelative !== '..' &&
      !managedRelative.startsWith('../') &&
      !managedRelative.startsWith('..\\');
    if (isManaged) {
      if (createIfMissing) await mkdir(normalizedInput, { recursive: true });
      const info = await stat(normalizedInput);
      if (!info.isDirectory())
        throw new BadRequestException('Workspace path must be a directory');
      return this.paths.normalizeRoot(normalizedInput);
    }
    let resolved: string;
    try {
      resolved = this.paths.normalizeRoot(
        await this.files.resolveSafePath(inputPath),
      );
    } catch (error) {
      if (!createIfMissing) throw error;
      resolved = this.paths.normalizeRoot(
        await this.files.resolveSafeTargetPath(inputPath, {
          recursiveParent: true,
        }),
      );
      await mkdir(resolved, { recursive: true });
      resolved = this.paths.normalizeRoot(
        await this.files.resolveSafePath(resolved),
      );
    }
    const info = await stat(resolved);
    if (!info.isDirectory()) {
      throw new BadRequestException('Workspace path must be a directory');
    }
    try {
      this.files.addWorkspaceRoot(resolved);
    } catch {
      // Parent workspace root already covers this path.
    }
    return resolved;
  }

  private demoPackageRoot(packageDir: string): string {
    return resolve(process.cwd(), 'demo-packages', packageDir);
  }

  private normalizeManifestMissing(
    manifest: DemoManifest,
  ): DemoManifestMissing[] {
    return manifest.missing.map((item) =>
      typeof item === 'string'
        ? {
            path: item,
            reason: 'file_missing',
            requiredBy: [],
            optional: false,
          }
        : item,
    );
  }

  private assertRelativeDirs(directories: Record<string, string>) {
    for (const [key, value] of Object.entries(directories)) {
      if (
        !value ||
        value.includes('..') ||
        value.startsWith('/') ||
        value.includes(':')
      ) {
        throw new BadRequestException(`Invalid module directory for ${key}`);
      }
    }
  }

  private async walkFiles(
    dir: string,
    onFile: (absolutePath: string) => Promise<void>,
  ): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.navivisor' || entry.name === 'node_modules')
          continue;
        await this.walkFiles(abs, onFile);
      } else if (entry.isFile()) {
        await onFile(abs);
      }
    }
  }

  private async atomicJson(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const temp = `${path}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(value, null, 2), {
      encoding: 'utf8',
      flag: 'wx',
    });
    await rename(temp, path);
  }
}

function sha256Buffer(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function guessMediaType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.jsonl')) return 'application/x-ndjson';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.bib')) return 'application/x-bibtex';
  if (lower.endsWith('.tex')) return 'application/x-tex';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.py')) return 'text/x-python';
  if (lower.endsWith('.zip')) return 'application/zip';
  return 'application/octet-stream';
}
