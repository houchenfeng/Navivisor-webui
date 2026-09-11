import { BadRequestException, Injectable } from '@nestjs/common';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import {
  isResearchArtifactRole,
  type ResearchAgentResult,
  type ResearchAgentResultOutput,
  type ResearchStage,
} from './research-contracts';
import { ResearchPathsService } from './research-paths.service';

const MAX_RESULT_BYTES = 1_000_000;
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;
const MAX_OUTPUTS = 50;

export interface ValidatedResearchOutput extends ResearchAgentResultOutput {
  absolutePath: string;
  size: number;
}

@Injectable()
export class ResearchResultValidatorService {
  constructor(private readonly paths: ResearchPathsService) {}

  async validate(
    projectId: string,
    runId: string,
    stage: ResearchStage,
  ): Promise<{
    result: ResearchAgentResult;
    outputs: ValidatedResearchOutput[];
  }> {
    const tempRoot = await realpath(this.paths.temp(projectId, runId));
    const resultPath = resolve(tempRoot, 'result.json');
    const resultStat = await lstat(resultPath);
    if (!resultStat.isFile() || resultStat.isSymbolicLink()) {
      throw new BadRequestException('result.json must be a regular file');
    }
    if (resultStat.size > MAX_RESULT_BYTES) {
      throw new BadRequestException('result.json exceeds the size limit');
    }

    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(resultPath, 'utf8')) as unknown;
    } catch {
      throw new BadRequestException('result.json is not valid JSON');
    }
    const result = this.parseResult(raw, runId, stage);
    const seen = new Set<string>();
    const outputs: ValidatedResearchOutput[] = [];
    for (const output of result.outputs) {
      const normalized = output.path.replaceAll('\\', '/');
      if (
        !normalized ||
        isAbsolute(normalized) ||
        normalized.split('/').includes('..') ||
        normalized === 'result.json' ||
        seen.has(normalized)
      ) {
        throw new BadRequestException(`Invalid output path: ${output.path}`);
      }
      seen.add(normalized);
      const candidate = resolve(tempRoot, normalized);
      const pathFromTemp = relative(tempRoot, candidate);
      if (
        !pathFromTemp ||
        pathFromTemp.startsWith('..') ||
        isAbsolute(pathFromTemp)
      ) {
        throw new BadRequestException(
          `Output escapes run temp: ${output.path}`,
        );
      }
      const stat = await lstat(candidate);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new BadRequestException(
          `Output must be a regular file: ${output.path}`,
        );
      }
      const actualPath = await realpath(candidate);
      const actualRelative = relative(tempRoot, actualPath);
      if (actualRelative.startsWith('..') || isAbsolute(actualRelative)) {
        throw new BadRequestException(
          `Output resolves outside run temp: ${output.path}`,
        );
      }
      if (stat.size > MAX_OUTPUT_BYTES) {
        throw new BadRequestException(
          `Output exceeds size limit: ${output.path}`,
        );
      }
      outputs.push({
        ...output,
        path: normalized,
        absolutePath: actualPath,
        size: stat.size,
      });
    }
    return { result, outputs };
  }

  private parseResult(
    value: unknown,
    runId: string,
    stage: ResearchStage,
  ): ResearchAgentResult {
    if (!this.isRecord(value))
      throw new BadRequestException('result.json must contain an object');
    if (
      value.schemaVersion !== 1 ||
      value.runId !== runId ||
      value.stage !== stage ||
      value.status !== 'completed'
    ) {
      throw new BadRequestException(
        'result.json identity or schema does not match the run',
      );
    }
    if (
      !Array.isArray(value.outputs) ||
      value.outputs.length === 0 ||
      value.outputs.length > MAX_OUTPUTS
    ) {
      throw new BadRequestException(
        `result.json outputs must contain 1-${MAX_OUTPUTS} items`,
      );
    }
    if (
      !Array.isArray(value.warnings) ||
      !value.warnings.every((item) => typeof item === 'string')
    ) {
      throw new BadRequestException('result.json warnings must be strings');
    }
    const outputs = value.outputs.map((item, index) =>
      this.parseOutput(item, index),
    );
    return {
      schemaVersion: 1,
      runId,
      stage,
      status: 'completed',
      outputs,
      warnings: value.warnings,
    };
  }

  private parseOutput(
    value: unknown,
    index: number,
  ): ResearchAgentResultOutput {
    if (
      !this.isRecord(value) ||
      typeof value.path !== 'string' ||
      !isResearchArtifactRole(value.role) ||
      typeof value.mediaType !== 'string' ||
      !value.mediaType.trim() ||
      typeof value.simulated !== 'boolean'
    ) {
      throw new BadRequestException(`Invalid result output at index ${index}`);
    }
    if (value.metadata !== undefined && !this.isRecord(value.metadata)) {
      throw new BadRequestException(
        `Invalid output metadata at index ${index}`,
      );
    }
    return {
      path: value.path,
      role: value.role,
      mediaType: value.mediaType.trim(),
      simulated: value.simulated,
      ...(value.metadata !== undefined && { metadata: value.metadata }),
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
