/**
 * Chat view for the index route (no thread selected).
 * Only clears visible selection; running threads remain subscribed and recoverable.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimelineStore } from '@/stores/timeline-store';
import { useNavigate } from '@tanstack/react-router';
import { ClipboardList, FlaskConical, PenLine, Send, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

const modules = [
  { title: '开题探索', copy: '从兴趣出发，发现值得研究的问题', icon: ClipboardList, to: '/research/topic' },
  { title: '实验验证', copy: '规划实验路径，沉淀可信研究证据', icon: FlaskConical, to: '/research/experiment' },
  { title: '论文写作', copy: '组织成果，协同完成学术表达', icon: PenLine, to: '/research/paper' },
  { title: '投稿启航', copy: '模拟投稿流程，做好提交准备', icon: Send, to: '/research/submit' },
] as const;

export function ChatView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const threadId = useTimelineStore((s) => s.threadId);
  const selectThread = useTimelineStore((s) => s.selectThread);

  useEffect(() => {
    if (threadId) selectThread(null);
  }, [threadId, selectThread]);

  return (
    <main className="navivisor-home flex min-h-0 flex-1 overflow-y-auto p-4 sm:p-7 lg:p-10">
      <section className="brand-enter mx-auto flex w-full max-w-6xl flex-col justify-center py-5 lg:py-10">
        <BrandLogo />
        <div className="mt-9 max-w-3xl">
          <p className="text-sm font-bold tracking-[0.2em] text-[#1F4DCB] uppercase">Your research voyage</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] text-[#102c65] sm:text-5xl lg:text-6xl">
            让研究路径，看得见。
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-[#55739f] sm:text-lg">
            从一个好问题出发，在同一条数据链路中完成开题、实验、写作与投稿。
          </p>
        </div>

        <div className="research-route mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map(({ title, copy, icon: Icon, to }, index) => (
            <button
              key={title}
              type="button"
              onClick={() => void navigate({ to })}
              className="journey-card group relative overflow-hidden rounded-[24px] border border-white/80 bg-white/72 p-5 text-left shadow-[0_16px_42px_rgba(31,77,203,0.10)] backdrop-blur-xl"
              style={{ animationDelay: `${index * 80 + 120}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-[0.18em] text-[#7795c6]">0{index + 1}</span>
                <span className="grid size-11 place-items-center rounded-2xl bg-[#e8f0ff] text-[#1F4DCB] transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110">
                  <Icon className="size-5" />
                </span>
              </div>
              <h2 className="mt-8 text-xl font-extrabold text-[#173778]">{title}</h2>
              <p className="mt-2 min-h-10 text-sm font-medium leading-5 text-[#6781aa]">{copy}</p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[#1F4DCB]">进入模块 <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
            </button>
          ))}
        </div>
        <p className="mt-7 text-center text-xs font-medium text-[#7890b6]">{t('Select or create a thread to start chatting.')}</p>
      </section>
    </main>
  );
}
