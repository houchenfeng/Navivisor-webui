/**
 * Relevance self-check card (T47).
 *
 * The refinement button is capped at three rounds because the backend enforces
 * the same limit — offering a fourth click that always 400s would be worse than
 * disabling it and saying why.
 */
import { StageCard, type StageStatus } from './stage-card';
import type { RelevanceCheck } from './types';

export const MAX_RELEVANCE_ROUNDS = 3;

export type RelevanceCardProps = {
  check: RelevanceCheck | null;
  status: StageStatus;
  error?: string;
  fallbackUsed?: boolean;
  provider?: 'codex' | 'http';
  /** Triggered when the operator asks for another refinement round. */
  onRefine?: () => void;
  refining?: boolean;
  onViewMarkdown?: () => void;
};

export function RelevanceCard({
  check,
  status,
  error,
  fallbackUsed,
  provider,
  onRefine,
  refining,
  onViewMarkdown,
}: RelevanceCardProps) {
  const roundsUsed = check?.round ?? 0;
  const canRefine = Boolean(onRefine) && roundsUsed < MAX_RELEVANCE_ROUNDS && status !== 'running';

  return (
    <StageCard
      title="相关度自检"
      status={status}
      error={error}
      fallbackUsed={fallbackUsed}
      provider={provider}
      onViewMarkdown={onViewMarkdown}
    >
      {check ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-[#f7fbff] px-3 py-2">
              <p className="text-[10px] font-black tracking-[0.08em] text-[#8aa1c1] uppercase">
                相关度
              </p>
              <p className="mt-0.5 text-lg font-black text-[#183b70]">
                {(check.relevantRatio * 100).toFixed(1)}%
              </p>
            </div>
            <p className="text-[11px] font-semibold text-[#617da9]">
              抽查 {check.sampleSize} 篇 · 第 {check.round}/{MAX_RELEVANCE_ROUNDS} 轮
            </p>
          </div>

          {check.irrelevantSamples.length ? (
            <div>
              <p className="text-[11px] font-black text-[#5f85b8]">不相关样例及原因</p>
              <ul className="mt-1.5 space-y-1.5">
                {check.irrelevantSamples.map((sample) => (
                  <li
                    key={sample.title}
                    className="rounded-xl bg-[#fff8e8] px-3 py-2 text-[11px] font-semibold leading-5 text-[#8a6414]"
                  >
                    <span className="font-black">{sample.title}</span>
                    <span className="ml-1 text-[#a08447]">— {sample.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] font-semibold text-[#1d7a4d]">
              未发现明显不相关的样例。
            </p>
          )}

          {check.refinedQueryPlan ? (
            <div>
              <p className="text-[11px] font-black text-[#5f85b8]">优化后的检索式</p>
              <pre className="mt-1.5 overflow-x-auto rounded-xl bg-[#f7fbff] p-3 text-[11px] font-semibold leading-5 text-[#263d65]">
                {check.refinedQueryPlan.openalexOql}
              </pre>
            </div>
          ) : (
            <p className="text-[11px] font-semibold text-[#7892b7]">
              本轮未改动概念组（没有可回写的新检索式）。
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRefine}
              disabled={!canRefine}
              className="rounded-xl bg-[#1f4dcb] px-3 py-1.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-[#c8d6ea]"
            >
              {refining ? '优化中…' : '不满意，再优化'}
            </button>
            {roundsUsed >= MAX_RELEVANCE_ROUNDS ? (
              <span className="text-[11px] font-semibold text-[#8a6414]">
                已达 {MAX_RELEVANCE_ROUNDS} 轮上限，不再继续优化。
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未执行相关度自检。自检会抽取最新的一批文献，判断检索式是否命中目标方向。
        </p>
      )}
    </StageCard>
  );
}
