/**
 * Smoke tests for TopicPage.
 *
 * Written before splitting the file so the split has something to hold it to.
 * They assert the page's outward behaviour — which step is showing, what the
 * nav does, that the primer is shown once — rather than its internals, so they
 * survive a refactor that only moves code around.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopicPage } from './topic-page';

const navigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/components/research-workflow/use-research-project', () => ({
  useWorkspaceArtifacts: () => ({ projectId: null, artifacts: [], loading: false }),
  fetchArtifactText: vi.fn(async () => ''),
  findLatestByRole: () => undefined,
  parseCsvRows: () => [],
}));

vi.mock('@/stores/research-project-store', () => ({
  useResearchProjectStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ projectId: null, artifacts: [], activeRunId: null }),
}));

/** The primer dialog covers the page on a first visit, so dismiss it first. */
const PRIMER_SEEN = 'navivisor-topic-primer-seen';

describe('TopicPage', () => {
  beforeEach(() => {
    navigate.mockReset();
    window.localStorage.clear();
    window.localStorage.setItem(PRIMER_SEEN, '1');
  });

  it('shows the primer on a first visit and not on the next', async () => {
    const user = userEvent.setup();
    window.localStorage.removeItem(PRIMER_SEEN);
    const { unmount } = render(<TopicPage />);
    await user.click(screen.getByRole('button', { name: '知道了，开始开题' }));

    unmount();
    render(<TopicPage />);
    expect(
      screen.queryByRole('button', { name: '知道了，开始开题' }),
    ).not.toBeInTheDocument();
  });

  it('opens on the first step and names all three', () => {
    render(<TopicPage />);
    expect(screen.getAllByText('实验研究方向').length).toBeGreaterThan(0);
    expect(screen.getByText('交叉研究候选课题选取')).toBeInTheDocument();
    expect(screen.getByText('核心参考文献')).toBeInTheDocument();
  });

  it('marks the current step and leaves the others viewable', () => {
    render(<TopicPage />);
    expect(screen.getAllByText('当前查看')).toHaveLength(1);
    expect(screen.getAllByText('可查看')).toHaveLength(2);
  });

  it('switches to the second step when the nav is clicked', async () => {
    const user = userEvent.setup();
    render(<TopicPage />);
    await user.click(screen.getByRole('button', { name: /交叉研究候选课题选取/ }));
    // The first step's form is replaced by the second step's content.
    expect(screen.queryByLabelText(/研究方向/)).not.toBeInTheDocument();
  });

  it('returns to the first step', async () => {
    const user = userEvent.setup();
    render(<TopicPage />);
    await user.click(screen.getByRole('button', { name: /核心参考文献/ }));
    await user.click(screen.getByRole('button', { name: /实验研究方向/ }));
    expect(screen.getByLabelText(/研究方向/)).toBeInTheDocument();
  });

  it('keeps the typed research interest when the step changes', async () => {
    const user = userEvent.setup();
    render(<TopicPage />);
    await user.type(screen.getByLabelText(/研究方向/), '三维重建');
    await user.click(screen.getByRole('button', { name: /交叉研究候选课题选取/ }));
    await user.click(screen.getByRole('button', { name: /实验研究方向/ }));
    expect(screen.getByLabelText(/研究方向/)).toHaveValue('三维重建');
  });

  it('shows no process panel before a run exists', () => {
    render(<TopicPage />);
    expect(screen.queryByText(/第一段/)).not.toBeInTheDocument();
  });
});
