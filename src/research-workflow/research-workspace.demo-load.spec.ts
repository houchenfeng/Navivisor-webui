/**
 * Integration: temp copy of camera-vad Demo → register → load → switch → rebuild.
 * Does not mutate demo-packages/camera-vad-scene-memory.
 */
import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { createTestDatabase } from '../database/database.testing';
import type { AppDatabase } from '../database/database.constants';
import type { FilesService } from '../files/files.service';
import { ResearchPathsService } from './research-paths.service';
import { ResearchResultValidatorService } from './research-result-validator.service';
import { ResearchWorkflowService } from './research-workflow.service';
import { ResearchWorkspaceService } from './research-workspace.service';

const demoSrc = resolve(
  process.cwd(),
  'demo-packages/camera-vad-scene-memory',
);

describe('camera-vad Demo package load (integration)', () => {
  let managedRoot: string;
  let copyA: string;
  let copyB: string;
  let db: AppDatabase;
  let sqlite: ReturnType<typeof createTestDatabase>['sqlite'];
  let service: ResearchWorkspaceService;
  let workflow: ResearchWorkflowService;

  beforeEach(async () => {
    managedRoot = await mkdtemp(join(tmpdir(), 'rw-demo-managed-'));
    copyA = await mkdtemp(join(tmpdir(), 'rw-demo-a-'));
    copyB = await mkdtemp(join(tmpdir(), 'rw-demo-b-'));
    const testDb = createTestDatabase();
    db = testDb.db;
    sqlite = testDb.sqlite;
    const paths = new ResearchPathsService({
      get: vi.fn().mockReturnValue(managedRoot),
    } as unknown as ConfigService);
    const files = {
      addWorkspaceRoot: vi.fn(),
      resolveSafePath: async (input: string) => resolve(input),
      resolveSafeTargetPath: async (input: string) => resolve(input),
    } as unknown as FilesService;
    const validator = new ResearchResultValidatorService(paths);
    workflow = new ResearchWorkflowService(db, paths, validator);
    service = new ResearchWorkspaceService(db, paths, files, workflow);
  });

  afterEach(async () => {
    sqlite.close();
    await rm(managedRoot, { recursive: true, force: true });
    await rm(copyA, { recursive: true, force: true });
    await rm(copyB, { recursive: true, force: true });
  });

  async function prepareCopy(dest: string, title?: string) {
    await cp(demoSrc, dest, { recursive: true });
    const projectJsonPath = join(dest, 'project.json');
    const projectJson = JSON.parse(
      await readFile(projectJsonPath, 'utf8'),
    ) as Record<string, unknown>;
    projectJson.projectId = randomUUID();
    if (title) projectJson.title = title;
    await writeFile(projectJsonPath, JSON.stringify(projectJson, null, 2));
    return projectJson;
  }

  it('loads demo content, stays idempotent, isolates A/B, and rebuilds from disk', async () => {
    await prepareCopy(copyA);
    const registered = await service.registerWorkspace({
      absolutePath: copyA,
      createIfMissing: false,
    });

    const load1 = await service.loadDemoFromWorkspace(registered.projectId);
    expect(load1.loadedFiles).toBeGreaterThan(20);
    expect(load1.idempotent).toBe(false);

    const load2 = await service.loadDemoFromWorkspace(registered.projectId);
    expect(load2.idempotent).toBe(true);
    expect(load2.loadedFiles).toBe(load1.loadedFiles);

    const artifacts = await workflow.listArtifacts(registered.projectId);
    expect(artifacts.length).toBeGreaterThan(20);
    const roles = new Set(artifacts.map((a) => a.role));
    expect(roles.has('project-intake')).toBe(true);
    expect(roles.has('experiment-plan')).toBe(true);
    expect(roles.has('experiment-results')).toBe(true);
    expect(roles.has('paper-outline')).toBe(true);
    expect(roles.has('paper-source')).toBe(true);

    const events = await service.listUiEvents(registered.projectId, {
      limit: 20,
    });
    expect(events.events.length).toBeGreaterThan(0);
    expect(events.events.every((e) => e.projectId === registered.projectId)).toBe(
      true,
    );

    await prepareCopy(copyB, 'Second Project B');
    const b = await service.registerWorkspace({
      absolutePath: copyB,
      createIfMissing: false,
    });
    await service.loadDemoFromWorkspace(b.projectId);
    const eventsA = await service.listUiEvents(registered.projectId);
    const eventsB = await service.listUiEvents(b.projectId);
    expect(eventsA.events.some((e) => e.projectId === b.projectId)).toBe(false);
    expect(eventsB.events.some((e) => e.projectId === registered.projectId)).toBe(
      false,
    );

    // Empty-DB rebuild from directory A
    sqlite.close();
    const rebuiltDb = createTestDatabase();
    const paths2 = new ResearchPathsService({
      get: vi.fn().mockReturnValue(managedRoot),
    } as unknown as ConfigService);
    const files2 = {
      addWorkspaceRoot: vi.fn(),
      resolveSafePath: async (input: string) => resolve(input),
      resolveSafeTargetPath: async (input: string) => resolve(input),
    } as unknown as FilesService;
    const workflow2 = new ResearchWorkflowService(
      rebuiltDb.db,
      paths2,
      new ResearchResultValidatorService(paths2),
    );
    const service2 = new ResearchWorkspaceService(
      rebuiltDb.db,
      paths2,
      files2,
      workflow2,
    );
    const rebuilt = await service2.rebuildDatabaseFromWorkspace(copyA);
    expect(rebuilt.projectId).toBe(registered.projectId);
    rebuiltDb.sqlite.close();
  }, 120_000);

  it('creates and reuses a controlled EviVAD workspace without mutating the template', async () => {
    const templateManifest = resolve(
      process.cwd(),
      'demo-packages/evivad-surveillance-demo/demo/demo-manifest.json',
    );
    const before = await readFile(templateManifest, 'utf8');
    const definitions = await service.listDemoDefinitions();
    expect(definitions.map((item) => item.id)).toEqual([
      'camera-vad-scene-memory',
      'evivad-surveillance-demo',
    ]);

    const first = await service.activateDemo('evivad-surveillance-demo');
    expect(first.workspace.rootPath).toContain('demo-workspaces');
    expect(first.workspace.rootPath).not.toContain('demo-packages');
    expect(first.load.loadedFiles).toBeGreaterThan(70);
    expect(first.load.idempotent).toBe(false);
    expect(first.load.complete).toBe(false);

    const second = await service.activateDemo('evivad-surveillance-demo');
    expect(second.workspace.projectId).toBe(first.workspace.projectId);
    expect(second.load.idempotent).toBe(true);
    expect(await readFile(templateManifest, 'utf8')).toBe(before);
  }, 180_000);
});
