/**
 * Per-paper relevance scoring card (T48).
 *
 * `unscored` is shown as its own number, not folded into the rejected count.
 * A paper the model failed to score is unknown, not irrelevant, and treating
 * the two the same would quietly shrink the pool.
 */
import { StageCard, type StageStatus } from './stage-card';
import type { PaperScore } from './types';

export const DEFAULT_SCORE_THRESHOLD = 4;

export type RelevanceScoreCardProps = {
  scores: PaperScore[] | null;
  /** Ids the model failed to score after the retry. */
  unscored?: string[];
  threshold?: number;
  status: StageStatus;
  error?: string;
  onViewMarkdown?: () => void;
};

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= DEFAULT_SCORE_THRESHOLD
      ? 'bg-[#e8f7ef] text-[#1d7a4d]'
      : score >= 3
        ? 'bg-[#eef4fd] text-[#315a98]'
        : 'bg-[#f4f7fb] text-[#6b86ac]';
  return (
    <span className={`grid size-6 shrink-0 place-items-center rounded-lg text-[11px] font-black ${tone}`}>
      {score}
    </span>
  );
}

export function RelevanceScoreCard({
  scores,
  unscored,
  threshold = DEFAULT_SCORE_THRESHOLD,
  status,
  error,
  onViewMarkdown,
}: RelevanceScoreCardProps) {
  const accepted = scores?.filter((entry) => entry.relevant).length ?? 0;
  const rejected = (scores?.length ?? 0) - accepted;
  const sorted = scores ? [...scores].sort((a, b) => b.score - a.score) : [];

  return (
    <StageCard
      title="AI 逐篇相关性判定"
      status={status}
      error={error}
      collapsible
      defaultOpen={(scores?.length ?? 0) > 0}
      onViewMarkdown={onViewMarkdown}
    >
      {scores?.length ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[#e8f7ef] px-3 py-2">
              <p className="text-[10px] font-black text-[#1d7a4d]">通过</p>
              <p className="mt-0.5 text-lg font-black text-[#1d7a4d]">{accepted}</p>
            </div>
            <div className="rounded-xl bg-[#f4f7fb] px-3 py-2">
              <p className="text-[10px] font-black text-[#6b86ac]">淘汰</p>
              <p className="mt-0.5 text-lg font-black text-[#6b86ac]">{rejected}</p>
            </div>
            <div className="rounded-xl bg-[#fff8e8] px-3 py-2">
              <p className="text-[10px] font-black text-[#8a6414]">未判定成功</p>
              <p className="mt-0.5 text-lg font-black text-[#8a6414]">{unscored?.length ?? 0}</p>
            </div>
          </div>

          <p className="text-[10px] font-semibold text-[#8aa1c1]">
            判定阈值：score ≥ {threshold}。未判定成功的文献不计入淘汰，需要重跑。
          </p>

          <ul className="space-y-1">
            {sorted.slice(0, 30).map((entry) => (
              <li key={entry.refId} className="flex items-start gap-2 rounded-xl bg-[#fbfdff] px-3 py-2">
                <ScoreBadge score={entry.score} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black leading-5 text-[#244a7d]">
                    <span className="font-mono text-[10px] text-[#8aa1c1]">{entry.refId}</span>{' '}
                    {entry.title}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold leading-4 text-[#617da9]">
                    {entry.reason}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    {entry.transferable ? (
                      <span className="rounded-full bg-[#eef4fd] px-2 py-0.5 text-[10px] font-black text-[#315a98]">
                        方法可迁移
                      </span>
                    ) : null}
                    {entry.baselineCandidate ? (
                      <span className="rounded-full bg-[#e8f7ef] px-2 py-0.5 text-[10px] font-black text-[#1d7a4d]">
                        可作 baseline
                      </span>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {unscored?.length ? (
            <details className="rounded-xl bg-[#fff8e8] p-3">
              <summary className="cursor-pointer text-[11px] font-black text-[#8a6414]">
                未判定成功的文献（需重跑）
              </summary>
              <ul className="mt-1.5 space-y-0.5">
                {unscored.map((id) => (
                  <li key={id} className="font-mono text-[11px] font-semibold text-[#a08447]">
                    · {id}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未执行逐篇相关性判定。判定按 10 篇一批进行，失败批次会重试一次。
        </p>
      )}
    </StageCard>
  );
}
