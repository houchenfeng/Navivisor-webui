import { useRef, useState } from "react";
import type { WritingData } from "@/components/research-writing/data/writingSteps";
import { generateWritingFigure, generateWritingSection } from "@/components/research-writing/lib/codex";
import { tryLoadDemoResultFigures } from "@/components/research-writing/lib/demo-writing";
import { formatUnknownError } from "@/components/research-writing/lib/errors";
import WordCounter from "./WordCounter";
import TranslateButton from "./TranslateButton";

interface Props {
  data: WritingData;
  onChange: (patch: Partial<WritingData>) => void;
}

type ImageKind = "algorithmFlowImage";

function buildDefaultPrompt(kind: ImageKind, topic: string): string {
  const t = topic || "machine learning method";
  if (kind === "algorithmFlowImage") {
    return `Create a wide, white-background, CVPR-style computer vision method pipeline for "${t}". Preserve the supplied experiment topology exactly: keep every declared node, order, branch, fusion, arrow direction, and output; do not invent modules, datasets, metrics, formulas, numbers, citations, or claims. Use 5–9 compact modules arranged left-to-right, optional lower detail panels only when specified, restrained blue/teal/green/orange accents, thin gray borders, consistent arrows, readable English labels, and generous paper-ready whitespace. No paragraphs, random small text, neon, 3D cards, decorative circuit lines, robots, AI brains, logos, or watermark.`;
  }
  return "";
}

