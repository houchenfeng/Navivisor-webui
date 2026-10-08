/**
 * Search result card (T47).
 *
 * Shows where the pool came from and how it was filtered. The per-source split
 * matters: a pool that is 100% OpenAlex with 0 arXiv hits usually means the
 * arXiv query is too narrow, which is worth seeing before the analysis stages.
 */
import { StageCard, type StageStatus } from './stage-card';
import type { SearchStageData } from './types';

export type SearchResultCardProps = {
  data: SearchStageData | null;
  status: StageStatus;
  error?: string;
  warnings?: string[];
  onViewMarkdown?: () => void;
};

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-[#f7fbff] px-3 py-2">
      <p className="text-[10px] font-black tracking-[0.08em] text-[#8aa1c1] uppercase">{label}</p>
      <p className="mt-0.5 text-lg font-black text-[#183b70]">{value}</p>
      {hint ? <p className="text-[10px] font-semibold text-[#8aa1c1]">{hint}</p> : null}
    </div>
  );
}

export function SearchResultCard({
  data,
  status,
  error,
  warnings,
  onViewMarkdown,
}: SearchResultCardProps) {
  return (
    <StageCard
      title="双源检索结果"
      status={status}
      error={error}
      warnings={warnings}
      onViewMarkdown={onViewMarkdown}
    >
      {data ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="OpenAlex" value={String(data.openalex)} hint="篇" />
          <Metric label="arXiv" value={String(data.arxiv)} hint="篇" />
          <Metric label="去重合并" value={String(data.merged)} hint="DOI / 标题双键去重" />
          <Metric
            label="年份窗口"
            value={`${data.yearFrom}–${data.yearTo}`}
            hint="超出窗口的已剔除"
          />
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">尚未执行检索。</p>
      )}
    </StageCard>
  );
}
