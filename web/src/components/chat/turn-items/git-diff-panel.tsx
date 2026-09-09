/**
 * Shared Git diff panel backed by @git-diff-view/react.
 * Centralizes theme, Shiki highlighting, view-mode switching, and raw fallback.
 */
import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DiffModeEnum, DiffView } from '@git-diff-view/react';
import { getDiffViewHighlighter } from '@git-diff-view/shiki';
import '@git-diff-view/react/styles/diff-view.css';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { stripGitPathPrefix, ensureDiffHeaders } from '@/lib/diff-utils';
import { useThemeStore } from '@/stores/theme-store';

type DiffViewHighlighter = Awaited<ReturnType<typeof getDiffViewHighlighter>>;

let highlighterPromise: Promise<DiffViewHighlighter> | null = null;

interface GitDiffPanelProps {
  /** Unified diff patch string. */
  diff: string;
  /** File path used for DiffView metadata and as the default panel title. */
  filePath?: string;
  /** Whether to show the toolbar with file name and view-mode toggle. */
  showToolbar?: boolean;
  /** Additional class names for the panel root. */
  className?: string;
  /** Tailwind max-height class for the scrollable diff body. */
  maxHeightClassName?: string;
}

// ── Highlighter singleton ────────────────────────────────────────────

/** Lazily creates and reuses the Shiki highlighter used by git-diff-view. */
function loadHighlighter(): Promise<DiffViewHighlighter> {
  if (!highlighterPromise) {
    highlighterPromise = getDiffViewHighlighter()
      .then((highlighter) => {
        highlighter.setMaxLineToIgnoreSyntax(5000);
        return highlighter;
      })
      .catch((error) => {
        highlighterPromise = null;
        throw error;
      });
  }
  return highlighterPromise;
}

// ── Diff parsing utilities ───────────────────────────────────────────

/** Extracts the best old/new file names from unified diff headers. */
function parseFileNames(diff: string, fallback: string) {
  let oldFileName: string | undefined;
  let newFileName: string | undefined;
  for (const line of diff.split('\n')) {
    if (line.startsWith('--- ')) {
      const parsed = stripGitPathPrefix(line.slice(4));
      if (parsed && parsed !== '/dev/null') oldFileName = parsed;
    }
    if (line.startsWith('+++ ')) {
      const parsed = stripGitPathPrefix(line.slice(4));
      if (parsed && parsed !== '/dev/null') newFileName = parsed;
    }
    if (oldFileName && newFileName) break;
  }
  const display = newFileName ?? oldFileName ?? fallback;
  return { oldFileName: oldFileName ?? display, newFileName: newFileName ?? display, display };
}

/** Returns true when a diff has @@ hunks that DiffView can render. */
function hasRenderableHunks(diff: string): boolean {
  if (!diff.trim()) return false;
  return diff.split('\n').some((line) => line.startsWith('@@'));
}

// ── Raw fallback renderer ────────────────────────────────────────────

function rawLineClassName(line: string): string {
  if (line.startsWith('+') && !line.startsWith('+++')) return 'bg-green-500/10 text-green-400';
  if (line.startsWith('-') && !line.startsWith('---')) return 'bg-red-500/10 text-red-400';
  if (line.startsWith('@@')) return 'text-blue-400';
  if (line.startsWith('diff --git')) return 'font-semibold text-foreground';
  return 'text-muted-foreground';
}

/** Lightweight fallback for streaming, invalid, empty, or unsupported diffs. */
function RawDiffBlock({ diff, maxHeightClassName }: { diff: string; maxHeightClassName?: string }) {
  const lines = diff ? diff.split('\n') : [''];
  return (
    <pre
      className={cn(
        'overflow-auto p-3 font-mono text-xs leading-relaxed',
        'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20',
        maxHeightClassName,
      )}
    >
      {lines.map((line, i) => (
        <div key={i} className={rawLineClassName(line)}>{line}</div>
      ))}
    </pre>
  );
}

// ── Error boundary ───────────────────────────────────────────────────

interface BoundaryProps { resetKey: string; fallback: ReactNode; children: ReactNode }
interface BoundaryState { hasError: boolean }

/** Catches DiffView parse/render failures and falls back to raw diff text. */
class DiffRenderBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };
  static getDerivedStateFromError(): BoundaryState { return { hasError: true }; }
  componentDidUpdate(prev: BoundaryProps) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

// ── Main component ───────────────────────────────────────────────────

/** Renders a completed unified diff with DiffView and a raw fallback path. */
export function GitDiffPanel({
  diff,
  filePath,
  showToolbar = true,
  className,
  maxHeightClassName = 'max-h-64',
}: GitDiffPanelProps) {
  const { t } = useTranslation();
  const dark = useThemeStore((s) => s.dark);
  const [mode, setMode] = useState(DiffModeEnum.Unified);
  const [highlighter, setHighlighter] = useState<DiffViewHighlighter | null>(null);

  const fallbackName = filePath ?? t('Diff');
  const fileNames = useMemo(() => parseFileNames(diff, fallbackName), [diff, fallbackName]);
  const canRender = hasRenderableHunks(diff);
  const fullDiff = useMemo(() => ensureDiffHeaders(diff, filePath), [diff, filePath]);
  const diffData = useMemo(() => ({
    oldFile: { fileName: fileNames.oldFileName },
    newFile: { fileName: fileNames.newFileName },
    hunks: [fullDiff],
  }), [fullDiff, fileNames.oldFileName, fileNames.newFileName]);
  const theme = dark ? 'dark' : 'light';

  useEffect(() => {
    if (!canRender) return;
    let cancelled = false;
    void loadHighlighter()
      .then((h) => { if (!cancelled) setHighlighter(h); })
      .catch(() => { if (!cancelled) setHighlighter(null); });
    return () => { cancelled = true; };
  }, [canRender]);

  const fallback = <RawDiffBlock diff={diff} maxHeightClassName={maxHeightClassName} />;

  return (
    <div className={cn('border-t border-border', className)}>
      {showToolbar && (
        <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-background/30 px-3 py-1.5">
          <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
            {fileNames.display}
          </span>
          <div className="flex shrink-0 rounded-md border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setMode(DiffModeEnum.Unified)}
              className={cn(
                'rounded px-2 py-0.5 text-[11px] transition-colors',
                mode === DiffModeEnum.Unified
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t('Unified')}
            </button>
            <button
              type="button"
              onClick={() => setMode(DiffModeEnum.Split)}
              className={cn(
                'rounded px-2 py-0.5 text-[11px] transition-colors',
                mode === DiffModeEnum.Split
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t('Split')}
            </button>
          </div>
        </div>
      )}

      {canRender ? (
        <DiffRenderBoundary resetKey={`${mode}:${theme}:${fullDiff}`} fallback={fallback}>
          <div
            className={cn(
              'overflow-auto text-xs',
              'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20',
              maxHeightClassName,
            )}
          >
            <DiffView
              data={diffData}
              diffViewMode={mode}
              diffViewTheme={theme}
              diffViewHighlight={Boolean(highlighter)}
              diffViewWrap={false}
              diffViewFontSize={12}
              registerHighlighter={highlighter ?? undefined}
            />
          </div>
        </DiffRenderBoundary>
      ) : fallback}
    </div>
  );
}
