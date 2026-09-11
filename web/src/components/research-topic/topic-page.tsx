import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, Check, CircleHelp, FileSearch, FlaskConical, LoaderCircle, RotateCcw, Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiToken } from '@/auth-token';
import { withBasePath } from '@/base-path';
import { demoContext, demoInterest, demoTaskSnapshot } from './data';
import { buildOpenAlexQueryPlan } from './openalex-query';
import type { ResearchTaskSnapshot } from './topic-workflow-contract';

const steps = ['实验研究方向', '交叉研究候选课题选取', '核心文献智能分析'];
const ACTIVE_RUN_KEY = 'navivisor:research-topic:active-run:v1';

export function TopicPage() {
  const [page, setPage] = useState(1);
  const [interest, setInterest] = useState('');
  const [context, setContext] = useState('');
  const [task, setTask] = useState<ResearchTaskSnapshot | null>(null);
  const [error, setError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const loadDemo = () => { window.sessionStorage.removeItem(ACTIVE_RUN_KEY); setInterest(demoInterest); setContext(demoContext); setTask(demoTaskSnapshot); setSelectedCandidate(null); setError(''); setPage(1); };

  useEffect(() => {
    const runId = window.sessionStorage.getItem(ACTIVE_RUN_KEY);
    if (!runId) return;
    let cancelled = false;
    const restore = async () => {
      try {
        const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(runId)}`), { headers: authorizationHeaders() });
        if (!response.ok) { window.sessionStorage.removeItem(ACTIVE_RUN_KEY); return; }
        const snapshot = await response.json() as ResearchTaskSnapshot;
        if (cancelled) return;
        setTask(snapshot);
        setPage(snapshot.coreStatus && snapshot.coreStatus !== 'idle' ? 3 : snapshot.candidateStatus && snapshot.candidateStatus !== 'idle' ? 2 : 1);
        if (['queued', 'running'].includes(snapshot.status)) await pollTask(runId, setTask);
        if (['queued', 'running'].includes(snapshot.candidateStatus ?? 'idle')) await pollCandidates(runId, setTask);
        if (['queued', 'running'].includes(snapshot.coreStatus ?? 'idle')) await pollCore(runId, setTask);
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : '后台任务恢复失败，请稍后刷新重试。');
      }
    };
    void restore();
    return () => { cancelled = true; };
  }, []);

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
      window.sessionStorage.setItem(ACTIVE_RUN_KEY, started.runId);
      setTask(started);
      await pollTask(started.runId, setTask);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '网络错误，请稍后重试。';
      setError(message);
      if (!isStillRunningMessage(message)) setTask({ runId: 'failed', stage: 'first-search', status: 'failed', files: [], errors: [{ message }] });
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

  const generateCandidates = async () => {
    if (!task || !isComplete) return;
    setError('');
    try {
      const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(task.runId)}/candidates`), { method: 'POST', headers: authorizationHeaders() });
      if (!response.ok) throw new Error(response.status === 400 ? '请先完成第一环节并确认有可用文献。' : '候选课题任务创建失败，请稍后重试。');
      const started = await response.json() as ResearchTaskSnapshot;
      setTask(started);
      await pollCandidates(started.runId, setTask);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '网络错误，请稍后重试。';
      setError(message);
      if (!isStillRunningMessage(message)) setTask((current) => current ? { ...current, candidateStatus: 'failed', candidateError: message } : current);
    }
  };

  const startCoreLiterature = async () => {
    if (task?.isDemo) { setPage(3); return; }
    if (!task || !selectedCandidate || task.coreStatus === 'completed' || task.coreStatus === 'partial') { setPage(3); return; }
    setPage(3); setError('');
    try {
      const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(task.runId)}/core-literature`), { method: 'POST', headers: { 'Content-Type': 'application/json', ...authorizationHeaders() }, body: JSON.stringify({ label: selectedCandidate }) });
      if (!response.ok) throw new Error('核心文献检索任务创建失败，请稍后重试。');
      const started = await response.json() as ResearchTaskSnapshot; setTask(started); await pollCore(started.runId, setTask);
    } catch (requestError) { const message = requestError instanceof Error ? requestError.message : '核心文献检索失败，请稍后重试。'; setError(message); }
  };

  const isRunning = task?.status === 'queued' || task?.status === 'running';
  const isComplete = task?.status === 'completed';

  return <main className="min-h-0 flex-1 overflow-auto bg-[linear-gradient(108deg,#f5f6f5_0%,#e5f0fd_51%,#bfdcff_100%)] text-[#19386f]">
    <div className="mx-auto min-h-full w-full max-w-[1500px] px-5 py-7 sm:px-8 lg:px-12">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#315a98]"><span className="grid size-8 place-items-center rounded-xl bg-white/80 text-[#1f4dcb]"><Sparkles className="size-4" /></span>启航 · 开题阶段</div><h1 className="text-3xl font-black tracking-[-0.04em] text-[#102f72] sm:text-4xl">开题智能体</h1><p className="mt-2 text-sm font-semibold leading-6 text-[#617da9]">输入感兴趣的研究领域，先用公开文献试检索确认方向</p></div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#ddecff] px-3.5 py-2 text-xs font-black text-[#2670d1] shadow-sm"><span className={`size-2 rounded-full ${isRunning ? 'animate-pulse bg-[#1f4dcb]' : 'bg-[#4c83d0]'}`} />{isRunning ? '检索中' : 'OpenAlex · 公开试检索'}</span>
      </header>
      {task?.isDemo && <div className="mt-4 rounded-xl border border-[#f0d6a5] bg-[#fff8e9] px-4 py-3 text-xs font-bold text-[#8b641e]" role="status">教学演示数据 · 基于 OpenAlex 公开元数据快照，候选课题与核心文献说明均需后续核验。</div>}

      <nav aria-label="开题三步进度" className="mt-8 grid grid-cols-1 gap-2 rounded-2xl bg-white p-2 shadow-[0_12px_32px_rgba(38,90,167,0.12)] sm:grid-cols-3">
        {steps.map((label, index) => { const number = index + 1; const active = page === number; const available = number <= 3; return <button key={label} type="button" disabled={!available} onClick={() => setPage(number)} aria-current={active ? 'step' : undefined} className={`flex min-w-0 items-center gap-3 rounded-xl px-4 py-3 text-left transition sm:justify-center ${active ? 'bg-[#1f4dcb] text-white shadow-[0_7px_15px_rgba(31,77,203,0.2)]' : 'text-[#7890b6] hover:bg-[#f3f8ff]'}`}><span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-black ${active ? 'bg-white/20' : 'bg-[#eef4fc] text-[#7187aa]'}`}>{number < page ? <Check className="size-4" /> : number}</span><span className="min-w-0"><span className="block truncate text-sm font-black">{label}</span><span className={`block text-[11px] font-bold ${active ? 'text-blue-100' : 'text-[#9aafd0]'}`}>{number === 1 ? '当前可操作' : '完成前一步后可继续'}</span></span></button>; })}
      </nav>

      {page === 1 && <DirectionPage interest={interest} setInterest={setInterest} context={context} setContext={setContext} task={task} error={error} isRunning={isRunning} isComplete={isComplete} onRun={runSearch} onCancel={cancelSearch} onRetry={runSearch} onNext={() => setPage(2)} onLoadDemo={loadDemo} />}
      {page === 2 && <CandidatesPage task={task} selectedCandidate={selectedCandidate} setSelectedCandidate={setSelectedCandidate} error={error} onGenerate={generateCandidates} onBack={() => setPage(1)} onNext={startCoreLiterature} />}
      {page === 3 && (task?.isDemo ? <DemoCoreLiteraturePage onBack={() => setPage(2)} /> : <CoreLiteraturePage task={task} error={error} onStart={startCoreLiterature} onBack={() => setPage(2)} />)}
    </div>
  </main>;
}

