/**
 * UI conversation summary cards (not Codex turns) for the current project.
 */
import { useEffect, useState } from 'react';
import { FileText, MessageSquareText } from 'lucide-react';
import { ArtifactPreviewDialog } from '@/components/research-workflow/artifact-preview-dialog';
import { researchWorkflowClient } from '@/components/research-workflow/research-workflow-client';
import type {
  ResearchArtifact,
  ResearchUiEvent,
} from '@/components/research-workflow/research-workflow-types';
import { useResearchProjectStore } from '@/stores/research-project-store';

export function ConversationEventCards({
  className,
}: {
  className?: string;
}) {
  const projectId = useResearchProjectStore((s) => s.project?.projectId ?? null);
  if (!projectId) return null;
  return (
    <ConversationEventCardsInner
      key={projectId}
      projectId={projectId}
      className={className}
    />
  );
}

function ConversationEventCardsInner({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  const demoEpoch = useResearchProjectStore((s) => s.demoEpoch);
  const [events, setEvents] = useState<ResearchUiEvent[]>([]);
  const [artifacts, setArtifacts] = useState<ResearchArtifact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ResearchArtifact | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [page, listed] = await Promise.all([
          researchWorkflowClient.listUiEvents(projectId, { limit: 40 }),
          researchWorkflowClient.listArtifacts(projectId),
        ]);
        if (cancelled) return;
        setEvents(page.events);
        setArtifacts(listed);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId, demoEpoch]);

  const byId = new Map(artifacts.map((a) => [a.artifactId, a]));

  return (
    <section className={className}>
      <div className="mb-2 flex items-center gap-2">
        <MessageSquareText className="size-4 text-[#1F4DCB]" />
        <h3 className="text-xs font-extrabold text-[#173778]">对话摘要卡片</h3>
        <span className="text-[10px] font-medium text-[#7890b6]">
          UI 事件 · 非模型 turn
        </span>
      </div>
      {error ? (
        <p className="text-[11px] text-[#b45309]">{error}</p>
      ) : events.length === 0 ? (
        <p className="text-[11px] font-medium text-[#7890b6]">
          载入研究数据或保存版本后，这里会显示可打开的文件摘要。
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => {
            const linked = (event.artifactIds ?? [])
              .map((id) => byId.get(id))
              .filter((a): a is ResearchArtifact => Boolean(a))
              .slice(0, 8);
            return (
              <li
                key={event.eventId}
                className="rounded-xl border border-[#d7e6fb] bg-white/90 px-3 py-2"
              >
                <p className="text-[11px] font-bold text-[#173778]">
                  {event.summary}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-[#7890b6]">
                  {event.kind}
                  {event.module ? ` · ${event.module}` : ''}
                  {event.runId ? ` · run ${event.runId.slice(0, 8)}` : ''}
                  {' · '}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
                {linked.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {linked.map((artifact) => (
                      <button
                        key={artifact.artifactId}
                        type="button"
                        onClick={() => setPreview(artifact)}
                        className="inline-flex max-w-full items-center gap-1 rounded-lg border border-[#c9dbf8] bg-[#f7faff] px-2 py-1 text-[10px] font-bold text-[#1F4DCB] hover:bg-[#eef4ff]"
                      >
                        <FileText className="size-3 shrink-0" />
                        <span className="truncate">{artifact.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {preview ? (
        <ArtifactPreviewDialog
          projectId={projectId}
          artifact={preview}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </section>
  );
}
