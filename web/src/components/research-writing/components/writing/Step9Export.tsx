import { useMemo, useState } from "react";
import type { WritingData } from "@/components/research-writing/data/writingSteps";
import { clearData } from "@/components/research-writing/lib/storage";
import { buildCvprTex, buildCvprBib } from "@/components/research-writing/lib/cvprTex";

interface Props {
  data: WritingData;
}

// 从论文标题生成安全的文件名
function makeSafeFilename(title: string): string {
  if (!title.trim()) return "article";
  return (
    title
      .trim()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, "") // 去掉特殊字符
      .replace(/\s+/g, "-")
      .slice(0, 80) || "article"
  );
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(meta)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function urlToBlob(url: string): Promise<Blob> {
  if (url.startsWith("data:")) return dataUrlToBlob(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`无法下载图片 ${url}`);
  return res.blob();
}

export default function Step9Export({ data }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState("");

  const tex = useMemo(() => buildCvprTex(data), [data]);
  const safeName = useMemo(() => makeSafeFilename(data.title), [data.title]);

  // 下载 main.tex
  const handleDownloadTex = () => {
    const blob = new Blob([tex], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "main.tex";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 下载文章 zip（不含模板）
  const handleDownloadZip = async () => {
    setDownloading(true);
    setError("");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // 1. main.tex
      zip.file("main.tex", tex);

      // 2. main.bib
      zip.file("main.bib", buildCvprBib(data));

      // 3. figures/
      const figFolder = zip.folder("figures")!;
      if (data.algorithmFlowImage) {
        try {
          const blob = await urlToBlob(data.algorithmFlowImage);
          figFolder.file("algorithm_flow.png", blob);
        } catch (e) {
          console.warn("flow image failed:", e);
        }
      }
      if (data.algorithmIllustImage) {
        try {
          const blob = await urlToBlob(data.algorithmIllustImage);
          figFolder.file("algorithm_illustration.png", blob);
        } catch (e) {
          console.warn("illust image failed:", e);
        }
      }

      // 4. 打包
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(`打包失败：${String(e)}`);
    } finally {
      setDownloading(false);
    }
  };

  // 一键编译 PDF
  const handleCompile = async () => {
    setCompiling(true);
    setError("");
    try {
      const files: Record<string, string> = {};
      files["main.tex"] = tex;
      files["main.bib"] = buildCvprBib(data);

      const toDataUrl = async (url: string): Promise<string> => {
        if (url.startsWith("data:")) return url;
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(blob);
        });
      };

      if (data.algorithmFlowImage) {
        files["figures/algorithm_flow.png"] = await toDataUrl(
          data.algorithmFlowImage
        );
      }
      if (data.algorithmIllustImage) {
        files["figures/algorithm_illustration.png"] = await toDataUrl(
          data.algorithmIllustImage
        );
      }

      void files;
      throw new Error("PDF 编译尚未接入统一 Research Workflow/Codex，已阻止旧 localhost 接口调用");
    } catch (e) {
      setError(`编译失败：${String(e)}`);
    } finally {
      setCompiling(false);
    }
  };

  const handlePreview = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<pre style="white-space:pre-wrap;font-family:Menlo,Consolas,monospace;font-size:12px;padding:20px;line-height:1.5">${tex
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>`
    );
    w.document.title = "main.tex 预览";
  };

  const handleClearAll = () => {
    const ok = window.confirm(
      "确定要清空所有已保存的数据吗？此操作不可恢复。"
    );
    if (!ok) return;
    clearData();
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-bold text-brand-700">生成 CVPR PDF</h2>
        <p className="mt-1 text-sm text-ink-sub">
          一键编译成符合 CVPR 投稿格式的 PDF，或下载你的文章源文件。
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="标题" value={data.title ? "✓" : "—"} />
        <Stat label="摘要" value={data.abstract ? "✓" : "—"} />
        <Stat label="引用" value={`${data.references.length} 条`} />
        <Stat
          label="配图"
          value={`${
            (data.algorithmFlowImage ? 1 : 0) +
            (data.algorithmIllustImage ? 1 : 0)
          }/2`}
        />
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      <section className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-ink">
            main.tex 预览
          </label>
          <button
            type="button"
            onClick={handlePreview}
            className="text-xs text-brand-500 underline-offset-2 hover:underline"
          >
            在新窗口打开
          </button>
        </div>
        <pre className="max-h-[320px] min-h-[240px] overflow-auto rounded-lg border border-blue-100 bg-[#f7faff] p-4 text-[11.5px] leading-relaxed text-ink">
          {tex}
        </pre>
      </section>

      {/* 三个操作按钮 */}
      <section className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCompile}
          disabled={compiling}
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-green-700 disabled:opacity-60"
        >
          {compiling ? "编译中..." : "🔨 一键编译 PDF"}
        </button>
        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={downloading}
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-700 disabled:opacity-60"
        >
          {downloading ? "打包中..." : "⬇ 下载文章 zip"}
        </button>
        <button
          type="button"
          onClick={handleDownloadTex}
          className="rounded-lg bg-brand-100 px-5 py-2.5 text-sm font-semibold text-brand-500 transition-all hover:bg-brand-500 hover:text-white"
        >
          ⬇ 仅下载 main.tex
        </button>
      </section>

      <section className="rounded-lg border border-blue-100 bg-[#f7faff] px-4 py-3 text-xs leading-relaxed text-ink-sub">
        <div className="mb-1 font-semibold text-brand-700">
          两个下载的区别：
        </div>
        <ul className="ml-4 list-disc">
          <li>
            <b>一键编译 PDF</b> — 后端自动套用 CVPR 模板，直接返回 PDF（推荐）
          </li>
          <li>
            <b>下载文章 zip</b> — 只包含你的文章（main.tex + main.bib + 图片），不含模板文件，用于备份或自行编译
          </li>
        </ul>
      </section>

      <p className="text-xs text-ink-sub">
        ⓘ 文件名根据论文标题自动生成：<b>{safeName}</b>
      </p>

      {/* 危险操作 */}
      <section className="mt-4 rounded-lg border border-red-100 bg-red-50/40 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-red-600">危险操作</div>
            <div className="mt-0.5 text-xs text-ink-sub">
              清空所有已保存在本地的数据（课题、章节内容、上传文件等）。
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearAll}
            className="shrink-0 rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-red-600"
          >
            清空全部数据
          </button>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white/70 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-ink-sub">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-brand-700">{value}</div>
    </div>
  );
}
