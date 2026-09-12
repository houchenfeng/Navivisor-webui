import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FolderOpen,
  LoaderCircle,
  X,
} from 'lucide-react';
import { researchWorkflowClient } from './research-workflow-client';
import type { DemoDefinition, LoadDemoResult } from './research-workflow-types';
import { useResearchProjectStore, isResearchDemoMode } from '@/stores/research-project-store';
import { exitResearchDemo } from '@/components/research-workflow/exit-research-demo';
import { cn } from '@/lib/utils';

type Props = {
  compact?: boolean;
  className?: string;
  onLoaded?: (result: LoadDemoResult) => void;
  /** Only the research home page should offer leaving Demo mode. */
  allowUnload?: boolean;
};

export function LoadWorkspaceDemoButton({
  compact = false,
  className,
  onLoaded,
  allowUnload = false,
}: Props) {
  const project = useResearchProjectStore((state) => state.project);
  const setProject = useResearchProjectStore((state) => state.setProject);
  const bumpDemoEpoch = useResearchProjectStore((state) => state.bumpDemoEpoch);
  const demoLoaded = isResearchDemoMode(project);
  const [open, setOpen] = useState(false);
  const [demos, setDemos] = useState<DemoDefinition[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [demoRoot, setDemoRoot] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setMessage(null);
    void researchWorkflowClient
      .listDemos()
      .then((items) => {
        if (cancelled) return;
        setDemos(items);
        setSelected((current) => {
          const next =
            current && items.some((item) => item.id === current)
              ? current
              : (items[0]?.id ?? null);
          setDemoRoot(items.find((item) => item.id === next)?.rootPath ?? '');
          return next;
        });
      })
      .catch((error) => {
        if (!cancelled)
          setMessage(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function activate() {
    if (!selected) return;
    const chosen = demos.find((item) => item.id === selected);
    if (
      project &&
      project.title !== chosen?.title &&
      !window.confirm(
        `切换到「${chosen?.title ?? selected}」前，请确认当前草稿已保存。继续切换？`,
      )
    )
      return;
    setBusy(true);
    setMessage(null);
    try {
      const { workspace, load } =
        await researchWorkflowClient.activateDemo(selected, demoRoot.trim());
      setProject({
        projectId: workspace.projectId,
        title: workspace.title,
        rootPath: workspace.rootPath,
        description: workspace.description,
        demoComplete: load.complete,
        missing: load.missing,
      });
      bumpDemoEpoch();
      onLoaded?.(load);
      setOpen(false);
      setMessage(
        load.complete
          ? `已载入 ${workspace.title}${load.idempotent ? '（幂等复用）' : ''}`
          : `已部分载入 ${workspace.title}，缺失 ${load.missing.length} 项`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function unload() {
    if (
      !window.confirm(
        '卸载研究数据并退出 Demo 模式？开题、实验、写作、投稿中的 Demo 内容会清空，可重新载入。',
      )
    )
      return;
    exitResearchDemo();
    setOpen(false);
    setMessage('已退出 Demo 模式');
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl border border-[#c9dbf8] bg-white font-bold text-[#1F4DCB] transition hover:bg-[#f3f8ff]',
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
        )}
      >
        <FolderOpen className="size-4" />
        {demoLoaded ? '研究数据已载入' : '载入研究数据'}
      </button>
      {allowUnload ? (
        <button
          type="button"
          onClick={() => void unload()}
          disabled={!demoLoaded}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl border border-[#f3c4c4] bg-white font-bold text-[#b42318] transition hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-40',
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
          )}
        >
          卸载研究数据
        </button>
      ) : null}
      </div>
      {message ? (
        <p
          role="status"
          className="max-w-sm text-[11px] font-medium leading-4 text-[#6781aa]"
        >
          {message}
        </p>
      ) : null}
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[2147483647] isolate grid place-items-center bg-[#102c65]/35 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="选择研究数据"
              onClick={() => setOpen(false)}
            >
          <section
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#173778]">
                  载入研究数据
                </h2>
                <p className="mt-1 text-sm text-[#6781aa]">
                  选择研究数据并确认其文件夹主路径。系统会载入受控工作副本。
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-[#6781aa] hover:bg-[#f3f8ff]"
              >
                <X className="size-5" />
              </button>
            </div>
            {loading ? (
              <div className="grid min-h-40 place-items-center text-sm text-[#6781aa]">
                <span>
                  <LoaderCircle className="mr-2 inline size-4 animate-spin" />
                  正在读取研究数据清单…
                </span>
              </div>
            ) : null}
            {!loading && demos.length === 0 ? (
              <div className="mt-5 rounded-xl bg-[#fff7ed] p-4 text-sm text-[#9a5a16]">
                {message || '没有可用研究数据。'}
              </div>
            ) : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {demos.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => {
                    setSelected(demo.id);
                    setDemoRoot(demo.rootPath);
                  }}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition',
                    selected === demo.id
                      ? 'border-[#1F4DCB] bg-[#f3f7ff] ring-2 ring-[#1F4DCB]/10'
                      : 'border-[#d7e6fb] hover:bg-[#f8fbff]',
                  )}
                >
                  <h3 className="font-black text-[#173778]">{demo.title}</h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#6781aa]">
                    {demo.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold">
                    <span className="rounded-full bg-[#e8f0ff] px-2 py-1 text-[#1F4DCB]">
                      v{demo.version}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <label className="mt-5 block text-xs font-bold text-[#55739f]">
              研究数据文件夹主路径
              <input
                value={demoRoot}
                onChange={(event) => setDemoRoot(event.target.value)}
                placeholder="请输入服务端可访问的研究数据文件夹绝对路径"
                className="mt-2 w-full rounded-xl border border-[#c9dbf8] bg-[#f8fbff] px-3 py-2.5 font-mono text-xs font-normal text-[#173778] outline-none focus:border-[#1F4DCB]"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#c9dbf8] px-4 py-2 text-sm font-bold text-[#55739f]"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!selected || !demoRoot.trim() || busy}
                onClick={() => void activate()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1F4DCB] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {busy ? '正在载入…' : '确认载入'}
              </button>
            </div>
          </section>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
