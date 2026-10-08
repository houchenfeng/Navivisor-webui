/**
 * Research gap card (T47).
 *
 * Zero-co-occurrence gaps are rendered in a separate, visually louder block.
 * They are the most attractive and least supported kind of finding — the
 * backend forces a "no direct title-level evidence" caveat onto every one, and
 * this card makes sure that caveat is not the smallest text on the screen.
 */
import { AlertTriangle, Crosshair, Layers, ShieldQuestion } from 'lucide-react';
import { StageCard, type StageStatus } from './stage-card';
import type { ResearchGaps } from './types';

export type ResearchGapCardProps = {
  gaps: ResearchGaps | null;
  status: StageStatus;
  error?: string;
  onViewMarkdown?: () => void;
};

function GapList({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: string[];
  empty: string;
  tone: 'neutral' | 'warn' | 'info';
}) {
  const toneClass =
    tone === 'warn'
      ? 'bg-[#fff8e8] text-[#8a6414]'
      : tone === 'info'
        ? 'bg-[#eef4fd] text-[#315a98]'
        : 'bg-[#f7fbff] text-[#263d65]';

  return (
    <div className={`rounded-xl p-3 ${toneClass}`}>
      <p className="text-[11px] font-black">{title}</p>
      {items.length ? (
        <ul className="mt-1.5 space-y-1">
          {items.map((item) => (
            <li key={item} className="text-[11px] font-semibold leading-5">
              · {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[11px] font-semibold opacity-70">{empty}</p>
      )}
    </div>
  );
}

export function ResearchGapCard({
  gaps,
  status,
  error,
  onViewMarkdown,
}: ResearchGapCardProps) {
  return (
    <StageCard
      title="研究空白识别"
      status={status}
      error={error}
      collapsible
      defaultOpen
      onViewMarkdown={onViewMarkdown}
    >
      {gaps ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Layers className="mt-0.5 size-3.5 shrink-0 text-[#5f85b8]" />
            <div className="min-w-0 flex-1">
              <GapList
                title="过于拥挤的方向"
                items={gaps.crowded}
                empty="未识别到明确饱和的方向。"
                tone="neutral"
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Crosshair className="mt-0.5 size-3.5 shrink-0 text-[#5f85b8]" />
            <div className="min-w-0 flex-1">
              <GapList
                title="交叉空白与候选方向"
                items={gaps.crossGaps}
                empty="未识别到候选方向。"
                tone="info"
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#8a6414]" />
            <div className="min-w-0 flex-1">
              <GapList
                title="零共现推测组合（高风险，无直接题名共现证据）"
                items={gaps.zeroCooccurrence}
                empty="未发现零共现组合。"
                tone="warn"
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <ShieldQuestion className="mt-0.5 size-3.5 shrink-0 text-[#5f85b8]" />
            <div className="min-w-0 flex-1">
              <GapList
                title="红队复核"
                items={gaps.redteam}
                empty="未给出红队复核意见。"
                tone="neutral"
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未识别研究空白。空白由态势分析的组合矩阵派生，因此需要先完成态势分析。
        </p>
      )}
    </StageCard>
  );
}
