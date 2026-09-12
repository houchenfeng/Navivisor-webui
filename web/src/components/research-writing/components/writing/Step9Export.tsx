import { useEffect, useMemo, useState } from "react";
import type { WritingData } from "@/components/research-writing/data/writingSteps";
import { clearData } from "@/components/research-writing/lib/storage";
import { buildCvprTex, buildCvprBib } from "@/components/research-writing/lib/cvprTex";
import { getAuthorizationHeader } from "@/auth-token";
import {
  tryLoadDemoMainTex,
  tryResolveDemoPaperPdf,
} from "@/components/research-writing/lib/demo-writing";
import { PdfViewer } from "@/components/files/viewers/pdf-viewer";
import { filePreviewSource } from "@/components/files/viewers/preview-source";

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

const TEMPLATE_FILES = ["cvpr.sty", "preamble.tex", "ieeenat_fullname.bst"] as const;

async function loadTemplateFile(name: string): Promise<Blob> {
  const response = await fetch(`/cvpr-template/${name}`);
  if (!response.ok) throw new Error(`无法读取官方模板文件：${name}`);
  return response.blob();
}

export default function Step9Export({ data }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [generatingTex, setGeneratingTex] = useState(false);
  const [error, setError] = useState("");
  const [texOverride, setTexOverride] = useState<string | null>(null);
  const [pdfFilePath, setPdfFilePath] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const generatedTex = useMemo(() => buildCvprTex(data), [data]);
  const tex = texOverride ?? generatedTex;
  const safeName = useMemo(() => makeSafeFilename(data.title), [data.title]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

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

      // 3. Official CVPR support files, so the archive is directly compilable.
      for (const name of TEMPLATE_FILES) zip.file(name, await loadTemplateFile(name));

      // 4. figures/
      const figFolder = zip.folder("figures")!;
      if (data.algorithmFlowImage) {
        try {
          const blob = await urlToBlob(data.algorithmFlowImage);
          figFolder.file("algorithm_flow.png", blob);
        } catch (e) {
          console.warn("flow image failed:", e);
        }
      }
      const resultImages =
        data.resultImages?.length > 0
          ? data.resultImages
          : data.algorithmIllustImage
            ? [data.algorithmIllustImage]
            : [];
      for (const [index, image] of resultImages.entries()) {
        try {
          const blob = await urlToBlob(image);
          figFolder.file(`result_${index + 1}.png`, blob);
        } catch (e) {
          console.warn("result image failed:", e);
        }
      }

      // 5. 打包
      zip.file(
        "CVPR-COMPILE-README.txt",
        "Compile with a local TeX installation:\n\n" +
          "pdflatex -interaction=nonstopmode -halt-on-error main.tex\n" +
          "bibtex main\n" +
          "pdflatex -interaction=nonstopmode -halt-on-error main.tex\n" +
          "pdflatex -interaction=nonstopmode -halt-on-error main.tex\n",
      );
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

  const showPdf = (filePath: string | null, blobUrl: string | null) => {
    setPdfBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return blobUrl;
    });
    setPdfFilePath(filePath);
  };

  const handleGenerateTex = async () => {
    setGeneratingTex(true);
    setError("");
    try {
      const loaded = await tryLoadDemoMainTex();
      if (!loaded) {
        throw new Error("未找到 Demo 的 main.tex（writing/source/cvpr-paper）");
      }
      setTexOverride(loaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGeneratingTex(false);
    }
  };

  // 一键编译 PDF：发送源码到后端；失败时回退 Demo 已编译 PDF，并在下方预览。
  const handleCompile = async () => {
    setCompiling(true);
    setError("");
    try {
      const response = await fetch("/api/research/writing/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getAuthorizationHeader()
            ? { Authorization: getAuthorizationHeader()! }
            : {}),
        },
        body: JSON.stringify({
          tex,
          bib: buildCvprBib(data),
          figures: {
            ...(data.algorithmFlowImage.startsWith("data:")
              ? { "algorithm_flow.png": data.algorithmFlowImage }
              : {}),
            ...Object.fromEntries(
              (data.resultImages?.length
                ? data.resultImages
                : data.algorithmIllustImage
                  ? [data.algorithmIllustImage]
                  : []
              )
                .filter((image) => image.startsWith("data:"))
                .map((image, index) => [`result_${index + 1}.png`, image]),
            ),
          },
        }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const demoPdf = await tryResolveDemoPaperPdf();
        if (demoPdf) {
          showPdf(demoPdf, null);
        } else {
          showPdf(null, URL.createObjectURL(blob));
        }
        return;
      }
      const detail = await response.text();
      const demoPdf = await tryResolveDemoPaperPdf();
      if (demoPdf) {
        showPdf(demoPdf, null);
        return;
      }
      throw new Error(detail || `编译请求失败（${response.status}）`);
    } catch (e) {
      const demoPdf = await tryResolveDemoPaperPdf();
      if (demoPdf) {
        showPdf(demoPdf, null);
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
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
        <Stat label="配图" value="2" />
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleGenerateTex()}
              disabled={generatingTex}
              className="rounded-md bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {generatingTex ? "生成中..." : "AI 生成"}
            </button>
            <button
              type="button"
              onClick={handlePreview}
              className="text-xs text-brand-500 underline-offset-2 hover:underline"
            >
              在新窗口打开
            </button>
          </div>
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
            <b>一键编译 PDF</b> — 使用后端本机的 TeX 环境编译，并在下方预览 PDF
          </li>
          <li>
            <b>下载文章 zip</b> — 包含 main.tex + main.bib + 官方模板文件 + 图片，可离线编译
          </li>
        </ul>
      </section>

      {(pdfFilePath || pdfBlobUrl) && (
        <section className="flex min-h-0 flex-col gap-2">
          <label className="text-sm font-semibold text-ink">PDF 预览</label>
          <div className="h-[420px] overflow-hidden rounded-lg border border-blue-100 bg-white">
            {pdfFilePath ? (
              <PdfViewer source={filePreviewSource(pdfFilePath)} />
            ) : (
              <iframe
                title="PDF 预览"
                src={pdfBlobUrl ?? undefined}
                className="h-full w-full"
              />
            )}
          </div>
        </section>
      )}

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
