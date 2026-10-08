import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BaselineCard } from './baseline-card';
import { BatchAnalysisCard, summarizeBatches } from './batch-analysis-card';
import { BatchPrepCard } from './batch-prep-card';
import { CoreQueryCard } from './core-query-card';
import { FallbackLogCard, findNarrowingStep } from './fallback-log-card';
import { PdfDownloadCard } from './pdf-download-card';
import { RelevanceScoreCard } from './relevance-score-card';
import { ReverseCitationCard } from './reverse-citation-card';
import { SeedPapersCard } from './seed-papers-card';
import { SynthesisCard } from './synthesis-card';
import { formatRatio } from './types';

describe('formatRatio', () => {
  it('renders a ratio as a percentage', () => {
    expect(formatRatio(0.625)).toBe('62.5%');
  });

  it('clamps out-of-range values instead of printing nonsense', () => {
    expect(formatRatio(1.4)).toBe('100.0%');
    expect(formatRatio(-0.2)).toBe('0.0%');
  });

  it('degrades to a dash for non-finite input', () => {
    expect(formatRatio(Number.NaN)).toBe('—');
  });
});

describe('CoreQueryCard', () => {
  const combinations = [
    { id: 'A+B+C' as const, reason: '最精确', oql: 'oql-abc', found: 12, accepted: 9 },
    { id: 'B+C' as const, reason: '换角度', oql: 'oql-bc', found: 0, accepted: 0 },
  ];

  it('shows found and accepted per combination', () => {
    render(<CoreQueryCard combinations={combinations} status="completed" />);
    expect(screen.getByText('命中 12')).toBeInTheDocument();
    expect(screen.getByText('采纳 9')).toBeInTheDocument();
  });

  it('explains a zero-hit combination rather than just showing 0', () => {
    render(<CoreQueryCard combinations={combinations} status="completed" />);
    expect(screen.getByText(/概念群过窄或术语选偏/)).toBeInTheDocument();
  });

  it('disables selection for an empty combination', () => {
    render(
      <CoreQueryCard combinations={combinations} status="completed" onSelect={vi.fn()} />,
    );
    const buttons = screen.getAllByRole('button', { name: '选用此组合' });
    expect(buttons[1]).toBeDisabled();
  });
});

describe('SeedPapersCard', () => {
  it('flags a seed that cannot be walked because it has no OpenAlex id', async () => {
        render(
      <SeedPapersCard
        seeds={[
          {
            refId: 'RE001',
            title: 'Walkable',
            venue: 'CVPR',
            year: 2020,
            citedByCount: 100,
            openalexWorkId: 'W123',
          },
          {
            refId: 'RE002',
            title: 'Not walkable',
            venue: 'arXiv',
            year: 2024,
            citedByCount: 50,
            openalexWorkId: null,
          },
        ]}
        status="completed"
      />,
    );
    expect(screen.getByText(/W123/)).toBeInTheDocument();
    expect(screen.getByText(/无 OpenAlex ID，无法做反向引用/)).toBeInTheDocument();
  });
});

describe('ReverseCitationCard', () => {
  it('distinguishes "lookup failed" from "no recent citations"', () => {
    render(
      <ReverseCitationCard
        hits={[]}
        failures={[{ seedWorkId: 'W999', reason: 'HTTP_500' }]}
        status="completed"
      />,
    );
    expect(screen.getByText(/不代表该种子没有近期引用/)).toBeInTheDocument();
    expect(screen.getByText(/W999：HTTP_500/)).toBeInTheDocument();
  });

  it('says a failed arXiv call is not the same as no new submissions', () => {
    render(
      <ReverseCitationCard
        hits={[]}
        arxivFailed
        arxivFailureReason="HTTP_429"
        status="completed"
      />,
    );
    expect(screen.getByText(/不是「确实没有新投稿」/)).toBeInTheDocument();
  });
});

describe('RelevanceScoreCard', () => {
  it('keeps unscored separate from rejected', async () => {
        render(
      <RelevanceScoreCard
        scores={[
          {
            refId: 'RE001',
            title: 'A',
            score: 5,
            relevant: true,
            reason: 'r',
            transferable: true,
            baselineCandidate: false,
          },
          {
            refId: 'RE002',
            title: 'B',
            score: 1,
            relevant: false,
            reason: 'r',
            transferable: false,
            baselineCandidate: false,
          },
        ]}
        unscored={['RE003']}
        status="completed"
      />,
    );
    expect(screen.getByText('通过')).toBeInTheDocument();
    expect(screen.getByText('淘汰')).toBeInTheDocument();
    expect(screen.getByText('未判定成功')).toBeInTheDocument();
    expect(screen.getByText(/不计入淘汰，需要重跑/)).toBeInTheDocument();
  });
});

