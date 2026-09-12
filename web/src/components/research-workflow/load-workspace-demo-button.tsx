import { useState } from 'react';
import { FolderOpen, LoaderCircle } from 'lucide-react';
import { researchWorkflowClient } from '@/components/research-workflow/research-workflow-client';
import type { LoadDemoResult } from '@/components/research-workflow/research-workflow-types';
import { useResearchProjectStore } from '@/stores/research-project-store';
import { cn } from '@/lib/utils';

type Props = {
  compact?: boolean;
  className?: string;
  onLoaded?: (result: LoadDemoResult) => void;
};

export function LoadWorkspaceDemoButton({
  compact = false,
  className,
  onLoaded,
}: Props) {
  const project = useResearchProjectStore((s) => s.project);
  const setProject = useResearchProjectStore((s) => s.setProject);
  const bumpDemoEpoch = useResearchProjectStore((s) => s.bumpDemoEpoch);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    if (!project?.projectId) {
      setMessage('请先在首页选择论文工作目录');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await researchWorkflowClient.loadWorkspaceDemo(
        project.projectId,
      );
      const workspace = await researchWorkflowClient.getWorkspace(
        project.projectId,
      );
      setProject({
        projectId: workspace.projectId,
        title: workspace.title,
        rootPath: workspace.rootPath,
        description: workspace.description,
        demoComplete: result.complete,
        missing: result.missing,
      });
      bumpDemoEpoch();
      const summary = result.complete
        ? `完整 Demo 已载入（${result.loadedFiles} 项）${result.idempotent ? ' · 幂等复用' : ''}`
        : `部分载入：已有 ${result.loadedFiles} 项，待补 ${result.missing.length} 项`;
      setMessage(summary);
      onLoaded?.(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleClick()}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl border border-[#c9dbf8] bg-white font-bold text-[#1F4DCB] transition hover:bg-[#f3f8ff] disabled:opacity-60',
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
        )}
      >
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <FolderOpen className="size-4" />
        )}
        载入Demo
      </button>
      {message ? (
        <p className="text-[11px] font-medium leading-4 text-[#6781aa]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