export default function Step5Algorithm({ data, onChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [imgLoadingFlow, setImgLoadingFlow] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [imgError, setImgError] = useState("");

  const [promptFlow, setPromptFlow] = useState(() =>
    buildDefaultPrompt("algorithmFlowImage", data.topic)
  );

  const [preview, setPreview] = useState<string | null>(null);

  const flowUploadRef = useRef<HTMLInputElement>(null);
  const resultUploadRef = useRef<HTMLInputElement>(null);

  const resultImages =
    data.resultImages?.length > 0
      ? data.resultImages
      : data.algorithmIllustImage
        ? [data.algorithmIllustImage]
        : [];

  const setResultImages = (images: string[]) => {
    onChange({
      resultImages: images,
      algorithmIllustImage: images[0] ?? "",
    });
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const text = await generateWritingSection("algorithm", data);
      onChange({
        algorithm: typeof text === "string" ? text : JSON.stringify(text),
      });
    } catch (e) {
      setError(formatUnknownError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async (kind: ImageKind) => {
    setImgLoadingFlow(true);
    setImgError("");

    try {
      const prompt =
        promptFlow.trim() || buildDefaultPrompt(kind, data.topic);

      const imageUrl = await generateWritingFigure(prompt, kind, {
        topic: data.topic,
        algorithm: data.algorithm,
        experimentMarkdown: [data.experimentDetail, data.experimentResult, data.experiment]
          .filter(Boolean)
          .join("\n\n"),
      });
      onChange({ [kind]: imageUrl } as Partial<WritingData>);
    } catch (e) {
      setImgError(formatUnknownError(e));
    } finally {
      setImgLoadingFlow(false);
    }
  };

  const handleLoadResultFigures = async () => {
    setResultLoading(true);
    setImgError("");
    try {
      const images = await tryLoadDemoResultFigures();
      if (images.length === 0) {
        setImgError("当前 Demo 中没有找到结果效果图，请手动上传。");
        return;
      }
      setResultImages(images);
    } catch (e) {
      setImgError(formatUnknownError(e));
    } finally {
      setResultLoading(false);
    }
  };

  const clearImage = (kind: ImageKind) => {
    onChange({ [kind]: "" } as Partial<WritingData>);
  };

  const resetPrompt = (kind: ImageKind) => {
    setPromptFlow(buildDefaultPrompt("algorithmFlowImage", data.topic));
    void kind;
  };

  const handleUpload = (kind: ImageKind, file: File) => {
    if (!file.type.startsWith("image/")) {
      setImgError("请选择图片文件");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setImgError("图片不能超过 3MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ [kind]: String(reader.result) } as Partial<WritingData>);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadResult = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setImgError("请选择图片文件");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setImgError("图片不能超过 3MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setResultImages([...resultImages, String(reader.result)]);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlInput = (kind: ImageKind) => {
    const url = window.prompt("粘贴图片 URL：");
    if (!url) return;
    onChange({ [kind]: url.trim() } as Partial<WritingData>);
  };

  const handleDownload = async (kind: ImageKind, url: string) => {
    try {
      let blob: Blob;
      if (url.startsWith("data:")) {
        const [meta, base64] = url.split(",");
        const mime = /:(.*?);/.exec(meta)?.[1] ?? "image/png";
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++)
          bytes[i] = binary.charCodeAt(i);
        blob = new Blob([bytes], { type: mime });
      } else {
        const res = await fetch(url);
        blob = await res.blob();
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${
        kind === "algorithmFlowImage"
          ? "algorithm_flow"
          : "algorithm_illustration"
      }.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setImgError(`下载失败：${formatUnknownError(e)}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand-700">算法介绍</h2>
          <p className="mt-1 text-sm text-ink-sub">
            描述方法框架，并配算法框架流程图；结果展示图只支持从 Demo 载入或手动上传。
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

      {error && error !== "[object Object]" && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {imgError && imgError !== "[object Object]" && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">
          {imgError}
        </div>
      )}

      <section className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-ink">方法正文</label>
        <textarea
          value={typeof data.algorithm === "string" ? data.algorithm : ""}
          onChange={(e) => onChange({ algorithm: e.target.value })}
          placeholder="在这里描述你的算法：整体框架、各模块作用、训练目标等。"
          className="h-[220px] w-full resize-none rounded-lg border border-blue-100 bg-white p-5 font-serif text-[15px] leading-relaxed text-ink outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
        />
        <div className="flex flex-col gap-2">
          <WordCounter text={data.algorithm} min={600} max={1200} />
          <TranslateButton
            text={data.algorithm}
            onApply={(translated) => onChange({ algorithm: translated })}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ImageSlot
          title="算法框架流程图"
          description="载入 Demo 后点击生成，会直接读取 Demo 中的算法框架流程图"
          image={data.algorithmFlowImage}
          loading={imgLoadingFlow}
          prompt={promptFlow}
          onPromptChange={setPromptFlow}
          onResetPrompt={() => resetPrompt("algorithmFlowImage")}
          onGenerate={() => handleGenerateImage("algorithmFlowImage")}
          onClear={() => clearImage("algorithmFlowImage")}
          onUpload={(file) => handleUpload("algorithmFlowImage", file)}
          onUrl={() => handleUrlInput("algorithmFlowImage")}
          onDownload={() =>
            handleDownload("algorithmFlowImage", data.algorithmFlowImage)
          }
          onPreview={() => setPreview(data.algorithmFlowImage)}
          uploadRef={flowUploadRef}
        />
        <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-white/70 p-4">
          <div>
            <div className="text-sm font-semibold text-ink">结果展示图</div>
            <div className="mt-0.5 text-xs text-ink-sub">
              不支持 AI 生成。点击载入会读取 Demo 中的对比/曲线/定性效果图，也可手动上传。
            </div>
          </div>
          <input
            ref={resultUploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadResult(file);
              if (resultUploadRef.current) resultUploadRef.current.value = "";
            }}
          />
          {resultLoading ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-blue-200 bg-[#f7faff] text-xs text-ink-sub">
              正在载入 Demo 结果图…
            </div>
          ) : resultImages.length > 0 ? (
            <div className="grid min-h-[180px] grid-cols-2 gap-2 rounded-lg border border-dashed border-blue-200 bg-[#f7faff] p-2">
              {resultImages.map((image, index) => (
                <img
                  key={`${index}-${image.slice(0, 24)}`}
                  src={image}
                  alt={`结果图 ${index + 1}`}
                  className="h-28 w-full cursor-zoom-in rounded bg-white object-contain"
                  onClick={() => setPreview(image)}
                />
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleLoadResultFigures()}
              className="flex min-h-[180px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-blue-200 bg-[#f7faff] p-2 text-center text-xs text-ink-sub"
            >
              点击此处从 Demo 载入结果效果图
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleLoadResultFigures()}
              disabled={resultLoading}
              className="flex-1 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-brand-700 disabled:opacity-50"
            >
              {resultLoading ? "载入中..." : resultImages.length ? "重新载入 Demo 图" : "载入 Demo 图"}
            </button>
            <button
              type="button"
              onClick={() => resultUploadRef.current?.click()}
              className="rounded-lg bg-brand-100 px-3 py-2 text-xs font-semibold text-brand-500 transition-all hover:bg-brand-500 hover:text-white"
            >
              上传
            </button>
            {resultImages.length > 0 ? (
              <button
                type="button"
                onClick={() => setResultImages([])}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-ink-sub transition-all hover:bg-red-100 hover:text-red-600"
              >
                清空
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <p className="text-xs text-ink-sub">
        ⓘ 算法框架图可生成或上传；结果展示图仅从 Demo 载入或上传，不调用 AI 生图。
      </p>

      {preview && <Lightbox src={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

interface ImageSlotProps {
  title: string;
  description: string;
  image: string;
  loading: boolean;
  prompt: string;
  onPromptChange: (v: string) => void;
  onResetPrompt: () => void;
  onGenerate: () => void;
  onClear: () => void;
  onUpload: (file: File) => void;
  onUrl: () => void;
  onDownload: () => void;
  onPreview: () => void;
  uploadRef: React.RefObject<HTMLInputElement | null>;
}

function ImageSlot({
  title,
  description,
  image,
  loading,
  prompt,
  onPromptChange,
  onResetPrompt,
  onGenerate,
  onClear,
  onUpload,
  onUrl,
  onDownload,
  onPreview,
  uploadRef,
}: ImageSlotProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-white/70 p-4">
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        <div className="mt-0.5 text-xs text-ink-sub">{description}</div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowPrompt((v) => !v)}
          className="flex items-center gap-1 text-xs text-brand-500 hover:underline"
        >
          {showPrompt ? "▾ 隐藏提示词" : "▸ 编辑提示词"}
        </button>

        {showPrompt && (
          <div className="mt-2 flex flex-col gap-1.5">
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              rows={4}
              placeholder="描述你想要的图片（英文效果更好）..."
              className="w-full resize-none rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs leading-relaxed text-ink outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-ink-sub">
                {prompt.length} 字符
              </span>
              <button
                type="button"
                onClick={onResetPrompt}
                className="text-[10px] text-brand-500 hover:underline"
              >
                恢复默认提示词
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex h-[260px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-blue-200 bg-[#f7faff] p-2">
        {loading ? (
          <div className="text-center text-xs text-ink-sub">
            <div className="mb-2 animate-spin text-2xl">⏳</div>
            生成中，请稍候（10~30 秒）...
          </div>
        ) : image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full cursor-zoom-in rounded object-contain transition-transform hover:scale-[1.02]"
            onClick={onPreview}
          />
        ) : (
          <div className="text-center text-xs text-ink-sub">
            <div className="mb-1 text-2xl text-blue-200">🖼</div>
            尚未生成
          </div>
        )}
      </div>

      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          if (uploadRef.current) uploadRef.current.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="flex-1 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "生成中..." : image ? "重新生成" : "生成图片"}
        </button>
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          className="rounded-lg bg-brand-100 px-3 py-2 text-xs font-semibold text-brand-500 transition-all hover:bg-brand-500 hover:text-white"
        >
          上传替换
        </button>
        <button
          type="button"
          onClick={onUrl}
          className="rounded-lg bg-brand-100 px-3 py-2 text-xs font-semibold text-brand-500 transition-all hover:bg-brand-500 hover:text-white"
        >
          URL
        </button>
      </div>

      {image && !loading && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPreview}
            className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-ink-sub transition-all hover:bg-slate-200"
          >
            🔍 查看大图
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-ink-sub transition-all hover:bg-slate-200"
          >
            ⬇ 下载
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-ink-sub transition-all hover:bg-red-100 hover:text-red-600"
          >
            ✕ 清空
          </button>
        </div>
      )}
    </div>
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = e.deltaY < 0 ? scale * 1.15 : scale / 1.15;
    setScale(Math.min(Math.max(next, 0.2), 8));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    dragging.current = true;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    dragging.current = false;
    setIsDragging(false);
  };

  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
      onWheel={handleWheel}
    >
      <div
        className="flex h-full w-full items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt="preview"
          draggable={false}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
          className="max-h-[85vh] max-w-[90vw] select-none rounded-lg object-contain shadow-2xl"
        />
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-6 top-6 rounded-full bg-white/95 px-4 py-1.5 text-sm font-semibold text-ink shadow-lg hover:bg-white"
      >
        ✕ 关闭
      </button>

      <div
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(s / 1.2, 0.2))}
          className="grid h-8 w-8 place-items-center rounded-full text-lg font-bold text-ink hover:bg-blue-50"
        >
          −
        </button>
        <span className="min-w-[60px] text-center text-xs font-semibold text-ink">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(s * 1.2, 8))}
          className="grid h-8 w-8 place-items-center rounded-full text-lg font-bold text-ink hover:bg-blue-50"
        >
          +
        </button>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <button
          type="button"
          onClick={reset}
          className="rounded-full px-3 py-1 text-xs font-semibold text-ink hover:bg-blue-50"
        >
          重置
        </button>
      </div>

      <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/60">
        滚轮缩放 · 拖动平移 ·
        点击空白关闭
      </p>
    </div>
  );
}
