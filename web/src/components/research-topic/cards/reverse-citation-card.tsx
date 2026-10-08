/**
 * Reverse citation + arXiv latest card (T48).
 *
 * Seed failures are listed explicitly. A seed whose request failed is not the
 * same as a seed with no recent citations, and conflating the two would make a
 * dead research direction look alive — or vice versa.
 */
import { AlertCircle, Radio } from 'lucide-react';
import { StageCard, type StageStatus } from './stage-card';
import type { ReverseCitationHit } from './types';

export type ReverseCitationCardProps = {
  hits: ReverseCitationHit[] | null;
  /** Seeds whose lookup failed, with the reason. */
  failures?: Array<{ seedWorkId: string; reason: string }>;
  arxivLatest?: Array<{ title: string; arxivId: string; published: string }>;
  arxivFailed?: boolean;
  arxivFailureReason?: string;
  status: StageStatus;
  error?: string;
  onViewMarkdown?: () => void;
};

export function ReverseCitationCard({
  hits,
  failures,
  arxivLatest,
  arxivFailed,
  arxivFailureReason,
  status,
  error,
  onViewMarkdown,
}: ReverseCitationCardProps) {
  const hitCount = hits?.length ?? 0;
  const latestCount = arxivLatest?.length ?? 0;

  return (
    <StageCard
      title="反向引用与 arXiv 最新"
      status={status}
      error={error}
      collapsible
      defaultOpen
      onViewMarkdown={onViewMarkdown}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#f7fbff] px-3 py-2">
            <p className="text-[10px] font-black tracking-[0.08em] text-[#8aa1c1] uppercase">
              近 6 个月引用者
            </p>
            <p className="mt-0.5 text-lg font-black text-[#183b70]">{hitCount}</p>
          </div>
          <div className="rounded-xl bg-[#f7fbff] px-3 py-2">
            <p className="text-[10px] font-black tracking-[0.08em] text-[#8aa1c1] uppercase">
              arXiv 新投稿
            </p>
            <p className="mt-0.5 text-lg font-black text-[#183b70]">{latestCount}</p>
          </div>
        </div>

        {arxivFailed ? (
          <p className="flex items-start gap-2 rounded-xl bg-[#fff8e8] p-3 text-[11px] font-semibold leading-5 text-[#8a6414]">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            arXiv 检索失败{arxivFailureReason ? `（${arxivFailureReason}）` : ''}，
            上方 0 篇是「没查到」而不是「确实没有新投稿」。
          </p>
        ) : null}

        {failures?.length ? (
          <div className="rounded-xl bg-[#fff8e8] p-3">
            <p className="text-[11px] font-black text-[#8a6414]">
              以下种子的引用检索失败（不代表该种子没有近期引用）
            </p>
            <ul className="mt-1 space-y-0.5">
              {failures.map((failure) => (
                <li key={failure.seedWorkId} className="text-[11px] font-semibold text-[#a08447]">
                  · {failure.seedWorkId}：{failure.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hits?.length ? (
          <div>
            <p className="text-[11px] font-black text-[#5f85b8]">近期引用者</p>
            <ul className="mt-1.5 space-y-1">
              {hits.slice(0, 20).map((hit) => (
                <li
                  key={`${hit.seedWorkId}-${hit.title}`}
                  className="rounded-lg bg-[#fbfdff] px-3 py-1.5 text-[11px] font-semibold leading-5 text-[#263d65]"
                >
                  <span className="font-mono text-[10px] text-[#8aa1c1]">[{hit.seedWorkId}]</span>{' '}
                  {hit.title}
                  <span className="ml-1 text-[#8aa1c1]">
                    （{hit.venue || '未标注来源'} · {hit.year ?? '未知'}）
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {arxivLatest?.length ? (
          <div>
            <p className="flex items-center gap-1 text-[11px] font-black text-[#5f85b8]">
              <Radio className="size-3" />
              arXiv 最新投稿
            </p>
            <ul className="mt-1.5 space-y-1">
              {arxivLatest.slice(0, 20).map((paper) => (
                <li
                  key={paper.arxivId}
                  className="rounded-lg bg-[#fbfdff] px-3 py-1.5 text-[11px] font-semibold leading-5 text-[#263d65]"
                >
                  {paper.title}
                  <span className="ml-1 text-[#8aa1c1]">
                    （{paper.arxivId} · {paper.published.slice(0, 10)}）
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!hitCount && !latestCount && !failures?.length && !arxivFailed ? (
          <p className="text-xs font-semibold text-[#7892b7]">
            尚未执行反向引用检索。将从经典种子出发，查找近 6 个月内引用它们的文献。
          </p>
        ) : null}
      </div>
    </StageCard>
  );
}
