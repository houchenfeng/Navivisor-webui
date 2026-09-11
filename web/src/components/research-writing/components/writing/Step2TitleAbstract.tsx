import { useState } from "react";
import type { WritingData } from "@/components/research-writing/data/writingSteps";
import { generateWithQwen } from "@/components/research-writing/lib/qwen";
import WordCounter from "./WordCounter";
import TranslateButton from "./TranslateButton";

interface Props {
  data: WritingData;
  onChange: (patch: Partial<WritingData>) => void;
}

export default function Step2TitleAbstract({ data, onChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await generateWithQwen("title-abstract", data);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          onChange({
            title: parsed.title ?? data.title,
            abstract: parsed.abstract ?? data.abstract,
          });
          return;
        } catch {}
      }
      onChange({ abstract: raw });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand-700">标题与摘要</h2>
          <p className="mt-1 text-sm text-ink-sub">
            为论文拟定标题，并撰写一段可独立阅读的摘要（150~250 词）。
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !data.topic}
          className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "生成中..." : "✨ AI 生成"}
        </button>
      </header>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      <section>
        <label className="mb-2 block text-sm font-semibold text-ink">
          论文标题
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="例如：A Contrastive Learning Framework for Few-Shot Image Classification"
          className="w-full rounded-lg border border-blue-100 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
        />
        <div className="mt-1">
          <WordCounter text={data.title} min={8} max={25} />
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col">
        <label className="mb-2 block text-sm font-semibold text-ink">
          摘要（Abstract）
        </label>
        <textarea
          value={data.abstract}
          onChange={(e) => onChange({ abstract: e.target.value })}
          placeholder="在这里撰写摘要。建议包含：研究背景、存在问题、本文方法、主要结果与贡献。"
          className="h-[280px] w-full resize-none rounded-lg border border-blue-100 bg-white p-4 font-serif text-[15px] leading-relaxed text-ink outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
        />
        <div className="mt-1 flex flex-col gap-2">
          <WordCounter text={data.abstract} min={150} max={250} />
          <TranslateButton
            text={data.abstract}
            onApply={(translated) => onChange({ abstract: translated })}
          />
        </div>
      </section>
    </div>
  );
}
