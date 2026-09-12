/**
 * Lightweight artifact preview — text/CSV/MD inline; PNG via blob URL; PDF via object URL.
 * Does not inject full content into the chat timeline.
 */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getAuthorizationHeader } from '@/auth-token';
import { researchWorkflowClient } from '@/components/research-workflow/research-workflow-client';
import type { ResearchArtifact } from '@/components/research-workflow/research-workflow-types';
import { artifactContentUrl } from '@/components/research-workflow/use-research-project';

type Props = {
  projectId: string;
  artifact: ResearchArtifact;
  onClose: () => void;
};

function isTextLike(mediaType: string, path: string): boolean {
  const lower = path.toLowerCase();
  if (
    mediaType.startsWith('text/') ||
    mediaType.includes('json') ||
    mediaType.includes('csv') ||
    mediaType.includes('markdown')
  ) {
    return true;
  }
  return /\.(md|txt|csv|json|jsonl|tex|bib|py|log)$/i.test(lower);
}

function isImage(mediaType: string, path: string): boolean {
  return mediaType.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(path);
}

function isPdf(mediaType: string, path: string): boolean {
  return mediaType.includes('pdf') || path.toLowerCase().endsWith('.pdf');
}

export function ArtifactPreviewDialog({ projectId, artifact, onClose }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      setText(null);
      setObjectUrl(null);
      try {
        if (isTextLike(artifact.mediaType, artifact.path)) {
          const body = await researchWorkflowClient.getArtifactContent(
            projectId,
            artifact.artifactId,
          );
          if (!cancelled) setText(body.slice(0, 200_000));
          return;
        }

        const url = artifactContentUrl(projectId, artifact.artifactId);
        const blob = await researchWorkflowClient.getArtifactBlob(
          projectId,
          artifact.artifactId,
        ).catch(async () => {
          const authorization = getAuthorizationHeader();
          const response = await fetch(url, {
            headers: authorization ? { Authorization: authorization } : {},
          });
          if (!response.ok) {
            throw new Error(`无法加载文件（${response.status}）`);
          }
          return response.blob();
        });
        createdUrl = URL.createObjectURL(blob);
        if (!cancelled) setObjectUrl(createdUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [projectId, artifact.artifactId, artifact.mediaType, artifact.path]);

  const versionHint =
    typeof artifact.metadata?.sourcePath === 'string'
      ? String(artifact.metadata.sourcePath)
      : artifact.path;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`预览 ${artifact.name}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-[#e8f0ff] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-[#173778]">
              {artifact.name}
            </p>
            <p className="truncate text-[11px] font-medium text-[#7890b6]">
              {artifact.role} · {versionHint}
              {artifact.simulated ? ' · 模拟' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#7890b6] hover:bg-[#f3f8ff]"
            aria-label="关闭预览"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {loading ? (
            <p className="text-sm text-[#7890b6]">加载中…</p>
          ) : error ? (
            <p className="text-sm text-[#b45309]">{error}</p>
          ) : text != null ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-[#173778]">
              {text}
            </pre>
          ) : objectUrl && isImage(artifact.mediaType, artifact.path) ? (
            <img
              src={objectUrl}
              alt={artifact.name}
              className="mx-auto max-h-[70vh] max-w-full object-contain"
            />
          ) : objectUrl && isPdf(artifact.mediaType, artifact.path) ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#55739f]">
                PDF 可通过下方链接打开或下载（不在对话时间线内嵌全文）。
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={objectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold text-[#1F4DCB] underline"
                >
                  打开 PDF
                </a>
                <a
                  href={objectUrl}
                  download={artifact.name}
                  className="text-sm font-bold text-[#1F4DCB] underline"
                >
                  下载
                </a>
              </div>
            </div>
          ) : objectUrl ? (
            <a
              href={objectUrl}
              download={artifact.name}
              className="text-sm font-bold text-[#1F4DCB] underline"
            >
              下载文件
            </a>
          ) : (
            <p className="text-sm text-[#7890b6]">无可预览内容</p>
          )}
        </div>
      </div>
    </div>
  );
}
