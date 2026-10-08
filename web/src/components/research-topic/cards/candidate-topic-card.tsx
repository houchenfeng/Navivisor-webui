/**
 * Candidate topic card (T47).
 *
 * Keeps the existing "选择此题" interaction and adds the evidence line: each
 * candidate must cite the reference ids behind it, and a candidate whose
 * rationale says 待核验 is visually flagged — an unsupported proposal should not
 * look the same as a grounded one.
 */
import { CheckCircle2, FileText } from 'lucide-react';
import { StageCard, type StageStatus } from './stage-card';
import type { CandidateTopic } from './types';

const LABEL_STYLE: Record<CandidateTopic['label'], string> = {
  偏可行: 'bg-[#e8f7ef] text-[#1d7a4d]',
  偏创新: 'bg-[#f3ecff] text-[#6b3fa0]',
  较平衡: 'bg-[#e7f0ff] text-[#1f4dcb]',
};

export type CandidateTopicCardProps = {
  candidates: CandidateTopic[] | null;
  status: StageStatus;
  error?: string;
  selectedLabel?: string | null;
  onSelect?: (candidate: CandidateTopic) => void;
  onViewMarkdown?: () => void;
};

/** True when the rationale admits the evidence is not verified yet. */
export function needsVerification(candidate: CandidateTopic): boolean {
  return /待核验/.test(candidate.rationale);
}

export function CandidateTopicCard({
  candidates,
  status,
  error,
  selectedLabel,
  onSelect,
  onViewMarkdown,
}: CandidateTopicCardProps) {
  return (
    <StageCard
      title="候选课题"
      status={status}
      error={error}
      onViewMarkdown={onViewMarkdown}
    >
      {candidates?.length ? (
        <div className="space-y-3">
          {candidates.map((candidate) => {
            const selected = selectedLabel === candidate.label;
            const unverified = needsVerification(candidate);
            return (
              <article
                key={candidate.label}
                className={
                  selected
                    ? 'rounded-2xl border-2 border-[#1f4dcb] bg-[#f7fbff] p-4'
                    : 'rounded-2xl border border-[#d8e5f6] bg-white p-4'
                }
              >
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-black ${LABEL_STYLE[candidate.label]}`}
                  >
                    {candidate.label}
                  </span>
                  {selected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#1f4dcb]">
                      <CheckCircle2 className="size-3.5" />
                      已选择
                    </span>
                  ) : null}
                </header>

                <h4 className="mt-2 text-sm font-black leading-6 text-[#183b70]">
                  {candidate.title}
                </h4>
                <p className="mt-1.5 text-[11px] font-semibold leading-5 text-[#526e98]">
                  {candidate.oneSentenceDefinition}
                </p>

                <dl className="mt-2 space-y-1.5">
                  {[
                    ['研究设计', candidate.researchDesign],
                    ['预期创新性', candidate.expectedInnovation],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[10px] font-black tracking-[0.08em] text-[#8aa1c1] uppercase">
                        {label}
                      </dt>
                      <dd className="text-[11px] font-semibold leading-5 text-[#526e98]">{value}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-[10px] font-black tracking-[0.08em] text-[#8aa1c1] uppercase">
                      立论依据
                    </dt>
                    <dd
                      className={
                        unverified
                          ? 'rounded-lg bg-[#fff8e8] px-2 py-1 text-[11px] font-semibold leading-5 text-[#8a6414]'
                          : 'text-[11px] font-semibold leading-5 text-[#526e98]'
                      }
                    >
                      {unverified ? '⚠️ ' : ''}
                      {candidate.rationale}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect?.(candidate)}
                    disabled={!onSelect}
                    className="rounded-xl bg-[#1f4dcb] px-3 py-1.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-[#c8d6ea]"
                  >
                    选择此题
                  </button>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8aa1c1]">
                    <FileText className="size-3" />
                    依据须可回溯到具体文献编号
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未生成候选课题。建议先完成研究空白识别，候选会据此按风险取向分档。
        </p>
      )}
    </StageCard>
  );
}
