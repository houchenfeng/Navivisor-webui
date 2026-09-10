import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  FileSearch,
  FlaskConical,
  Info,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Save,
  Search,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { demoInterest, emptyResearchMessage, starterKeywordGroups, topicSteps } from './data';
import type { KeywordGroup, TopicDraft, TopicStep } from './types';
import { unavailableTopicWorkflowClient, type ResearchTaskSnapshot, type TopicHandoff } from './topic-workflow-contract';

const initialDraft: TopicDraft = {
  interest: '',
  boundary: '',
  keywords: starterKeywordGroups,
  searchFeedback: {},
};

const statusStyles = {
  '教学模拟': 'border-amber-200 bg-amber-50 text-amber-800',
  待核验: 'border-slate-200 bg-slate-100 text-slate-700',
  需复核: 'border-red-200 bg-red-50 text-red-700',
  真实: 'border-emerald-200 bg-emerald-50 text-emerald-700',
} as const;

export function TopicPage() {
  const [step, setStep] = useState<TopicStep>(1);
  const [draft, setDraft] = useState<TopicDraft>(initialDraft);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organized, setOrganized] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [task, setTask] = useState<ResearchTaskSnapshot | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [deepened, setDeepened] = useState<'原方案' | '进化版方案'>('原方案');
  const [showSyntax, setShowSyntax] = useState(false);

  const canAdvance = step === 1 ? organized : step === 2 ? Object.keys(draft.searchFeedback).length > 0 : step === 4 ? Boolean(selectedCandidate) : true;
  const handoff = useMemo<TopicHandoff>(() => ({
    confirmedTopic: selectedCandidate ?? '待用户确认的候选课题',
    boundary: draft.boundary || '待用户补充研究边界与资源条件',
    candidateEvidenceStatus: '待核验',
    evidenceRunId: task?.runId,
    next: {
      experiment: '消费 confirmedTopic、用户边界/资源、候选方向依据和相关 runId',
      writing: '消费 confirmedTopic、来源状态和核心文献包',
      submission: '不从开题直接消费，仅消费后续论文草稿与教学模拟状态',
    },
  }), [draft.boundary, selectedCandidate, task?.runId]);

  const organizeInterest = () => {
    if (draft.interest.trim().length < 8) {
      setFeedback('还需要多写一点：至少说明你想观察谁、什么行为或什么场景。');
      return;
    }
    setFeedback('');
    setIsOrganizing(true);
    window.setTimeout(() => {
      setIsOrganizing(false);
      setOrganized(true);
      setDraft((current) => ({
        ...current,
        boundary: '对象：大学生与校园投放行为；任务：了解坚持/放弃的影响因素；场景：大学校园日常投放。',
      }));
    }, 520);
  };

  const runSearchPreview = async () => {
    setFeedback('');
    setTask({ runId: 'pending-demo', stage: 'first-search', status: 'running', files: [], errors: [] });
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    const snapshot = await unavailableTopicWorkflowClient.startFirstSearch({ topic: draft.interest, context: draft.boundary });
    setTask(snapshot);
    setFeedback('试搜接口已预留，但真实检索服务未接入；页面保留了失败/未接入状态，不展示虚构论文。');
  };

  const updateGroup = (groupIndex: number, updater: (group: KeywordGroup) => KeywordGroup) => {
    setDraft((current) => ({ ...current, keywords: current.keywords.map((group, index) => index === groupIndex ? updater(group) : group) }));
  };

  const next = () => {
    if (!canAdvance) {
      setFeedback(step === 1 ? '请先完成一次兴趣整理。' : step === 2 ? '至少给一条试搜结果标注相关度，再继续。' : '请先选择一个候选方向。');
      return;
    }
    setFeedback('');
    setStep((current) => Math.min(5, current + 1) as TopicStep);
  };

  return (
    <main className="min-h-0 flex-1 overflow-auto bg-[#f5f4ef] text-[#20252b]">
      <div className="mx-auto min-h-full w-full max-w-[1440px] px-4 py-5 sm:px-8 lg:px-12">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#d9d8d1] pb-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-[#65706c] uppercase"><span className="grid size-7 place-items-center rounded-lg bg-[#243f3b] text-[#f5f4ef]"><BookOpen className="size-4" /></span>启航 · 研究工作区</div>
            <h1 className="font-serif text-3xl tracking-[-0.03em] text-[#1d302e] sm:text-4xl">从一个问题，开始一次可验证的研究</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65706c]">开题不是让智能体替你做决定，而是把兴趣变成可以查证、比较和继续实验的问题。</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#68736f]"><span className="size-2 rounded-full bg-[#c79045]" />本地教学流程 · 未接入真实检索</div>
        </header>

        <nav aria-label="开题五步进度" className="mb-8 grid grid-cols-2 gap-2 md:grid-cols-5">
          {topicSteps.map((item) => {
            const active = item.number === step;
            const complete = item.number < step;
            return <button key={item.number} type="button" onClick={() => setStep(item.number as TopicStep)} className={cn('group flex min-w-0 items-center gap-3 border-b-2 px-2 py-3 text-left transition-colors', active ? 'border-[#bc7d35]' : complete ? 'border-[#607b72]' : 'border-[#d9d8d1]')} aria-current={active ? 'step' : undefined}>
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-full border text-sm font-bold', active ? 'border-[#bc7d35] bg-[#bc7d35] text-white' : complete ? 'border-[#607b72] bg-[#607b72] text-white' : 'border-[#c9cbc3] text-[#78817d]')}>{complete ? <Check className="size-4" /> : item.number}</span>
              <span className="min-w-0"><span className={cn('block truncate text-sm font-semibold', active ? 'text-[#243f3b]' : 'text-[#65706c]')}>{item.label}</span><span className="hidden truncate text-xs text-[#8a918d] lg:block">{item.short}</span></span>
            </button>;
          })}
        </nav>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="min-w-0">
            {step === 1 && <InterestStep draft={draft} setDraft={setDraft} organized={organized} isOrganizing={isOrganizing} feedback={feedback} organizeInterest={organizeInterest} updateGroup={updateGroup} />}
            {step === 2 && <SearchStep draft={draft} setDraft={setDraft} task={task} feedback={feedback} showSyntax={showSyntax} setShowSyntax={setShowSyntax} updateGroup={updateGroup} runSearchPreview={runSearchPreview} />}
            {step === 3 && <EvidenceStep task={task} setStep={setStep} />}
            {step === 4 && <CandidateStep selectedCandidate={selectedCandidate} setSelectedCandidate={setSelectedCandidate} feedback={feedback} />}
            {step === 5 && <DeepenStep draft={draft} handoff={handoff} deepened={deepened} setDeepened={setDeepened} setDraft={setDraft} feedback={feedback} />}
            <ActionBar step={step} setStep={setStep} next={next} canAdvance={canAdvance} feedback={feedback} />
          </section>
          <GuidePanel step={step} />
        </div>
      </div>
    </main>
  );
}

