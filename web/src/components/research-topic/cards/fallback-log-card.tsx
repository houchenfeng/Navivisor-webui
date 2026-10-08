/**
 * Fallback ladder card (T48).
 *
 * When the target was not reached the card names the first rung that produced
 * nothing. That rung is the narrowing culprit, and pointing at it is the whole
 * reason the ladder is logged rather than just reported as a final count.
 */
import { ArrowDownWideNarrow, CheckCircle2, XCircle } from 'lucide-react';
import { StageCard, type StageStatus } from './stage-card';
import type { FallbackAttempt } from './types';

const KIND_LABEL: Record<FallbackAttempt['kind'], string> = {
  combination: '检索组合',
  'year-window': '年份放宽',
  'document-type': '文献类型放宽',
  'score-threshold': '阈值放宽',
};

export type FallbackLogCardProps = {
  attempts: FallbackAttempt[] | null;
  satisfied: boolean;
  targetCount?: number;
  status: StageStatus;
  error?: string;
  onViewMarkdown?: () => void;
};

/** The first rung that yielded nothing; null when every rung produced papers. */
export function findNarrowingStep(attempts: FallbackAttempt[]): FallbackAttempt | null {
  return attempts.find((attempt) => attempt.accepted === 0) ?? null;
}

export function FallbackLogCard({
  attempts,
  satisfied,
  targetCount,
  status,
  error,
  onViewMarkdown,
}: FallbackLogCardProps) {
  const narrowing = attempts ? findNarrowingStep(attempts) : null;

  return (
    <StageCard
      title="阶梯式回退记录"
      status={status}
      error={error}
      collapsible
      defaultOpen
      onViewMarkdown={onViewMarkdown}
    >
      {attempts?.length ? (
        <div className="space-y-3">
          <p
            className={
              satisfied
                ? 'flex items-center gap-1.5 rounded-xl bg-[#e8f7ef] px-3 py-2 text-[11px] font-black text-[#1d7a4d]'
                : 'flex items-center gap-1.5 rounded-xl bg-[#fff8e8] px-3 py-2 text-[11px] font-black text-[#8a6414]'
            }
          >
            {satisfied ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
            {satisfied
              ? `已达到目标篇数${targetCount ? `（${targetCount} 篇）` : ''}。`
              : `未达到目标篇数${targetCount ? `（${targetCount} 篇）` : ''}，已按实际数量继续，未补造文献。`}
          </p>

          <ol className="space-y-1.5">
            {attempts.map((attempt) => (
              <li
                key={attempt.index}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-[#fbfdff] px-3 py-2"
              >
                <span className="grid size-5 shrink-0 place-items-center rounded-lg bg-[#eef4fd] text-[10px] font-black text-[#315a98]">
                  {attempt.index}
                </span>
                <span className="rounded-lg bg-[#f4f7fb] px-2 py-0.5 text-[10px] font-black text-[#6b86ac]">
                  {KIND_LABEL[attempt.kind]}
                </span>
                <span className="min-w-0 flex-1 text-[11px] font-semibold text-[#526e98]">
                  {attempt.label}
                </span>
                <span className="text-[11px] font-black text-[#183b70]">
                  命中 {attempt.found} · 采纳 {attempt.accepted}
                </span>
                {attempt.stopped ? (
                  <span className="rounded-full bg-[#e8f7ef] px-2 py-0.5 text-[10px] font-black text-[#1d7a4d]">
                    已停止
                  </span>
                ) : null}
              </li>
            ))}
          </ol>

          {!satisfied ? (
            <p className="flex items-start gap-2 rounded-xl bg-[#fff8e8] p-3 text-[11px] font-semibold leading-5 text-[#8a6414]">
              <ArrowDownWideNarrow className="mt-0.5 size-3.5 shrink-0" />
              {narrowing
                ? `第 ${narrowing.index} 步「${narrowing.label}」没有产出可用文献，该步骤对应的限制是主要瓶颈。`
                : '各步均有一定产出，但累计仍未达到目标篇数，说明该课题本身文献量偏少。'}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未触发回退。回退按「组合收窄 → 年份 → 文献类型 → 阈值」四级依次放宽。
        </p>
      )}
    </StageCard>
  );
}
