import { useState } from "react";
import { translateText, type TranslateDirection } from "@/components/research-writing/lib/translate";

interface Props {
  text: string;
  onApply: (translated: string) => void;
}

export default function TranslateButton({ text, onApply }: Props) {
  const [loading, setLoading] = useState<TranslateDirection | null>(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const handleTranslate = async (direction: TranslateDirection) => {
    setLoading(direction);
    setError("");
    setResult("");
    try {
      const t = await translateText(text, direction);
      setResult(t);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  };

  const handleApply = () => {
    onApply(result);
    setResult("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleTranslate("en2zh")}
          disabled={loading !== null || !text.trim()}
          className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-ink-sub transition-all hover:bg-brand-100 hover:text-brand-500 disabled:opacity-50"
        >
          {loading === "en2zh" ? "翻译中..." : "🌐 英译中"}
        </button>
        <button
          type="button"
          onClick={() => handleTranslate("zh2en")}
          disabled={loading !== null || !text.trim()}
          className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-ink-sub transition-all hover:bg-brand-100 hover:text-brand-500 disabled:opacity-50"
        >
          {loading === "zh2en" ? "翻译中..." : "🌐 中译英"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {result && (
        <div className="rounded-lg border border-blue-100 bg-[#f7faff] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              翻译结果（可编辑）
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApply}
                className="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white transition-all hover:bg-brand-700"
              >
                ✓ 应用（覆盖原文）
              </button>
              <button
                type="button"
                onClick={() => setResult("")}
                className="rounded-md bg-slate-200 px-2.5 py-1 text-xs font-semibold text-ink-sub transition-all hover:bg-slate-300"
              >
                ✕ 关闭
              </button>
            </div>
          </div>
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={Math.min(20, Math.max(4, result.split("\n").length + 1))}
            className="w-full resize-y rounded-md border border-blue-100 bg-white p-3 font-serif text-sm leading-relaxed text-ink outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-1 text-right text-[10px] text-ink-sub">
            {result.length} 字符
          </div>
        </div>
      )}
    </div>
  );
}
