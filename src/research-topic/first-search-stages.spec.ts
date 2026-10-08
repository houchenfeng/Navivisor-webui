import { describe, expect, it } from 'vitest';
import {
  RelevanceFeedbackError,
  parseRelevanceCheck,
} from './relevance-feedback';
import { aggregateVenues, parseVenueTiering } from './venue-tiering';
import { renderPaperLines } from './landscape-analysis';
import {
  ResearchGapsError,
  deriveResearchGaps,
  renderResearchGapsMarkdown,
} from './research-gaps';
import type { QueryPlanArtifact, ResearchTopicPaper } from './research-topic.types';

function paper(overrides: Partial<ResearchTopicPaper> = {}): ResearchTopicPaper {
  return {
    openalexId: 'W1',
    title: 'A paper',
    authors: [],
    institutions: [],
    source: 'CVPR',
    publicationYear: 2023,
    citedByCount: 0,
    abstract: '',
    doi: '',
    landingUrl: '',
    sourceStatus: 'openalex_public_api',
    ...overrides,
  };
}

const BASE_PLAN: QueryPlanArtifact = {
  concepts: { A: ['geolocalization'], B: ['cross-view'], C: ['street view'] },
  openalex: { versionA: 'a', versionB: 'b' },
  arxiv: { versionA: 'a', versionB: 'b' },
  scopus: { versionA: 'a', versionB: 'b' },
  exclusions: [],
  rationale: 'base',
  provider: 'codex',
  fallbackUsed: false,
  openalexOql: 'title/abstract has ("geolocalization")',
  arxivQuery: 'all:"geolocalization"',
};

describe('parseRelevanceCheck', () => {
  it('reads the ratio and the irrelevant samples', () => {
    const check = parseRelevanceCheck(
      JSON.stringify({
        relevantRatio: 0.65,
        irrelevantSamples: [
          { title: 'A medical imaging paper', reason: '跨领域' },
        ],
      }),
      { round: 1, sampleSize: 20, yearFrom: 2021, yearTo: 2026 },
    );
    expect(check.relevantRatio).toBeCloseTo(0.65);
    expect(check.irrelevantSamples).toEqual([
      { title: 'A medical imaging paper', reason: '跨领域' },
    ]);
    expect(check.refinedQueryPlan).toBeUndefined();
  });

  it('normalizes a percentage answer into a ratio', () => {
    const check = parseRelevanceCheck(
      JSON.stringify({ relevantRatio: 80 }),
      { round: 1, sampleSize: 10, yearFrom: 2021, yearTo: 2026 },
    );
    expect(check.relevantRatio).toBeCloseTo(0.8);
  });

  it('drops samples without a title instead of rendering blanks', () => {
    const check = parseRelevanceCheck(
      JSON.stringify({
        relevantRatio: 0.5,
        irrelevantSamples: [{ reason: 'no title' }, { title: 'keep me' }],
      }),
      { round: 1, sampleSize: 4, yearFrom: 2021, yearTo: 2026 },
    );
    expect(check.irrelevantSamples).toHaveLength(1);
    expect(check.irrelevantSamples[0].title).toBe('keep me');
  });

  it('attaches a refined plan only when the concepts actually changed', () => {
    const unchanged = parseRelevanceCheck(
      JSON.stringify({
        concepts: BASE_PLAN.concepts,
        exclusions: [],
      }),
      { round: 1, sampleSize: 5, yearFrom: 2021, yearTo: 2026 },
      BASE_PLAN,
    );
    expect(unchanged.refinedQueryPlan).toBeUndefined();

    const changed = parseRelevanceCheck(
      JSON.stringify({
        concepts: { A: ['image geolocalization'], B: [], C: [] },
        exclusions: ['medical imaging'],
      }),
      { round: 2, sampleSize: 5, yearFrom: 2021, yearTo: 2026 },
      BASE_PLAN,
    );
    expect(changed.refinedQueryPlan?.concepts.A).toEqual(['image geolocalization']);
    expect(changed.refinedQueryPlan?.openalexOql).toContain('medical imaging');
  });

  it('throws a typed error on non-JSON output', () => {
    expect(() =>
      parseRelevanceCheck('无法完成', {
        round: 1,
        sampleSize: 5,
        yearFrom: 2021,
        yearTo: 2026,
      }),
    ).toThrow(RelevanceFeedbackError);
  });
});

describe('aggregateVenues', () => {
  it('counts papers per venue and sorts by count', () => {
    const venues = aggregateVenues([
      paper({ source: 'CVPR' }),
      paper({ source: 'CVPR', openalexId: 'W2' }),
      paper({ source: 'ICCV', openalexId: 'W3' }),
    ]);
    expect(venues[0]).toMatchObject({ name: 'CVPR', paperCount: 2 });
    expect(venues[1]).toMatchObject({ name: 'ICCV', paperCount: 1 });
  });

  it('buckets missing sources instead of dropping them', () => {
    const venues = aggregateVenues([paper({ source: '' })]);
    expect(venues[0].name).toBe('未标注来源');
    expect(venues[0].paperCount).toBe(1);
  });

  it('tracks the year span per venue', () => {
    const venues = aggregateVenues([
      paper({ publicationYear: 2019 }),
      paper({ publicationYear: 2024, openalexId: 'W2' }),
    ]);
    expect(venues[0].yearFrom).toBe(2019);
    expect(venues[0].yearTo).toBe(2024);
  });
});

