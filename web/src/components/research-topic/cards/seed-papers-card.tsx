/**
 * Classic seed papers card (T48).
 *
 * These are the anchors the reverse-citation stage walks from, so the OpenAlex
 * work id is shown next to each one — a seed without an id cannot be walked and
 * is called out rather than silently skipped.
 */
import { StageCard, type StageStatus } from './stage-card';
import type { SeedPaper } from './types';

export type SeedPapersCardProps = {
  seeds: SeedPaper[] | null;
  status: StageStatus;
  error?: string;
  onViewMarkdown?: () => void;
};

export function SeedPapersCard({
  seeds,
  status,
  error,
  onViewMarkdown,
}: SeedPapersCardProps) {
  return (
    <StageCard
      title={`经典种子文献（被引 Top ${seeds?.length ?? 20}）`}
      status={status}
      error={error}
      collapsible
      defaultOpen={false}
      onViewMarkdown={onViewMarkdown}
    >
      {seeds?.length ? (
        <ol className="space-y-2">
          {seeds.map((seed, index) => (
            <li
              key={seed.refId}
              className="flex items-start gap-3 rounded-xl bg-[#fbfdff] px-3 py-2"
            >
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-lg bg-[#eef4fd] text-[10px] font-black text-[#315a98]">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black leading-5 text-[#244a7d]">{seed.title}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-[#8aa1c1]">
                  {seed.venue || '未标注来源'} · {seed.year ?? '未知'} · 被引 {seed.citedByCount} 次
                  {seed.openalexWorkId ? (
                    <span className="ml-1 font-mono">· {seed.openalexWorkId}</span>
                  ) : (
                    <span className="ml-1 text-[#b64d57]">· 无 OpenAlex ID，无法做反向引用</span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未选出经典种子。种子按被引量降序取前 20 篇。
        </p>
      )}
    </StageCard>
  );
}
