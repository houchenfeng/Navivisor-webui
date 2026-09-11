import { ConfigService } from '@nestjs/config';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResearchPathsService } from './research-paths.service';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const RUN_ID = '22222222-2222-4222-8222-222222222222';
const ARTIFACT_ID = '33333333-3333-4333-8333-333333333333';

describe('ResearchPathsService', () => {
  let managedRoot: string;
  let workspaceRoot: string;
  let paths: ResearchPathsService;

  beforeEach(async () => {
    managedRoot = await mkdtemp(join(tmpdir(), 'research-managed-'));
    workspaceRoot = await mkdtemp(join(tmpdir(), 'research-workspace-'));
    paths = new ResearchPathsService({
      get: vi.fn().mockReturnValue(managedRoot),
    } as unknown as ConfigService);
  });

  afterEach(async () => {
    await rm(managedRoot, { recursive: true, force: true });
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('falls back to managed root + uuid when unbound', () => {
    expect(paths.project(PROJECT_ID)).toBe(join(managedRoot, PROJECT_ID));
  });

  it('binds an arbitrary absolute workspace directory', () => {
    const bound = paths.bind(PROJECT_ID, workspaceRoot);
    expect(bound).toBe(paths.normalizeRoot(workspaceRoot));
    expect(paths.project(PROJECT_ID)).toBe(bound);
    expect(paths.run(PROJECT_ID, RUN_ID)).toBe(
      join(bound, '.navivisor', 'runs', RUN_ID),
    );
    expect(paths.artifactDir(PROJECT_ID, ARTIFACT_ID)).toBe(
      join(bound, '.navivisor', 'artifacts', ARTIFACT_ID),
    );
  });

  it('rejects relative project roots', () => {
    expect(() => paths.bind(PROJECT_ID, 'relative/path')).toThrow(
      /absolute path/i,
    );
  });

  it('keeps relative paths inside the bound project', async () => {
    paths.bind(PROJECT_ID, workspaceRoot);
    await mkdir(join(workspaceRoot, 'topic'), { recursive: true });
    await writeFile(join(workspaceRoot, 'topic', 'intake.json'), '{}');
    const abs = paths.resolveProjectRelative(PROJECT_ID, 'topic/intake.json');
    expect(paths.relativeToProject(PROJECT_ID, abs)).toBe('topic/intake.json');
    expect(() =>
      paths.resolveProjectRelative(PROJECT_ID, '../outside.json'),
    ).toThrow();
  });
});
