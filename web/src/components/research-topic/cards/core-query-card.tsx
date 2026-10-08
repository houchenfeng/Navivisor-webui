/**
 * Core-literature combination card (T48).
 *
 * Shows every combination that was tried and how many papers each yielded.
 * Seeing the numbers side by side is what makes a too-narrow concept group
 * obvious — a combination returning 0 is the usual culprit.
 */
import { StageCard, type StageStatus } from './stage-card';
import type { CoreCombinationHit } from './types';

export type CoreQueryCardProps = {
  combinations: CoreCombinationHit[] | null;
  /** Combination the operator settled on, if any. */
  selectedId?: string | null;
  onSelect?: (combination: CoreCombinationHit) => void;
  status: StageStatus;
  error?: string;
  onViewMarkdown?: () => void;
};

export function CoreQueryCard({
  combinations,
  selectedId,
  onSelect,
  status,
  error,
  onViewMarkdown,
}: CoreQueryCardProps) {
  return (
    <StageCard
      title="二次检索组合"
      status={status}
      error={error}
      collapsible
      defaultOpen
      onViewMarkdown={onViewMarkdown}
    >
      {combinations?.length ? (
        <ul className="space-y-2">
          {combinations.map((combination) => {
            const selected = selectedId === combination.id;
            const empty = combination.found === 0;
            return (
              <li
                key={combination.id}
                className={
                  selected
                    ? 'rounded-2xl border-2 border-[#1f4dcb] bg-[#f7fbff] p-3'
                    : 'rounded-2xl border border-[#d8e5f6] bg-white p-3'
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-lg bg-[#eef4fd] px-2 py-0.5 font-mono text-[11px] font-black text-[#315a98]">
                    {combination.id}
                  </span>
                  <span className="flex items-center gap-2 text-[11px] font-black">
                    <span className={empty ? 'text-[#b64d57]' : 'text-[#183b70]'}>
                      命中 {combination.found}
                    </span>
                    <span className="text-[#8aa1c1]">·</span>
                    <span className="text-[#1d7a4d]">采纳 {combination.accepted}</span>
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] font-semibold leading-5 text-[#617da9]">
                  {combination.reason}
                </p>
                {empty ? (
                  <p className="mt-1 text-[11px] font-semibold text-[#b64d57]">
                    该组合没有命中文献，通常是概念群过窄或术语选偏。
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect?.(combination)}
                    disabled={!onSelect || empty}
                    className="rounded-xl bg-[#1f4dcb] px-3 py-1 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:bg-[#c8d6ea]"
                  >
                    {selected ? '已选用' : '选用此组合'}
                  </button>
                  <code className="truncate text-[10px] font-semibold text-[#8aa1c1]">
                    {combination.oql}
                  </code>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未生成二次检索组合。组合由概念群按精确到宽泛的顺序生成。
        </p>
      )}
    </StageCard>
  );
}