function InterestStep({ draft, setDraft, organized, isOrganizing, feedback, organizeInterest, updateGroup }: { draft: TopicDraft; setDraft: React.Dispatch<React.SetStateAction<TopicDraft>>; organized: boolean; isOrganizing: boolean; feedback: string; organizeInterest: () => void; updateGroup: (index: number, updater: (group: KeywordGroup) => KeywordGroup) => void }) {
  const [editing, setEditing] = useState(false);
  return <StepFrame title="研究兴趣与问题边界" subtitle="先把脑海里的模糊想法说出来，再一起整理成可以查资料的问题。" icon={Lightbulb}>
    <Panel title="1 · 先写下你的兴趣" icon={Sparkles} status="教学模拟"><textarea aria-label="原始研究兴趣" value={draft.interest} onChange={(event) => setDraft((current) => ({ ...current, interest: event.target.value }))} placeholder="例如：我对大学校园里的垃圾分类行为很感兴趣……" className="mt-4 min-h-32 w-full resize-y rounded-xl border border-[#d7d9d1] bg-[#fbfbf8] p-4 text-sm leading-6 outline-none transition focus:border-[#bc7d35] focus:ring-2 focus:ring-[#bc7d35]/15" /><div className="mt-3 flex flex-wrap items-center gap-3"><Button onClick={organizeInterest} disabled={isOrganizing} className="bg-[#243f3b] text-[#f8f7f1] hover:bg-[#31534d]">{isOrganizing ? <><LoaderCircle className="animate-spin" />正在整理</> : <><Sparkles />整理兴趣</>}</Button><button type="button" className="text-xs font-semibold text-[#9b672e] underline underline-offset-4" onClick={() => setDraft((current) => ({ ...current, interest: demoInterest }))}>使用一个教学示例</button></div>{feedback && <InlineMessage kind="error" message={feedback} />}</Panel>
    <Panel title="AI 整理后的研究边界" icon={Target} status="待核验"><p className="mt-2 text-xs leading-5 text-[#747d78]">把输入拆成“研究对象、研究任务、研究场景”。这只是查资料前的工作草稿，不是研究结论。</p>{organized ? <div className="mt-4 space-y-3"><div className="rounded-xl border border-[#d9d8d1] bg-[#fbfbf8] p-4 text-sm leading-6 text-[#37433f]"><span className="mb-2 block text-xs font-semibold text-[#9b672e]">AI 建议 · 待你确认</span>{draft.boundary}</div><div className="flex items-start gap-2 rounded-lg bg-[#f3eadc] p-3 text-xs leading-5 text-[#75552e]"><Info className="mt-0.5 size-4 shrink-0" />智能体可以帮你整理表达，但不能替你决定研究价值、创新性或最终范围。</div></div> : <EmptyState icon={Sparkles} title="等待 AI 整理结果" description="先输入至少一句完整想法，再点击“整理兴趣”。" />}</Panel>
    <Panel title="研究方向关键词" icon={Search}><div className="mt-2 flex items-center justify-between gap-3"><p className="text-xs leading-5 text-[#747d78]">关键词可随时编辑，后面会用于检查检索方向。</p><Button size="sm" variant="outline" onClick={() => setEditing((current) => !current)}>{editing ? <><Save />保存关键词</> : '编辑关键词'}</Button></div><div className="mt-4 space-y-3">{draft.keywords.map((group, groupIndex) => <div key={group.label} className="grid gap-2 rounded-xl border border-[#e2e1da] bg-[#fbfbf8] p-3 sm:grid-cols-[112px_1fr]"><div><span className="block text-sm font-semibold text-[#33423e]">{group.label}</span><span className="text-xs text-[#89918d]">{group.description}</span></div><div className="flex flex-wrap items-center gap-2">{group.items.map((item, itemIndex) => editing ? <span key={`${group.label}-${itemIndex}`} className="flex items-center gap-1 rounded-lg border border-[#d0d4cc] bg-white pl-2"><input value={item} onChange={(event) => updateGroup(groupIndex, (current) => ({ ...current, items: current.items.map((value, index) => index === itemIndex ? event.target.value : value) }))} className="w-28 bg-transparent py-1.5 text-xs outline-none" aria-label={`${group.label}关键词${itemIndex + 1}`} /><button type="button" aria-label={`删除${group.label}关键词`} onClick={() => updateGroup(groupIndex, (current) => ({ ...current, items: current.items.filter((_, index) => index !== itemIndex) }))} className="p-1.5 text-[#8b928c] hover:text-red-600"><Trash2 className="size-3.5" /></button></span> : <span key={`${group.label}-${itemIndex}`} className="rounded-lg bg-[#e9eee8] px-2.5 py-1.5 text-xs font-medium text-[#456158]">{item || '待填写'}</span>)}<button type="button" aria-label={`新增${group.label}关键词`} onClick={() => updateGroup(groupIndex, (current) => ({ ...current, items: [...current.items, ''] }))} className="grid size-7 place-items-center rounded-lg border border-dashed border-[#bcc6bd] text-[#607b72] hover:bg-[#eef2eb]"><Plus className="size-4" /></button></div></div>)}</div></Panel>
  </StepFrame>;
}

