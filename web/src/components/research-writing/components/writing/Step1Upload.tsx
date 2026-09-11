import { useRef } from "react";
import type { WritingData } from "@/data/writingSteps";

interface Props {
  data: WritingData;
  onChange: (patch: Partial<WritingData>) => void;
}

export default function Step1Upload({ data, onChange }: Props) {
  const detailRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLInputElement>(null);
  const bibRef = useRef<HTMLInputElement>(null);

  // 读取文本文件为字符串
  const readTextFile = (file: File, callback: (text: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result ?? ""));
    reader.readAsText(file, "utf-8");
  };

  const handleDetail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readTextFile(file, (text) => onChange({ experimentDetail: text }));
  };

  const handleResult = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readTextFile(file, (text) => onChange({ experimentResult: text }));
  };

  const handleBib = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readTextFile(file, (text) => onChange({ bibContent: text }));
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-bold text-brand-700">上传素材</h2>
        <p className="mt-1 text-sm text-ink-sub">
          填写课题名称，并上传实验细节、实验结果和引用文献。
        </p>
      </header>

      {/* 课题名称 */}
      <section>
        <label className="mb-2 block text-sm font-semibold text-ink">
          课题名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.topic}
          onChange={(e) => onChange({ topic: e.target.value })}
          placeholder="例如：基于对比学习的小样本图像分类方法研究"
          className="w-full rounded-lg border border-blue-100 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
        />
      </section>

      {/* 三个文件上传 */}
      <section className="grid gap-4">
        <FileUploadCard
          label="实验完整细节"
          description="记录实验设计、数据集、模型结构、训练参数等（.md 或 .txt）"
          fileName={data.experimentDetail ? "已读取" : ""}
          preview={data.experimentDetail}
          onPick={() => detailRef.current?.click()}
          onClear={() => {
            onChange({ experimentDetail: "" });
            if (detailRef.current) detailRef.current.value = "";
          }}
        />
        <input
          ref={detailRef}
          type="file"
          accept=".md,.txt,text/plain"
          className="hidden"
          onChange={handleDetail}
        />

        <FileUploadCard
          label="实验结果描述"
          description="包含指标数值、对比方法、消融分析等（.md 或 .txt）"
          fileName={data.experimentResult ? "已读取" : ""}
          preview={data.experimentResult}
          onPick={() => resultRef.current?.click()}
          onClear={() => {
            onChange({ experimentResult: "" });
            if (resultRef.current) resultRef.current.value = "";
          }}
        />
        <input
          ref={resultRef}
          type="file"
          accept=".md,.txt,text/plain"
          className="hidden"
          onChange={handleResult}
        />

        <FileUploadCard
          label="引用文献"
          description="BibTeX 格式（.bib）"
          fileName={data.bibContent ? "已读取" : ""}
          preview={data.bibContent}
          onPick={() => bibRef.current?.click()}
          onClear={() => {
            onChange({ bibContent: "" });
            if (bibRef.current) bibRef.current.value = "";
          }}
        />
        <input
          ref={bibRef}
          type="file"
          accept=".bib,text/plain"
          className="hidden"
          onChange={handleBib}
        />
      </section>
    </div>
  );
}

interface FileUploadCardProps {
  label: string;
  description: string;
  fileName: string;
  preview: string;
  onPick: () => void;
  onClear: () => void;
}

function FileUploadCard({
  label,
  description,
  fileName,
  preview,
  onPick,
  onClear,
}: FileUploadCardProps) {
  const hasContent = preview.length > 0;
  const charCount = preview.length;

  return (
    <div className="rounded-xl border border-blue-100 bg-white/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">{label}</div>
          <div className="mt-0.5 text-xs text-ink-sub">{description}</div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasContent && (
            <span className="text-xs text-green-600">
              ✓ {fileName}（{charCount} 字）
            </span>
          )}
          <button
            type="button"
            onClick={onPick}
            className="rounded-lg bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-500 transition-all hover:bg-brand-500 hover:text-white"
          >
            {hasContent ? "重新选择" : "选择文件"}
          </button>
          {hasContent && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-ink-sub transition-all hover:bg-red-100 hover:text-red-600"
            >
              清空
            </button>
          )}
        </div>
      </div>

      {hasContent && (
        <pre className="mt-3 max-h-[120px] overflow-auto rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-ink-sub">
          {preview.length > 500 ? preview.slice(0, 500) + "\n...(已省略)" : preview}
        </pre>
      )}
    </div>
  );
}