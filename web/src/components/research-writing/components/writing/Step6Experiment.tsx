import { useState } from "react";
import type { WritingData } from "@/components/research-writing/data/writingSteps";
import { generateWritingSection } from "@/components/research-writing/lib/codex";
import WordCounter from "./WordCounter";
import TranslateButton from "./TranslateButton";

interface Props {
  data: WritingData;
  onChange: (patch: Partial<WritingData>) => void;
}

type ResultTable = WritingData["experimentTables"][number];

function syncTables(tables: ResultTable[]): Pick<WritingData, "experimentTables" | "experimentTable"> {
  return {
    experimentTables: tables,
    experimentTable: tables[0] ?? { title: "结果表格", headers: [], rows: [] },
  };
}

export default function Step6Experiment({ data, onChange }: Props) {
  const tables =
    data.experimentTables?.length > 0
      ? data.experimentTables
      : data.experimentTable.headers.length > 0
        ? [{ ...data.experimentTable, title: data.experimentTable.title || "结果表格" }]
        : [];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await generateWritingSection("experiment", data);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as {
            text?: string;
            table?: ResultTable;
            tables?: ResultTable[];
          };

          const nextTables = Array.isArray(parsed.tables)
            ? parsed.tables.filter((table) => table.headers?.length)
            : parsed.table?.headers?.length
              ? [{ ...parsed.table, title: parsed.table.title || "结果表格" }]
              : tables;

          onChange({
            experiment: typeof parsed.text === "string" ? parsed.text : raw,
            ...syncTables(
              nextTables.map((table) => ({
                title: table.title || "结果表格",
                headers: (table.headers ?? []).map((header) => String(header ?? "")),
                rows: (table.rows ?? []).map((row) =>
                  (table.headers ?? []).map((_, index) => String(row[index] ?? "")),
                ),
              })),
            ),
          });
          return;
        } catch {
          onChange({ experiment: raw });
        }
      } else {
        onChange({ experiment: raw });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const updateTables = (next: ResultTable[]) => onChange(syncTables(next));

  const updateCell = (tableIndex: number, r: number, c: number, value: string) => {
    updateTables(
      tables.map((table, index) =>
        index === tableIndex
          ? {
              ...table,
              rows: table.rows.map((row, ri) =>
                ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row,
              ),
            }
          : table,
      ),
    );
  };

  const updateHeader = (tableIndex: number, c: number, value: string) => {
    updateTables(
      tables.map((table, index) =>
        index === tableIndex
          ? { ...table, headers: table.headers.map((header, i) => (i === c ? value : header)) }
          : table,
      ),
    );
  };

  const addRow = (tableIndex: number) => {
    updateTables(
      tables.map((table, index) =>
        index === tableIndex
          ? { ...table, rows: [...table.rows, new Array(table.headers.length).fill("")] }
          : table,
      ),
    );
  };

  const removeRow = (tableIndex: number, r: number) => {
    updateTables(
      tables.map((table, index) =>
        index === tableIndex && table.rows.length > 1
          ? { ...table, rows: table.rows.filter((_, i) => i !== r) }
          : table,
      ),
    );
  };

  const addColumn = (tableIndex: number) => {
    updateTables(
      tables.map((table, index) =>
        index === tableIndex
          ? {
              ...table,
              headers: [...table.headers, `列 ${table.headers.length + 1}`],
              rows: table.rows.map((row) => [...row, ""]),
            }
          : table,
      ),
    );
  };

  const removeColumn = (tableIndex: number, c: number) => {
    updateTables(
      tables.map((table, index) =>
        index === tableIndex && table.headers.length > 1
          ? {
              ...table,
              headers: table.headers.filter((_, i) => i !== c),
              rows: table.rows.map((row) => row.filter((_, i) => i !== c)),
            }
          : table,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand-700">实验结果</h2>
          <p className="mt-1 text-sm text-ink-sub">
            说明实验设置、对比方法与结果分析。
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
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

      <section className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-ink">结果分析正文</label>
        <textarea
          value={data.experiment}
          onChange={(e) => onChange({ experiment: e.target.value })}
          placeholder="描述数据集、评价指标、对比方法和主要结论..."
          className="h-[180px] w-full resize-none rounded-lg border border-blue-100 bg-white p-5 font-serif text-[15px] leading-relaxed text-ink outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
        />
        <div className="flex flex-col gap-2">
          <WordCounter text={data.experiment} min={400} max={1000} />
          <TranslateButton
            text={data.experiment}
            onApply={(translated) => onChange({ experiment: translated })}
          />
        </div>
      </section>

      {tables.length === 0 ? (
        <section className="rounded-lg border border-dashed border-blue-200 bg-[#f8fbff] px-4 py-8 text-center text-sm text-ink-sub">
          尚未载入结果表格。点击「AI 生成」可生成结果表格和消融实验表格。
        </section>
      ) : (
        tables.map((table, tableIndex) => (
          <section key={`${table.title}-${tableIndex}`} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-ink">
                {tableIndex + 1}. {table.title || "结果表格"}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addRow(tableIndex)}
                  className="rounded-md bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-500 transition-all hover:bg-brand-500 hover:text-white"
                >
                  + 行
                </button>
                <button
                  type="button"
                  onClick={() => addColumn(tableIndex)}
                  className="rounded-md bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-500 transition-all hover:bg-brand-500 hover:text-white"
                >
                  + 列
                </button>
              </div>
            </div>

            <div className="overflow-auto rounded-lg border border-blue-100 bg-white">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f4f8ff]">
                    {table.headers.map((h, ci) => (
                      <th
                        key={ci}
                        className="border border-blue-100 px-2 py-1.5 text-left font-semibold text-brand-700"
                      >
                        <div className="flex items-center gap-1">
                          <input
                            value={h}
                            onChange={(e) => updateHeader(tableIndex, ci, e.target.value)}
                            className="w-full min-w-[80px] bg-transparent outline-none"
                          />
                          {table.headers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeColumn(tableIndex, ci)}
                              className="text-[10px] text-slate-400 hover:text-red-500"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="w-8 border border-blue-100 bg-[#f4f8ff]" />
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-blue-50/40">
                      {row.map((cell, ci) => (
                        <td key={ci} className="border border-blue-100 px-2 py-1.5">
                          <input
                            value={cell}
                            onChange={(e) => updateCell(tableIndex, ri, ci, e.target.value)}
                            className="w-full min-w-[80px] bg-transparent text-sm outline-none"
                          />
                        </td>
                      ))}
                      <td className="border border-blue-100 px-1 text-center">
                        {table.rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(tableIndex, ri)}
                            className="text-xs text-slate-400 hover:text-red-500"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      <p className="text-xs text-ink-sub">
        ⓘ 点击「✨ AI 生成」会同时生成正文和表格；单元格也可手动编辑。
      </p>
    </div>
  );
}
