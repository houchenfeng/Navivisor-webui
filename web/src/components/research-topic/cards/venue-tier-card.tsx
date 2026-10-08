/**
 * Venue tiering card (T47).
 *
 * The tier-1 share is the headline number, not the raw counts: a direction with
 * 300 papers of which 5 are in top venues is a very different research prospect
 * from one with 300 papers of which 120 are.
 */
import { StageCard, type StageStatus } from './stage-card';
import type { VenueTiering } from './types';

const TIER_LABEL: Record<1 | 2 | 3, string> = {
  1: '第一梯队 · 领域风向标',
  2: '第二梯队 · 技术深挖',
  3: '第三梯队 · 细分创新',
};

const TIER_STYLE: Record<1 | 2 | 3, string> = {
  1: 'bg-[#e7f0ff] text-[#1f4dcb]',
  2: 'bg-[#eef4fd] text-[#315a98]',
  3: 'bg-[#f4f7fb] text-[#6b86ac]',
};

export type VenueTierCardProps = {
  tiering: VenueTiering | null;
  status: StageStatus;
  error?: string;
  fallbackUsed?: boolean;
  provider?: 'codex' | 'http';
  onViewMarkdown?: () => void;
};

export function VenueTierCard({
  tiering,
  status,
  error,
  fallbackUsed,
  provider,
  onViewMarkdown,
}: VenueTierCardProps) {
  const grouped = tiering
    ? ([1, 2, 3] as const).map((tier) => ({
        tier,
        venues: tiering.tiers.filter((entry) => entry.tier === tier),
      }))
    : [];

  return (
    <StageCard
      title="期刊分层"
      status={status}
      error={error}
      fallbackUsed={fallbackUsed}
      provider={provider}
      onViewMarkdown={onViewMarkdown}
    >
      {tiering ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-[#f7fbff] px-3 py-2">
            <p className="text-[10px] font-black tracking-[0.08em] text-[#8aa1c1] uppercase">
              一梯队占比
            </p>
            <p className="mt-0.5 text-lg font-black text-[#183b70]">
              {(tiering.topVenueRatio * 100).toFixed(1)}%
            </p>
          </div>

          {grouped.map(({ tier, venues }) => (
            <div key={tier}>
              <p className="text-[11px] font-black text-[#5f85b8]">{TIER_LABEL[tier]}</p>
              {venues.length ? (
                <ul className="mt-1.5 space-y-1">
                  {venues.map((venue) => (
                    <li
                      key={venue.name}
                      className="flex items-center justify-between gap-2 rounded-lg bg-[#fbfdff] px-3 py-1.5"
                    >
                      <span className="truncate text-[11px] font-semibold text-[#263d65]">
                        {venue.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${TIER_STYLE[tier]}`}
                      >
                        {venue.count} 篇
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[11px] font-semibold text-[#8aa1c1]">该梯队没有命中场所。</p>
              )}
            </div>
          ))}

          {tiering.note ? (
            <p className="text-[11px] font-semibold leading-5 text-[#617da9]">{tiering.note}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未执行期刊分层。分层依据来自命中场所的实际分布，不会硬编码名单。
        </p>
      )}
    </StageCard>
  );
}