describe('parseVenueTiering', () => {
  const venues = [
    { name: 'CVPR', paperCount: 6, sampleTitles: [] },
    { name: 'Some Journal', paperCount: 4, sampleTitles: [] },
  ];

  it('maps labels to tiers and computes the tier-1 share from our own counts', () => {
    const tiering = parseVenueTiering(
      JSON.stringify({
        tiers: [
          { name: 'CVPR', tier: '顶会顶刊' },
          { name: 'Some Journal', tier: '一般' },
        ],
        summary: '格局说明',
      }),
      venues,
    );
    expect(tiering.tiers[0]).toEqual({ tier: 1, name: 'CVPR', count: 6 });
    expect(tiering.topVenueRatio).toBeCloseTo(0.6);
    expect(tiering.note).toBe('格局说明');
  });

  it('ignores counts the model invents', () => {
    const tiering = parseVenueTiering(
      JSON.stringify({ tiers: [{ name: 'CVPR', tier: '顶会顶刊', count: 999 }] }),
      venues,
    );
    expect(tiering.tiers[0].count).toBe(6);
  });

  it('falls back to tier 3 for an unrecognized label', () => {
    const tiering = parseVenueTiering(
      JSON.stringify({ tiers: [{ name: 'CVPR', tier: '还行' }] }),
      venues,
    );
    expect(tiering.tiers[0].tier).toBe(3);
  });
});

describe('renderPaperLines', () => {
  it('emits stable RE ids with the four allowed fields only', () => {
    const lines = renderPaperLines([
      paper({ title: 'T1', source: 'CVPR', publicationYear: 2024 }),
      paper({ title: 'T2', openalexId: 'W2', source: '', publicationYear: null }),
    ]);
    expect(lines[0]).toBe('RE-001 | T1 | CVPR | 2024');
    expect(lines[1]).toBe('RE-002 | T2 | 未标注来源 | 未知');
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      paper({ openalexId: `W${i}`, title: `T${i}` }),
    );
    expect(renderPaperLines(many, 3)).toHaveLength(3);
  });
});

describe('deriveResearchGaps', () => {
  const payload = {
    combinationMatrix: [
      { combination: 'A+B', relation: 'strong', signal: '饱和' },
      { combination: 'A+C', relation: 'weak', signal: '上升' },
      { combination: 'A+D', relation: 'zero', maxUncertainty: '无直接题名共现证据' },
    ],
    signals: { saturated: ['D 方向'] },
    candidates: [
      { name: '方向一', relation: 'strong', evidenceStrength: 'strong' },
    ],
    priorities: [{ name: '方向一', novelty: '高' }],
    redTeam: [{ misjudgement: '可能已被做过', intercepted: true }],
  };

  it('classifies crowded, cross and zero-co-occurrence gaps', () => {
    const gaps = deriveResearchGaps(payload);
    expect(gaps.crowded.some((item) => item.includes('A+B'))).toBe(true);
    expect(gaps.crowded.some((item) => item.includes('D 方向'))).toBe(true);
    expect(gaps.crossGaps.some((item) => item.includes('方向一'))).toBe(true);
    expect(gaps.zeroCooccurrence).toHaveLength(1);
    expect(gaps.zeroCooccurrence[0]).toContain('无直接题名共现证据');
  });

  it('forces the caveat onto a zero-co-occurrence entry that omits it', () => {
    const gaps = deriveResearchGaps({
      combinationMatrix: [{ combination: 'A+D', relation: 'zero' }],
    });
    expect(gaps.zeroCooccurrence[0]).toContain('无直接题名共现证据');
  });

  it('records whether the red team finding was intercepted', () => {
    const gaps = deriveResearchGaps(payload);
    expect(gaps.redteam[0]).toContain('已被前置自筛拦截');
  });

  it('throws when there is nothing usable', () => {
    expect(() => deriveResearchGaps({})).toThrow(ResearchGapsError);
    expect(() => deriveResearchGaps(null)).toThrow(ResearchGapsError);
  });

  it('renders a Markdown report with every section present', () => {
    const md = renderResearchGapsMarkdown(deriveResearchGaps(payload), '单图地理定位');
    expect(md).toContain('# 研究空白识别 · 单图地理定位');
    expect(md).toContain('## 过于拥挤的方向');
    expect(md).toContain('## 零共现推测组合（高风险）');
    expect(md).toContain('## 红队复核');
  });
});
