import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CandidateTopicCard, needsVerification } from './candidate-topic-card';
import { QueryPlanCard } from './query-plan-card';
import { RelevanceCard, MAX_RELEVANCE_ROUNDS } from './relevance-card';
import { ResearchGapCard } from './research-gap-card';
import { SearchResultCard } from './search-result-card';
import { VenueTierCard } from './venue-tier-card';
import type { QueryPlanArtifact, RelevanceCheck } from './types';

const PLAN: QueryPlanArtifact = {
  concepts: { A: ['geolocalization'], B: ['cross-view'], C: ['street view'] },
  openalex: { versionA: 'draft-a', versionB: 'draft-b' },
  arxiv: { versionA: 'ax-a', versionB: 'ax-b' },
  scopus: { versionA: 'sc-a', versionB: 'sc-b' },
  exclusions: ['medical imaging'],
  rationale: '拆成对象/方法/场景三组',
  provider: 'codex',
  fallbackUsed: false,
  openalexOql: 'title/abstract has ("geolocalization")',
  arxivQuery: 'all:"geolocalization"',
};

describe('QueryPlanCard', () => {
  it('shows the OQL that was actually sent, not just the draft', () => {
    render(<QueryPlanCard plan={PLAN} status="completed" />);
    expect(screen.getByText('title/abstract has ("geolocalization")')).toBeInTheDocument();
    expect(screen.getByText('all:"geolocalization"')).toBeInTheDocument();
  });

  it('renders the concept groups and the exclusions', () => {
    render(<QueryPlanCard plan={PLAN} status="completed" />);
    expect(screen.getByText('geolocalization')).toBeInTheDocument();
    expect(screen.getByText('cross-view')).toBeInTheDocument();
    expect(screen.getByText(/排除项：medical imaging/)).toBeInTheDocument();
  });

  it('switches which draft version is shown', async () => {
    const user = userEvent.setup();
    render(<QueryPlanCard plan={PLAN} status="completed" />);
    expect(screen.getByText(/draft-a/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /概念拆分式/ }));
    expect(screen.getByText(/draft-b/)).toBeInTheDocument();
  });

  it('explains the empty state instead of rendering nothing', () => {
    render(<QueryPlanCard plan={null} status="idle" />);
    expect(screen.getByText(/尚未生成检索式/)).toBeInTheDocument();
  });
});

describe('SearchResultCard', () => {
  it('shows the per-source split and the merged count', () => {
    render(
      <SearchResultCard
        data={{ openalex: 120, arxiv: 8, merged: 121, yearFrom: 2021, yearTo: 2026 }}
        status="completed"
      />,
    );
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('121')).toBeInTheDocument();
    expect(screen.getByText('2021–2026')).toBeInTheDocument();
  });

  it('surfaces the insufficient_results warning in Chinese', () => {
    render(
      <SearchResultCard
        data={{ openalex: 40, arxiv: 0, merged: 40, yearFrom: 2021, yearTo: 2026 }}
        status="completed"
        warnings={['insufficient_results']}
      />,
    );
    expect(screen.getByText(/命中文献不足 100 篇/)).toBeInTheDocument();
  });
});

describe('RelevanceCard', () => {
  const check: RelevanceCheck = {
    round: 1,
    sampleSize: 50,
    relevantRatio: 0.62,
    irrelevantSamples: [{ title: 'A medical paper', reason: '跨领域' }],
  };

  it('shows the ratio, the sample count and the round', () => {
    render(<RelevanceCard check={check} status="completed" />);
    expect(screen.getByText('62.0%')).toBeInTheDocument();
    expect(screen.getByText(/抽查 50 篇 · 第 1\/3 轮/)).toBeInTheDocument();
  });

  it('lists the irrelevant samples with their reasons', () => {
    render(<RelevanceCard check={check} status="completed" />);
    expect(screen.getByText('A medical paper')).toBeInTheDocument();
    expect(screen.getByText(/跨领域/)).toBeInTheDocument();
  });

  it('says the concept groups were unchanged when there is no refined plan', () => {
    render(<RelevanceCard check={check} status="completed" />);
    expect(screen.getByText(/本轮未改动概念组/)).toBeInTheDocument();
  });

  it('disables the refine button at the round cap', () => {
    render(
      <RelevanceCard
        check={{ ...check, round: MAX_RELEVANCE_ROUNDS }}
        status="completed"
        onRefine={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: '不满意，再优化' })).toBeDisabled();
    expect(screen.getByText(/已达 3 轮上限/)).toBeInTheDocument();
  });

  it('allows refining below the cap', async () => {
    const user = userEvent.setup();
    const onRefine = vi.fn();
    render(<RelevanceCard check={check} status="completed" onRefine={onRefine} />);

    await user.click(screen.getByRole('button', { name: '不满意，再优化' }));
    expect(onRefine).toHaveBeenCalledTimes(1);
  });
});

