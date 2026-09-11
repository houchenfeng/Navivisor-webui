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
  mkdir,
  readFile,
  readdir,
  rename,
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
  WorkspaceProjectJson,
} from './research-contracts';
import {
  RESEARCH_MODULES,
  isResearchArtifactRole,
  isResearchStage,
} from './research-contracts';
import { ResearchPathsService } from './research-paths.service';
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
}

export interface DemoManifestNode {
  key: string;
  stage: ResearchStage;
  files: DemoManifestNodeFile[];
  inputs: string[];
}

export interface DemoManifest {
  schemaVersion: 2;
  demoId: string;
  version: string;
  simulated: boolean;
  nodes: DemoManifestNode[];
  missing: string[];
}

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

@Injectable()
export class ResearchWorkspaceService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDatabase,
    private readonly paths: ResearchPathsService,
    private readonly files: FilesService,
    private readonly workflow: ResearchWorkflowService,
  ) {}

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
    } catch {
      projectJson = null;
    }

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

  async saveVersion(
    projectId: string,
    relativePath: string,
    role: ResearchArtifactRole,
    options: { stage: ResearchStage; mode?: ResearchRunMode; simulated?: boolean } ,
  ) {
    this.requireProject(projectId);
    if (!isResearchStage(options.stage) || !isResearchArtifactRole(role)) {
      throw new BadRequestException('Invalid stage or role');
    }
    const absolute = this.paths.resolveProjectRelative(projectId, relativePath);
    const bytes = await readFile(absolute);
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
    await this.projectCurrentFile(projectId, relativePath, absolute);
    await this.rebuildPortableIndex(projectId);
    return artifact;
  }

  async loadDemoFromWorkspace(projectId: string): Promise<LoadDemoResult> {
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
    const manifest = JSON.parse(raw) as DemoManifest;
    if (manifest.schemaVersion !== 2 || !manifest.demoId || !manifest.version) {
      throw new BadRequestException('Invalid demo-manifest.json');
    }
    const manifestSha256 = sha256Buffer(Buffer.from(raw, 'utf8'));
    const index = await this.readOrRebuildIndex(projectId);
    if (
      index.demo &&
      index.demo.demoId === manifest.demoId &&
      index.demo.version === manifest.version &&
      index.demo.manifestSha256 === manifestSha256
    ) {
      return {
        projectId,
        demoId: manifest.demoId,
        version: manifest.version,
        manifestSha256,
        idempotent: true,
        complete: index.demo.complete,
        loadedFiles: index.artifacts.length,
        missing: index.demo.missing,
        runIds: index.runs.map((r) => r.runId),
        warnings: ['Demo already loaded with identical manifest hash'],
      };
    }

    this.assertAcyclic(manifest.nodes);
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
      for (const node of manifest.nodes) {
        if (!isResearchStage(node.stage)) {
          throw new BadRequestException(`Unknown demo stage: ${node.stage}`);
        }
        for (const inputKey of node.inputs) {
          if (!fileKeyToArtifact.has(inputKey) && !this.findFileKey(manifest, inputKey)) {
            throw new BadRequestException(
              `Demo node ${node.key} references unknown input ${inputKey}`,
            );
          }
        }

        const inputArtifactIds = node.inputs
          .map((key) => fileKeyToArtifact.get(key))
          .filter((id): id is string => Boolean(id));

        const presentFiles: DemoManifestNodeFile[] = [];
        for (const file of node.files) {
          const abs = this.paths.resolveProjectRelative(projectId, file.path);
          try {
            const bytes = await readFile(abs);
            const digest = sha256Buffer(bytes);
            if (digest !== file.sha256.toLowerCase()) {
              throw new BadRequestException(
                `Checksum mismatch for ${file.path}: expected ${file.sha256}, got ${digest}`,
              );
            }
            presentFiles.push(file);
          } catch (error) {
            if (error instanceof BadRequestException) throw error;
            warnings.push(`Missing demo file skipped: ${file.path}`);
          }
        }

        if (presentFiles.length === 0) {
          warnings.push(
            `Stage ${node.stage} has no present files; not marking completed`,
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
          const abs = this.paths.resolveProjectRelative(projectId, file.path);
          const bytes = await readFile(abs);
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

      const missing = [...manifest.missing];
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
        missing,
      });

      await this.appendConversationCard(projectId, {
        eventId: randomUUID(),
        projectId,
        module: 'topic',
        summary: complete
          ? `已载入完整 Demo「${projectJson.title}」（${manifest.demoId}@${manifest.version}）。`
          : `已部分载入 Demo「${projectJson.title}」：已有 ${loadedFiles} 项，待补 ${missing.length} 项。以上为模拟教学数据。`,
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
        missing,
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

  async rebuildPortableIndex(
    projectId: string,
    demoOverride?: {
      demoId: string;
      version: string;
      manifestSha256: string;
      complete: boolean;
      missing: string[];
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
          const matched = artifacts.find(
            (a) =>
              a.sha256 === digest ||
              (typeof a.metadataJson === 'string' &&
                a.metadataJson.includes(rel)),
          );
          const externalModified = Boolean(
            matched && matched.sha256 !== digest,
          );
          currentFiles.push({
            path: rel,
            role: matched
              ? (matched.role as ResearchArtifactRole)
              : undefined,
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
        throw new BadRequestException(`Demo manifest has a dependency cycle at ${key}`);
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

  private async projectCurrentFile(
    projectId: string,
    relativePath: string,
    sourceAbsolute: string,
  ) {
    const target = this.paths.resolveProjectRelative(projectId, relativePath);
    if (resolve(target) === resolve(sourceAbsolute)) return;
    await mkdir(dirname(target), { recursive: true });
    const temp = `${target}.${randomUUID()}.tmp`;
    await copyFile(sourceAbsolute, temp);
    await rename(temp, target);
  }

  private async appendConversationCard(
    projectId: string,
    card: Record<string, unknown>,
  ) {
    const path = join(
      this.paths.conversationsDir(projectId),
      'ui-events.jsonl',
    );
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(card)}\n`, { flag: 'a' });
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
