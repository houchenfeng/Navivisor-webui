/**
 * Turns a research direction into a structured QueryPlan.
 *
 * The AI is asked for concept groups plus draft queries for all three sources;
 * everything downstream (rendering, retrieval, the UI's query card) works off
 * this single object.
 */
import { AiProviderError, extractJsonPayload } from './ai/ai-provider';
import type { AiProviderFactory } from './ai/ai-provider.factory';
import {
  QUERY_GENERATION_SYSTEM,
  buildQueryGenerationPrompt,
} from './prompts/query-generation';

export type QueryPlan = {
  concepts: { A: string[]; B: string[]; C: string[] };
  openalex: { versionA: string; versionB: string };
  arxiv: { versionA: string; versionB: string };
  scopus: { versionA: string; versionB: string };
  exclusions: string[];
  rationale: string;
  provider: 'codex' | 'http';
  fallbackUsed: boolean;
};

export class QueryPlanError extends Error {
  readonly code = 'QUERY_PLAN_FAILED';

  constructor(message: string) {
    super(message);
    this.name = 'QueryPlanError';
  }
}

export type BuildQueryPlanInput = {
  direction: string;
  context?: string;
  yearFrom: number;
  yearTo: number;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function asQueryPair(value: unknown): { versionA: string; versionB: string } {
  const record = (value ?? {}) as Record<string, unknown>;
  return {
    versionA: typeof record.versionA === 'string' ? record.versionA.trim() : '',
    versionB: typeof record.versionB === 'string' ? record.versionB.trim() : '',
  };
}

/** Parses and validates the model's JSON into a QueryPlan. */
export function parseQueryPlan(
  raw: string,
  meta: { provider: 'codex' | 'http'; fallbackUsed: boolean },
): QueryPlan {
  let payload: unknown;
  try {
    payload = extractJsonPayload(raw);
  } catch (error) {
    throw new QueryPlanError(
      `检索式生成失败：${(error as Error).message}`,
    );
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new QueryPlanError('检索式生成失败：模型返回的不是 JSON 对象。');
  }
  const record = payload as Record<string, unknown>;
  const concepts = (record.concepts ?? {}) as Record<string, unknown>;

  const plan: QueryPlan = {
    concepts: {
      A: asStringArray(concepts.A),
      B: asStringArray(concepts.B),
      C: asStringArray(concepts.C),
    },
    openalex: asQueryPair(record.openalex),
    arxiv: asQueryPair(record.arxiv),
    scopus: asQueryPair(record.scopus),
    exclusions: asStringArray(record.exclusions),
    rationale: typeof record.rationale === 'string' ? record.rationale.trim() : '',
    provider: meta.provider,
    fallbackUsed: meta.fallbackUsed,
  };

  if (!plan.concepts.A.length) {
    throw new QueryPlanError('检索式生成失败：A 组（研究对象）为空。');
  }
  return plan;
}

/**
 * Produces a QueryPlan for the direction.
 *
 * Throws QueryPlanError when the model is unavailable or returns something
 * unusable — callers decide whether to degrade to keyword extraction.
 */
export async function buildQueryPlan(
  factory: AiProviderFactory,
  input: BuildQueryPlanInput,
): Promise<QueryPlan> {
  const prompt = buildQueryGenerationPrompt({
    direction: input.direction,
    context: input.context,
    yearFrom: input.yearFrom,
    yearTo: input.yearTo,
  });

  try {
    const completion = await factory.complete(prompt, {
      system: QUERY_GENERATION_SYSTEM,
    });
    return parseQueryPlan(completion.text, {
      provider: completion.provider,
      fallbackUsed: completion.fallbackUsed,
    });
  } catch (error) {
    if (error instanceof QueryPlanError) throw error;
    if (error instanceof AiProviderError) {
      throw new QueryPlanError(`检索式生成失败：${error.message}`);
    }
    throw new QueryPlanError(`检索式生成失败：${(error as Error).message}`);
  }
}
