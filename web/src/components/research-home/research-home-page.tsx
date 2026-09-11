/**
 * Navivisor research home — journey hub for the four workflow modules.
 */
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  BookOpenText,
  Compass,
  FileText,
  FlaskConical,
  Lightbulb,
  Newspaper,
  PenLine,
  Rocket,
  Sparkles,
} from 'lucide-react';
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
    status: '进行中',
    updated: '2 小时前',
    icon: FlaskConical,
  },
  {
    title: '校园行人检测开题调研',
    stage: '开题',
    status: '进行中',
    updated: '昨天',
    icon: Compass,
  },
  {
    title: 'CVPR 风格方法章节草稿',
    stage: '写作',
    status: '草稿',
    updated: '3 天前',
    icon: FileText,
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
  {
    id: '2401.15672',
    title: 'Teaching Research Workflows to First-Year Undergraduates with AI',
    venue: 'arXiv cs.HC',
    tag: 'Edu',
  },
] as const;

const journeyStats = [
  { label: '文献阅读', value: 12, icon: BookOpenText },
  { label: '笔记整理', value: 8, icon: Newspaper },
  { label: '写作草稿', value: 3, icon: PenLine },
  { label: '里程碑', value: 2, icon: Sparkles },
] as const;

function JourneyCurve() {
  const path =
    'M8 28 C 130 8, 220 42, 255 24 S 380 4, 505 28 630 46, 752 20';

  return (
    <div className="pointer-events-none absolute inset-x-[10%] top-2 z-0 hidden md:block">
      <p className="mb-1 text-center text-xs font-extrabold tracking-[0.18em] text-[#1F4DCB]/80">
        点击开始尝试 →
      </p>
      <svg className="mx-auto h-12 w-[88%] overflow-visible" viewBox="0 0 760 48" fill="none" aria-hidden="true">
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
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <div className="relative grid size-[68px] shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="size-[68px] -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#e8f0ff" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#1F4DCB"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-sm font-black text-[#173778]">{value}%</div>
      </div>
    </div>
  );
}

export function ResearchHomePage() {
  const navigate = useNavigate();
  const threadId = useTimelineStore((s) => s.threadId);
  const selectThread = useTimelineStore((s) => s.selectThread);

  useEffect(() => {
    if (threadId) selectThread(null);
  }, [threadId, selectThread]);

  return (
    <main className="navivisor-module scrollbar-hide flex min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-7 lg:p-10">
      <section className="brand-enter mx-auto flex w-full max-w-6xl flex-col py-4 lg:py-8">
        <div className="mt-2 max-w-3xl">
          <p className="text-sm font-bold tracking-[0.2em] text-[#1F4DCB]">你好，研究者</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] text-[#102c65] sm:text-5xl lg:text-[3.4rem]">
            欢迎来到Navivisor研途启航
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-[#55739f] sm:text-lg">
            从一个研究领域，让AI陪你走完完整的研究旅程。
          </p>
        </div>

        {/* Four module icon buttons + curved path */}
        <div className="relative mt-10 pt-8">
          <JourneyCurve />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-6">
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
                    'grid size-[72px] place-items-center rounded-[22px] bg-gradient-to-br text-white shadow-[0_14px_30px_rgba(31,77,203,0.28)] transition-all duration-300',
                    'group-hover:-translate-y-1.5 group-hover:scale-105 group-hover:shadow-[0_18px_36px_rgba(31,77,203,0.36)]',
                    tint,
                  )}
                >
                  <Icon className="size-8" strokeWidth={2.1} />
                </span>
                <span className="mt-4 text-base font-extrabold text-[#173778]">{title}</span>
                <span className="mt-1.5 max-w-[11rem] text-sm font-medium leading-5 text-[#6781aa]">
                  {copy}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom dashboard cards — compact (~1/4 height) */}
        <div className="mt-8 grid max-h-[min(220px,26vh)] gap-3 lg:grid-cols-3">
          <article className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/75 p-3.5 shadow-[0_12px_28px_rgba(31,77,203,0.08)] backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#173778]">最近项目</h2>
              <span className="rounded-full bg-[#e8f0ff] px-2 py-0.5 text-[10px] font-bold text-[#1F4DCB]">
                Demo
              </span>
            </div>
            <ul className="min-h-0 space-y-1.5 overflow-hidden">
              {recentProjects.slice(0, 2).map((project) => {
                const Icon = project.icon;
                return (
                  <li
                    key={project.title}
                    className="flex items-center gap-2.5 rounded-xl border border-[#e4eefc] bg-[#f7faff] px-2.5 py-2"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[#1F4DCB] shadow-sm">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-[#173778]">{project.title}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-[#7890b6]">
                        <span className="rounded-full bg-[#e8f0ff] px-1.5 py-px text-[#1F4DCB]">{project.stage}</span>
                        <span>{project.updated}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/75 p-3.5 shadow-[0_12px_28px_rgba(31,77,203,0.08)] backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#173778]">arXiv 速递</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1F4DCB]">
                <Newspaper className="size-3" />
                今日
              </span>
            </div>
            <ul className="min-h-0 space-y-1.5 overflow-hidden">
              {arxivDigest.slice(0, 2).map((paper) => (
                <li
                  key={paper.id}
                  className="rounded-xl border border-[#e4eefc] bg-[#f7faff] px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-[#7890b6]">{paper.venue}</span>
                    <span className="rounded-full bg-[#e8f0ff] px-1.5 py-px text-[9px] font-bold text-[#1F4DCB]">
                      {paper.tag}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs font-bold leading-4 text-[#173778]">{paper.title}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/75 p-3.5 shadow-[0_12px_28px_rgba(31,77,203,0.08)] backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#173778]">我的研究旅程</h2>
              <Lightbulb className="size-3.5 text-[#1F4DCB]" />
            </div>
            <div className="flex min-h-0 items-center gap-3 overflow-hidden rounded-xl border border-[#e4eefc] bg-[#f7faff] p-2.5">
              <ProgressRing value={72} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#173778]">本学期进度</p>
                <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-4 text-[#6781aa]">
                  开题与实验已完成，写作推进中。
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {journeyStats.slice(0, 2).map(({ label, value }) => (
                    <span
                      key={label}
                      className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#1F4DCB] shadow-sm"
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
