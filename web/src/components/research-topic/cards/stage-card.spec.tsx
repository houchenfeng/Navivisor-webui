import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  StageCard,
  describeWarning,
  toStageStatus,
} from './stage-card';

describe('StageCard status badge', () => {
  it.each([
    ['idle', '未开始'],
    ['queued', '排队中'],
    ['running', '进行中'],
    ['completed', '已完成'],
    ['failed', '失败'],
  ] as const)('renders the %s label', (status, label) => {
    render(<StageCard title="检索式" status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('surfaces the fallback provider so a qwen answer is never invisible', () => {
    render(
      <StageCard title="态势分析" status="completed" provider="http" fallbackUsed />,
    );
    expect(screen.getByText(/兜底模型（qwen）作答/)).toBeInTheDocument();
  });

  it('does not show the fallback badge when the primary provider answered', () => {
    render(
      <StageCard title="态势分析" status="completed" provider="codex" fallbackUsed={false} />,
    );
    expect(screen.queryByText(/兜底模型/)).not.toBeInTheDocument();
  });

  it('renders the error text only when the stage failed', () => {
    const { rerender } = render(
      <StageCard title="期刊分层" status="running" error="不该显示" />,
    );
    expect(screen.queryByText('不该显示')).not.toBeInTheDocument();

    rerender(<StageCard title="期刊分层" status="failed" error="模型返回空内容" />);
    expect(screen.getByRole('alert')).toHaveTextContent('模型返回空内容');
  });

  it('lists warnings with their human-readable labels', () => {
    render(
      <StageCard
        title="检索结果"
        status="completed"
        warnings={['insufficient_results', 'ai_fallback_used']}
      />,
    );
    expect(screen.getByText(/命中文献不足 100 篇/)).toBeInTheDocument();
    expect(screen.getByText(/由兜底模型完成/)).toBeInTheDocument();
  });
});

describe('StageCard collapsing', () => {
  it('is expanded by default', () => {
    render(
      <StageCard title="组合矩阵" status="completed" collapsible>
        <p>卡片正文</p>
      </StageCard>,
    );
    expect(screen.getByText('卡片正文')).toBeInTheDocument();
  });

  it('toggles the body when the header button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <StageCard title="组合矩阵" status="completed" collapsible>
        <p>卡片正文</p>
      </StageCard>,
    );

    await user.click(screen.getByRole('button', { name: '折叠' }));
    expect(screen.queryByText('卡片正文')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '展开' }));
    expect(screen.getByText('卡片正文')).toBeInTheDocument();
  });

  it('honours defaultOpen=false', () => {
    render(
      <StageCard title="概念词典" status="completed" collapsible defaultOpen={false}>
        <p>卡片正文</p>
      </StageCard>,
    );
    expect(screen.queryByText('卡片正文')).not.toBeInTheDocument();
  });

  it('cannot be collapsed when collapsible is not set', () => {
    render(
      <StageCard title="检索式" status="completed">
        <p>卡片正文</p>
      </StageCard>,
    );
    expect(screen.queryByRole('button', { name: '折叠' })).not.toBeInTheDocument();
    expect(screen.getByText('卡片正文')).toBeInTheDocument();
  });
});

describe('StageCard actions', () => {
  it('calls onViewMarkdown when the button is clicked', async () => {
    const user = userEvent.setup();
    const onViewMarkdown = vi.fn();
    render(
      <StageCard title="态势分析" status="completed" onViewMarkdown={onViewMarkdown} />,
    );

    await user.click(screen.getByRole('button', { name: '查看 Markdown' }));
    expect(onViewMarkdown).toHaveBeenCalledTimes(1);
  });

  it('hides the action row when no handler is provided', () => {
    render(<StageCard title="检索式" status="completed" />);
    expect(screen.queryByRole('button', { name: '查看 Markdown' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '下载' })).not.toBeInTheDocument();
  });
});

describe('toStageStatus', () => {
  it('passes known statuses through', () => {
    expect(toStageStatus('running')).toBe('running');
    expect(toStageStatus('failed')).toBe('failed');
  });

  it('falls back to idle for unknown or missing values', () => {
    expect(toStageStatus(undefined)).toBe('idle');
    expect(toStageStatus('weird')).toBe('idle');
  });
});

describe('describeWarning', () => {
  it('translates known warnings', () => {
    expect(describeWarning('insufficient_results')).toContain('未补造数据');
  });

  it('passes unknown warnings through unchanged', () => {
    expect(describeWarning('something_new')).toBe('something_new');
  });
});
