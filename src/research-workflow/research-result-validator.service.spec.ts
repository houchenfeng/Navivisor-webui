import { ConfigService } from '@nestjs/config';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ResearchPathsService } from './research-paths.service';
import { ResearchResultValidatorService } from './research-result-validator.service';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const RUN_ID = '22222222-2222-4222-8222-222222222222';
const STAGE = 'writing.draft' as const;

describe('ResearchResultValidatorService', () => {
  let root: string;
  let paths: ResearchPathsService;
  let validator: ResearchResultValidatorService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'research-result-'));
    paths = new ResearchPathsService({
      get: vi.fn().mockReturnValue(root),
    } as unknown as ConfigService);
    validator = new ResearchResultValidatorService(paths);
    await mkdir(paths.temp(PROJECT_ID, RUN_ID), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function writeResult(value: unknown): Promise<void> {
    await writeFile(
      join(paths.temp(PROJECT_ID, RUN_ID), 'result.json'),
      JSON.stringify(value),
      'utf8',
    );
  }

  it('accepts a declared regular output inside the run temp directory', async () => {
    await writeFile(
      join(paths.temp(PROJECT_ID, RUN_ID), 'draft.md'),
      '# Draft',
      'utf8',
    );
    await writeResult({
      schemaVersion: 1,
      runId: RUN_ID,
      stage: STAGE,
      status: 'completed',
      outputs: [
        {
          path: 'draft.md',
          role: 'paper-source',
          mediaType: 'text/markdown',
          simulated: false,
        },
      ],
      warnings: [],
    });

    const result = await validator.validate(PROJECT_ID, RUN_ID, STAGE);

    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]).toMatchObject({
      path: 'draft.md',
      role: 'paper-source',
      size: 7,
    });
  });

  it('rejects traversal paths before reading an output', async () => {
    await writeResult({
      schemaVersion: 1,
      runId: RUN_ID,
      stage: STAGE,
      status: 'completed',
      outputs: [
        {
          path: '../outside.md',
          role: 'paper-source',
          mediaType: 'text/markdown',
          simulated: false,
        },
      ],
      warnings: [],
    });

    await expect(validator.validate(PROJECT_ID, RUN_ID, STAGE)).rejects.toThrow(
      'Invalid output path',
    );
  });

  it('rejects unknown artifact roles', async () => {
    await writeResult({
      schemaVersion: 1,
      runId: RUN_ID,
      stage: STAGE,
      status: 'completed',
      outputs: [
        {
          path: 'draft.md',
          role: 'arbitrary-output',
          mediaType: 'text/markdown',
          simulated: false,
        },
      ],
      warnings: [],
    });

    await expect(validator.validate(PROJECT_ID, RUN_ID, STAGE)).rejects.toThrow(
      'Invalid result output',
    );
  });

  it('rejects a result belonging to another run', async () => {
    await writeResult({
      schemaVersion: 1,
      runId: PROJECT_ID,
      stage: STAGE,
      status: 'completed',
      outputs: [],
      warnings: [],
    });

    await expect(validator.validate(PROJECT_ID, RUN_ID, STAGE)).rejects.toThrow(
      'identity or schema',
    );
  });
});
