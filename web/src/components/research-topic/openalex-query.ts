/**
 * Client-side preview of the OpenAlex query.
 *
 * The authoritative query is produced by the backend planner
 * (`src/research-topic/query-planner.ts`), which asks the AI to split the
 * direction into concept groups. This file only renders a *preview* so the
 * card can show something before the run starts.
 *
 * It therefore contains no domain term lists — the previous hard-coded
 * `semantic segmentation` / `video anomaly` branches made the preview wrong for
 * every other research direction.
 */

export type OpenAlexQueryPlan = {
  tier: 'focused' | 'balanced' | 'broad';
  reason: string;
  includeTerms: string[];
  excludeTitleTerms: string[];
  oql: string;
};

const DEFAULT_WINDOW_YEARS = 5;

function window(): { yearFrom: number; yearTo: number } {
  const yearTo = new Date().getFullYear();
  return { yearFrom: yearTo - (DEFAULT_WINDOW_YEARS - 1), yearTo };
}

export function buildOpenAlexQueryPlan(input: string): OpenAlexQueryPlan {
  return buildOpenAlexQueryPlans(input)[0];
}

export function buildOpenAlexQueryPlans(input: string): OpenAlexQueryPlan[] {
  const terms = extractSearchTerms(input);
  const { yearFrom, yearTo } = window();

  const tiers: Array<{
    tier: OpenAlexQueryPlan['tier'];
    include: string[];
    reason: string;
  }> = [
    {
      tier: 'focused',
      include: terms,
      reason: '预览：直接使用输入中的可识别术语。实际检索式由后端 AI 规划生成。',
    },
    {
      tier: 'balanced',
      include: [...terms, 'research method', 'empirical study'],
      reason: '预览：精准层结果不足时补充常见研究表达。',
    },
    {
      tier: 'broad',
      include: terms.slice(0, Math.max(1, Math.ceil(terms.length / 2))),
      reason: '预览：保底层只保留核心术语。',
    },
  ];

  return tiers
    .filter((tier) => tier.include.length > 0)
    .map((tier) => ({
      tier: tier.tier,
      reason: tier.reason,
      includeTerms: tier.include,
      excludeTitleTerms: [],
      oql:
        `title/abstract has (${tier.include.map(quote).join(' or ')})` +
        ` and from_publication_date:${yearFrom}-01-01` +
        ` and to_publication_date:${yearTo}-12-31`,
    }));
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

function quote(value: string): string {
  return `"${value.replaceAll('"', '')}"`;
}
