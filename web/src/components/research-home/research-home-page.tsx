/**
 * Navivisor research home — journey hub for the four workflow modules.
 * Layout targets a single viewport: compact workspace strip + modules + demo cards.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Compass,
  FlaskConical,
  FolderInput,
  Newspaper,
  PenLine,
  Rocket,
} from 'lucide-react';
import { LoadWorkspaceDemoButton } from '@/components/research-workflow/load-workspace-demo-button';
import { CurrentPaperCard } from '@/components/research-workflow/current-paper-card';
import { researchWorkflowClient } from '@/components/research-workflow/research-workflow-client';
import { useResearchProjectStore } from '@/stores/research-project-store';
import { useTimelineStore } from '@/stores/timeline-store';
import { cn } from '@/lib/utils';

const modules = [
  {
    title: '开题探索',
    copy: '从兴趣出发，发现值得研究的问题',
    icon: Compass,
    to: '/research/topic',
    tint: 'from-[#5b8def] to-[#1f4dcb]',
  },
  {
    title: '实验验证',
    copy: '规划实验路径，沉淀可信研究证据',
    icon: FlaskConical,
    to: '/research/experiment',
    tint: 'from-[#4f9be8] to-[#2563c7]',
  },
  {
    title: '论文写作',
    copy: '组织成果，协同完成学术表达',
    icon: PenLine,
    to: '/research/paper',
    tint: 'from-[#6a9ef0] to-[#1f4dcb]',
  },
  {
    title: '投稿启航',
    copy: '模拟投稿流程，做好提交准备',
    icon: Rocket,
    to: '/research/submit',
    tint: 'from-[#3f82eb] to-[#173778]',
  },
] as const;

const recentProjects = [
  {
    title: 'CrackSAM-MVE 裂缝分割复现',
    stage: '实验',
    updated: '2 小时前',
    icon: FlaskConical,
  },
  {
    title: '校园行人检测开题调研',
    stage: '开题',
    updated: '昨天',
    icon: Compass,
  },
] as const;

const arxivDigest = [
  {
    id: '2403.01234',
    title: 'Multi-View Consistency for Robust Surface Reconstruction',
    venue: 'arXiv cs.CV',
    tag: '3DGS',
  },
  {
    id: '2402.08821',
    title: 'Boundary-Aware Adaptation of Foundation Segmentation Models',
    venue: 'arXiv cs.CV',
    tag: 'SAM',
  },
] as const;

const journeyStats = [
  { label: '文献', value: 12 },
  { label: '笔记', value: 8 },
] as const;

function JourneyCurve() {
  const path =
    'M8 28 C 130 8, 220 42, 255 24 S 380 4, 505 28 630 46, 752 20';

  return (
    <div className="pointer-events-none absolute inset-x-[8%] top-0 z-0 hidden md:block">
      <p className="mb-0.5 text-center text-[10px] font-extrabold tracking-[0.16em] text-[#1F4DCB]/80">
        点击开始尝试
      </p>
      <svg className="mx-auto h-8 w-[88%] overflow-visible" viewBox="0 0 760 48" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="home-journey-stroke" x1="0" y1="0" x2="760" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a9c7f5" />
            <stop offset="0.5" stopColor="#1F4DCB" />
            <stop offset="1" stopColor="#7aa6ef" />
          </linearGradient>
        </defs>
        <path
          id="home-journey-rail"
          d={path}
          stroke="url(#home-journey-stroke)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.35"
        />
        {[0, 0.8, 1.6].map((delay) => (
          <polygon
            key={delay}
            points="0,-5 12,0 0,5 2.5,0"
            fill="#1F4DCB"
            className="home-journey-arrow"
          >
            <animateMotion
              dur="2.4s"
              repeatCount="indefinite"
              begin={`${delay}s`}
              rotate="auto"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="linear"
            >
              <mpath href="#home-journey-rail" />
            </animateMotion>
          </polygon>
        ))}
      </svg>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <div className="relative grid size-12 shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="size-12 -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#e8f0ff" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#1F4DCB"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-[11px] font-black text-[#173778]">{value}%</div>
    </div>
  );
}

export function ResearchHomePage() {
  const navigate = useNavigate();
  const threadId = useTimelineStore((s) => s.threadId);
  const selectThread = useTimelineStore((s) => s.selectThread);
  const project = useResearchProjectStore((s) => s.project);
  const setProject = useResearchProjectStore((s) => s.setProject);
  const [workspacePath, setWorkspacePath] = useState(project?.rootPath ?? '');
  const [workspaceTitle, setWorkspaceTitle] = useState(project?.title ?? '');
  const [registerBusy, setRegisterBusy] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);

  useEffect(() => {
    if (threadId) selectThread(null);
  }, [threadId, selectThread]);

  async function registerWorkspace() {
    const absolutePath = workspacePath.trim();
    if (!absolutePath) {
      setRegisterMessage('请填写服务端可访问的绝对目录路径');
      return;
    }
    setRegisterBusy(true);
    setRegisterMessage(null);
    try {
      const workspace = await researchWorkflowClient.registerWorkspace({
        absolutePath,
        title: workspaceTitle.trim() || undefined,
        createIfMissing: true,
      });
      setProject({
        projectId: workspace.projectId,
        title: workspace.title,
        rootPath: workspace.rootPath,
        description: workspace.description,
        demoComplete: workspace.index.demo?.complete ?? null,
        missing: workspace.index.demo?.missing ?? [],
      });
      setRegisterMessage(
        workspace.reused
          ? `已复用 ${workspace.projectId.slice(0, 8)}…`
          : `已注册 ${workspace.projectId.slice(0, 8)}…`,
      );
    } catch (error) {
      setRegisterMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setRegisterBusy(false);
    }
  }

  return (
    <main className="navivisor-module scrollbar-hide flex h-full min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
      <section className="brand-enter mx-auto flex h-full w-full max-w-6xl min-h-0 flex-col justify-between gap-3">
        {/* Hero — compact */}
        <header className="shrink-0">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#1F4DCB]">你好，研究者</p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#102c65] sm:text-3xl lg:text-[2.15rem]">
            欢迎来到 Navivisor 研途启航
          </h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-[#55739f]">
            从一个研究领域，让 AI 陪你走完完整的研究旅程。
          </p>
        </header>

        {/* Workspace — single compact strip */}
        <div className="shrink-0 rounded-xl border border-[#d7e6fb] bg-white/80 px-3 py-2 shadow-[0_8px_20px_rgba(31,77,203,0.06)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="shrink-0 text-xs font-extrabold text-[#173778]">论文工作目录</h2>
            <input
              value={workspacePath}
              onChange={(event) => setWorkspacePath(event.target.value)}
              placeholder="绝对路径，如 D:/Research/CameraVAD-SceneMemory"
              aria-label="工作目录绝对路径"
              className="min-w-[12rem] flex-1 rounded-lg border border-[#c9dbf8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#173778] outline-none focus:border-[#1F4DCB]"
            />
            <input
              value={workspaceTitle}
              onChange={(event) => setWorkspaceTitle(event.target.value)}
              placeholder="标题（可选）"
              aria-label="论文标题"
              className="w-[8.5rem] shrink-0 rounded-lg border border-[#c9dbf8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#173778] outline-none focus:border-[#1F4DCB]"
            />
            <button
              type="button"
              disabled={registerBusy}
              onClick={() => void registerWorkspace()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1F4DCB] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              <FolderInput className="size-3.5" />
              {registerBusy ? '注册中…' : '注册目录'}
            </button>
            <LoadWorkspaceDemoButton compact className="shrink-0" />
          </div>
          {(registerMessage || project) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {registerMessage ? (
                <p className="truncate text-[10px] font-medium text-[#55739f]">{registerMessage}</p>
              ) : null}
              <CurrentPaperCard compact className="min-w-0 flex-1" />
            </div>
          )}
        </div>

        {/* Four modules */}
        <div className="relative min-h-0 flex-1 pt-5">
          <JourneyCurve />
          <div className="grid h-full grid-cols-2 content-center gap-x-3 gap-y-4 md:grid-cols-4 md:gap-4">
            {modules.map(({ title, copy, icon: Icon, to, tint }, index) => (
              <button
                key={title}
                type="button"
                onClick={() => void navigate({ to })}
                className="group relative z-10 flex flex-col items-center text-center"
                style={{ animationDelay: `${index * 90 + 80}ms` }}
              >
                <span
                  className={cn(
                    'grid size-14 place-items-center rounded-[18px] bg-gradient-to-br text-white shadow-[0_10px_22px_rgba(31,77,203,0.26)] transition-all duration-300 sm:size-[60px]',
                    'group-hover:-translate-y-1 group-hover:scale-105',
                    tint,
                  )}
                >
                  <Icon className="size-6 sm:size-7" strokeWidth={2.1} />
                </span>
                <span className="mt-2 text-sm font-extrabold text-[#173778]">{title}</span>
                <span className="mt-0.5 max-w-[10.5rem] text-[11px] font-medium leading-4 text-[#6781aa]">
                  {copy}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom demo cards — short row */}
        <div className="grid shrink-0 gap-2 lg:grid-cols-3">
          <article className="overflow-hidden rounded-xl border border-white/80 bg-white/75 px-2.5 py-2 shadow-[0_8px_18px_rgba(31,77,203,0.06)] backdrop-blur-xl">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-[#173778]">最近项目</h2>
              <span className="rounded-full bg-[#e8f0ff] px-1.5 py-px text-[9px] font-bold text-[#1F4DCB]">Demo</span>
            </div>
            <ul className="space-y-1">
              {recentProjects.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.title}
                    className="flex items-center gap-2 rounded-lg border border-[#e4eefc] bg-[#f7faff] px-2 py-1"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white text-[#1F4DCB]">
                      <Icon className="size-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-bold text-[#173778]">{item.title}</div>
                      <div className="text-[9px] font-semibold text-[#7890b6]">
                        {item.stage} · {item.updated}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="overflow-hidden rounded-xl border border-white/80 bg-white/75 px-2.5 py-2 shadow-[0_8px_18px_rgba(31,77,203,0.06)] backdrop-blur-xl">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-[#173778]">arXiv 速递</h2>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#7890b6]">
                <Newspaper className="size-2.5" />
                Demo
              </span>
            </div>
            <ul className="space-y-1">
              {arxivDigest.map((paper) => (
                <li
                  key={paper.id}
                  className="rounded-lg border border-[#e4eefc] bg-[#f7faff] px-2 py-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-[#7890b6]">{paper.venue}</span>
                    <span className="rounded-full bg-[#e8f0ff] px-1.5 py-px text-[8px] font-bold text-[#1F4DCB]">
                      {paper.tag}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] font-bold text-[#173778]">{paper.title}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="overflow-hidden rounded-xl border border-white/80 bg-white/75 px-2.5 py-2 shadow-[0_8px_18px_rgba(31,77,203,0.06)] backdrop-blur-xl">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-[#173778]">我的研究旅程</h2>
              <span className="text-[9px] font-bold text-[#7890b6]">Demo</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[#e4eefc] bg-[#f7faff] p-1.5">
              <ProgressRing value={72} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-[#173778]">本学期进度</p>
                <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-[#6781aa]">
                  开题与实验已完成，写作推进中。
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {journeyStats.map(({ label, value }) => (
                    <span
                      key={label}
                      className="rounded-full bg-white px-1.5 py-px text-[9px] font-bold text-[#1F4DCB]"
                    >
                      {label} {value}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
