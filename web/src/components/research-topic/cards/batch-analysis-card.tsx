/**
 * Per-batch analysis card (T48).
 *
 * One card per batch. A batch marked `skipped` says so explicitly — that state
 * means "already done in an earlier run", which is different from "pending",
 * and an operator resuming a run needs to tell them apart.
 */
import { CheckCircle2, Clock, Loader2, MinusCircle, XCircle } from 'lucide-react';
import { StageCard, type StageStatus } from './stage-card';
import type { BatchAnalysisEntry } from './types';

const BATCH_STATUS_LABEL: Record<BatchAnalysisEntry['status'], string> = {
  pending: '待分析',
  running: '分析中',
  completed: '已完成',
  failed: '失败',
  skipped: '已跳过（此前已完成）',
};

const BATCH_STATUS_TONE: Record<BatchAnalysisEntry['status'], string> = {
  pending: 'bg-[#eef4fd] text-[#4a6b9a]',
  running: 'bg-[#e7f0ff] text-[#1f4dcb]',
  completed: 'bg-[#e8f7ef] text-[#1d7a4d]',
  failed: 'bg-[#fff1f1] text-[#b64d57]',
  skipped: 'bg-[#f4f7fb] text-[#6b86ac]',
};

function BatchIcon({ status }: { status: BatchAnalysisEntry['status'] }) {
  const className = 'size-3.5';
  switch (status) {
    case 'running':
      return <Loader2 className={`${className} animate-spin`} />;
    case 'completed':
      return <CheckCircle2 className={className} />;
    case 'failed':
      return <XCircle className={className} />;
    case 'pending':
      return <Clock className={className} />;
    case 'skipped':
      return <MinusCircle className={className} />;
  }
}

export type BatchAnalysisCardProps = {
  batch: BatchAnalysisEntry;
  status: StageStatus;
  onViewMarkdown?: () => void;
};

export function BatchAnalysisCard({
  batch,
  status,
  onViewMarkdown,
}: BatchAnalysisCardProps) {
  return (
    <StageCard
      title={`第 ${String(batch.index).padStart(2, '0')} 批 · ${batch.refIdRange}`}
      status={status}
      error={batch.error}
      collapsible
      defaultOpen={batch.status === 'failed'}
      onViewMarkdown={onViewMarkdown}
    >
      <div className="space-y-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${BATCH_STATUS_TONE[batch.status]}`}
        >
          <BatchIcon status={batch.status} />
          {BATCH_STATUS_LABEL[batch.status]}
        </span>

        {batch.matrixPreview ? (
          <pre className="max-h-48 overflow-auto rounded-xl bg-[#f7fbff] p-3 text-[11px] font-semibold leading-5 text-[#263d65]">
            {batch.matrixPreview}
          </pre>
        ) : (
          <p className="text-[11px] font-semibold text-[#7892b7]">
            {batch.status === 'completed' || batch.status === 'skipped'
              ? '矩阵与报告已写入磁盘，点击「查看 Markdown」读取原文。'
              : '尚未产出分析结果。'}
          </p>
        )}
      </div>
    </StageCard>
  );
}

/** Summarises the batch list for the section header. */
export function summarizeBatches(batches: BatchAnalysisEntry[]): {
  total: number;
  completed: number;
  failed: number;
} {
  return {
    total: batches.length,
    completed: batches.filter(
      (batch) => batch.status === 'completed' || batch.status === 'skipped',
    ).length,
    failed: batches.filter((batch) => batch.status === 'failed').length,
  };
}
