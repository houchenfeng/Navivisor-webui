/**
 * Shared shell for every first-search / core-literature stage card.
 *
 * Centralising the status badge here matters for one reason: when a stage was
 * answered by the fallback model, every card must say so. Hiding that in one
 * card's bespoke markup is how "qwen answered this" quietly becomes invisible.
 */
import { useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Clock, Loader2, MinusCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StageStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';

const STATUS_LABEL: Record<StageStatus, string> = {
  idle: '未开始',
  queued: '排队中',
  running: '进行中',
  completed: '已完成',
  failed: '失败',
};

const STATUS_STYLE: Record<StageStatus, string> = {
  idle: 'bg-[#eef4fd] text-[#6b86ac]',
  queued: 'bg-[#eef4fd] text-[#4a6b9a]',
  running: 'bg-[#e7f0ff] text-[#1f4dcb]',
  completed: 'bg-[#e8f7ef] text-[#1d7a4d]',
  failed: 'bg-[#fff1f1] text-[#b64d57]',
};

function StatusIcon({ status }: { status: StageStatus }) {
  const className = 'size-3.5';
  switch (status) {
    case 'running':
      return <Loader2 className={cn(className, 'animate-spin')} />;
    case 'completed':
      return <CheckCircle2 className={className} />;
    case 'failed':
      return <XCircle className={className} />;
    case 'queued':
      return <Clock className={className} />;
    case 'idle':
      return <MinusCircle className={className} />;
  }
}

export type StageCardProps = {
  title: string;
  status: StageStatus;
  /** Which provider answered, when the stage called an AI provider. */
  provider?: 'codex' | 'http';
  /** True when the primary provider failed and the fallback answered. */
  fallbackUsed?: boolean;
  error?: string;
  /** Machine-readable warnings surfaced to the operator, e.g. insufficient_results. */
  warnings?: string[];
  /** Collapsed by default when the card is long. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Opens the raw Markdown artifact for this stage. */
  onViewMarkdown?: () => void;
  onDownload?: () => void;
  children?: ReactNode;
};

export function StageCard({
  title,
  status,
  provider,
  fallbackUsed,
  error,
  warnings,
  collapsible = false,
  defaultOpen = true,
  onViewMarkdown,
  onDownload,
  children,
}: StageCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const expanded = collapsible ? open : true;

  return (
    <section className="rounded-[24px] bg-white p-5 shadow-[0_12px_32px_rgba(42,83,143,0.10)]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={expanded}
              aria-label={expanded ? '折叠' : '展开'}
              className="grid size-6 shrink-0 place-items-center rounded-lg text-[#5f85b8] hover:bg-[#eef4fd]"
            >
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ) : null}
          <h3 className="truncate text-sm font-black tracking-[-0.01em] text-[#183b70]">{title}</h3>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {fallbackUsed ? (
            <span
              className="rounded-full bg-[#fff4e5] px-2.5 py-1 text-[11px] font-black text-[#9a6212]"
              title="主 provider 不可用，本阶段由兜底模型完成"
            >
              兜底模型{provider === 'http' ? '（qwen）' : ''}作答
            </span>
          ) : null}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black',
              STATUS_STYLE[status],
            )}
          >
            <StatusIcon status={status} />
            {STATUS_LABEL[status]}
          </span>
        </div>
      </header>

      {warnings?.length ? (
        <ul className="mt-3 space-y-1">
          {warnings.map((warning) => (
            <li
              key={warning}
              className="flex items-start gap-1.5 rounded-xl bg-[#fff8e8] px-3 py-2 text-[11px] font-semibold leading-5 text-[#8a6414]"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              {describeWarning(warning)}
            </li>
          ))}
        </ul>
      ) : null}

      {status === 'failed' && error ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#fff1f1] p-3 text-xs font-semibold leading-5 text-[#b64d57]" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {expanded ? (
        <div className="mt-4">
          {children}
          {onViewMarkdown || onDownload ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e8f0ff] pt-3">
              {onViewMarkdown ? (
                <button
                  type="button"
                  onClick={onViewMarkdown}
                  className="rounded-xl border border-[#9bbce8] px-3 py-1.5 text-xs font-black text-[#1f4dcb] hover:bg-[#f4f8ff]"
                >
                  查看 Markdown
                </button>
              ) : null}
              {onDownload ? (
                <button
                  type="button"
                  onClick={onDownload}
                  className="rounded-xl border border-[#9bbce8] px-3 py-1.5 text-xs font-black text-[#1f4dcb] hover:bg-[#f4f8ff]"
                >
                  下载
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** Maps a backend stage state onto the card's status vocabulary. */
export function toStageStatus(status: string | undefined): StageStatus {
  switch (status) {
    case 'queued':
    case 'running':
    case 'completed':
    case 'failed':
      return status;
    default:
      return 'idle';
  }
}

/** Human-readable labels for the machine-readable warnings. */
export const WARNING_LABEL: Record<string, string> = {
  insufficient_results: '命中文献不足 100 篇，已按实际数量继续（未补造数据）。',
  year_window_relaxed: '年份窗口已放宽。',
  query_plan_fallback: '检索式未由 AI 生成，已退回关键词兜底。',
  ai_fallback_used: '有阶段由兜底模型完成，结论请对照原文复核。',
};

export function describeWarning(warning: string): string {
  return WARNING_LABEL[warning] ?? warning;
}
