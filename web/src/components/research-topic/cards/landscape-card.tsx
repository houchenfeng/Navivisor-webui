/**
 * Landscape analysis card (T47).
 *
 * Five sub-sections, each collapsible: the diagnosis (framework choice), the
 * concept dictionary, the trend matrix, the venue preference matrix and the
 * combination matrix plus signals. They are kept separate rather than merged
 * because they answer different questions and the operator usually reads only
 * one or two of them.
 */
import { StageCard, type StageStatus } from './stage-card';
import type { Landscape } from './types';

export type LandscapeCardProps = {
  landscape: Landscape | null;
  status: StageStatus;
  error?: string;
  fallbackUsed?: boolean;
  provider?: 'codex' | 'http';
  onViewMarkdown?: () => void;
};

const SECTIONS: Array<{ key: keyof Landscape; title: string }> = [
  { key: 'diagnosis', title: '第0步 · 学科题名书写习惯诊断' },
  { key: 'conceptDictionary', title: '第1步 · 标准化概念词典' },
  { key: 'trendMatrix', title: '第1步 · 时间窗趋势矩阵' },
  { key: 'venuePreference', title: '第1步 · 期刊×方向偏好矩阵' },
  { key: 'combinationMatrix', title: '第2步 · 概念组合矩阵' },
  { key: 'signals', title: '第1步 · 六类概念信号' },
];

function Section({ title, body }: { title: string; body: string }) {
  if (!body?.trim()) {
    return (
      <div className="rounded-xl bg-[#f7fbff] p-3">
        <p className="text-[11px] font-black text-[#5f85b8]">{title}</p>
        <p className="mt-1 text-[11px] font-semibold text-[#8aa1c1]">本节没有内容。</p>
      </div>
    );
  }
  return (
    <details className="rounded-xl bg-[#f7fbff] p-3" open>
      <summary className="cursor-pointer text-[11px] font-black text-[#5f85b8]">{title}</summary>
      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-[11px] font-semibold leading-5 text-[#263d65]">
        {body}
      </pre>
    </details>
  );
}

export function LandscapeCard({
  landscape,
  status,
  error,
  fallbackUsed,
  provider,
  onViewMarkdown,
}: LandscapeCardProps) {
  return (
    <StageCard
      title="研究态势分析"
      status={status}
      error={error}
      fallbackUsed={fallbackUsed}
      provider={provider}
      collapsible
      defaultOpen={Boolean(landscape)}
      onViewMarkdown={onViewMarkdown}
    >
      {landscape ? (
        <div className="space-y-2">
          {SECTIONS.map((section) => (
            <Section
              key={section.key}
              title={section.title}
              body={landscape[section.key]}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未执行态势分析。分析只发送「编号 / 标题 / 期刊 / 年份」四个字段，不发送摘要。
        </p>
      )}
    </StageCard>
  );
}
