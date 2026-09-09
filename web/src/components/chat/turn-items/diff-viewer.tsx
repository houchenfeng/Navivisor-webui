/**
 * Turn-level unified diff viewer.
 * Shows the aggregated diff across all file changes in a turn,
 * split into per-file GitHub-style diff panels.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, GitBranch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { stripGitPathPrefix } from '@/lib/diff-utils';
import { GitDiffPanel } from './git-diff-panel';

interface Props {
  diff: string;
}

interface FileDiffSection {
  id: string;
  filePath: string;
  diff: string;
  additions: number;
  deletions: number;
}

/** Counts added content lines while excluding unified diff metadata. */
function countAdditions(lines: string[]): number {
  return lines.filter((line) => line.startsWith('+') && !line.startsWith('+++')).length;
}

/** Counts deleted content lines while excluding unified diff metadata. */
function countDeletions(lines: string[]): number {
  return lines.filter((line) => line.startsWith('-') && !line.startsWith('---')).length;
}

/** Extracts the new-side path from a diff --git header when possible. */
function filePathFromDiffHeader(line: string): string | null {
  const markerIndex = line.indexOf(' b/');
  if (markerIndex < 0) return null;
  return stripGitPathPrefix(line.slice(markerIndex + 1));
}

/** Picks the best display path for a file-level diff segment. */
function extractSectionFilePath(diff: string, index: number): string {
  let diffHeaderPath: string | null = null;
  let oldPath: string | null = null;
  let newPath: string | null = null;

  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ') && !diffHeaderPath) {
      diffHeaderPath = filePathFromDiffHeader(line);
    }

    if (line.startsWith('--- ')) {
      const parsed = stripGitPathPrefix(line.slice(4));
      if (parsed && parsed !== '/dev/null') oldPath = parsed;
    }

    if (line.startsWith('+++ ')) {
      const parsed = stripGitPathPrefix(line.slice(4));
      if (parsed && parsed !== '/dev/null') newPath = parsed;
    }
  }

  return newPath ?? oldPath ?? diffHeaderPath ?? `File ${index + 1}`;
}

/** Splits an aggregated git patch into per-file sections at diff --git boundaries. */
function splitFileDiffSections(diff: string): FileDiffSection[] {
  const sections: string[][] = [];
  let currentSection: string[] = [];

  const flushCurrentSection = () => {
    if (currentSection.some((line) => line.trim())) {
      sections.push(currentSection);
    }
    currentSection = [];
  };

  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ') && currentSection.length > 0) {
      flushCurrentSection();
    }
    currentSection.push(line);
  }

  flushCurrentSection();

  return sections.map((sectionLines, index) => {
    const filePath = extractSectionFilePath(sectionLines.join('\n'), index);
    return {
      id: `${index}-${filePath}`,
      filePath,
      diff: sectionLines.join('\n'),
      additions: countAdditions(sectionLines),
      deletions: countDeletions(sectionLines),
    };
  });
}

export function DiffViewer({ diff }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const sections = useMemo(() => splitFileDiffSections(diff), [diff]);
  const fileCount = sections.length;
  const additions = sections.reduce((total, section) => total + section.additions, 0);
  const deletions = sections.reduce((total, section) => total + section.deletions, 0);
  const fileCountLabel = fileCount === 1
    ? t('{{count}} file changed', { count: fileCount })
    : t('{{count}} files changed', { count: fileCount });

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 text-sm">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent/30"
      >
        <GitBranch className="h-3.5 w-3.5 text-purple-400" />
        <span className="font-medium">{fileCountLabel}</span>
        <span className="text-green-400">+{additions}</span>
        <span className="text-red-400">-{deletions}</span>
        <ChevronDown
          className={cn(
            'ml-auto h-3 w-3 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border p-2">
          {sections.length > 0 ? (
            sections.map((section) => (
              <GitDiffPanel
                key={section.id}
                diff={section.diff}
                filePath={section.filePath}
                className="overflow-hidden rounded-md border border-border/70 bg-background/40"
                maxHeightClassName="max-h-96"
              />
            ))
          ) : (
            <GitDiffPanel
              diff={diff}
              className="overflow-hidden rounded-md border border-border/70 bg-background/40"
              maxHeightClassName="max-h-96"
            />
          )}
        </div>
      )}
    </div>
  );
}
