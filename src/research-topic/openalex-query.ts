/**
 * OpenAlex query construction.
 *
 * The AI planner (query-planner.ts) is the primary source of queries. This
 * module keeps a deterministic keyword-extraction fallback for when no AI
 * provider is reachable, so the pipeline degrades instead of failing.
 *
 * There are deliberately no hard-coded domain term lists here: the previous
 * `semantic segmentation` / `video anomaly` special cases made the system work
 * for exactly two research directions.
 */
import type { AiProviderFactory } from './ai/ai-provider.factory';
import { buildQueryPlan, type QueryPlan } from './query-planner';
import { toOpenAlexOql } from './query-renderers';

export type OpenAlexQueryPlan = {
  tier: 'focused' | 'balanced' | 'broad';
  reason: string;
  includeTerms: string[];
  excludeTitleTerms: string[];
  oql: string;
};

export type OpenAlexQueryOptions = {
  translatedTerms?: string[];
  /** Year window; defaults to the last five years. */
  yearFrom?: number;
  yearTo?: number;
};

const DEFAULT_WINDOW_YEARS = 5;

function defaultWindow(): { yearFrom: number; yearTo: number } {
  const yearTo = new Date().getFullYear();
  return { yearFrom: yearTo - (DEFAULT_WINDOW_YEARS - 1), yearTo };
}

export function buildOpenAlexQueryPlan(
  input: string,
  options?: OpenAlexQueryOptions,
): OpenAlexQueryPlan {
  return buildOpenAlexQueryPlans(input, options)[0];
}

/**
 * Deterministic fallback: extracts terms from the input and widens in tiers.
 * Used only when the AI planner is unavailable.
 */
export function buildOpenAlexQueryPlans(
  input: string,
  options: OpenAlexQueryOptions = {},
): OpenAlexQueryPlan[] {
  const terms = [
    ...new Set([...(options.translatedTerms ?? []), ...extractSearchTerms(input)]),
  ];
  const window = {
    yearFrom: options.yearFrom ?? defaultWindow().yearFrom,
    yearTo: options.yearTo ?? defaultWindow().yearTo,
  };

  const tiers: Array<{
    tier: OpenAlexQueryPlan['tier'];
    include: string[];
    exclude: string[];
    reason: string;
  }> = [
    {
      tier: 'focused',
      include: terms,
      exclude: [],
      reason: '兜底路径：直接使用输入中的可识别术语，未经过 AI 拆解。',
    },
    {
      tier: 'balanced',
      include: [...terms, 'research method', 'empirical study'],
      exclude: [],
      reason: '兜底路径：精准层结果不足，补充常见研究表达以扩大召回。',
    },
    {
      tier: 'broad',
      include: terms.slice(0, Math.max(1, Math.ceil(terms.length / 2))),
      exclude: [],
      reason: '兜底路径：前两层去重结果仍不足，收窄到核心术语避免完全无结果。',
    },
  ];

  return tiers
    .filter((tier) => tier.include.length > 0)
    .map((tier) =>
      makePlan(tier.tier, tier.include, tier.exclude, tier.reason, window),
    );
}

/**
 * Preferred path: ask the planner for concept groups, then render OQL from them.
 *
 * Returns `source: 'fallback'` instead of throwing when the AI is unreachable —
 * the caller records that in the run so the UI can say so.
 */
export async function buildOpenAlexQueryPlansWithAi(
  factory: AiProviderFactory,
  input: string,
  options: OpenAlexQueryOptions = {},
): Promise<{
  plans: OpenAlexQueryPlan[];
  source: 'ai' | 'fallback';
  plan?: QueryPlan;
  reason?: string;
}> {
  const window = {
    yearFrom: options.yearFrom ?? defaultWindow().yearFrom,
    yearTo: options.yearTo ?? defaultWindow().yearTo,
  };

  try {
    const plan = await buildQueryPlan(factory, {
      direction: input,
      yearFrom: window.yearFrom,
      yearTo: window.yearTo,
    });

    const focused = toOpenAlexOql(plan, window.yearFrom, window.yearTo);
    const plans: OpenAlexQueryPlan[] = [
      makePlanFromOql('focused', focused, plan.concepts.A, plan.exclusions, plan.rationale, window),
    ];

    // Widen by dropping the C group, then the B group, keeping the same window.
    if (plan.concepts.C.length) {
      plans.push(
        makePlanFromOql(
          'balanced',
          toOpenAlexOql(
            { concepts: { ...plan.concepts, C: [] }, exclusions: plan.exclusions },
            window.yearFrom,
            window.yearTo,
          ),
          [...plan.concepts.A, ...plan.concepts.B],
          plan.exclusions,
          '放宽：去掉场景/模态限制以扩大召回。',
          window,
        ),
      );
    }
    plans.push(
      makePlanFromOql(
        'broad',
        toOpenAlexOql(
          {
            concepts: { A: plan.concepts.A, B: [], C: [] },
            exclusions: plan.exclusions,
          },
          window.yearFrom,
          window.yearTo,
        ),
        plan.concepts.A,
        plan.exclusions,
        '保底：只保留研究对象本体，避免完全无结果。',
        window,
      ),
    );

    return { plans, source: 'ai', plan };
  } catch (error) {
    return {
      plans: buildOpenAlexQueryPlans(input, options),
      source: 'fallback',
      reason: (error as Error).message,
    };
  }
}

function makePlan(
  tier: OpenAlexQueryPlan['tier'],
  includeTerms: string[],
  excludeTitleTerms: string[],
  reason: string,
  window: { yearFrom: number; yearTo: number },
): OpenAlexQueryPlan {
  if (includeTerms.length === 0) throw new Error('NO_SEARCH_TERMS');
  return {
    tier,
    reason,
    includeTerms,
    excludeTitleTerms,
    oql: toOpenAlexOql(
      {
        concepts: { A: includeTerms, B: [], C: [] },
        exclusions: excludeTitleTerms,
      },
      window.yearFrom,
      window.yearTo,
    ),
  };
}

function makePlanFromOql(
  tier: OpenAlexQueryPlan['tier'],
  oql: string,
  includeTerms: string[],
  excludeTitleTerms: string[],
  reason: string,
  _window: { yearFrom: number; yearTo: number },
): OpenAlexQueryPlan {
  return { tier, reason, includeTerms, excludeTitleTerms, oql };
}

function extractSearchTerms(input: string): string[] {
  const phrases = input.match(/[A-Za-z][A-Za-z0-9]*(?:[ -][A-Za-z0-9]+){0,4}/g) ?? [];
  const english = [
    ...new Set(
      phrases.map((value) => value.trim().toLowerCase()).filter((value) => value.length >= 3),
    ),
  ];
  if (english.length > 0) return english.slice(0, 5);
  const chinese = input.match(/[\u3400-\u4dbf\u4e00-\u9fff]{2,}/g) ?? [];
  return [...new Set(chinese.map((value) => value.trim()).filter(Boolean))].slice(0, 5);
}
