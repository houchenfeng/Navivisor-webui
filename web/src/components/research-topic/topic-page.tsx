import { useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, Check, CircleHelp, FileSearch, FlaskConical, LoaderCircle, RotateCcw, Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiToken } from '@/auth-token';
import { withBasePath } from '@/base-path';
import type { ResearchTaskSnapshot } from './topic-workflow-contract';

const steps = ['实验研究方向', '交叉研究候选课题选取', '核心文献智能分析'];

export function TopicPage() {
  const [page, setPage] = useState(1);
  const [interest, setInterest] = useState('');
  const [context, setContext] = useState('');
  const [task, setTask] = useState<ResearchTaskSnapshot | null>(null);
  const [error, setError] = useState('');

  const runSearch = async () => {
    if (interest.trim().length < 3) {
      setError('请先写下至少 3 个字的研究兴趣。');
      return;
    }
    setPage(1);
    setError('');
    setTask({ runId: 'pending', stage: 'first-search', status: 'running', files: [], errors: [] });
    try {
      const response = await fetch(withBasePath('/api/research/topic/first-search'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authorizationHeaders() },
        body: JSON.stringify({ researchInterest: interest.trim(), context: context.trim() || undefined }),
      });
      if (!response.ok) throw new Error(response.status === 401 ? '登录状态已失效，请重新登录。' : '检索任务创建失败，请稍后重试。');
      const started = await response.json() as ResearchTaskSnapshot;
      setTask(started);
      await pollTask(started.runId, setTask);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '网络错误，请稍后重试。';
      setError(message);
      setTask({ runId: 'failed', stage: 'first-search', status: 'failed', files: [], errors: [{ message }] });
    }
  };

  const cancelSearch = async () => {
    if (!task || task.runId === 'pending') return;
    try {
      await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(task.runId)}`), { method: 'DELETE', headers: authorizationHeaders() });
      setTask((current) => current ? { ...current, status: 'cancelled' } : current);
    } catch {
      setError('暂时无法取消任务，请等待当前请求结束。');
    }
  };

  const isRunning = task?.status === 'queued' || task?.status === 'running';
  const isComplete = task?.status === 'completed';

  return <main className="navivisor-module min-h-0 flex-1 overflow-auto text-[#19386f]">
    <div className="mx-auto min-h-full w-full max-w-[1500px] px-5 py-7 sm:px-8 lg:px-12">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#315a98]"><span className="grid size-8 place-items-center rounded-xl bg-white/80 text-[#1f4dcb]"><Sparkles className="size-4" /></span>启航 · 开题阶段</div><h1 className="text-3xl font-black tracking-[-0.04em] text-[#102f72] sm:text-4xl">开题智能体</h1><p className="mt-2 text-sm font-semibold leading-6 text-[#617da9]">从研究兴趣开始，先用公开文献试检索确认方向。</p></div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#ddecff] px-3.5 py-2 text-xs font-black text-[#2670d1] shadow-sm"><span className={`size-2 rounded-full ${isRunning ? 'animate-pulse bg-[#1f4dcb]' : 'bg-[#4c83d0]'}`} />{isRunning ? '检索中' : 'OpenAlex · 公开试检索'}</span>
      </header>

      <nav aria-label="开题三步进度" className="mt-8 grid grid-cols-1 gap-2 rounded-2xl bg-white p-2 shadow-[0_12px_32px_rgba(38,90,167,0.12)] sm:grid-cols-3">
        {steps.map((label, index) => { const number = index + 1; const active = page === number; const available = number <= 3; return <button key={label} type="button" disabled={!available} onClick={() => setPage(number)} aria-current={active ? 'step' : undefined} className={`flex min-w-0 items-center gap-3 rounded-xl px-4 py-3 text-left transition sm:justify-center ${active ? 'bg-[#1f4dcb] text-white shadow-[0_7px_15px_rgba(31,77,203,0.2)]' : 'text-[#7890b6] hover:bg-[#f3f8ff]'}`}><span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-black ${active ? 'bg-white/20' : 'bg-[#eef4fc] text-[#7187aa]'}`}>{number < page ? <Check className="size-4" /> : number}</span><span className="min-w-0"><span className="block truncate text-sm font-black">{label}</span><span className={`block text-[11px] font-bold ${active ? 'text-blue-100' : 'text-[#9aafd0]'}`}>{number === 1 ? '当前可操作' : '待后续能力接入'}</span></span></button>; })}
      </nav>

      {page === 1 && <DirectionPage interest={interest} setInterest={setInterest} context={context} setContext={setContext} task={task} error={error} isRunning={isRunning} isComplete={isComplete} onRun={runSearch} onCancel={cancelSearch} onRetry={runSearch} onNext={() => setPage(2)} />}
      {page === 2 && <FuturePage number="02" title="交叉研究候选课题选取" icon={Sparkles} description="这一步会在真实文献证据充分后，帮助你比较不同取向的候选课题。" detail="当前不生成偏可行、偏创新或较平衡的候选课题；请先完成第一步的研究方向和试检索。" onBack={() => setPage(1)} />}
      {page === 3 && <FuturePage number="03" title="核心文献智能分析" icon={FlaskConical} description="这一步会在用户确认候选课题后，整理核心文献与后续研究依据。" detail="当前不接入核心文献包、PDF、BibTeX 或实验方案。试检索完成不代表这些能力已经完成。" onBack={() => setPage(2)} />}
    </div>
  </main>;
}

