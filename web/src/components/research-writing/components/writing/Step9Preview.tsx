import { useState } from "react";
import type { WritingData } from "@/components/research-writing/data/writingSteps";
import { translateAll, type TranslateDirection } from "@/components/research-writing/lib/translate";
import WordCounter from "./WordCounter";

interface Props {
  data: WritingData;
  onChange: (patch: Partial<WritingData>) => void;
}

// 七个可翻译的章节
const SECTIONS: {
  field: keyof WritingData;
  zhField: keyof WritingData;
  zh: string;
  en: string;
  min: number;
  max: number;
}[] = [
  { field: "abstract",  zhField: "abstractZh",  zh: "摘要",       en: "Abstract",      min: 150, max: 250 },
  { field: "intro",     zhField: "introZh",     zh: "引言",       en: "Introduction",  min: 600, max: 1000 },
  { field: "related",   zhField: "relatedZh",   zh: "相关工作",   en: "Related Work",  min: 400, max: 800 },
  { field: "algorithm", zhField: "algorithmZh", zh: "算法介绍",   en: "Method",        min: 600, max: 1200 },
  { field: "experiment",zhField: "experimentZh",zh: "实验结果",   en: "Experiments",   min: 400, max: 1000 },
  { field: "discussion",zhField: "discussionZh",zh: "讨论和展望", en: "Discussion",    min: 300, max: 600 },
];

