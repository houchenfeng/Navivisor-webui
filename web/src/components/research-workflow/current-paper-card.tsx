/**
 * Collapsible current-paper card: title, module status, recent files, open preview.
 */
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, FileStack, FileText } from 'lucide-react';
import { ArtifactPreviewDialog } from '@/components/research-workflow/artifact-preview-dialog';
import { researchWorkflowClient } from '@/components/research-workflow/research-workflow-client';
import type {
  ResearchArtifact,
  ResearchModule,
  ResearchWorkspace,
} from '@/components/research-workflow/research-workflow-types';
import { useResearchProjectStore } from '@/stores/research-project-store';
import { cn } from '@/lib/utils';

const MODULE_LABEL: Record<ResearchModule, string> = {
  topic: '开题',
  experiment: '实验',
  writing: '写作',
  submission: '投稿',
};

const STATUS_LABEL: Record<string, string> = {
  empty: '空',
  partial: '部分',
  ready: '就绪',
  external_modified: '外部已改',
};

export function CurrentPaperCard({
  className,
  defaultOpen = true,
  slim = false,
}: {
  className?: string;
  defaultOpen?: boolean;
  /** Compact strip for module headers. */
  slim?: boolean;
}) {
  const project = useResearchProjectStore((s) => s.project);
  const demoEpoch = useResearchProjectStore((s) => s.demoEpoch);
  const [open, setOpen] = useState(slim ? false : defaultOpen);
  const [workspace, setWorkspace] = useState<ResearchWorkspace | null>(null);
  const [artifacts, setArtifacts] = useState<ResearchArtifact[]>([]);
  const [preview, setPreview] = useState<ResearchArtifact | null>(null);

  useEffect(() => {
    let cancelled = false;
    const projectId = project?.projectId;
    if (!projectId) {
      return;
    }
    async function load() {
      try {
        const [ws, listed] = await Promise.all([
          researchWorkflowClient.getWorkspace(projectId!),
          researchWorkflowClient.listArtifacts(projectId!),
        ]);
        if (cancelled) return;
        setWorkspace(ws);
        setArtifacts(
          [...listed].sort(
            (a, b) => Number(b.createdAt) - Number(a.createdAt),
          ),
        );
      } catch {
        if (!cancelled) {
          setWorkspace(null);
          setArtifacts([]);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [project?.projectId, demoEpoch]);

  if (!project) return null;

  const shortPath =
    project.rootPath.length > 48
      ? `…${project.rootPath.slice(-46)}`
      : project.rootPath;

  const modules = workspace?.index?.modules;
  const fromCurrentFiles =
    modules != null
      ? (Object.keys(MODULE_LABEL) as ResearchModule[]).flatMap((key) =>
          (modules[key]?.currentFiles ?? [])
            .filter((file) => file.artifactId)
            .map((file) => {
              const match = artifacts.find((a) => a.artifactId === file.artifactId);
              return (
                match ??
                ({
                  artifactId: file.artifactId!,
                  runId: '',
                  projectId: project.projectId,
                  role: file.role ?? 'unknown',
                  name: file.path.split('/').pop() || file.path,
                  path: file.path,
                  mediaType: 'application/octet-stream',
                  size: 0,
                  sha256: file.sha256 ?? '',
                  simulated: false,
                  createdAt: 0,
                } satisfies ResearchArtifact)
              );
            }),
        )
      : [];
  const recent =
    fromCurrentFiles.length > 0
      ? fromCurrentFiles.slice(0, 12)
      : artifacts.slice(0, 6);

  return (
    <section
      className={cn(
        'rounded-2xl border border-[#d7e6fb] bg-white/90 p-3 shadow-sm backdrop-blur',
        slim && 'p-2.5',
        className,
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid size-8 place-items-center rounded-lg bg-[#e8f0ff] text-[#1F4DCB]">
          <FileStack className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-[#173778]">
            当前论文 · {workspace?.title || project.title}
          </p>
          <p className="truncate text-[11px] font-medium text-[#7890b6]">
            {shortPath}
          </p>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-[#7890b6]" />
        ) : (
          <ChevronDown className="size-4 text-[#7890b6]" />
        )}
      </button>
      {slim && !open && modules ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {(Object.keys(MODULE_LABEL) as ResearchModule[]).map((key) => (
            <span
              key={key}
              className="rounded-full bg-[#e8f0ff] px-2 py-0.5 text-[10px] font-bold text-[#1F4DCB]"
            >
              {MODULE_LABEL[key]} · {STATUS_LABEL[modules[key]?.status ?? 'empty'] ?? modules[key]?.status ?? 'empty'}
            </span>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="mt-2 space-y-2 border-t border-[#e8f0ff] pt-2 text-[11px] font-medium text-[#55739f]">
          {project.description || workspace?.description ? (
            <p>{project.description || workspace?.description}</p>
          ) : null}
          <p>
            数据包：{workspace?.demo?.id ?? '未选择'}
            {' · '}
            {project.demoComplete == null
              ? '未载入'
              : project.demoComplete
                ? '完整'
                : `部分（待补 ${project.missing?.length ?? 0} 项）`}
            {workspace?.index?.updatedAt
              ? ` · 最近保存 ${new Date(workspace.index.updatedAt).toLocaleString()}`
              : null}
          </p>
          {modules ? (
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(MODULE_LABEL) as ResearchModule[]).map((key) => (
                <span
                  key={key}
                  className="rounded-lg border border-[#d7e6fb] bg-[#f7faff] px-2 py-0.5 text-[10px] font-bold text-[#1F4DCB]"
                >
                  {MODULE_LABEL[key]} · {STATUS_LABEL[modules[key]?.status ?? 'empty'] ?? modules[key]?.status ?? 'empty'}
                </span>
              ))}
            </div>
          ) : null}
          {recent.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#7890b6]">当前文件</p>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((artifact) => (
                  <button
                    key={artifact.artifactId}
                    type="button"
                    onClick={() => setPreview(artifact)}
                    className="inline-flex max-w-full items-center gap-1 rounded-lg border border-[#c9dbf8] bg-white px-2 py-1 text-[10px] font-bold text-[#1F4DCB] hover:bg-[#f3f8ff]"
                  >
                    <FileText className="size-3 shrink-0" />
                    <span className="truncate">{artifact.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {preview ? (
        <ArtifactPreviewDialog
          projectId={project.projectId}
          artifact={preview}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </section>
  );
}
