import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDatabase } from '../database/database.testing';
import type { AppDatabase } from '../database/database.constants';
import type { FilesService } from '../files/files.service';
import { ResearchPathsService } from './research-paths.service';
import { ResearchResultValidatorService } from './research-result-validator.service';
import { ResearchWorkspaceService } from './research-workspace.service';
import { ResearchWorkflowService } from './research-workflow.service';

function sha256(content: string | Buffer): string {
  return createHash('sha256')
    .update(typeof content === 'string' ? Buffer.from(content, 'utf8') : content)
    .digest('hex');
}

describe('ResearchWorkspaceService', () => {
  let managedRoot: string;
  let workspaceRoot: string;
  let db: AppDatabase;
  let sqlite: ReturnType<typeof createTestDatabase>['sqlite'];
  let paths: ResearchPathsService;
  let workflow: ResearchWorkflowService;
  let service: ResearchWorkspaceService;

  beforeEach(async () => {
    managedRoot = await mkdtemp(join(tmpdir(), 'rw-managed-'));
    workspaceRoot = await mkdtemp(join(tmpdir(), 'rw-workspace-'));
    const testDb = createTestDatabase();
    db = testDb.db;
    sqlite = testDb.sqlite;
    paths = new ResearchPathsService({
      get: vi.fn().mockReturnValue(managedRoot),
    } as unknown as ConfigService);
    const files = {
      addWorkspaceRoot: vi.fn(),
      resolveSafePath: async (input: string) => {
        const resolved = resolve(input);
        const { stat } = await import('node:fs/promises');
        await stat(resolved);
        return resolved;
      },
      resolveSafeTargetPath: async (input: string) => resolve(input),
    } as unknown as FilesService;
    const validator = new ResearchResultValidatorService(paths);
    workflow = new ResearchWorkflowService(db, paths, validator);
    service = new ResearchWorkspaceService(db, paths, files, workflow);
  });

  afterEach(async () => {
    sqlite.close();
    await rm(managedRoot, { recursive: true, force: true });
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('preserves invalid/corrupt project.json and rejects register', async () => {
    const projectJsonPath = join(workspaceRoot, 'project.json');
    const corrupt = '{not-json';
    await writeFile(projectJsonPath, corrupt, 'utf8');

    await expect(
      service.registerWorkspace({
        absolutePath: workspaceRoot,
        createIfMissing: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(await readFile(projectJsonPath, 'utf8')).toBe(corrupt);
  });
});
