/**
 * Relevance self-check (T23).
 *
 * Inspects the newest slice of the candidate pool and asks the model whether
 * the retrieval is on target. When it is not, the returned refined concept
 * groups replace the current plan so the next search can be re-run.
 *
 * The check never "fixes" a run silently: the caller stores each round so the
 * operator can see what changed and why.
 */
import { AiProviderError, extractJsonPayload } from './ai/ai-provider';
import type { AiProviderFactory } from './ai/ai-provider.factory';
import {
  QUERY_REFINEMENT_SYSTEM,
  buildQueryRefinementPrompt,
} from './prompts/query-refinement';
import type { QueryPlanArtifact, RelevanceCheck } from './research-topic.types';
import { toArxivQuery, toOpenAlexOql } from './query-renderers';

export class RelevanceFeedbackError extends Error {
  readonly code = 'RELEVANCE_CHECK_FAILED';

  constructor(message: string) {
    super(message);
    this.name = 'RelevanceFeedbackError';
  }
}

export type RelevanceSample = {
  title: string;
  abstract?: string;
  keywords?: string;
};

export type RunRelevanceCheckInput = {
  direction: string;
  /** Newest-first sample of the pool, typically 20-50 entries. */
  samples: RelevanceSample[];
  currentPlan: QueryPlanArtifact;
  /** 1-based; the caller caps this at 3. */
  round: number;
  yearFrom: number;
  yearTo: number;
};

/** Samples newer than this are the ones worth judging. */
export const RELEVANCE_SAMPLE_SIZE = 50;
/** Hard cap on refinement rounds, per the plan. */
export const MAX_RELEVANCE_ROUNDS = 3;

function clampRatio(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  // Models sometimes answer with a percentage instead of a ratio.
  const normalized = numeric > 1 ? numeric / 100 : numeric;
  return Math.min(1, Math.max(0, normalized));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

/**
 * Parses the refinement response into a RelevanceCheck.
 *
 * `irrelevantSamples` drives the UI's "why were these wrong" list, so entries
 * without a title are dropped rather than rendered as blanks.
 */
export function parseRelevanceCheck(
  raw: string,
  meta: { round: number; sampleSize: number; yearFrom: number; yearTo: number },
  basePlan?: QueryPlanArtifact,
): RelevanceCheck {
  let payload: unknown;
  try {
    payload = extractJsonPayload(raw);
  } catch (error) {
    throw new RelevanceFeedbackError(
      `相关度自检失败：${(error as Error).message}`,
    );
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new RelevanceFeedbackError('相关度自检失败：模型返回的不是 JSON 对象。');
  }

  const record = payload as Record<string, unknown>;
  const rawSamples = Array.isArray(record.irrelevantSamples)
    ? record.irrelevantSamples
    : [];
  const irrelevantSamples = rawSamples
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const entry = item as Record<string, unknown>;
      const title = typeof entry.title === 'string' ? entry.title.trim() : '';
      if (!title) return null;
      return {
        title,
        reason:
          typeof entry.reason === 'string' ? entry.reason.trim() : '未说明原因',
      };
    })
    .filter((item): item is { title: string; reason: string } => item !== null);

  const concepts = (record.concepts ?? {}) as Record<string, unknown>;
  const refinedConcepts = {
    A: asStringArray(concepts.A),
    B: asStringArray(concepts.B),
    C: asStringArray(concepts.C),
  };

  // Only attach a refined plan when the model actually changed the concept
  // groups; otherwise the caller would loop on an identical query.
  let refinedQueryPlan: QueryPlanArtifact | undefined;
  if (basePlan && refinedConcepts.A.length) {
    const changed =
      JSON.stringify(refinedConcepts) !== JSON.stringify(basePlan.concepts) ||
      JSON.stringify(asStringArray(record.exclusions)) !==
        JSON.stringify(basePlan.exclusions);
    if (changed) {
      const exclusions = asStringArray(record.exclusions);
      refinedQueryPlan = {
        ...basePlan,
        concepts: refinedConcepts,
        exclusions,
        rationale:
          typeof record.rationale === 'string'
            ? record.rationale.trim()
            : basePlan.rationale,
        openalexOql: toOpenAlexOql(
          { concepts: refinedConcepts, exclusions },
          meta.yearFrom,
          meta.yearTo,
        ),
        arxivQuery: toArxivQuery({ concepts: refinedConcepts, exclusions }),
      };
    }
  }

  const judged = irrelevantSamples.length;
  return {
    round: meta.round,
    sampleSize: meta.sampleSize,
    relevantRatio: clampRatio(
      record.relevantRatio,
      meta.sampleSize > 0 ? Math.max(0, (meta.sampleSize - judged) / meta.sampleSize) : 0,
    ),
    irrelevantSamples,
    refinedQueryPlan,
  };
}

export async function runRelevanceCheck(
  factory: AiProviderFactory,
  input: RunRelevanceCheckInput,
): Promise<{ check: RelevanceCheck; provider: 'codex' | 'http'; fallbackUsed: boolean }> {
  const samples = input.samples.slice(0, RELEVANCE_SAMPLE_SIZE);
  const rendered = samples.map((sample) =>
    [sample.title, sample.abstract, sample.keywords]
      .filter(Boolean)
      .join(' ｜ '),
  );

  const prompt = buildQueryRefinementPrompt({
    direction: input.direction,
    currentPlan: {
      concepts: input.currentPlan.concepts,
      exclusions: input.currentPlan.exclusions,
    },
    offTargetSamples: rendered,
    offTargetCount: 0,
    inspectedCount: samples.length,
    attempt: input.round,
  });

  try {
    const completion = await factory.complete(prompt, {
      system: QUERY_REFINEMENT_SYSTEM,
    });
    return {
      check: parseRelevanceCheck(
        completion.text,
        {
          round: input.round,
          sampleSize: samples.length,
          yearFrom: input.yearFrom,
          yearTo: input.yearTo,
        },
        input.currentPlan,
      ),
      provider: completion.provider,
      fallbackUsed: completion.fallbackUsed,
    };
  } catch (error) {
    if (error instanceof RelevanceFeedbackError) throw error;
    if (error instanceof AiProviderError) {
      throw new RelevanceFeedbackError(`相关度自检失败：${error.message}`);
    }
    throw new RelevanceFeedbackError(
      `相关度自检失败：${(error as Error).message}`,
    );
  }
}
