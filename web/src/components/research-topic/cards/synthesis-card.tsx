/**
 * Synthesis cards (T48): 指令二 (元分析) and 降维指令 (高可行性课题).
 *
 * They share a card because they consume the same synthesis input and differ
 * only in intent — one optimises for novelty, the other for feasibility. Both
 * can be generated without re-running the batches.
 */
import { Lightbulb, Rocket } from 'lucide-react';
import { StageCard, type StageStatus } from './stage-card';

export type SynthesisCardProps = {
  mode: 'meta' | 'feasible';
  markdown: string | null;
  status: StageStatus;
  error?: string;
  fallbackUsed?: boolean;
  provider?: 'codex' | 'http';
  onGenerate?: () => void;
  generating?: boolean;
  onViewMarkdown?: () => void;
};

const COPY: Record<
  SynthesisCardProps['mode'],
  { title: string; blurb: string; action: string }
> = {
  meta: {
    title: '元分析 · 高创新课题',
    blurb:
      '跨批次整合各批报告，从「共识交叉点 / 分歧融合点 / 集体盲区点」孵化论文级课题，追求前沿与颠覆性。',
    action: '生成高创新课题',
  },
  feasible: {
    title: '降维 · 高可行性课题',
    blurb:
      '同样输入，改为孵化【初阶/验证性】课题：风险低、实验路径清晰，适合入门研究或快速验证想法。',
    action: '生成高可行性课题',
  },
};

export function SynthesisCard({
  mode,
  markdown,
  status,
  error,
  fallbackUsed,
  provider,
  onGenerate,
  generating,
  onViewMarkdown,
}: SynthesisCardProps) {
  const copy = COPY[mode];
  const Icon = mode === 'meta' ? Lightbulb : Rocket;

  return (
    <StageCard
      title={copy.title}
      status={status}
      error={error}
      fallbackUsed={fallbackUsed}
      provider={provider}
      // Not collapsible: the generate button lives in the body, and hiding the
      // only way to start the stage behind a disclosure toggle is a trap.
      onViewMarkdown={onViewMarkdown}
    >
      <div className="space-y-3">
        <p className="flex items-start gap-2 text-[11px] font-semibold leading-5 text-[#617da9]">
          <Icon className="mt-0.5 size-3.5 shrink-0 text-[#5f85b8]" />
          {copy.blurb}
        </p>

        {markdown ? (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f7fbff] p-3 text-[11px] font-semibold leading-5 text-[#263d65]">
            {markdown}
          </pre>
        ) : (
          <p className="text-[11px] font-semibold text-[#7892b7]">
            尚未生成。需要先完成分批分析，两个视图共用同一份输入，生成其一后可直接生成另一个。
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={!onGenerate || generating}
            className="rounded-xl bg-[#1f4dcb] px-3 py-1.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-[#c8d6ea]"
          >
            {generating ? '生成中…' : markdown ? '重新生成' : copy.action}
          </button>
        </div>
      </div>
    </StageCard>
  );
}
