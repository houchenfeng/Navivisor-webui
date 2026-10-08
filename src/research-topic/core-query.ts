/**
 * Core-literature concept groups and search combinations (T29).
 *
 * The course workflow is explicit about one thing: strip the "虚词" (abstract
 * filler like 机制 / 影响 / 赋能) before building the query, because those words
 * appear in every paper and destroy precision while adding nothing to recall.
 *
 * Concept groups come from the confirmed topic; combinations are generated in
 * decreasing specificity so the fallback ladder (T34) has something to walk
 * down without inventing new terms.
 */
import type { QueryPlan } from './query-planner';
import { toOpenAlexOql } from './query-renderers';

/**
 * Filler words that carry no retrieval signal in a Chinese research topic.
 *
 * Kept as an explicit list rather than a heuristic because false positives are
 * costly: dropping a real concept (e.g. 界面工程) silently narrows the search.
 */
export const FILLER_TERMS = [
  '机制',
  '机理',
  '影响',
  '赋能',
  '协同',
  '研究',
  '探索',
  '分析',
  '应用',
  '方法',
  '策略',
  '技术',
  '系统',
  '优化',
  '提升',
  '改进',
  '基于',
  '面向',
  '及其',
  '与',
  '和',
  '的',
] as const;

export type ConceptGroups = { A: string[]; B: string[]; C: string[] };

export type CombinationId = 'A+B+C' | 'A+B' | 'A+C' | 'B+C' | 'A';

export type CoreCombination = {
  id: CombinationId;
  groups: ConceptGroups;
  /** Why this combination is tried at this point in the ladder. */
  reason: string;
};

/** Removes filler terms from a single keyword. */
export function stripFiller(keyword: string): string {
  let result = keyword.trim();
  for (const filler of FILLER_TERMS) {
    // Chinese filler words concatenate without spaces, so a plain replace is
    // what actually matches; word-boundary logic would never fire.
    result = result.split(filler).join('');
  }
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Splits a confirmed topic into concept groups and drops filler terms.
 *
 * Returns an empty group rather than a filler-only group so callers can skip
 * combinations that would search on noise alone.
 */
export function buildConceptGroups(topic: string): ConceptGroups {
  // The course workflow joins concepts with "+"; fall back to splitting on the
  // usual separators when the topic was typed as prose.
  const raw = topic.includes('+')
    ? topic.split('+')
    : topic.split(/[，,、；;]/);

  const cleaned = raw
    .map((part) => stripFiller(part))
    .filter((part) => part.length > 0);

  return {
    A: cleaned.slice(0, 1),
    B: cleaned.slice(1, 2),
    C: cleaned.slice(2, 3),
  };
}

function groupsFor(id: CombinationId, groups: ConceptGroups): ConceptGroups {
  switch (id) {
    case 'A+B+C':
      return groups;
    case 'A+B':
      return { A: groups.A, B: groups.B, C: [] };
    case 'A+C':
      return { A: groups.A, B: [], C: groups.C };
    case 'B+C':
      return { A: groups.B, B: groups.C, C: [] };
    case 'A':
      return { A: groups.A, B: [], C: [] };
  }
}

const COMBINATION_ORDER: Array<{ id: CombinationId; reason: string }> = [
  { id: 'A+B+C', reason: '最精确：三个概念群同时命中。' },
  { id: 'A+B', reason: '放宽：去掉场景/模态限制。' },
  { id: 'A+C', reason: '放宽：去掉方法路线限制。' },
  { id: 'B+C', reason: '换角度：以方法+场景为主，弱化研究对象。' },
  { id: 'A', reason: '保底：只保留研究对象本体。' },
];

/** The concept groups a combination id actually names. */
const NAMED_GROUPS: Record<CombinationId, Array<keyof ConceptGroups>> = {
  'A+B+C': ['A', 'B', 'C'],
  'A+B': ['A', 'B'],
  'A+C': ['A', 'C'],
  'B+C': ['B', 'C'],
  A: ['A'],
};

/**
 * Generates the combinations worth searching, most specific first.
 *
 * A combination is only emitted when *every* group it names has terms: `A+B`
 * with an empty B is not a two-concept query, it is just `A`, and emitting it
 * would double-count the same search under two labels in the fallback ladder.
 */
export function buildCoreCombinations(groups: ConceptGroups): CoreCombination[] {
  const combinations: CoreCombination[] = [];

  for (const { id, reason } of COMBINATION_ORDER) {
    const named = NAMED_GROUPS[id];
    if (named.some((group) => groups[group].length === 0)) continue;
    combinations.push({ id, groups: groupsFor(id, groups), reason });
  }

  return combinations;
}

/** Renders a combination into the OQL sent to OpenAlex. */
export function combinationToOql(
  combination: CoreCombination,
  yearFrom: number,
  yearTo: number,
): string {
  return toOpenAlexOql(
    { concepts: combination.groups, exclusions: [] },
    yearFrom,
    yearTo,
  );
}

/** Renders the plan as the Markdown artifact persisted with the run. */
export function renderCoreQueryPlanMarkdown(
  topic: string,
  groups: ConceptGroups,
  combinations: CoreCombination[],
  yearFrom: number,
  yearTo: number,
): string {
  return [
    `# 核心文献检索策略 · ${topic}`,
    '',
    '## 概念群（已剔除虚词）',
    '',
    `- A 组（研究对象）：${groups.A.join('、') || '（空）'}`,
    `- B 组（方法路线）：${groups.B.join('、') || '（空）'}`,
    `- C 组（场景模态）：${groups.C.join('、') || '（空）'}`,
    '',
    `已剔除的虚词：${FILLER_TERMS.join('、')}`,
    '',
    '## 检索组合（由精确到宽泛）',
    '',
    ...combinations.map(
      (combination) =>
        `- \`${combination.id}\`｜${combination.reason}\n  \`\`\`\n  ${combinationToOql(combination, yearFrom, yearTo)}\n  \`\`\``,
    ),
  ].join('\n');
}

/** Convenience wrapper for callers that already have a QueryPlan. */
export function conceptGroupsFromPlan(plan: QueryPlan): ConceptGroups {
  return {
    A: plan.concepts.A.map(stripFiller).filter(Boolean),
    B: plan.concepts.B.map(stripFiller).filter(Boolean),
    C: plan.concepts.C.map(stripFiller).filter(Boolean),
  };
}