describe('FallbackLogCard', () => {
  const attempts = [
    { index: 1, kind: 'combination' as const, label: 'A+B+C', found: 0, accepted: 0, stopped: false },
    { index: 2, kind: 'combination' as const, label: 'A', found: 40, accepted: 12, stopped: true },
  ];

  it('names the first rung that produced nothing', () => {
    expect(findNarrowingStep(attempts)?.index).toBe(1);
    render(
      <FallbackLogCard attempts={attempts} satisfied={false} targetCount={10} status="completed" />,
    );
    expect(screen.getByText(/第 1 步「A\+B\+C」没有产出可用文献/)).toBeInTheDocument();
  });

  it('says the topic itself is sparse when every rung produced papers', () => {
    const allProductive = attempts.map((attempt) => ({ ...attempt, accepted: 1 }));
    render(
      <FallbackLogCard attempts={allProductive} satisfied={false} targetCount={50} status="completed" />,
    );
    expect(screen.getByText(/该课题本身文献量偏少/)).toBeInTheDocument();
    expect(screen.getByText(/未补造文献/)).toBeInTheDocument();
  });

  it('has no narrowing section when the target was met', () => {
    const met = [attempts[1]];
    render(<FallbackLogCard attempts={met} satisfied targetCount={10} status="completed" />);
    expect(screen.queryByText(/没有产出可用文献/)).not.toBeInTheDocument();
  });
});

describe('BaselineCard', () => {
  it('warns when any entry was picked mechanically', () => {
    render(
      <BaselineCard
        baselines={[
          {
            title: 'P',
            method: 'm',
            metrics: 'F1',
            dataset: 'D',
            codeUrl: '',
            whyTransferable: 'w',
            fallback: true,
          },
        ]}
        status="completed"
      />,
    );
    expect(screen.getByText('机械选取')).toBeInTheDocument();
    expect(screen.getByText(/使用前需人工确认/)).toBeInTheDocument();
    expect(screen.getByText(/未提供代码链接/)).toBeInTheDocument();
  });

  it('affirms when every entry came from the model', () => {
    render(
      <BaselineCard
        baselines={[
          {
            title: 'P',
            method: 'm',
            metrics: 'F1',
            dataset: 'D',
            codeUrl: 'https://github.com/x/y',
            whyTransferable: 'w',
            fallback: false,
          },
        ]}
        status="completed"
      />,
    );
    expect(screen.getByText(/全部条目由 AI/)).toBeInTheDocument();
  });
});

describe('PdfDownloadCard', () => {
  it('lists the failure reasons rather than only the count', () => {
    render(
      <PdfDownloadCard
        report={{
          succeeded: 42,
          failed: 2,
          failures: [
            { refId: 'RE003', reason: 'Content-Type 不是 application/pdf' },
            { refId: 'RE009', reason: '超出体积上限' },
          ],
        }}
        status="completed"
      />,
    );
    expect(screen.getByText(/RE003/)).toBeInTheDocument();
    expect(screen.getByText(/Content-Type 不是 application\/pdf/)).toBeInTheDocument();
    expect(screen.getByText(/四重校验/)).toBeInTheDocument();
  });
});

describe('BatchPrepCard', () => {
  it('shows the id range instead of the full id list', () => {
    render(
      <BatchPrepCard
        summary={{
          totalPapers: 217,
          batchSize: 50,
          batchCount: 5,
          firstRefId: 'RE001',
          lastRefId: 'RE217',
        }}
        status="completed"
      />,
    );
    expect(screen.getByText('RE001 … RE217')).toBeInTheDocument();
    expect(screen.getByText('217')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

describe('BatchAnalysisCard', () => {
  it('distinguishes skipped from pending', async () => {
    const user = userEvent.setup();
    render(
      <BatchAnalysisCard
        batch={{ index: 3, refIdRange: 'RE101–RE150', status: 'skipped' }}
        status="completed"
      />,
    );
    await user.click(screen.getByRole('button', { name: '展开' }));
    expect(screen.getByText('已跳过（此前已完成）')).toBeInTheDocument();
  });

  it('summarises the batch list', () => {
    expect(
      summarizeBatches([
        { index: 1, refIdRange: 'a', status: 'completed' },
        { index: 2, refIdRange: 'b', status: 'skipped' },
        { index: 3, refIdRange: 'c', status: 'failed' },
        { index: 4, refIdRange: 'd', status: 'pending' },
      ]),
    ).toEqual({ total: 4, completed: 2, failed: 1 });
  });
});

describe('SynthesisCard', () => {
  it('labels the two modes differently', () => {
    const { rerender } = render(
      <SynthesisCard mode="meta" markdown={null} status="idle" />,
    );
    expect(screen.getByText('元分析 · 高创新课题')).toBeInTheDocument();

    rerender(<SynthesisCard mode="feasible" markdown={null} status="idle" />);
    expect(screen.getByText('降维 · 高可行性课题')).toBeInTheDocument();
  });

  it('renders the generated markdown and offers regeneration', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(
      <SynthesisCard
        mode="meta"
        markdown="# 课题一"
        status="completed"
        onGenerate={onGenerate}
      />,
    );
    expect(screen.getByText('# 课题一')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重新生成' }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('disables generation while running', () => {
    render(
      <SynthesisCard
        mode="feasible"
        markdown={null}
        status="running"
        onGenerate={vi.fn()}
        generating
      />,
    );
    expect(screen.getByRole('button', { name: '生成中…' })).toBeDisabled();
  });
});