function SearchStep({ draft, setDraft, task, feedback, showSyntax, setShowSyntax, updateGroup, runSearchPreview }: { draft: TopicDraft; setDraft: React.Dispatch<React.SetStateAction<TopicDraft>>; task: ResearchTaskSnapshot | null; feedback: string; showSyntax: boolean; setShowSyntax: React.Dispatch<React.SetStateAction<boolean>>; updateGroup: (index: number, updater: (group: KeywordGroup) => KeywordGroup) => void; runSearchPreview: () => Promise<void> }) {
  const resultLabels = ['结果 A', '结果 B', '结果 C'];
  return <StepFrame title="检索策略与相关度试搜" subtitle="正式检索前，先用少量结果检查：我们是不是在找正确的问题。" icon={Search}>
    <section className="rounded-2xl border border-[#d9d8d1] bg-[#fffefa] p-5 shadow-[0_8px_30px_rgba(41,54,48,0.04)] sm:p-6"><div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-base font-semibold text-[#33423e]"><BookOpen className="size-4 text-[#9b672e]" />文献来源方案</h3><span className="text-[11px] text-[#89918d]">由后端策略选择</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#9fb5a4] bg-[#f1f6f0] p-4"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-[#355449]">OpenAlex</span><span className="rounded-md bg-[#dbe9dc] px-2 py-1 text-[11px] font-semibold text-[#456158]">当前默认</span></div><p className="mt-2 text-xs leading-5 text-[#687a70]">开放元数据与摘要方案；网络可用性需在运行时验证，不代表全文或 PDF 已获取。</p></div><div className="rounded-xl border border-dashed border-[#d4d5ce] bg-[#fafaf7] p-4 opacity-75"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-[#69736e]">Scopus</span><span className="rounded-md border border-[#e3d2b7] bg-[#fbf1e2] px-2 py-1 text-[11px] font-semibold text-[#8c6637]">待授权</span></div><p className="mt-2 text-xs leading-5 text-[#89918d]">当前不可直接运行；需要合法 API 或机构权限，浏览器登录不等于 API 授权。</p></div></div></section>
    <Panel title="检索范围" icon={FileSearch} status="待核验"><p className="mt-2 text-xs leading-5 text-[#747d78]">试搜只用来检查关键词方向，不代表真实论文结果。你可以修改上一页的三组关键词。</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{draft.keywords.map((group, index) => <div key={group.label} className="rounded-xl border border-[#e2e1da] bg-[#fbfbf8] p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-[#394a45]">{group.label}</span><button type="button" onClick={() => updateGroup(index, (current) => ({ ...current, items: [...current.items, ''] }))} className="text-xs font-semibold text-[#9b672e]">编辑</button></div><div className="space-y-1.5">{group.items.map((item, itemIndex) => <input key={`${group.label}-${itemIndex}`} value={item} onChange={(event) => updateGroup(index, (current) => ({ ...current, items: current.items.map((value, key) => key === itemIndex ? event.target.value : value) }))} className="w-full rounded-lg border border-[#deded7] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#bc7d35]" aria-label={`${group.label}关键词${itemIndex + 1}`} />)}</div></div>)}</div><div className="mt-4 flex flex-wrap items-center gap-3"><Button onClick={runSearchPreview} disabled={task?.status === 'running'} className="bg-[#243f3b] text-[#f8f7f1] hover:bg-[#31534d]"><Search />{task?.status === 'running' ? '试搜中' : '试搜'}</Button><Button variant="outline" onClick={() => setShowSyntax((current) => !current)}>{showSyntax ? '收起检索语法' : '查看检索语法'}<ChevronDown className={cn('size-4 transition-transform', showSyntax && 'rotate-180')} /></Button></div>{showSyntax && <div className="mt-3 rounded-xl bg-[#edf1eb] p-4 text-xs leading-6 text-[#52645c]"><code>对象 AND 任务 AND 场景</code><br />这只是帮助理解的简化表达式，页面不会要求你手写复杂检索式。</div>}</Panel>
    <Panel title="相关度检查" icon={CircleHelp} status="教学模拟"><p className="mt-2 text-xs leading-5 text-[#747d78]">当前没有真实来源可展示。下面的三个位置只是教学用的判断练习，不是论文条目。</p><div className="mt-4 space-y-2">{resultLabels.map((label) => <div key={label} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#cfd4cc] bg-[#fbfbf8] p-3"><span className="flex items-center gap-2 text-sm text-[#68736f]"><span className="grid size-7 place-items-center rounded-lg bg-[#e9eee8] text-xs font-bold text-[#607b72]">?</span>{label} · 尚未收到真实结果</span><div className="flex gap-1.5">{(['相关', '部分相关', '不相关'] as const).map((value) => <button key={value} type="button" onClick={() => setDraft((current) => ({ ...current, searchFeedback: { ...current.searchFeedback, [label]: value } }))} className={cn('rounded-md border px-2 py-1 text-xs transition', draft.searchFeedback[label] === value ? 'border-[#607b72] bg-[#e1ebe1] text-[#38554b]' : 'border-[#deded7] text-[#7a827d] hover:bg-white')}>{value}</button>)}</div></div>)}</div>{task?.status === 'unavailable' && <InlineMessage kind="warning" message={feedback} />}</Panel>
  </StepFrame>;
}

function EvidenceStep({ task, setStep }: { task: ResearchTaskSnapshot | null; setStep: (step: TopicStep) => void }) { return <StepFrame title="文献证据、领域态势与研究空白" subtitle="把“我觉得值得研究”变成“我能指出依据在哪里”。" icon={BookOpen}><Panel title="已检索论文" icon={FileSearch} status="待核验"><EmptyState icon={Search} title="尚未收到真实检索结果" description={emptyResearchMessage} action={<Button variant="outline" onClick={() => setStep(2)}><ArrowLeft />返回策略与试搜</Button>} /></Panel><Panel title="核心文献" icon={BookOpen} status="待核验"><div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center"><div className="grid size-16 place-items-center rounded-2xl bg-[#e9eee8] text-[#607b72]"><LockKeyhole className="size-7" /></div><div><h3 className="font-semibold text-[#33423e]">核心文献库保持为空</h3><p className="mt-1 text-xs leading-5 text-[#747d78]">只有真实检索返回、来源可追溯的论文，才允许由用户逐篇加入。当前不会自动加入或生成论文。</p>{task && <span className="mt-2 inline-flex rounded-md border border-[#d9d8d1] px-2 py-1 text-xs text-[#7c8580]">任务状态：{task.status === 'unavailable' ? '工具未接入' : task.status}</span>}</div></div></Panel></StepFrame>; }

function CandidateStep({ selectedCandidate, setSelectedCandidate, feedback }: { selectedCandidate: string | null; setSelectedCandidate: (value: string | null) => void; feedback: string }) { const candidates = [['偏可行', '优先控制变量与资源成本'], ['偏创新', '优先探索新的问题切口'], ['较平衡', '在可验证与新意之间取平衡']] as const; return <StepFrame title="候选选题：三种方向取舍" subtitle="好的选题不是唯一答案，而是你在证据、资源和风险之间做出的选择。" icon={Target}><div className="mb-4 flex items-start gap-3 rounded-xl border border-[#e8d7bb] bg-[#fbf1e2] p-4 text-xs leading-5 text-[#775934]"><AlertTriangle className="mt-0.5 size-4 shrink-0" />当前候选内容等待真实文献分析，以下仅保留三个可比较的位置，不伪造课题、证据或研究空白。</div><div className="grid gap-4 lg:grid-cols-3">{candidates.map(([label, hint]) => <article key={label} className={cn('flex min-h-64 flex-col rounded-2xl border bg-[#fbfbf8] p-5 transition', selectedCandidate === label ? 'border-[#bc7d35] ring-2 ring-[#bc7d35]/15' : 'border-[#d9d8d1]')}><div className="flex items-center justify-between"><span className="rounded-md border border-[#d5d9d1] px-2 py-1 text-xs font-semibold text-[#53665e]">{label}</span>{selectedCandidate === label && <Check className="size-4 text-[#bc7d35]" />}</div><h3 className="mt-5 font-serif text-xl text-[#33423e]">等待真实分析</h3><p className="mt-2 text-sm leading-6 text-[#747d78]">{hint}。生成后这里会显示研究问题、推荐理由、资源、风险与关键证据。</p><div className="mt-auto pt-5"><Button variant={selectedCandidate === label ? 'default' : 'outline'} className={selectedCandidate === label ? 'bg-[#243f3b] text-white' : ''} onClick={() => setSelectedCandidate(label)}>选择此方向</Button></div></article>)}</div>{feedback && <InlineMessage kind="warning" message={feedback} />}</StepFrame>; }

function DeepenStep({ draft, handoff, deepened, setDeepened, setDraft, feedback }: { draft: TopicDraft; handoff: TopicHandoff; deepened: '原方案' | '进化版方案'; setDeepened: (value: '原方案' | '进化版方案') => void; setDraft: React.Dispatch<React.SetStateAction<TopicDraft>>; feedback: string }) { return <StepFrame title="选题深化与确认" subtitle="最后一次检查：这个方向是否适合你的资源、兴趣和下一步实验。" icon={FlaskConical}><Panel title="深化依据" icon={BookOpen} status="待核验"><EmptyState icon={Search} title="等待强相关文献" description="真实检索服务接入后，你可以逐篇选择文献作为深化依据。没有依据时，不把方案包装成确定结论。" /></Panel><Panel title="选题方案" icon={Lightbulb} status="待核验"><div className="flex flex-wrap gap-2"><Button size="sm" variant={deepened === '原方案' ? 'default' : 'outline'} onClick={() => setDeepened('原方案')}>保留原方案</Button><Button size="sm" variant={deepened === '进化版方案' ? 'default' : 'outline'} onClick={() => setDeepened('进化版方案')}>接受深化建议</Button></div><textarea aria-label="当前选题方案" value={draft.confirmedTopic ?? ''} onChange={(event) => setDraft((current) => ({ ...current, confirmedTopic: event.target.value }))} placeholder="在这里写下你最终想验证的问题。当前候选方向仅为待核验位置。" className="mt-4 min-h-28 w-full resize-y rounded-xl border border-[#d7d9d1] bg-[#fbfbf8] p-4 text-sm leading-6 outline-none focus:border-[#bc7d35]" /><p className="mt-2 text-xs text-[#89918d]">当前选择：{deepened} · 可编辑草稿，不代表已完成研究。</p></Panel><Panel title="交给下一模块的对象" icon={ArrowRight} status="待核验"><div className="space-y-2 text-xs leading-5 text-[#65706c]"><p><strong className="text-[#33423e]">实验模块：</strong>{handoff.next.experiment}</p><p><strong className="text-[#33423e]">写作模块：</strong>{handoff.next.writing}</p><p><strong className="text-[#33423e]">投稿模块：</strong>{handoff.next.submission}</p></div>{feedback && <InlineMessage kind="warning" message={feedback} />}</Panel></StepFrame>; }

function StepFrame({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof BookOpen; children: React.ReactNode }) { return <div><div className="mb-5 flex items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e3ebe3] text-[#456158]"><Icon className="size-5" /></div><div><h2 className="font-serif text-2xl text-[#243f3b]">{title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#747d78]">{subtitle}</p></div></div><div className="space-y-4">{children}</div></div>; }

function Panel({ title, icon: Icon, status, children }: { title: string; icon: typeof BookOpen; status?: keyof typeof statusStyles; children: React.ReactNode }) { return <section className="rounded-2xl border border-[#d9d8d1] bg-[#fffefa] p-5 shadow-[0_8px_30px_rgba(41,54,48,0.04)] sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-base font-semibold text-[#33423e]"><Icon className="size-4 text-[#9b672e]" />{title}</h3>{status && <span className={cn('rounded-md border px-2 py-1 text-[11px] font-semibold', statusStyles[status])}>{status}</span>}</div>{children}</section>; }

function GuidePanel({ step }: { step: TopicStep }) { const guides = [{ doing: '把兴趣变成可查证的问题', decide: '你真正想观察的对象和场景', help: '整理表达、发现范围缺口' }, { doing: '检查关键词是否找对方向', decide: '结果是否足够相关', help: '解释检索语法、记录判断' }, { doing: '决定哪些证据值得保留', decide: '哪些论文进入核心文献', help: '整理来源和状态，不替你判断' }, { doing: '比较三种资源与创新取舍', decide: '你愿意承担的风险', help: '展示依据、限制和候选差异' }, { doing: '修改并确认可继续验证的方案', decide: '是否把它交给实验模块', help: '生成交接对象，不直接执行实验' }][step - 1]; return <aside className="self-start rounded-2xl border border-[#d9d8d1] bg-[#e9eee8] p-5 xl:sticky xl:top-5"><div className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-[#456158] uppercase"><Info className="size-4" />这一步在做什么</div><p className="mt-3 font-serif text-xl leading-7 text-[#2d453d]">{guides.doing}</p><dl className="mt-6 space-y-4 text-xs leading-5"><div><dt className="font-semibold text-[#52645c]">你需要决定</dt><dd className="mt-1 text-[#74817a]">{guides.decide}</dd></div><div><dt className="font-semibold text-[#52645c]">智能体可以帮</dt><dd className="mt-1 text-[#74817a]">{guides.help}</dd></div><div className="border-t border-[#cbd7cc] pt-4"><dt className="font-semibold text-[#52645c]">当前边界</dt><dd className="mt-1 flex gap-2 text-[#74817a]"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" />不调用 CLI，不伪造论文，不把待核验建议当成结论。</dd></div></dl></aside>; }

function ActionBar({ step, setStep, next, canAdvance, feedback }: { step: TopicStep; setStep: (step: TopicStep) => void; next: () => void; canAdvance: boolean; feedback: string }) { return <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#d9d8d1] pt-5"><div className="flex items-center gap-2">{step > 1 && <Button variant="outline" onClick={() => setStep((step - 1) as TopicStep)}><ArrowLeft />上一步</Button>}{step === 1 && <span className="text-xs text-[#8a918d]">输入会保留在当前浏览会话中</span>}</div><div className="flex items-center gap-3"><span className={cn('text-xs', feedback ? 'text-[#a35f36]' : 'text-[#8a918d]')}>{feedback || (step === 5 ? '确认前请检查方案与依据状态' : `第 ${step} / 5 步`)}</span>{step < 5 ? <Button onClick={next} disabled={!canAdvance} className="bg-[#bc7d35] text-white hover:bg-[#a9692b]">下一步<ArrowRight /></Button> : <Button onClick={() => setStep(4)} disabled={!canAdvance} className="bg-[#243f3b] text-white hover:bg-[#31534d]"><Check />确认开题并进入实验</Button>}</div></div>; }

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof Search; title: string; description: string; action?: React.ReactNode }) { return <div className="mt-4 rounded-xl border border-dashed border-[#cfd4cc] bg-[#fbfbf8] p-8 text-center"><Icon className="mx-auto size-7 text-[#93a097]" /><h4 className="mt-3 text-sm font-semibold text-[#52645c]">{title}</h4><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#89918d]">{description}</p>{action && <div className="mt-4">{action}</div>}</div>; }

function InlineMessage({ kind, message }: { kind: 'error' | 'warning'; message: string }) { return <div className={cn('mt-3 flex items-start gap-2 rounded-lg p-3 text-xs leading-5', kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-[#fbf1e2] text-[#775934]')} role={kind === 'error' ? 'alert' : 'status'}><AlertTriangle className="mt-0.5 size-4 shrink-0" />{message}</div>; }
