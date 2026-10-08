/**
 * Baseline candidate card (T48).
 *
 * Entries picked mechanically (by citation count, when the model could not
 * decide) are marked. Presenting a mechanically chosen paper as a verified
 * baseline is exactly the kind of over-claim that wastes a student's first
 * month, so the distinction stays visible.
 */
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { StageCard, type StageStatus } from './stage-card';
import type { BaselineCandidate } from './types';

export type BaselineCardProps = {
  baselines: BaselineCandidate[] | null;
  note?: string;
  status: StageStatus;
  error?: string;
  onViewMarkdown?: () => void;
};

export function BaselineCard({
  baselines,
  note,
  status,
  error,
  onViewMarkdown,
}: BaselineCardProps) {
  const usedFallback = baselines?.some((entry) => entry.fallback) ?? false;

  return (
    <StageCard
      title="可用 baseline 候选"
      status={status}
      error={error}
      collapsible
      defaultOpen
      onViewMarkdown={onViewMarkdown}
    >
      {baselines?.length ? (
        <div className="space-y-3">
          {usedFallback ? (
            <p className="flex items-start gap-2 rounded-xl bg-[#fff8e8] p-3 text-[11px] font-semibold leading-5 text-[#8a6414]">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              部分条目为按被引量机械选取，未核查可复现性，使用前需人工确认。
            </p>
          ) : (
            <p className="rounded-xl bg-[#e8f7ef] p-3 text-[11px] font-semibold leading-5 text-[#1d7a4d]">
              全部条目由 AI 依据「有公开代码 / 可复现 / 指标可比 / 数据集一致」判据选出。
            </p>
          )}

          <ul className="space-y-2">
            {baselines.map((baseline, index) => (
              <li key={baseline.title} className="rounded-2xl border border-[#d8e5f6] bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="min-w-0 flex-1 text-[11px] font-black leading-5 text-[#244a7d]">
                    {index + 1}. {baseline.title}
                  </h4>
                  {baseline.fallback ? (
                    <span className="shrink-0 rounded-full bg-[#fff4e5] px-2 py-0.5 text-[10px] font-black text-[#9a6212]">
                      机械选取
                    </span>
                  ) : null}
                </div>

                <dl className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-3">
                  {[
                    ['方法', baseline.method],
                    ['指标', baseline.metrics],
                    ['数据集', baseline.dataset],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[10px] font-black tracking-[0.08em] text-[#8aa1c1] uppercase">
                        {label}
                      </dt>
                      <dd className="text-[11px] font-semibold text-[#526e98]">{value || '未给出'}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-2 text-[11px] font-semibold leading-5 text-[#617da9]">
                  可迁移理由：{baseline.whyTransferable || '未给出'}
                </p>

                {baseline.codeUrl ? (
                  <a
                    href={baseline.codeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-black text-[#1f4dcb] underline"
                  >
                    <ExternalLink className="size-3" />
                    代码仓库
                  </a>
                ) : (
                  <p className="mt-1.5 text-[11px] font-semibold text-[#8a6414]">
                    未提供代码链接，需确认是否可复现。
                  </p>
                )}
              </li>
            ))}
          </ul>

          {note ? (
            <p className="text-[11px] font-semibold leading-5 text-[#617da9]">{note}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未挑选 baseline。若 AI 无法确认可复现的对比方法，会退回按被引量机械选取并标注。
        </p>
      )}
    </StageCard>
  );
}
