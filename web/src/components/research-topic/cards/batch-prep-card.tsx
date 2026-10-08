/**
 * Batch preparation card (T48).
 *
 * Shows the RE id range so the operator can map any downstream claim back to a
 * paper. The range is displayed rather than the full id list — 300 ids on
 * screen is noise, but "RE001 … RE217" is the fact that matters.
 */
import { Hash, Layers } from 'lucide-react';
import { StageCard, type StageStatus } from './stage-card';
import type { BatchPrepSummary } from './types';

export type BatchPrepCardProps = {
  summary: BatchPrepSummary | null;
  status: StageStatus;
  error?: string;
  onViewMarkdown?: () => void;
};

export function BatchPrepCard({
  summary,
  status,
  error,
  onViewMarkdown,
}: BatchPrepCardProps) {
  return (
    <StageCard
      title="预处理：编号与分批"
      status={status}
      error={error}
      onViewMarkdown={onViewMarkdown}
    >
      {summary ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-[#f7fbff] px-3 py-2">
              <p className="text-[10px] font-black tracking-[0.08em] text-[#8aa1c1] uppercase">
                总篇数
              </p>
              <p className="mt-0.5 text-lg font-black text-[#183b70]">{summary.totalPapers}</p>
            </div>
            <div className="rounded-xl bg-[#f7fbff] px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] font-black tracking-[0.08em] text-[#8aa1c1] uppercase">
                <Layers className="size-3" />
                批次数
              </p>
              <p className="mt-0.5 text-lg font-black text-[#183b70]">{summary.batchCount}</p>
            </div>
            <div className="rounded-xl bg-[#f7fbff] px-3 py-2 sm:col-span-2">
              <p className="flex items-center gap-1 text-[10px] font-black tracking-[0.08em] text-[#8aa1c1] uppercase">
                <Hash className="size-3" />
                编号区间
              </p>
              <p className="mt-0.5 font-mono text-sm font-black text-[#183b70]">
                {summary.firstRefId} … {summary.lastRefId}
              </p>
            </div>
          </div>

          <p className="text-[11px] font-semibold leading-5 text-[#617da9]">
            每批最多 {summary.batchSize} 篇；已生成 <code className="font-mono">references.csv</code>
            （含 <code className="font-mono">paper_id</code> 列）、
            <code className="font-mono">references.bib</code> 与
            <code className="font-mono">handoff.md</code>。
            后续所有 AI 结论都会引用编号，便于回溯原文。
          </p>
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未完成预处理。预处理会为最终名单编号（RE001…）并按 50 篇/份切批。
        </p>
      )}
    </StageCard>
  );
}
