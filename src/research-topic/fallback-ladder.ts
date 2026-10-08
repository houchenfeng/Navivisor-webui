/**
 * Stepwise fallback for core-literature retrieval (T34).
 *
 * The course workflow specifies four widening steps. The important property is
 * that each step is *logged*: when the final pool is small, the operator must
 * be able to see which concept group or filter caused the narrowing, rather
 * than getting a bare count.
 *
 * The ladder never fabricates papers to reach the target.
 */
import type { CoreCombination, CombinationId, ConceptGroups } from './core-query';
import { buildCoreCombinations, combinationToOql } from './core-query';

export type LadderStepKind =
  | 'combination'
  | 'year-window'
  | 'document-type'
  | 'score-threshold';

export type LadderStep = {
  /** 1-based, in execution order. */
  index: number;
  kind: LadderStepKind;
  label: string;
  /** The combination to search at this step (undefined for non-search steps). */
  combination?: CoreCombination;
  yearFrom: number;
  yearTo: number;
  /** Extra OpenAlex type filter, e.g. 'preprint|conference-paper'. */
  typeFilter?: string;
  scoreThreshold: number;
};

export type BuildLadderInput = {
  groups: ConceptGroups;
  yearFrom: number;
  yearTo: number;
  /** Papers needed before the ladder stops widening. */
  targetCount: number;
  scoreThreshold: number;
};

/** How far back the year window is allowed to stretch. */
export const RELAXED_WINDOW_YEARS = 8;
/** Threshold used by the final rung. */
export const RELAXED_SCORE_THRESHOLD = 3;
/** OpenAlex type filter applied by the third rung. */
export const RELAXED_TYPE_FILTER = 'preprint|conference-paper';

/**
 * Expands the search one rung at a time.
 *
 * Step 1 walks the concept combinations from most to least specific; steps 2-4
 * each widen one constraint (years, document types, AI threshold) on the
 * broadest combination.
 */
export function buildLadder(input: BuildLadderInput): LadderStep[] {
  const combinations = buildCoreCombinations(input.groups);
  if (!combinations.length) return [];

  const steps: LadderStep[] = [];
  let index = 1;

  for (const combination of combinations) {
    steps.push({
      index: index++,
      kind: 'combination',
      label: `检索组合 ${combination.id}：${combination.reason}`,
      combination,
      yearFrom: input.yearFrom,
      yearTo: input.yearTo,
      scoreThreshold: input.scoreThreshold,
    });
  }

  const broadest = combinations[combinations.length - 1];
  const relaxedFrom = Math.min(
    input.yearFrom,
    input.yearTo - (RELAXED_WINDOW_YEARS - 1),
  );

  steps.push({
    index: index++,
    kind: 'year-window',
    label: `年份放宽到近 ${RELAXED_WINDOW_YEARS} 年（${relaxedFrom}-${input.yearTo}）。`,
    combination: broadest,
    yearFrom: relaxedFrom,
    yearTo: input.yearTo,
    scoreThreshold: input.scoreThreshold,
  });

  steps.push({
    index: index++,
    kind: 'document-type',
    label: '文献类型放宽：纳入预印本与会议论文。',
    combination: broadest,
    yearFrom: relaxedFrom,
    yearTo: input.yearTo,
    typeFilter: RELAXED_TYPE_FILTER,
    scoreThreshold: input.scoreThreshold,
  });

  steps.push({
    index: index++,
    kind: 'score-threshold',
    label: `AI 相关性阈值降到 ${RELAXED_SCORE_THRESHOLD}。`,
    combination: broadest,
    yearFrom: relaxedFrom,
    yearTo: input.yearTo,
    typeFilter: RELAXED_TYPE_FILTER,
    scoreThreshold: RELAXED_SCORE_THRESHOLD,
  });

  return steps;
}

export type LadderAttempt = {
  step: LadderStep;
  /** Papers found at this step. */
  found: number;
  /** Papers that passed the relevance threshold at this step. */
  accepted: number;
  /** True when the run stopped here. */
  stopped: boolean;
  note?: string;
};

export type LadderOutcome = {
  attempts: LadderAttempt[];
  /** True when the target was reached. */
  satisfied: boolean;
  /** Machine-readable warning when the target was not reached. */
  warning?: 'insufficient_results';
};

/**
 * Applies the ladder against a caller-supplied search function.
 *
 * Stops at the first step that yields `targetCount` accepted papers. The
 * caller owns the actual retrieval, so this stays testable without network.
 */
export async function runLadder(
  steps: LadderStep[],
  search: (step: LadderStep) => Promise<{ found: number; accepted: number }>,
  targetCount: number,
): Promise<LadderOutcome> {
  const attempts: LadderAttempt[] = [];
  let acceptedTotal = 0;

  for (const step of steps) {
    const { found, accepted } = await search(step);
    acceptedTotal += accepted;
    const stopped = acceptedTotal >= targetCount;
    attempts.push({
      step,
      found,
      accepted,
      stopped,
      note:
        accepted === 0
          ? '该步没有新增可用文献。'
          : undefined,
    });
    if (stopped) break;
  }

  return {
    attempts,
    satisfied: acceptedTotal >= targetCount,
    warning: acceptedTotal >= targetCount ? undefined : 'insufficient_results',
  };
}

/**
 * Renders the ladder log.
 *
 * When the target was not met, the first step that produced nothing is called
 * out explicitly — that step is the narrowing culprit.
 */
export function renderFallbackLog(
  outcome: LadderOutcome,
  targetCount: number,
): string {
  const lines = [
    '# 核心文献阶梯式回退日志',
    '',
    `目标篇数：${targetCount}`,
    `结果：${outcome.satisfied ? '已达成' : '未达成（未补造文献）'}`,
    '',
    '| 步骤 | 类型 | 说明 | 命中 | 采纳 | 是否停止 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...outcome.attempts.map(
      (attempt) =>
        `| ${attempt.step.index} | ${attempt.step.kind} | ${attempt.step.label} | ${attempt.found} | ${attempt.accepted} | ${attempt.stopped ? '是' : '否'} |`,
    ),
  ];

  if (!outcome.satisfied) {
    const firstEmpty = outcome.attempts.find((attempt) => attempt.accepted === 0);
    lines.push(
      '',
      '## 收窄原因',
      '',
      firstEmpty
        ? `第 ${firstEmpty.step.index} 步「${firstEmpty.step.label}」没有产出可用文献，说明该步骤对应的限制是主要瓶颈。`
        : '各步均有一定产出，但累计仍未达到目标篇数，说明该课题本身文献量偏少。',
    );
  }

  return lines.join('\n');
}
