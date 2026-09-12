import { useEffect, useMemo, useRef } from "react";
import type { WritingData } from "@/components/research-writing/data/writingSteps";

interface Props {
  data: WritingData;
  onChange: (patch: Partial<WritingData>) => void;
}

function parseBib(bib: string): { key: string; text: string }[] {
  const entries: { key: string; text: string }[] = [];
  const regex = /@(\w+)\s*\{\s*([^,]+)\s*,([\s\S]*?)\n\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(bib)) !== null) {
    const type = match[1].toLowerCase();
    const key = match[2].trim();
    const body = match[3];

    const fields: Record<string, string> = {};
    const fieldRegex = /(\w+)\s*=\s*[{"]([\s\S]*?)[}"]\s*,?/g;
    let fm: RegExpExecArray | null;
    while ((fm = fieldRegex.exec(body)) !== null) {
      fields[fm[1].toLowerCase()] = fm[2].replace(/\s+/g, " ").trim();
    }

    const author = fields.author ?? "";
    const title = fields.title ?? "";
    const year = fields.year ?? "";
    const venue =
      fields.journal ?? fields.booktitle ?? fields.publisher ?? "";

    const text = [author, title, venue, year]
      .filter(Boolean)
      .join(". ");

    entries.push({ key: `${type}:${key}`, text: text || `(${key})` });
  }

  return entries;
}

export default function Step8References({ data, onChange }: Props) {
  const parsed = useMemo(() => parseBib(data.bibContent), [data.bibContent]);
  const lastSyncedBib = useRef<string | null>(null);

  useEffect(() => {
    if (lastSyncedBib.current !== data.bibContent && parsed.length > 0) {
      onChange({ references: parsed });
    }
    lastSyncedBib.current = data.bibContent;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, data.bibContent, onChange]);

  const removeRef = (idx: number) => {
    onChange({ references: data.references.filter((_, i) => i !== idx) });
  };

  const updateRefText = (idx: number, text: string) => {
    onChange({
      references: data.references.map((r, i) =>
        i === idx ? { ...r, text } : r
      ),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-bold text-brand-700">引用文献</h2>
        <p className="mt-1 text-sm text-ink-sub">
          从第 1 步上传的 .bib 文件自动解析，可在此微调每一条的显示文本。
        </p>
      </header>

      <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-[#f7faff] px-4 py-3 text-sm">
        <span className="text-xl">📚</span>
        <span className="text-ink-sub">
          已解析 <b className="text-brand-700">{data.references.length}</b> 条引用
        </span>
        {data.references.length === 0 && (
          <span className="text-xs text-ink-sub">
            （请先在第 1 步上传 .bib 文件）
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {data.references.map((ref, idx) => (
          <div
            key={ref.key || idx}
            className="flex items-start gap-3 rounded-lg border border-blue-100 bg-white p-3"
          >
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-500">
              [{idx + 1}]
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-ink-sub">
                {ref.key}
              </div>
              <textarea
                value={ref.text}
                onChange={(e) => updateRefText(idx, e.target.value)}
                rows={2}
                className="w-full resize-none rounded-md border border-transparent bg-transparent p-1 text-sm leading-relaxed text-ink outline-none transition-all hover:border-blue-100 focus:border-brand-300 focus:bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => removeRef(idx)}
              className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
              title="删除此条"
            >
              ✕
            </button>
          </div>
        ))}

        {data.references.length === 0 && (
          <div className="grid place-items-center rounded-lg border border-dashed border-blue-200 bg-[#f7faff] py-10 text-sm text-ink-sub">
            暂未解析到引用
          </div>
        )}
      </div>

      <p className="text-xs text-ink-sub">
        ⓘ 每条引用可单独编辑文本、删除，或后续手动补充。
      </p>
    </div>
  );
}