export default function Step9Preview({ data, onChange }: Props) {
  const [translating, setTranslating] = useState<TranslateDirection | null>(null);
  const [error, setError] = useState("");

  // 一键翻译全文
  const handleTranslateAll = async (direction: TranslateDirection) => {
    const ok = window.confirm(
      direction === "en2zh"
        ? "确定要把全文（摘要、引言、相关工作、算法、实验、讨论）翻译成中文吗？翻译结果会显示在每段右侧，不会覆盖原文。"
        : "确定要把全文翻译成英文吗？翻译结果会显示在每段右侧，不会覆盖原文。"
    );
    if (!ok) return;

    setTranslating(direction);
    setError("");
    try {
      // 收集所有非空字段
      const fields: Record<string, string> = {};
      for (const s of SECTIONS) {
        const v = data[s.field] as string;
        if (v && v.trim()) fields[s.field as string] = v;
      }

      if (Object.keys(fields).length === 0) {
        throw new Error("没有可翻译的内容");
      }

      const result = await translateAll(fields, direction);

      // 把结果写入 zhField
      const patch: Partial<WritingData> = {};
      for (const s of SECTIONS) {
        const key = s.field as string;
        if (result[key]) {
          (patch as Record<string, string>)[s.zhField as string] = result[key];
        }
      }
      onChange(patch);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTranslating(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand-700">全文预览与修改</h2>
          <p className="mt-1 text-sm text-ink-sub">
            最后检查一遍整篇论文。可左右对照中英翻译，翻译不覆盖原文。
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => handleTranslateAll("en2zh")}
            disabled={translating !== null}
            className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-50"
          >
            {translating === "en2zh" ? "翻译中..." : "🌐 翻译为中文"}
          </button>
          <button
            type="button"
            onClick={() => handleTranslateAll("zh2en")}
            disabled={translating !== null}
            className="rounded-lg bg-brand-100 px-4 py-2 text-xs font-semibold text-brand-500 shadow-sm transition-all hover:bg-brand-500 hover:text-white disabled:opacity-50"
          >
            {translating === "zh2en" ? "翻译中..." : "🌐 翻译为英文"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {translating && (
        <div className="rounded-lg bg-blue-50 px-4 py-2 text-xs text-brand-700">
          ⏳ 正在翻译，请稍候（约 20-60 秒，需要翻译 {SECTIONS.length} 段）...
        </div>
      )}

      {/* 标题 */}
      <Section title="标题 / Title">
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="论文标题..."
          className="w-full rounded-lg border border-blue-100 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
        />
        <div className="mt-1">
          <WordCounter text={data.title} min={8} max={25} />
        </div>
      </Section>

      {/* 其他 6 个章节 */}
      {SECTIONS.map((s) => {
        const en = data[s.field] as string;
        const zh = data[s.zhField] as string;
        return (
          <Section key={s.field as string} title={`${s.zh} / ${s.en}`}>
            <div className="grid grid-cols-2 gap-3">
              {/* 原文 */}
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-sub">
                  原文（可编辑）
                </div>
                <textarea
                  value={en}
                  onChange={(e) =>
                    onChange({ [s.field]: e.target.value } as Partial<WritingData>)
                  }
                  className="h-[260px] w-full resize-none rounded-lg border border-blue-100 bg-white p-4 font-serif text-[14px] leading-relaxed text-ink outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              {/* 翻译 */}
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                  翻译（可编辑）
                </div>
                <textarea
                  value={zh}
                  onChange={(e) =>
                    onChange({
                      [s.zhField]: e.target.value,
                    } as Partial<WritingData>)
                  }
                  placeholder="点击上方「🌐 翻译为中文」或直接输入..."
                  className="h-[260px] w-full resize-none rounded-lg border border-blue-100 bg-[#f7faff] p-4 font-serif text-[14px] leading-relaxed text-ink outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
            <div className="mt-1">
              <WordCounter text={en} min={s.min} max={s.max} />
            </div>
          </Section>
        );
      })}

      {/* 图片 */}
      {(data.algorithmFlowImage || data.algorithmIllustImage) && (
        <Section title="算法配图 / Figures">
          <div className="grid grid-cols-2 gap-3">
            {data.algorithmFlowImage && (
              <div>
                <div className="mb-1 text-[11px] font-semibold text-ink-sub">
                  算法框架流程图
                </div>
                <img
                  src={data.algorithmFlowImage}
                  alt="flow"
                  className="max-h-[260px] w-full rounded-lg border border-blue-100 bg-white object-contain p-2"
                />
              </div>
            )}
            {data.algorithmIllustImage && (
              <div>
                <div className="mb-1 text-[11px] font-semibold text-ink-sub">
                  方法示意图
                </div>
                <img
                  src={data.algorithmIllustImage}
                  alt="illust"
                  className="max-h-[260px] w-full rounded-lg border border-blue-100 bg-white object-contain p-2"
                />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* 表格 */}
      {data.experimentTable.headers.length > 0 && (
        <Section title="实验结果表格 / Results Table">
          <div className="overflow-auto rounded-lg border border-blue-100 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f4f8ff]">
                  {data.experimentTable.headers.map((h, i) => (
                    <th
                      key={i}
                      className="border border-blue-100 px-3 py-2 text-left font-semibold text-brand-700"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.experimentTable.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="border border-blue-100 px-3 py-2 text-ink"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* 引用文献 */}
      {data.references.length > 0 && (
        <Section title="引用文献 / References">
          <div className="flex flex-col gap-1.5">
            {data.references.map((ref, i) => (
              <div
                key={i}
                className="rounded-md border border-blue-100 bg-white px-3 py-2 text-xs leading-relaxed text-ink"
              >
                <span className="mr-2 font-bold text-brand-500">[{i + 1}]</span>
                {ref.text}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 全局统计 */}
      <div className="rounded-lg border border-blue-100 bg-white/70 px-4 py-3 text-xs text-ink-sub">
        全局统计：标题 {data.title.length} 字符 · 摘要 {data.abstract.length} 字符 ·
        引言 {data.intro.length} 字符 · 相关工作 {data.related.length} 字符 ·
        算法 {data.algorithm.length} 字符 · 实验 {data.experiment.length} 字符 ·
        讨论 {data.discussion.length} 字符 · 引用 {data.references.length} 条 ·
        配图 {(data.algorithmFlowImage ? 1 : 0) + (data.algorithmIllustImage ? 1 : 0)}/2
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="border-b border-blue-100 pb-2 text-sm font-bold text-brand-700">
        {title}
      </h3>
      {children}
    </section>
  );
}
