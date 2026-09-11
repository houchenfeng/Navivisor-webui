import { useState } from "react";
import type { WritingData } from "@/components/research-writing/data/writingSteps";
import { generateWithQwen } from "@/components/research-writing/lib/qwen";
import WordCounter from "./WordCounter";
import TranslateButton from "./TranslateButton";

interface Props {
  data: WritingData;
  onChange: (patch: Partial<WritingData>) => void;
  field: "intro" | "related" | "discussion";
  title: string;
  hint: string;
  placeholder: string;
}

const RANGES: Record<string, { min: number; max: number }> = {
  intro: { min: 600, max: 1000 },
  related: { min: 400, max: 800 },
  discussion: { min: 300, max: 600 },
};

export default function Step3To8Text({
  data,
  onChange,
  field,
  title,
  hint,
  placeholder,
}: Props) {
  const value = data[field];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const range = RANGES[field] ?? { min: 300, max: 1000 };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const text = await generateWithQwen(field, data);
      onChange({ [field]: text } as Partial<WritingData>);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand-700">{title}</h2>
          <p className="mt-1 text-sm text-ink-sub">{hint}</p>
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

      <textarea
        value={value}
        onChange={(e) =>
          onChange({ [field]: e.target.value } as Partial<WritingData>)
        }
        placeholder={placeholder}
        className="min-h-0 flex-1 resize-none rounded-lg border border-blue-100 bg-white p-5 font-serif text-[15px] leading-relaxed text-ink outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
      />

      <div className="flex flex-col gap-2">
        <WordCounter text={value} min={range.min} max={range.max} />
        <TranslateButton
          text={value}
          onApply={(translated) =>
            onChange({ [field]: translated } as Partial<WritingData>)
          }
        />
      </div>
    </div>
  );
}
