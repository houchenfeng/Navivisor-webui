/**
 * Navivisor research home — journey hub for the four workflow modules.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowRight,
  BookOpenText,
  Compass,
  FileText,
  FlaskConical,
  FolderInput,
  Newspaper,
  PenLine,
  Sparkles,
} from 'lucide-react';
import { LoadWorkspaceDemoButton } from '@/components/research-workflow/load-workspace-demo-button';
import { CurrentPaperCard } from '@/components/research-workflow/current-paper-card';
import { ConversationEventCards } from '@/components/research-workflow/conversation-event-cards';
import { researchWorkflowClient } from '@/components/research-workflow/research-workflow-client';
import { useResearchProjectStore } from '@/stores/research-project-store';
import { useTimelineStore } from '@/stores/timeline-store';
import './research-home.css';

const modules = [
  {
    title: '开题探索',
    copy: '从兴趣出发，发现值得研究的问题',
    image: 'research-home/topic.png',
    to: '/research/topic',
  },
  {
    title: '实验验证',
    copy: '规划实验路径，沉淀可信研究证据',
    image: 'research-home/experiment.png',
    to: '/research/experiment',
  },
  {
    title: '论文写作',
    copy: '组织成果，协同完成学术表达',
    image: 'research-home/writing.png',
    to: '/research/paper',
  },
  {
    title: '投稿启航',
    copy: '模拟投稿流程，做好提交准备',
    image: 'research-home/submission.png',
    to: '/research/submit',
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
  const project = useResearchProjectStore((s) => s.project);
  const setProject = useResearchProjectStore((s) => s.setProject);
  const [workspacePath, setWorkspacePath] = useState(project?.rootPath ?? '');
  const [workspaceTitle, setWorkspaceTitle] = useState(project?.title ?? '');
  const [registerBusy, setRegisterBusy] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);

  useEffect(() => {
    if (threadId) selectThread(null);
  }, [threadId, selectThread]);

  useEffect(() => {
    if (!project) return;
    const syncProject = window.setTimeout(() => {
      setWorkspacePath(project.rootPath);
      setWorkspaceTitle(project.title);
    }, 0);
    return () => window.clearTimeout(syncProject);
  }, [project]);

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
          ? `已复用项目 ${workspace.projectId}`
          : `已注册项目 ${workspace.projectId}`,
      );
    } catch (error) {
      setRegisterMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setRegisterBusy(false);
    }
  }

  return (
    <main className="research-home scrollbar-hide flex min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4 pt-0 sm:px-7 sm:pb-6 lg:px-10 lg:pb-6">
      <img className="research-home__mountains" src="research-home/mountains.png" alt="" aria-hidden="true" />
      <section className="brand-enter mx-auto flex w-full max-w-6xl flex-col pb-4 pt-5 sm:pt-6">
        <div className="research-home__slogan hidden lg:block" aria-hidden="true">
          <span>研途有光</span>
          <small>始于好奇，终于远方</small>
        </div>
        <div className="research-home__hero">
          <p className="text-sm font-bold tracking-[0.2em] text-[#1F4DCB]">你好，研究者</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] text-[#102c65] sm:text-5xl lg:text-[3.4rem]">
            欢迎来到Navivisor研途启航
          </h1>
          <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-[#55739f] sm:text-lg">
            从一个模糊的研究想法到投稿会议论文，让AI陪你走完完整的研究旅程。
          </p>
        </div>

        <div className="research-home__workspace mt-6 rounded-2xl px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-extrabold text-[#173778]">新论文工作目录</h2>
              <p className="mt-0.5 text-[11px] font-medium text-[#7890b6]">
                选择服务端可访问目录，四模块所有数据均储存在此目录。
              </p>
            </div>
            <LoadWorkspaceDemoButton compact />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={workspacePath}
              onChange={(event) => setWorkspacePath(event.target.value)}
              placeholder="绝对路径，例如 D:/Research/CameraVAD-SceneMemory"
              aria-label="工作目录绝对路径"
              className="min-w-[14rem] flex-1 rounded-lg border border-[#c9dbf8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#173778] outline-none focus:border-[#1F4DCB]"
            />
            <input
              value={workspaceTitle}
              onChange={(event) => setWorkspaceTitle(event.target.value)}
              placeholder="标题（可选）"
              aria-label="论文标题"
              className="w-36 shrink-0 rounded-lg border border-[#c9dbf8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#173778] outline-none focus:border-[#1F4DCB]"
            />
            <button
              type="button"
              disabled={registerBusy}
              onClick={() => void registerWorkspace()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1F4DCB] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              <FolderInput className="size-3.5" />
              {registerBusy ? '使用中…' : '使用该目录'}
            </button>
          </div>
          {registerMessage ? (
            <p className="mt-1.5 truncate text-[11px] font-medium text-[#55739f]">{registerMessage}</p>
          ) : null}
          {project ? (
            <div className="mt-1.5 space-y-2">
              <CurrentPaperCard defaultOpen={false} />
              <ConversationEventCards />
            </div>
          ) : null}
        </div>

        {/* Four module icon buttons + curved path */}
        <div className="research-journey">
          <img className="research-journey__curve hidden md:block" src="research-home/journey-curve.png" alt="" aria-hidden="true" />
          <div className="research-journey__grid">
            {modules.map(({ title, copy, image, to }, index) => (
              <button
                key={title}
                type="button"
                onClick={() => void navigate({ to })}
                className="research-module-card group"
                style={{ animationDelay: `${index * 90 + 80}ms` }}
              >
                <span className="research-module-card__icon">
                  <img src={image} alt="" aria-hidden="true" />
                </span>
                <span className="mt-2 text-[1.05rem] font-black tracking-[-0.02em] text-[#173778]">
                  <span className="research-module-card__number">{String(index + 1).padStart(2, '0')}</span>
                  {title}
                </span>
                <span className="mt-1.5 max-w-[13rem] text-[0.82rem] font-semibold leading-5 text-[#607ca7]">
                  {copy}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom dashboard cards — compact (~1/4 height) */}
        <div className="mt-2 grid max-h-[min(220px,26vh)] gap-3 lg:grid-cols-3">
          <article className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/75 p-3.5 shadow-[0_12px_28px_rgba(31,77,203,0.08)] backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#173778]">最近项目</h2>
              <button type="button" onClick={() => void navigate({ to: '/files' })} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5275a8] transition-colors hover:text-[#1F4DCB]">
                点击查看 <ArrowRight className="size-3.5" />
              </button>
            </div>
            <ul className="min-h-0 space-y-1.5 overflow-hidden">
              {recentProjects.slice(0, 2).map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.title}
                    className="flex items-center gap-2.5 rounded-xl border border-[#e4eefc] bg-[#f7faff] px-2.5 py-2"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[#1F4DCB] shadow-sm">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-[#173778]">{item.title}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-[#7890b6]">
                        <span className="rounded-full bg-[#e8f0ff] px-1.5 py-px text-[#1F4DCB]">{item.stage}</span>
                        <span>{item.updated}</span>
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
              <button type="button" onClick={() => void navigate({ to: '/research/topic' })} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5275a8] transition-colors hover:text-[#1F4DCB]">
                点击查看 <ArrowRight className="size-3.5" />
              </button>
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
              <button type="button" onClick={() => void navigate({ to: '/research/experiment' })} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5275a8] transition-colors hover:text-[#1F4DCB]">
                点击查看 <ArrowRight className="size-3.5" />
              </button>
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
