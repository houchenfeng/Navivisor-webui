import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TopicProcessPanel, toBatchEntries } from './topic-process-panel';
import type { CoreAnalysisProgress, StageSnapshot } from './topic-workflow-contract';

function stages(partial: Record<string, Partial<StageSnapshot>>) {
  const out: Record<string, StageSnapshot> = {};
  for (const [name, value] of Object.entries(partial)) {
    out[name] = { status: 'completed', ...value } as StageSnapshot;
  }
  return out;
}

describe('toBatchEntries', () => {
  it('returns nothing when there is no progress', () => {
    expect(toBatchEntries(null)).toEqual([]);
  });

  it('falls back to the batch name when the ref-id range is unknown', () => {
    const progress: CoreAnalysisProgress = {
      totalBatches: 2,
      completedBatches: 1,
      batches: [
        { index: 0, name: 'batch-00', status: 'completed' },
        { index: 1, name: 'batch-01', status: 'pending' },
      ],
      updatedAt: '2026-10-08T00:00:00Z',
    };
    const entries = toBatchEntries(progress);
    expect(entries[0].name).toBe('batch-00');
    expect(entries[0].refIdRange).toBeUndefined();
  });

  it('uses the supplied range when the prep stage produced one', () => {
    const progress: CoreAnalysisProgress = {
      totalBatches: 1,
      completedBatches: 1,
      batches: [{ index: 0, name: 'batch-00', status: 'completed' }],
      updatedAt: '2026-10-08T00:00:00Z',
    };
    const entries = toBatchEntries(progress, () => 'A001–A150');
    expect(entries[0].refIdRange).toBe('A001–A150');
  });
});

describe('TopicProcessPanel', () => {
  it('renders both pipeline sections', () => {
    render(<TopicProcessPanel stages={{}} />);
    expect(screen.getByText(/第一段/)).toBeInTheDocument();
    expect(screen.getByText(/第二段/)).toBeInTheDocument();
  });

  it('shows the first section as idle before any stage runs', () => {
    render(<TopicProcessPanel stages={{}} />);
    expect(screen.getAllByText('未开始').length).toBeGreaterThan(0);
  });

  it('survives a null stage map', () => {
    render(<TopicProcessPanel stages={undefined} />);
    expect(screen.getByText(/第一段/)).toBeInTheDocument();
  });

  it('reads the first section payload out of the stage map', () => {
    render(
      <TopicProcessPanel
        stages={stages({
          landscape: { data: { landscape: { diagnosis: '该方向已有三类主流方法。' } } },
        })}
      />,
    );
    expect(screen.getByText(/三类主流方法/)).toBeInTheDocument();
  });

  it('ignores a stage payload of the wrong shape instead of throwing', () => {
    render(
      <TopicProcessPanel
        stages={stages({ landscape: { data: 'not-an-object' } })}
      />,
    );
    expect(screen.getByText(/第一段/)).toBeInTheDocument();
  });

  it('marks a second-section card idle when its payload is an empty list', () => {
    render(<TopicProcessPanel stages={{}} seeds={[]} />);
    expect(screen.getByText(/第二段/)).toBeInTheDocument();
  });

  it('marks a second-section card completed once its payload arrives', () => {
    render(
      <TopicProcessPanel
        stages={{}}
        seeds={[
          {
            refId: 'A001',
            title: 'Attention Is All You Need',
            venue: 'NeurIPS',
            year: 2017,
            citedByCount: 90000,
            openalexWorkId: 'W1',
          },
        ]}
      />,
    );
    expect(screen.getByText(/Attention Is All You Need/)).toBeInTheDocument();
  });

  it('renders one card per core-analysis batch', () => {
    const progress: CoreAnalysisProgress = {
      totalBatches: 2,
      completedBatches: 1,
      batches: [
        { index: 0, name: 'batch-00', status: 'completed' },
        { index: 1, name: 'batch-01', status: 'failed', error: '超时' },
      ],
      updatedAt: '2026-10-08T00:00:00Z',
    };
    render(<TopicProcessPanel stages={{}} coreProgress={progress} />);
    expect(screen.getByText(/第 01 批/)).toBeInTheDocument();
    expect(screen.getByText(/第 02 批/)).toBeInTheDocument();
    expect(screen.getByText(/1\/2 完成/)).toBeInTheDocument();
  });

  it('reports a failed batch count in the section header', () => {
    const progress: CoreAnalysisProgress = {
      totalBatches: 3,
      completedBatches: 2,
      batches: [
        { index: 0, name: 'batch-00', status: 'completed' },
        { index: 1, name: 'batch-01', status: 'failed', error: '超时' },
        { index: 2, name: 'batch-02', status: 'skipped' },
      ],
      updatedAt: '2026-10-08T00:00:00Z',
    };
    render(<TopicProcessPanel stages={{}} coreProgress={progress} />);
    expect(screen.getByText(/1 批失败/)).toBeInTheDocument();
  });

  it('does not render a batch section when there are no batches', () => {
    render(<TopicProcessPanel stages={{}} coreProgress={null} />);
    expect(screen.queryByText(/批失败/)).not.toBeInTheDocument();
  });

  it('routes artifact clicks to the named file', async () => {
    const user = userEvent.setup();
    const onViewArtifact = vi.fn();
    render(<TopicProcessPanel stages={{}} onViewArtifact={onViewArtifact} />);
    const buttons = screen.getAllByRole('button', { name: /查看 Markdown/ });
    await user.click(buttons[0]);
    expect(onViewArtifact).toHaveBeenCalled();
  });

  it('offers no generate button when no synthesize handler is wired', () => {
    render(<TopicProcessPanel stages={{}} />);
    for (const button of screen.getAllByRole('button', { name: /生成/ })) {
      expect(button).toBeDisabled();
    }
  });

  it('wires the meta and feasible synthesis buttons separately', async () => {
    const user = userEvent.setup();
    const onSynthesize = vi.fn();
    render(<TopicProcessPanel stages={{}} onSynthesize={onSynthesize} />);
    const buttons = screen.getAllByRole('button', { name: /生成/ });
    expect(buttons).toHaveLength(2);
    await user.click(buttons[0]);
    expect(onSynthesize).toHaveBeenCalledWith('meta');
    await user.click(buttons[1]);
    expect(onSynthesize).toHaveBeenCalledWith('feasible');
  });

  it('selects a candidate through the panel callback', async () => {
    const user = userEvent.setup();
    const onSelectCandidate = vi.fn();
    const candidate = {
      label: '较平衡' as const,
      title: '基于稀疏视角的三维重建',
      oneSentenceDefinition: '一句话。',
      researchDesign: '设计。',
      expectedInnovation: '创新。',
      rationale: '理由。',
    };
    render(
      <TopicProcessPanel
        stages={stages({ candidates: {} })}
        candidates={[candidate]}
        onSelectCandidate={onSelectCandidate}
      />,
    );
    const select = screen.getAllByRole('button', { name: '选择此题' })[0];
    await user.click(select);
    expect(onSelectCandidate).toHaveBeenCalledWith(candidate);
  });
});
