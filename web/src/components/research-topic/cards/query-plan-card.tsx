/**
 * Query plan card (T47).
 *
 * Shows the OQL that was actually sent to OpenAlex next to the arXiv query,
 * plus the concept groups it was built from. The two versions from the course
 * prompt (完整词组并列式 / 概念拆分式) are switchable because the operator
 * often wants to compare them before re-running.
 */
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { StageCard, type StageStatus } from './stage-card';
import type { QueryPlanArtifact } from './types';

export type QueryPlanCardProps = {
  plan: QueryPlanArtifact | null;
  status: StageStatus;
  error?: string;
  fallbackUsed?: boolean;
  provider?: 'codex' | 'http';
  onViewMarkdown?: () => void;
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-lg border border-[#c8dcfb] px-2 py-1 text-[11px] font-black text-[#1f4dcb] hover:bg-[#f4f8ff]"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? '已复制' : '复制'}
    </button>
  );
}

function ConceptGroup({ name, terms }: { name: string; terms: string[] }) {
  if (!terms.length) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-1.5">
      <span className="text-[11px] font-black text-[#5f85b8]">{name}</span>
      {terms.map((term) => (
        <span
          key={term}
          className="rounded-lg bg-[#eef4fd] px-2 py-0.5 text-[11px] font-semibold text-[#315a98]"
        >
          {term}
        </span>
      ))}
    </div>
  );
}

export function QueryPlanCard({
  plan,
  status,
  error,
  fallbackUsed,
  provider,
  onViewMarkdown,
}: QueryPlanCardProps) {
  const [version, setVersion] = useState<'versionA' | 'versionB'>('versionA');

  return (
    <StageCard
      title="检索式规划"
      status={status}
      error={error}
      fallbackUsed={fallbackUsed}
      provider={provider}
      onViewMarkdown={onViewMarkdown}
    >
      {plan ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black text-[#5f85b8]">版本</span>
            {(['versionA', 'versionB'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setVersion(key)}
                aria-pressed={version === key}
                className={
                  version === key
                    ? 'rounded-lg bg-[#1f4dcb] px-2.5 py-1 text-[11px] font-black text-white'
                    : 'rounded-lg border border-[#c8dcfb] px-2.5 py-1 text-[11px] font-black text-[#1f4dcb] hover:bg-[#f4f8ff]'
                }
              >
                {key === 'versionA' ? 'A · 完整词组并列式' : 'B · 概念拆分式'}
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black text-[#5f85b8]">
                实际发送给 OpenAlex 的 OQL
              </span>
              <CopyButton value={plan.openalexOql} label="复制 OpenAlex 检索式" />
            </div>
            <pre className="mt-1.5 overflow-x-auto rounded-xl bg-[#f7fbff] p-3 text-[11px] font-semibold leading-5 text-[#263d65]">
              {plan.openalexOql}
            </pre>
          </div>

          {plan.arxivQuery ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black text-[#5f85b8]">arXiv 检索式</span>
                <CopyButton value={plan.arxivQuery} label="复制 arXiv 检索式" />
              </div>
              <pre className="mt-1.5 overflow-x-auto rounded-xl bg-[#f7fbff] p-3 text-[11px] font-semibold leading-5 text-[#263d65]">
                {plan.arxivQuery}
              </pre>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <span className="text-[11px] font-black text-[#5f85b8]">概念拆解</span>
            <ConceptGroup name="A 研究对象" terms={plan.concepts.A} />
            <ConceptGroup name="B 方法路线" terms={plan.concepts.B} />
            <ConceptGroup name="C 场景模态" terms={plan.concepts.C} />
          </div>

          {plan.exclusions.length ? (
            <p className="text-[11px] font-semibold leading-5 text-[#8a6414]">
              排除项：{plan.exclusions.join('、')}
            </p>
          ) : null}

          {plan.rationale ? (
            <p className="text-[11px] font-semibold leading-5 text-[#617da9]">
              {plan.rationale}
            </p>
          ) : null}

          <p className="text-[10px] font-semibold text-[#8aa1c1]">
            模型草拟的版本（{version === 'versionA' ? 'A' : 'B'}）：
            <span className="ml-1 break-all font-mono">
              {plan.openalex[version] || '（空）'}
            </span>
          </p>
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未生成检索式。检索式由 AI 依据研究方向拆解概念群后生成；AI 不可用时会退回关键词兜底并给出提示。
        </p>
      )}
    </StageCard>
  );
}