function DirectionPage({ interest, setInterest, context, setContext, task, error, isRunning, isComplete, onRun, onCancel, onRetry, onNext }: { interest: string; setInterest: (value: string) => void; context: string; setContext: (value: string) => void; task: ResearchTaskSnapshot | null; error: string; isRunning: boolean; isComplete: boolean; onRun: () => Promise<void>; onCancel: () => Promise<void>; onRetry: () => Promise<void>; onNext: () => void }) {
  return <section className="mt-7 grid min-h-0 gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
    <section className="rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">Step 01</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">实验研究方向</h2></div><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e7f0ff] text-[#1f4dcb]"><BookOpen className="size-5" /></div></div><p className="mt-4 text-sm font-semibold leading-6 text-[#617da9]">把你对学习或生活的好奇写下来，不需要先会写检索式。</p><label className="mt-7 block text-sm font-black text-[#294d80]" htmlFor="research-interest">研究方向 <span className="font-normal text-[#7892b7]">（必填）</span></label><textarea id="research-interest" value={interest} onChange={(event) => setInterest(event.target.value)} placeholder="例如：我想了解机器视觉如何识别校园道路上的行人和自行车……" maxLength={2000} className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-[#c8dcfb] bg-[#f7fbff] p-4 text-sm font-semibold leading-6 text-[#263d65] outline-none placeholder:text-[#91a7c8] focus:border-[#1f4dcb] focus:ring-4 focus:ring-[#1f4dcb]/10" /><div className="mt-5 flex items-center justify-between gap-3"><label className="text-sm font-black text-[#294d80]" htmlFor="research-context">研究目标或上下文 <span className="font-normal text-[#7892b7]">（可选）</span></label><span className="text-xs font-semibold text-[#8aa1c1]">帮助缩小范围</span></div><textarea id="research-context" value={context} onChange={(event) => setContext(event.target.value)} placeholder="例如：我是大一学生，希望从校园监控或手机拍摄的公开图片开始。" maxLength={4000} className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-[#c8dcfb] bg-[#f7fbff] p-4 text-sm font-semibold leading-6 text-[#263d65] outline-none placeholder:text-[#91a7c8] focus:border-[#1f4dcb] focus:ring-4 focus:ring-[#1f4dcb]/10" /><div className="mt-6 flex flex-wrap items-center gap-3"><Button onClick={isRunning ? onCancel : onRun} className="rounded-xl bg-[#1f4dcb] px-5 font-black text-white shadow-[0_7px_16px_rgba(31,77,203,0.22)] hover:bg-[#11357f]">{isRunning ? <><X />取消检索</> : <><Search />开始试检索</>}</Button><button type="button" onClick={() => { setInterest('我对机器视觉识别校园道路上的行人与自行车很感兴趣，想了解不同光照和视角下的识别效果。'); setContext('我是大一学生，希望从校园监控或手机拍摄的公开图片开始，先了解这个方向有哪些公开研究。'); }} className="text-xs font-black text-[#4b78b5] underline decoration-[#a8c4e8] underline-offset-4">填入教学示例</button></div>{error && <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#fff1f1] p-3 text-xs font-semibold leading-5 text-[#b64d57]" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}<div className="mt-7 border-t border-[#e3ecf8] pt-5 text-xs font-semibold leading-5 text-[#6d85a6]"><div className="flex items-start gap-2"><CircleHelp className="mt-0.5 size-4 shrink-0 text-[#6090cf]" /><p><strong className="text-[#315a98]">你需要决定：</strong>这个问题是否真的让你感兴趣、是否符合你的时间和资源。智能体可以帮你找资料，但不能替你决定研究价值。</p></div></div></section>
    <ResultsCard task={task} isRunning={isRunning} isComplete={isComplete} onRetry={onRetry} />
    <div className="xl:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 px-5 py-4 text-xs font-semibold text-[#55749f]"><span>{isComplete ? '试检索完成；下一步仍不会自动生成候选课题。' : '完成一次真实试检索后，才可以继续查看第二步。'}</span><Button variant="outline" disabled={!isComplete} onClick={onNext} className="rounded-xl border-[#9bbce8] bg-white/60 font-black text-[#1f4dcb] disabled:cursor-not-allowed disabled:opacity-50">进入候选课题步骤<ArrowRight /></Button></div>
  </section>;
}

function ResultsCard({ task, isRunning, isComplete, onRetry }: { task: ResearchTaskSnapshot | null; isRunning: boolean; isComplete: boolean; onRetry: () => Promise<void> }) { const papers = task?.papers ?? []; const counts = task?.counts; const insufficient = isComplete && counts?.targetReached === false; return <section className="min-w-0 rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">OpenAlex trial search</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">试检索结果</h2></div><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e7f0ff] text-[#1f4dcb]"><FileSearch className="size-5" /></div></div><p className="mt-4 text-sm font-semibold leading-6 text-[#617da9]">这里只展示前 20 条公开元数据和摘要节选，不代表已经读完或验证论文结论。</p>{isRunning ? <div className="mt-7 rounded-2xl border border-[#c9dcf7] bg-[#f5f9ff] p-6" role="status"><div className="flex items-center gap-3 text-sm font-black text-[#285c9f]"><LoaderCircle className="size-5 animate-spin" />正在从 OpenAlex 获取公开资料</div><p className="mt-3 text-xs font-semibold leading-5 text-[#7089ac]">任务已提交，正在按目标数量分页获取并去重。你可以取消本次检索。</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dfebfb]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#1f4dcb]" /></div></div> : task?.status === 'failed' ? <State icon={AlertCircle} title="这次试检索没有完成" description={task.errors[0]?.message ?? '公开资料服务暂时不可用，请稍后重试。'} action={<Button variant="outline" onClick={onRetry} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><RotateCcw />重新试检索</Button>} /> : isComplete && papers.length === 0 ? <State icon={Search} title="没有返回可展示的论文" description="OpenAlex 已完成本次试检索，但没有符合条件的记录。可以修改左侧描述后重试。" action={<Button variant="outline" onClick={onRetry} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><RotateCcw />重新试检索</Button>} /> : papers.length === 0 ? <State icon={Search} title="等待你的研究兴趣" description="输入研究方向后，点击“开始试检索”。结果会显示在这里。" /> : <div className="mt-7 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#eef5ff] px-4 py-3 text-xs font-bold text-[#55749f]"><span>已去重 {counts?.deduplicated ?? counts?.papers ?? papers.length} 条 · 已获取原始记录 {counts?.returned ?? '—'} 条 · 目标 {counts?.requested ?? '300'} 条</span><span className="text-[#4775b2]">来源：OpenAlex 公共 API · 预览 {counts?.previewed ?? papers.length} 条</span></div>{insufficient && <div className="rounded-xl border border-[#f0d6a5] bg-[#fff8e9] px-4 py-3 text-xs font-bold leading-5 text-[#8b641e]" role="status">结果不足：实际去重后仅 {counts?.deduplicated ?? papers.length} 条，不能按 {counts?.requested ?? 300} 条目标完成。没有填充或伪造论文。</div>}{papers.map((paper) => <article key={paper.openalexId} className="rounded-2xl border border-[#d8e5f6] bg-[#fbfdff] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 flex-1 text-sm font-black leading-6 text-[#244a7d]">{paper.title || '无标题'}</h3><span className="rounded-lg bg-[#e6f0ff] px-2 py-1 text-[11px] font-black text-[#3b6fae]">OpenAlex · 待核验</span></div><p className="mt-2 text-xs font-semibold leading-5 text-[#6c84a5]">{paper.publicationYear ?? '年份未知'} · {paper.authors.slice(0, 4).join('、') || '作者信息缺失'}{paper.authors.length > 4 ? ' 等' : ''} · {paper.source || '来源信息缺失'}{paper.citedByCount > 0 ? ` · 被引 ${paper.citedByCount}` : ''}</p><p className="mt-3 text-xs font-semibold leading-5 text-[#526e98]">{paper.abstract ? `${paper.abstract.slice(0, 320)}${paper.abstract.length > 320 ? '…' : ''}` : '暂无摘要'}</p><div className="mt-3 flex flex-wrap gap-4 text-xs font-black"><a href={paper.doi || paper.landingUrl || paper.openalexId} target="_blank" rel="noreferrer" className="text-[#1f4dcb] underline underline-offset-2">{paper.doi ? '打开 DOI' : '打开 OpenAlex 来源'}</a>{paper.doi && <a href={paper.landingUrl || paper.openalexId} target="_blank" rel="noreferrer" className="text-[#5b7fae] underline underline-offset-2">打开 OpenAlex 来源</a>}</div></article>)}</div>}</section>; }

function FuturePage({ number, title, icon: Icon, description, detail, onBack }: { number: string; title: string; icon: typeof Sparkles; description: string; detail: string; onBack: () => void }) { return <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-10"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e7f0ff] text-[#1f4dcb]"><Icon className="size-6" /></div><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">Step {number} · 待接入</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">{title}</h2><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#617da9]">{description}</p></div></div><div className="mt-8 rounded-2xl border border-dashed border-[#b9d0ef] bg-[#f7faff] p-8 text-center"><Icon className="mx-auto size-8 text-[#6594ce]" /><h3 className="mt-4 text-sm font-black text-[#315a98]">当前功能尚未接入</h3><p className="mx-auto mt-2 max-w-xl text-xs font-semibold leading-5 text-[#7189aa]">{detail}</p></div><div className="mt-7 border-t border-[#e3ecf8] pt-5"><Button variant="outline" onClick={onBack} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><ArrowLeft />返回上一步</Button></div></section>; }

function State({ icon: Icon, title, description, action }: { icon: typeof Search; title: string; description: string; action?: React.ReactNode }) { return <div className="mt-7 rounded-2xl border border-dashed border-[#b9d0ef] bg-[#f7faff] p-10 text-center"><Icon className="mx-auto size-8 text-[#6594ce]" /><h3 className="mt-4 text-sm font-black text-[#315a98]">{title}</h3><p className="mx-auto mt-2 max-w-sm text-xs font-semibold leading-5 text-[#7189aa]">{description}</p>{action && <div className="mt-5">{action}</div>}</div>; }

function authorizationHeaders(): Record<string, string> { const token = getApiToken(); return token ? { Authorization: `Bearer ${token}` } : {}; }

async function pollTask(runId: string, setTask: React.Dispatch<React.SetStateAction<ResearchTaskSnapshot | null>>) { for (let attempt = 0; attempt < 60; attempt += 1) { await new Promise((resolve) => window.setTimeout(resolve, 500)); const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(runId)}`), { headers: authorizationHeaders() }); if (!response.ok) throw new Error('无法读取检索任务状态，请重试。'); const snapshot = await response.json() as ResearchTaskSnapshot; setTask(snapshot); if (!['queued', 'running'].includes(snapshot.status)) return; } throw new Error('检索任务等待时间过长，请稍后重试。'); }