function DirectionPage({ interest, setInterest, context, setContext, task, error, isRunning, isComplete, onRun, onCancel, onRetry, onNext, onLoadDemo }: { interest: string; setInterest: (value: string) => void; context: string; setContext: (value: string) => void; task: ResearchTaskSnapshot | null; error: string; isRunning: boolean; isComplete: boolean; onRun: () => Promise<void>; onCancel: () => Promise<void>; onRetry: () => Promise<void>; onNext: () => void; onLoadDemo: () => void }) {
  return <section className="mt-7 flex min-h-0 flex-col gap-6">
    <div className="xl:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#b9d0ef] bg-[#f5f9ff] px-4 py-3 text-xs font-semibold text-[#55749f]"><span><strong className="text-[#315a98]">想先看完整流程？</strong> 加载一份基于 OpenAlex 快照的教学演示数据。</span><button type="button" onClick={onLoadDemo} className="rounded-xl bg-[#1f4dcb] px-3 py-2 font-black text-white hover:bg-[#11357f]">加载教学演示</button></div>
    <section className="rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">Step 01</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">实验研究方向</h2></div><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e7f0ff] text-[#1f4dcb]"><BookOpen className="size-5" /></div></div><p className="mt-4 text-sm font-semibold leading-6 text-[#617da9]">把你对学习或生活的好奇写下来，不需要先会写检索式。</p><label className="mt-7 block text-sm font-black text-[#294d80]" htmlFor="research-interest">研究方向 <span className="font-normal text-[#7892b7]">（必填）</span></label><textarea id="research-interest" value={interest} onChange={(event) => setInterest(event.target.value)} placeholder="例如：我想研究计算机视觉中的语义分割，尤其是复杂街景下的小目标与边界精细分割……" maxLength={2000} className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-[#c8dcfb] bg-[#f7fbff] p-4 text-sm font-semibold leading-6 text-[#263d65] outline-none placeholder:text-[#91a7c8] focus:border-[#1f4dcb] focus:ring-4 focus:ring-[#1f4dcb]/10" /><div className="mt-5 flex items-center justify-between gap-3"><label className="text-sm font-black text-[#294d80]" htmlFor="research-context">研究目标或上下文 <span className="font-normal text-[#7892b7]">（可选）</span></label><span className="text-xs font-semibold text-[#8aa1c1]">帮助缩小范围</span></div><textarea id="research-context" value={context} onChange={(event) => setContext(event.target.value)} placeholder="例如：我是大一学生，希望从校园监控或手机拍摄的公开图片开始。" maxLength={4000} className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-[#c8dcfb] bg-[#f7fbff] p-4 text-sm font-semibold leading-6 text-[#263d65] outline-none placeholder:text-[#91a7c8] focus:border-[#1f4dcb] focus:ring-4 focus:ring-[#1f4dcb]/10" /><div className="mt-6 flex flex-wrap items-center gap-3"><Button onClick={isRunning ? onCancel : onRun} className="rounded-xl bg-[#1f4dcb] px-5 font-black text-white shadow-[0_7px_16px_rgba(31,77,203,0.22)] hover:bg-[#11357f]">{isRunning ? <><X />取消检索</> : <><Search />开始试检索</>}</Button><button type="button" onClick={() => { setInterest('我对计算机视觉中的语义分割很感兴趣，想了解复杂街景场景下小目标与边界精细分割的方法。'); setContext('我是大一学生，希望从 Cityscapes、ADE20K 等公开数据集开始，先了解主流方法和常见评测指标（如 mIoU）。'); }} className="text-xs font-black text-[#4b78b5] underline decoration-[#a8c4e8] underline-offset-4">填入教学示例</button></div>{(isRunning || Boolean(task)) && <OpenAlexQueryCard query={interest.trim()} context={context.trim()} isRunning={isRunning} />}{error && <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#fff1f1] p-3 text-xs font-semibold leading-5 text-[#b64d57]" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}<div className="mt-7 border-t border-[#e3ecf8] pt-5 text-xs font-semibold leading-5 text-[#6d85a6]"><div className="flex items-start gap-2"><CircleHelp className="mt-0.5 size-4 shrink-0 text-[#6090cf]" /><p><strong className="text-[#315a98]">你需要决定：</strong>这个问题是否真的让你感兴趣、是否符合你的时间和资源。智能体可以帮你找资料，但不能替你决定研究价值。</p></div></div></section>
    <ResultsCard task={task} isRunning={isRunning} isComplete={isComplete} onRetry={onRetry} />
     <div className="xl:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 px-5 py-4 text-xs font-semibold text-[#55749f]"><span>{isComplete ? '试检索完成；下一步将基于文献生成三个候选课题。' : '完成一次真实试检索后，才可以继续查看第二步。'}</span><Button variant="outline" disabled={!isComplete} onClick={onNext} className="rounded-xl border-[#9bbce8] bg-white/60 font-black text-[#1f4dcb] disabled:cursor-not-allowed disabled:opacity-50">进入候选课题步骤<ArrowRight /></Button></div>
  </section>;
}

function OpenAlexQueryCard({ query, context, isRunning }: { query: string; context: string; isRunning: boolean }) {
  const plan = buildOpenAlexQueryPlan(query);
  const formula = plan.oql;
  return (
    <div className="mt-5 rounded-2xl border border-[#c9dcf7] bg-[#f5f9ff] p-4 shadow-[0_8px_20px_rgba(31,77,203,0.08)]" role="status">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black tracking-[0.16em] text-[#5f85b8] uppercase">OpenAlex Query</p>
          <h3 className="mt-1 text-sm font-black text-[#183b70]">检索式</h3>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#1f4dcb] shadow-sm">{isRunning ? '检索中' : '已生成'}</span>
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-[#617da9]">先用高精度命名变体检索；如果命中或去重结果不足，后端会自动放宽到下一层，并记录每次切换。</p>
      <pre className="mt-3 overflow-x-auto rounded-xl border border-[#d8e5f6] bg-white/90 p-3 text-[11px] font-semibold leading-5 text-[#294d80] whitespace-pre-wrap break-all">{formula}</pre>
      <p className="mt-2 text-[11px] font-semibold leading-5 text-[#7892b7]">当前策略：{plan.tier === 'focused' ? '高精度' : plan.tier === 'balanced' ? '平衡' : '保底'}；主题词：{plan.includeTerms.join(' · ')}{plan.excludeTitleTerms.length > 0 ? `；标题排除：${plan.excludeTitleTerms.join(' · ')}` : ''}</p>
      {context ? <p className="mt-2 text-[11px] font-semibold leading-5 text-[#7892b7]">上下文补充：{context}</p> : null}
    </div>
  );
}

function ResultsCard({ task, isRunning, isComplete, onRetry }: { task: ResearchTaskSnapshot | null; isRunning: boolean; isComplete: boolean; onRetry: () => Promise<void> }) { const papers = task?.papers ?? []; const counts = task?.counts; const insufficient = isComplete && counts?.targetReached === false; return <section className="min-w-0 rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">OpenAlex trial search</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">试检索结果</h2></div><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e7f0ff] text-[#1f4dcb]"><FileSearch className="size-5" /></div></div><p className="mt-4 text-sm font-semibold leading-6 text-[#617da9]">这里只展示前 20 条公开元数据和摘要节选，不代表已经读完或验证论文结论。</p>{isRunning ? <div className="mt-7 rounded-2xl border border-[#c9dcf7] bg-[#f5f9ff] p-6" role="status"><div className="flex items-center gap-3 text-sm font-black text-[#285c9f]"><LoaderCircle className="size-5 animate-spin" />正在从 OpenAlex 获取公开资料</div><p className="mt-3 text-xs font-semibold leading-5 text-[#7089ac]">任务已提交，正在按目标数量分页获取并去重。你可以取消本次检索。</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dfebfb]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#1f4dcb]" /></div></div> : task?.status === 'failed' ? <State icon={AlertCircle} title="这次试检索没有完成" description={task.errors[0]?.message ?? '公开资料服务暂时不可用，请稍后重试。'} action={<Button variant="outline" onClick={onRetry} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><RotateCcw />重新试检索</Button>} /> : isComplete && papers.length === 0 ? <State icon={Search} title="没有返回可展示的论文" description="OpenAlex 已完成本次试检索，但没有符合条件的记录。可以修改左侧描述后重试。" action={<Button variant="outline" onClick={onRetry} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><RotateCcw />重新试检索</Button>} /> : papers.length === 0 ? <State icon={Search} title="等待你的研究兴趣" description="输入研究方向后，点击“开始试检索”。结果会显示在这里。" /> : <div className="mt-7 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#eef5ff] px-4 py-3 text-xs font-bold text-[#55749f]"><span>已去重 {counts?.deduplicated ?? counts?.papers ?? papers.length} 条 · 已获取原始记录 {counts?.returned ?? '—'} 条 · 目标 {counts?.requested ?? '300'} 条</span><span className="text-[#4775b2]">来源：OpenAlex 公共 API · 预览 {counts?.previewed ?? papers.length} 条</span></div>{insufficient && <div className="rounded-xl border border-[#f0d6a5] bg-[#fff8e9] px-4 py-3 text-xs font-bold leading-5 text-[#8b641e]" role="status">结果不足：实际去重后仅 {counts?.deduplicated ?? papers.length} 条，不能按 {counts?.requested ?? 300} 条目标完成。没有填充或伪造论文。</div>}{papers.map((paper) => <article key={paper.openalexId} className="rounded-2xl border border-[#d8e5f6] bg-[#fbfdff] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 flex-1 text-sm font-black leading-6 text-[#244a7d]">{paper.title || '无标题'}</h3><span className="rounded-lg bg-[#e6f0ff] px-2 py-1 text-[11px] font-black text-[#3b6fae]">OpenAlex · 待核验</span></div><p className="mt-2 text-xs font-semibold leading-5 text-[#6c84a5]">{paper.publicationYear ?? '年份未知'} · {paper.authors.slice(0, 4).join('、') || '作者信息缺失'}{paper.authors.length > 4 ? ' 等' : ''} · {paper.source || '来源信息缺失'}{paper.citedByCount > 0 ? ` · 被引 ${paper.citedByCount}` : ''}</p><p className="mt-3 text-xs font-semibold leading-5 text-[#526e98]">{paper.abstract ? `${paper.abstract.slice(0, 320)}${paper.abstract.length > 320 ? '…' : ''}` : '暂无摘要'}</p><div className="mt-3 flex flex-wrap gap-4 text-xs font-black"><a href={paper.doi || paper.landingUrl || paper.openalexId} target="_blank" rel="noreferrer" className="text-[#1f4dcb] underline underline-offset-2">{paper.doi ? '打开 DOI' : '打开 OpenAlex 来源'}</a>{paper.doi && <a href={paper.landingUrl || paper.openalexId} target="_blank" rel="noreferrer" className="text-[#5b7fae] underline underline-offset-2">打开 OpenAlex 来源</a>}</div></article>)}</div>}</section>; }

function CandidatesPage({ task, selectedCandidate, setSelectedCandidate, error, onGenerate, onBack, onNext }: { task: ResearchTaskSnapshot | null; selectedCandidate: string | null; setSelectedCandidate: (value: string | null) => void; error: string; onGenerate: () => Promise<void>; onBack: () => void; onNext: () => Promise<void> }) {
  const candidates = task?.candidates ?? [];
  const running = task?.candidateStatus === 'queued' || task?.candidateStatus === 'running';
  const complete = task?.candidateStatus === 'completed' && candidates.length === 3;
  const labelClass: Record<string, string> = { '偏可行': 'bg-[#e8f7ed] text-[#24704a]', '偏创新': 'bg-[#fff0dd] text-[#9a5c19]', '较平衡': 'bg-[#eeeaff] text-[#5f4aa4]' };
  return <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-10"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">Step 02 · Codex CLI</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">交叉研究候选课题选取</h2><p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#617da9]">Codex 会读取第一步落盘的全部去重文献，再给出三个有取舍的研究方向。卡片里的证据和结论仍需你打开来源、判断是否值得做。</p></div><div className="rounded-2xl bg-[#edf4ff] px-4 py-3 text-xs font-black text-[#315a98]">输入：{task?.counts?.deduplicated ?? 0} 条文献</div></div>{!task || task.status !== 'completed' ? <State icon={FileSearch} title="请先完成第一环节的文献检索" description="候选课题只会基于真实检索结果生成，不会用示例内容填充。" /> : !complete && !running && <div className="mt-8 rounded-2xl border border-dashed border-[#b9d0ef] bg-[#f7faff] p-9 text-center"><Sparkles className="mx-auto size-8 text-[#6594ce]" /><h3 className="mt-4 text-sm font-black text-[#315a98]">准备好比较三个方向了吗？</h3><p className="mx-auto mt-2 max-w-xl text-xs font-semibold leading-5 text-[#7189aa]">会实际调用本机 Codex CLI 读取 CSV；没有合适证据时，结果会标记待核验，不会自动补齐。</p><Button onClick={onGenerate} className="mt-5 rounded-xl bg-[#1f4dcb] font-black text-white hover:bg-[#11357f]"><Sparkles />用全部检索结果生成三个课题</Button></div>}{running && <div className="mt-8 rounded-2xl border border-[#c9dcf7] bg-[#f5f9ff] p-7" role="status"><div className="flex items-center gap-3 text-sm font-black text-[#285c9f]"><LoaderCircle className="size-5 animate-spin" />Codex CLI 正在阅读文献并生成候选课题</div><p className="mt-3 text-xs font-semibold leading-5 text-[#7089ac]">后端只允许 CLI 读取本地检索 CSV，完成后会校验 JSON 是否恰好包含三类课题。</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dfebfb]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#1f4dcb]" /></div></div>}{task?.candidateStatus === 'failed' && <State icon={AlertCircle} title="候选课题没有生成" description={task.candidateError ?? 'Codex CLI 输出无法使用，请重试。'} action={<Button variant="outline" onClick={onGenerate} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><RotateCcw />重试生成</Button>} />}{complete && <div className="mt-8 grid gap-4 lg:grid-cols-3">{candidates.map((candidate) => <article key={candidate.label} className={`rounded-2xl border p-5 transition ${selectedCandidate === candidate.label ? 'border-[#1f4dcb] bg-[#f4f8ff] shadow-[0_10px_24px_rgba(31,77,203,0.13)]' : 'border-[#d8e5f6] bg-[#fbfdff]'}`}><div className="flex items-start justify-between gap-3"><span className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${labelClass[candidate.label]}`}>{candidate.label}</span><button type="button" onClick={() => setSelectedCandidate(selectedCandidate === candidate.label ? null : candidate.label)} className="text-xs font-black text-[#1f4dcb] underline underline-offset-4">{selectedCandidate === candidate.label ? '已选择' : '选择此题'}</button></div><h3 className="mt-4 text-base font-black leading-6 text-[#244a7d]">{candidate.title}</h3><Info label="一句话定义" value={candidate.oneSentenceDefinition} /><Info label="研究设计与技术路线" value={candidate.researchDesign} /><Info label="预期创新性与价值" value={candidate.expectedInnovation} /><Info label="立论依据" value={candidate.rationale} /></article>)}</div>}{error && <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#fff1f1] p-3 text-xs font-semibold leading-5 text-[#b64d57]" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}<div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3ecf8] pt-5"><Button variant="outline" onClick={onBack} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><ArrowLeft />返回上一步</Button><Button disabled={!selectedCandidate} onClick={onNext} className="rounded-xl bg-[#1f4dcb] font-black text-white disabled:opacity-50">继续核心文献分析<ArrowRight /></Button></div></section>;
}

function CoreLiteraturePage({ task, error, onStart, onBack }: { task: ResearchTaskSnapshot | null; error: string; onStart: () => Promise<void>; onBack: () => void }) { const status = task?.coreStatus ?? 'idle'; const manifest = task?.coreManifest; const files = Array.isArray(manifest?.files) ? manifest.files as string[] : []; const counts = manifest?.counts as Record<string, unknown> | undefined; const running = status === 'queued' || status === 'running'; return <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-10"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e7f0ff] text-[#1f4dcb]"><FlaskConical className="size-6" /></div><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">Step 03 · Core Literature Skill</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">核心文献深检索与资料打包</h2><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#617da9]">根据你确认的候选课题检索 100–300 篇核心文献，并分别记录 BibTeX 与 OA PDF 的真实获取状态。</p></div></div>{status === 'idle' && <State icon={FlaskConical} title="已选择课题，准备开始深度检索" description="点击开始后，系统会按核心文献 Skill 契约生成 references.csv、references.bib、PDF 下载报告和交接说明。" action={<Button onClick={onStart} className="rounded-xl bg-[#1f4dcb] font-black text-white">开始核心文献检索<Search /></Button>} />}{running && <div className="mt-8 rounded-2xl border border-[#c9dcf7] bg-[#f5f9ff] p-7" role="status"><div className="flex items-center gap-3 text-sm font-black text-[#285c9f]"><LoaderCircle className="size-5 animate-spin" />核心文献任务正在运行</div><p className="mt-3 text-xs font-semibold leading-5 text-[#7089ac]">任务已落盘，刷新页面后会自动恢复。</p></div>}{status === 'failed' && <State icon={AlertCircle} title="核心文献检索失败" description={task?.coreError ?? error ?? '请重试。'} action={<Button variant="outline" onClick={onStart} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><RotateCcw />重试</Button>} />}{(status === 'completed' || status === 'partial') && <div className="mt-8 space-y-4"><div className="rounded-2xl border border-[#b9d0ef] bg-[#f5f9ff] p-5 text-sm font-bold text-[#315a98]">核心文献：{String(counts?.references ?? '—')} 篇 · 有效 OA PDF：{String(counts?.pdfDownloaded ?? 0)} 篇 · 状态：{status === 'partial' ? '部分完成，按实际数量交接' : '已完成'}</div><div className="grid gap-3 sm:grid-cols-2">{files.map((file) => <div key={file} className="rounded-xl border border-[#d8e5f6] bg-[#fbfdff] px-4 py-3 text-xs font-black text-[#526e98]">{file}</div>)}</div><p className="text-xs font-semibold leading-5 text-[#7189aa]">PDF 下载遵守公开 OA 域名白名单；未获取的 PDF 会保留具体失败状态，不会伪造文件。</p></div>}{error && <div className="mt-5 rounded-xl bg-[#fff1f1] p-3 text-xs font-semibold text-[#b64d57]" role="alert">{error}</div>}<div className="mt-8 border-t border-[#e3ecf8] pt-5"><Button variant="outline" onClick={onBack} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><ArrowLeft />返回候选课题</Button></div></section>; }

function Info({ label, value }: { label: string; value: string }) { return <div className="mt-4"><p className="text-[11px] font-black tracking-wide text-[#6b89b3]">{label}</p><p className="mt-1 text-xs font-semibold leading-5 text-[#526e98]">{value}</p></div>; }

function DemoCoreLiteraturePage({ onBack }: { onBack: () => void }) { return <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-10"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e7f0ff] text-[#1f4dcb]"><FlaskConical className="size-6" /></div><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">Step 03 · 教学演示</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">核心文献智能分析</h2><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#617da9]">这是基于所选候选课题的模拟交接页，用来展示后续实验、写作和投稿模块需要消费什么证据。</p></div></div><div className="mt-7 rounded-2xl border border-[#f0d6a5] bg-[#fff8e9] p-4 text-xs font-bold leading-5 text-[#8b641e]">教学演示数据 · 文献来自 OpenAlex 元数据快照；下列“相关性说明”是 Demo 整理，不代表已完成全文阅读或真实研究结论。</div><div className="mt-6 space-y-3">{demoTaskSnapshot.demoCoreLiterature?.map((paper) => <article key={paper.openalexId} className="rounded-2xl border border-[#d8e5f6] bg-[#fbfdff] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 flex-1 text-sm font-black leading-6 text-[#244a7d]">{paper.title}</h3><a href={paper.openalexId} target="_blank" rel="noreferrer" className="text-xs font-black text-[#1f4dcb] underline">OpenAlex 来源</a></div><p className="mt-2 text-xs font-semibold leading-5 text-[#526e98]">{paper.whyRelevant}</p></article>)}</div><div className="mt-7 rounded-2xl bg-[#eef5ff] p-4 text-xs font-semibold leading-5 text-[#55749f]"><strong className="text-[#315a98]">交接说明：</strong>后续实验模块消费“已确认课题 + 核心文献依据”；写作模块消费实验方案和结果；投稿模块只消费论文草稿与实验记录。Demo 不会自动替代这些真实产物。</div><div className="mt-7 border-t border-[#e3ecf8] pt-5"><Button variant="outline" onClick={onBack} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><ArrowLeft />返回候选课题</Button></div></section>; }

export function FuturePage({ number, title, icon: Icon, description, detail, onBack }: { number: string; title: string; icon: typeof Sparkles; description: string; detail: string; onBack: () => void }) { return <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-10"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e7f0ff] text-[#1f4dcb]"><Icon className="size-6" /></div><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">Step {number} · 待接入</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">{title}</h2><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#617da9]">{description}</p></div></div><div className="mt-8 rounded-2xl border border-dashed border-[#b9d0ef] bg-[#f7faff] p-8 text-center"><Icon className="mx-auto size-8 text-[#6594ce]" /><h3 className="mt-4 text-sm font-black text-[#315a98]">当前功能尚未接入</h3><p className="mx-auto mt-2 max-w-xl text-xs font-semibold leading-5 text-[#7189aa]">{detail}</p></div><div className="mt-7 border-t border-[#e3ecf8] pt-5"><Button variant="outline" onClick={onBack} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><ArrowLeft />返回上一步</Button></div></section>; }

function State({ icon: Icon, title, description, action }: { icon: typeof Search; title: string; description: string; action?: React.ReactNode }) { return <div className="mt-7 rounded-2xl border border-dashed border-[#b9d0ef] bg-[#f7faff] p-10 text-center"><Icon className="mx-auto size-8 text-[#6594ce]" /><h3 className="mt-4 text-sm font-black text-[#315a98]">{title}</h3><p className="mx-auto mt-2 max-w-sm text-xs font-semibold leading-5 text-[#7189aa]">{description}</p>{action && <div className="mt-5">{action}</div>}</div>; }

function authorizationHeaders(): Record<string, string> { const token = getApiToken(); return token ? { Authorization: `Bearer ${token}` } : {}; }

async function pollTask(runId: string, setTask: React.Dispatch<React.SetStateAction<ResearchTaskSnapshot | null>>) { for (let attempt = 0; attempt < 600; attempt += 1) { await new Promise((resolve) => window.setTimeout(resolve, 500)); const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(runId)}`), { headers: authorizationHeaders() }); if (!response.ok) throw new Error('无法读取检索任务状态，请重试。'); const snapshot = await response.json() as ResearchTaskSnapshot; setTask(snapshot); if (!['queued', 'running'].includes(snapshot.status)) return; } throw new Error('后台任务仍在运行，稍后可刷新页面恢复结果。'); }

async function pollCandidates(runId: string, setTask: React.Dispatch<React.SetStateAction<ResearchTaskSnapshot | null>>) { for (let attempt = 0; attempt < 600; attempt += 1) { await new Promise((resolve) => window.setTimeout(resolve, 1000)); const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(runId)}`), { headers: authorizationHeaders() }); if (!response.ok) throw new Error('无法读取候选课题任务状态，请重试。'); const snapshot = await response.json() as ResearchTaskSnapshot; setTask(snapshot); if (!['queued', 'running'].includes(snapshot.candidateStatus ?? 'idle')) return; } throw new Error('后台任务仍在运行，稍后可刷新页面恢复候选课题。'); }

function isStillRunningMessage(message: string): boolean { return message.startsWith('后台任务仍在运行'); }

async function pollCore(runId: string, setTask: React.Dispatch<React.SetStateAction<ResearchTaskSnapshot | null>>) { for (let attempt = 0; attempt < 600; attempt += 1) { await new Promise((resolve) => window.setTimeout(resolve, 1000)); const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(runId)}`), { headers: authorizationHeaders() }); if (!response.ok) throw new Error('无法读取核心文献任务状态，请重试。'); const snapshot = await response.json() as ResearchTaskSnapshot; setTask(snapshot); if (!['queued', 'running'].includes(snapshot.coreStatus ?? 'idle')) return; } throw new Error('后台任务仍在运行，稍后可刷新页面恢复核心文献结果。'); }
