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

  async function writeDemoPackage(
    root: string,
    nodes: Array<{
      key: string;
      stage: string;
      inputs: string[];
      files: Array<{
        key: string;
        path: string;
        role: string;
        mediaType: string;
        content: string;
        required?: boolean;
        placeholder?: boolean;
      }>;
    }>,
    options?: { shuffle?: boolean },
  ) {
    await mkdir(join(root, 'demo'), { recursive: true });
    await mkdir(join(root, 'topic'), { recursive: true });
    await mkdir(join(root, 'writing'), { recursive: true });
    const manifestNodes = nodes.map((node) => ({
      key: node.key,
      stage: node.stage,
      inputs: node.inputs,
      files: node.files.map((file) => ({
        key: file.key,
        path: file.path,
        role: file.role,
        mediaType: file.mediaType,
        sha256: sha256(file.content),
        required: file.required ?? true,
        ...(file.placeholder ? { placeholder: true } : {}),
      })),
    }));
    if (options?.shuffle) {
      for (let i = manifestNodes.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [manifestNodes[i], manifestNodes[j]] = [
          manifestNodes[j]!,
          manifestNodes[i]!,
        ];
      }
    }
    for (const node of nodes) {
      for (const file of node.files) {
        const abs = join(root, file.path);
        await mkdir(dirname(abs), { recursive: true });
        await writeFile(abs, file.content, 'utf8');
      }
    }
    await writeFile(
      join(root, 'demo', 'demo-manifest.json'),
      JSON.stringify({
        schemaVersion: 2,
        demoId: 'unit-demo',
        version: '1.0.0',
        simulated: true,
        nodes: manifestNodes,
        missing: [],
      }),
      'utf8',
    );
  }

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

  it('rejects cycle, self-ref, and duplicate keys in demo manifests', async () => {
    const registered = await service.registerWorkspace({
      absolutePath: workspaceRoot,
      title: 'Cycle project',
    });

    await writeFile(
      join(workspaceRoot, 'demo', 'demo-manifest.json'),
      JSON.stringify({
        schemaVersion: 2,
        demoId: 'bad-demo',
        version: '1.0.0',
        simulated: true,
        nodes: [
          {
            key: 'a',
            stage: 'topic.intake',
            inputs: ['f-a'],
            files: [
              {
                key: 'f-a',
                path: 'topic/a.json',
                role: 'project-intake',
                mediaType: 'application/json',
                sha256: sha256('{}'),
                required: true,
              },
            ],
          },
        ],
        missing: [],
      }),
      'utf8',
    );
    await writeFile(join(workspaceRoot, 'topic', 'a.json'), '{}', 'utf8');
    await expect(
      service.loadDemoFromWorkspace(registered.projectId),
    ).rejects.toThrow(/self reference/i);

    await writeFile(
      join(workspaceRoot, 'demo', 'demo-manifest.json'),
      JSON.stringify({
        schemaVersion: 2,
        demoId: 'dup-demo',
        version: '1.0.0',
        simulated: true,
        nodes: [
          {
            key: 'a',
            stage: 'topic.intake',
            inputs: [],
            files: [
              {
                key: 'same',
                path: 'topic/a.json',
                role: 'project-intake',
                mediaType: 'application/json',
                sha256: sha256('{}'),
                required: true,
              },
            ],
          },
          {
            key: 'b',
            stage: 'topic.candidates',
            inputs: [],
            files: [
              {
                key: 'same',
                path: 'topic/b.json',
                role: 'candidate-topics',
                mediaType: 'application/json',
                sha256: sha256('{}'),
                required: true,
              },
            ],
          },
        ],
        missing: [],
      }),
      'utf8',
    );
    await expect(
      service.loadDemoFromWorkspace(registered.projectId),
    ).rejects.toThrow(/Duplicate demo file key/i);

    await writeFile(
      join(workspaceRoot, 'demo', 'demo-manifest.json'),
      JSON.stringify({
        schemaVersion: 2,
        demoId: 'cycle-demo',
        version: '1.0.0',
        simulated: true,
        nodes: [
          {
            key: 'a',
            stage: 'topic.intake',
            inputs: ['f-b'],
            files: [
              {
                key: 'f-a',
                path: 'topic/a.json',
                role: 'project-intake',
                mediaType: 'application/json',
                sha256: sha256('{}'),
                required: true,
              },
            ],
          },
          {
            key: 'b',
            stage: 'topic.candidates',
            inputs: ['f-a'],
            files: [
              {
                key: 'f-b',
                path: 'topic/b.json',
                role: 'candidate-topics',
                mediaType: 'application/json',
                sha256: sha256('{}'),
                required: true,
              },
            ],
          },
        ],
        missing: [],
      }),
      'utf8',
    );
    await writeFile(join(workspaceRoot, 'topic', 'b.json'), '{}', 'utf8');
    await expect(
      service.loadDemoFromWorkspace(registered.projectId),
    ).rejects.toThrow(/dependency cycle/i);
  });

  it('does not finalize placeholder content as a usable artifact', async () => {
    const registered = await service.registerWorkspace({
      absolutePath: workspaceRoot,
      title: 'Placeholder project',
    });
    await writeDemoPackage(workspaceRoot, [
      {
        key: 'final',
        stage: 'writing.final',
        inputs: [],
        files: [
          {
            key: 'pdf',
            path: 'writing/paper.pdf',
            role: 'paper-pdf',
            mediaType: 'application/pdf',
            content: 'NOT-A-PDF',
            placeholder: true,
            required: true,
          },
          {
            key: 'tex',
            path: 'writing/paper.tex',
            role: 'paper-source',
            mediaType: 'application/x-tex',
            content: '\\documentclass{article}',
            required: true,
          },
        ],
      },
    ]);

    const result = await service.loadDemoFromWorkspace(registered.projectId);
    expect(result.complete).toBe(false);
    expect(result.warnings.some((w) => /paper-pdf|Placeholder/i.test(w))).toBe(
      true,
    );
    const artifacts = workflow.listArtifacts(registered.projectId);
    expect(artifacts.some((a) => a.role === 'paper-pdf')).toBe(false);
    expect(artifacts.every((a) => a.metadata?.placeholder !== true)).toBe(true);
  });

  it('idempotent load revalidates file bytes before returning success', async () => {
    const registered = await service.registerWorkspace({
      absolutePath: workspaceRoot,
      title: 'Idempotent project',
    });
    const content = JSON.stringify({ ok: true });
    await writeDemoPackage(workspaceRoot, [
      {
        key: 'intake',
        stage: 'topic.intake',
        inputs: [],
        files: [
          {
            key: 'intake-json',
            path: 'topic/intake.json',
            role: 'project-intake',
            mediaType: 'application/json',
            content,
          },
        ],
      },
    ]);

    const first = await service.loadDemoFromWorkspace(registered.projectId);
    expect(first.idempotent).toBe(false);
    expect(first.loadedFiles).toBe(1);

    const second = await service.loadDemoFromWorkspace(registered.projectId);
    expect(second.idempotent).toBe(true);
    expect(second.loadedFiles).toBe(first.loadedFiles);

    await writeFile(
      join(workspaceRoot, 'topic', 'intake.json'),
      JSON.stringify({ ok: false, mutated: true }),
      'utf8',
    );
    await expect(
      service.loadDemoFromWorkspace(registered.projectId),
    ).rejects.toThrow(/Checksum mismatch/i);
  });

  it('loads shuffled nodes in topological order', async () => {
    const registered = await service.registerWorkspace({
      absolutePath: workspaceRoot,
      title: 'Topo project',
    });
    await writeDemoPackage(
      workspaceRoot,
      [
        {
          key: 'downstream',
          stage: 'topic.candidates',
          inputs: ['intake-json'],
          files: [
            {
              key: 'candidates',
              path: 'topic/candidates.json',
              role: 'candidate-topics',
              mediaType: 'application/json',
              content: JSON.stringify({ topics: [] }),
            },
          ],
        },
        {
          key: 'upstream',
          stage: 'topic.intake',
          inputs: [],
          files: [
            {
              key: 'intake-json',
              path: 'topic/intake.json',
              role: 'project-intake',
              mediaType: 'application/json',
              content: JSON.stringify({ title: 'x' }),
            },
          ],
        },
      ],
      { shuffle: true },
    );

    const result = await service.loadDemoFromWorkspace(registered.projectId);
    expect(result.loadedFiles).toBe(2);
    expect(result.warnings).toEqual([]);
    const runs = workflow.listRuns(registered.projectId);
    const intakeIdx = runs.findIndex((r) => r.stage === 'topic.intake');
    const candidatesIdx = runs.findIndex((r) => r.stage === 'topic.candidates');
    expect(intakeIdx).toBeGreaterThanOrEqual(0);
    expect(candidatesIdx).toBeGreaterThanOrEqual(0);
    expect(runs[intakeIdx]!.createdAt).toBeLessThanOrEqual(
      runs[candidatesIdx]!.createdAt,
    );
  });
});
