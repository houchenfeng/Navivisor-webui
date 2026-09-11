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
  return (
    <svg
      className="pointer-events-none absolute inset-x-[12%] top-[34px] hidden h-10 w-[76%] overflow-visible md:block"
      viewBox="0 0 760 40"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="home-journey-stroke" x1="0" y1="0" x2="760" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8eb6f5" />
          <stop offset="0.5" stopColor="#1F4DCB" />
          <stop offset="1" stopColor="#6a9ef0" />
        </linearGradient>
        <marker id="home-journey-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#1F4DCB" />
        </marker>
      </defs>
      <path
        d="M8 22 C 130 6, 220 34, 255 20 S 380 4, 505 22 630 38, 752 18"
        stroke="url(#home-journey-stroke)"
        strokeWidth="3"
        strokeLinecap="round"
        markerEnd="url(#home-journey-arrow)"
        className="home-journey-path"
      />
    </svg>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <div className="relative grid size-24 place-items-center">
      <svg viewBox="0 0 80 80" className="size-24 -rotate-90">
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
      <div className="absolute text-center">
        <div className="text-xl font-black text-[#173778]">{value}%</div>
        <div className="text-[10px] font-bold tracking-wide text-[#7890b6]">完成度</div>
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
    <main className="navivisor-module flex min-h-0 flex-1 overflow-y-auto p-4 sm:p-7 lg:p-10">
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
        <div className="relative mt-12">
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

        {/* Bottom dashboard cards */}
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <article className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-[0_16px_40px_rgba(31,77,203,0.10)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#173778]">最近项目</h2>
              <span className="rounded-full bg-[#e8f0ff] px-2.5 py-1 text-[11px] font-bold text-[#1F4DCB]">
                Demo
              </span>
            </div>
            <ul className="space-y-3">
              {recentProjects.map((project) => {
                const Icon = project.icon;
                return (
                  <li
                    key={project.title}
                    className="flex items-start gap-3 rounded-2xl border border-[#e4eefc] bg-[#f7faff] px-3 py-3"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#1F4DCB] shadow-sm">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-[#173778]">{project.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#7890b6]">
                        <span className="rounded-full bg-[#e8f0ff] px-2 py-0.5 text-[#1F4DCB]">{project.stage}</span>
                        <span>{project.status}</span>
                        <span>· {project.updated}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-[0_16px_40px_rgba(31,77,203,0.10)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#173778]">arXiv 速递</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1F4DCB]">
                <Newspaper className="size-3.5" />
                今日精选
              </span>
            </div>
            <ul className="space-y-3">
              {arxivDigest.map((paper) => (
                <li
                  key={paper.id}
                  className="rounded-2xl border border-[#e4eefc] bg-[#f7faff] px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold tracking-wide text-[#7890b6]">{paper.venue}</span>
                    <span className="rounded-full bg-[#e8f0ff] px-2 py-0.5 text-[10px] font-bold text-[#1F4DCB]">
                      {paper.tag}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold leading-5 text-[#173778]">{paper.title}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#9aafd0]">{paper.id}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-[0_16px_40px_rgba(31,77,203,0.10)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#173778]">我的研究旅程</h2>
              <Lightbulb className="size-4 text-[#1F4DCB]" />
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-[#e4eefc] bg-[#f7faff] p-4">
              <ProgressRing value={72} />
              <div>
                <p className="text-sm font-bold text-[#173778]">本学期进度</p>
                <p className="mt-1 text-xs font-medium leading-5 text-[#6781aa]">
                  已完成开题与首轮实验，写作草稿推进中。
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {journeyStats.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#e4eefc] bg-white/90 px-3 py-3"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7890b6]">
                    <Icon className="size-3.5 text-[#1F4DCB]" />
                    {label}
                  </div>
                  <div className="mt-1 text-xl font-black text-[#173778]">{value}</div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