describe('VenueTierCard', () => {
  it('headlines the tier-1 share rather than the raw counts', () => {
    render(
      <VenueTierCard
        tiering={{
          tiers: [
            { tier: 1, name: 'CVPR', count: 6 },
            { tier: 3, name: 'Some Journal', count: 4 },
          ],
          topVenueRatio: 0.6,
          note: '格局说明',
        }}
        status="completed"
      />,
    );
    expect(screen.getByText('60.0%')).toBeInTheDocument();
    expect(screen.getByText('CVPR')).toBeInTheDocument();
    expect(screen.getByText('6 篇')).toBeInTheDocument();
    expect(screen.getByText('格局说明')).toBeInTheDocument();
  });

  it('states when a tier has no venues instead of rendering an empty list', () => {
    render(
      <VenueTierCard
        tiering={{ tiers: [{ tier: 1, name: 'CVPR', count: 1 }], topVenueRatio: 1, note: '' }}
        status="completed"
      />,
    );
    expect(screen.getAllByText('该梯队没有命中场所。')).toHaveLength(2);
  });
});

describe('ResearchGapCard', () => {
  const gaps = {
    crowded: ['A+B（饱和）'],
    crossGaps: ['方向一（关系：strong，证据强度：strong）'],
    zeroCooccurrence: ['A+D（无直接题名共现证据）'],
    redteam: ['可能已被做过（已被前置自筛拦截）'],
  };

  it('renders all four gap sections', () => {
    render(<ResearchGapCard gaps={gaps} status="completed" />);
    expect(screen.getByText('过于拥挤的方向')).toBeInTheDocument();
    expect(screen.getByText('交叉空白与候选方向')).toBeInTheDocument();
    expect(screen.getByText('红队复核')).toBeInTheDocument();
  });

  it('labels zero-co-occurrence gaps as high risk in the heading itself', () => {
    render(<ResearchGapCard gaps={gaps} status="completed" />);
    expect(
      screen.getByText('零共现推测组合（高风险，无直接题名共现证据）'),
    ).toBeInTheDocument();
  });
});

describe('CandidateTopicCard', () => {
  const candidate = {
    label: '偏可行' as const,
    title: '在现有 baseline 上加轻量模块',
    oneSentenceDefinition: '一句话',
    researchDesign: '技术路线',
    expectedInnovation: '预期创新',
    rationale: '依据 RE-001',
  };

  it('renders the risk label and the evidence line', () => {
    render(<CandidateTopicCard candidates={[candidate]} status="completed" />);
    expect(screen.getByText('偏可行')).toBeInTheDocument();
    expect(screen.getByText('依据 RE-001')).toBeInTheDocument();
  });

  it('flags a candidate whose evidence is not yet verified', () => {
    render(
      <CandidateTopicCard
        candidates={[{ ...candidate, rationale: '证据不足，待核验' }]}
        status="completed"
      />,
    );
    expect(screen.getByText(/⚠️ 证据不足，待核验/)).toBeInTheDocument();
  });

  it('calls onSelect with the chosen candidate', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CandidateTopicCard candidates={[candidate]} status="completed" onSelect={onSelect} />,
    );

    await user.click(screen.getByRole('button', { name: '选择此题' }));
    expect(onSelect).toHaveBeenCalledWith(candidate);
  });

  it('marks the selected candidate', () => {
    render(
      <CandidateTopicCard
        candidates={[candidate]}
        status="completed"
        selectedLabel="偏可行"
      />,
    );
    expect(screen.getByText('已选择')).toBeInTheDocument();
  });
});

describe('needsVerification', () => {
  it('detects the 待核验 marker', () => {
    expect(
      needsVerification({
        label: '偏可行',
        title: 't',
        oneSentenceDefinition: '',
        researchDesign: '',
        expectedInnovation: '',
        rationale: '待核验',
      }),
    ).toBe(true);
    expect(
      needsVerification({
        label: '偏可行',
        title: 't',
        oneSentenceDefinition: '',
        researchDesign: '',
        expectedInnovation: '',
        rationale: '依据 RE-001',
      }),
    ).toBe(false);
  });
});
