/**
 * The step screens of the topic workflow (T44).
 *
 * Split out of topic-page.tsx, which had grown to 48 KB. Each screen is a leaf:
 * it takes its state and callbacks as props and owns no fetching, so the page
 * above stays the single place where a run is started and polled.
 */
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileSearch,
  FlaskConical,
  LoaderCircle,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  fetchArtifactText,
  findLatestByRole,
  useWorkspaceArtifacts,
} from '@/components/research-workflow/use-research-project';
import { ArtifactPreviewDialog } from '@/components/research-workflow/artifact-preview-dialog';
import type { ResearchArtifact } from '@/components/research-workflow/research-workflow-types';
import { withBasePath } from '@/base-path';
import { buildOpenAlexQueryPlan } from './openalex-query';
import { State } from './topic-page-primitives';
import {
  ACTIVE_RUN_KEY,
  authorizationHeaders,
  formatArtifactSize,
} from './topic-page-utils';
import type { ResearchTaskSnapshot } from './topic-workflow-contract';

export function DirectionPage({ interest, setInterest, context, setContext, task, error, isRunning, isComplete, onRun, onCancel, onRetry, onNext }: { interest: string; setInterest: (value: string) => void; context: string; setContext: (value: string) => void; task: ResearchTaskSnapshot | null; error: string; isRunning: boolean; isComplete: boolean; onRun: () => Promise<void>; onCancel: () => Promise<void>; onRetry: () => Promise<void>; onNext: () => void }) {
  return <section className="mt-7 flex min-h-0 flex-col gap-6">
    <section className="rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">Step 01</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">实验研究方向</h2></div><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e7f0ff] text-[#1f4dcb]"><BookOpen className="size-5" /></div></div><p className="mt-4 text-sm font-semibold leading-6 text-[#617da9]">输入你的研究方向或模糊的研究领域，AI将会辅助你选取最合适的课题。</p><label className="mt-7 block text-sm font-black text-[#294d80]" htmlFor="research-interest">研究方向 <span className="font-normal text-[#7892b7]">（必填）</span></label><textarea id="research-interest" value={interest} onChange={(event) => setInterest(event.target.value)} placeholder="例如：三维重建、语义分割、视频异常检测" maxLength={2000} className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-[#c8dcfb] bg-[#f7fbff] p-4 text-sm font-semibold leading-6 text-[#263d65] outline-none placeholder:text-[#91a7c8] focus:border-[#1f4dcb] focus:ring-4 focus:ring-[#1f4dcb]/10" /><div className="mt-5 flex items-center justify-between gap-3"><label className="text-sm font-black text-[#294d80]" htmlFor="research-context">研究目标或上下文 <span className="font-normal text-[#7892b7]">（可选）</span></label><span className="text-xs font-semibold text-[#8aa1c1]">帮助缩小范围</span></div><textarea id="research-context" value={context} onChange={(event) => setContext(event.target.value)} placeholder="例如：和大模型结合、做遥感场景的语义分割" maxLength={4000} className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-[#c8dcfb] bg-[#f7fbff] p-4 text-sm font-semibold leading-6 text-[#263d65] outline-none placeholder:text-[#91a7c8] focus:border-[#1f4dcb] focus:ring-4 focus:ring-[#1f4dcb]/10" /><div className="mt-6 flex flex-wrap items-center gap-3"><Button onClick={isRunning ? onCancel : onRun} className="rounded-xl bg-[#1f4dcb] px-5 font-black text-white shadow-[0_7px_16px_rgba(31,77,203,0.22)] hover:bg-[#11357f]">{isRunning ? <><X />取消检索</> : <><Search />开始试检索</>}</Button></div>{(isRunning || Boolean(task)) && <OpenAlexQueryCard query={interest.trim()} context={context.trim()} isRunning={isRunning} />}{error && <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#fff1f1] p-3 text-xs font-semibold leading-5 text-[#b64d57]" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}</section>
    <ResultsCard task={task} isRunning={isRunning} isComplete={isComplete} onRetry={onRetry} />
     <div className="xl:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 px-5 py-4 text-xs font-semibold text-[#55749f]"><span>{isComplete ? '试检索完成；下一步将基于文献生成三个候选课题。' : '可先查看下一步。生成候选课题前，请先填写研究方向并完成试检索。'}</span><Button variant="outline" onClick={onNext} className="rounded-xl border-[#9bbce8] bg-white/60 font-black text-[#1f4dcb]">进入候选课题步骤<ArrowRight /></Button></div>
  </section>;
}

export function OpenAlexQueryCard({ query, context, isRunning }: { query: string; context: string; isRunning: boolean }) {
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

export function ResultsCard({ task, isRunning, isComplete, onRetry }: { task: ResearchTaskSnapshot | null; isRunning: boolean; isComplete: boolean; onRetry: () => Promise<void> }) { const papers = task?.papers ?? []; const counts = task?.counts; const insufficient = isComplete && counts?.targetReached === false; return <section className="min-w-0 rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">OpenAlex trial search</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">试检索结果</h2></div><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e7f0ff] text-[#1f4dcb]"><FileSearch className="size-5" /></div></div><p className="mt-4 text-sm font-semibold leading-6 text-[#617da9]">这里只展示前 20 条公开元数据和摘要节选。</p>{isRunning ? <div className="mt-7 rounded-2xl border border-[#c9dcf7] bg-[#f5f9ff] p-6" role="status"><div className="flex items-center gap-3 text-sm font-black text-[#285c9f]"><LoaderCircle className="size-5 animate-spin" />正在从 OpenAlex 获取公开资料</div><p className="mt-3 text-xs font-semibold leading-5 text-[#7089ac]">任务已提交，正在按目标数量分页获取并去重。你可以取消本次检索。</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dfebfb]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#1f4dcb]" /></div></div> : task?.status === 'failed' ? <State icon={AlertCircle} title="这次试检索没有完成" description={task.errors[0]?.message ?? '公开资料服务暂时不可用，请稍后重试。'} action={<Button variant="outline" onClick={onRetry} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><RotateCcw />重新试检索</Button>} /> : isComplete && papers.length === 0 ? <State icon={Search} title="没有返回可展示的论文" description="OpenAlex 已完成本次试检索，但没有符合条件的记录。可以修改左侧描述后重试。" action={<Button variant="outline" onClick={onRetry} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><RotateCcw />重新试检索</Button>} /> : papers.length === 0 ? <State icon={Search} title="等待你的研究兴趣" description="输入研究方向后，点击“开始试检索”。结果会显示在这里。" /> : <div className="mt-7 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#eef5ff] px-4 py-3 text-xs font-bold text-[#55749f]"><span>已去重 {counts?.deduplicated ?? counts?.papers ?? papers.length} 条 · 已获取原始记录 {counts?.returned ?? '—'} 条 · 目标 {counts?.requested ?? '300'} 条</span><span className="text-[#4775b2]">来源：OpenAlex 公共 API · 预览 {counts?.previewed ?? papers.length} 条</span></div>{insufficient && <div className="rounded-xl border border-[#f0d6a5] bg-[#fff8e9] px-4 py-3 text-xs font-bold leading-5 text-[#8b641e]" role="status">结果不足：实际去重后仅 {counts?.deduplicated ?? papers.length} 条，不能按 {counts?.requested ?? 300} 条目标完成。没有填充或伪造论文。</div>}{papers.map((paper) => <article key={paper.openalexId} className="rounded-2xl border border-[#d8e5f6] bg-[#fbfdff] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 flex-1 text-sm font-black leading-6 text-[#244a7d]">{paper.title || '无标题'}</h3><span className="rounded-lg bg-[#e6f0ff] px-2 py-1 text-[11px] font-black text-[#3b6fae]">OpenAlex · 待核验</span></div><p className="mt-2 text-xs font-semibold leading-5 text-[#6c84a5]">{paper.publicationYear ?? '年份未知'} · {paper.authors.slice(0, 4).join('、') || '作者信息缺失'}{paper.authors.length > 4 ? ' 等' : ''} · {paper.source || '来源信息缺失'}{paper.citedByCount > 0 ? ` · 被引 ${paper.citedByCount}` : ''}</p><p className="mt-3 text-xs font-semibold leading-5 text-[#526e98]">{paper.abstract ? `${paper.abstract.slice(0, 320)}${paper.abstract.length > 320 ? '…' : ''}` : '暂无摘要'}</p><div className="mt-3 flex flex-wrap gap-4 text-xs font-black"><a href={paper.doi || paper.landingUrl || paper.openalexId} target="_blank" rel="noreferrer" className="text-[#1f4dcb] underline underline-offset-2">{paper.doi ? '打开 DOI' : '打开 OpenAlex 来源'}</a>{paper.doi && <a href={paper.landingUrl || paper.openalexId} target="_blank" rel="noreferrer" className="text-[#5b7fae] underline underline-offset-2">打开 OpenAlex 来源</a>}</div></article>)}</div>}</section>; }

export function CandidatesPage({ task, selectedCandidate, setSelectedCandidate, error, onGenerate, onBack, onNext }: { task: ResearchTaskSnapshot | null; selectedCandidate: string | null; setSelectedCandidate: (value: string | null) => void; error: string; onGenerate: () => Promise<void>; onBack: () => void; onNext: () => Promise<void> }) {
  const candidates = task?.candidates ?? [];
  const running = task?.candidateStatus === 'queued' || task?.candidateStatus === 'running';
  const complete = task?.candidateStatus === 'completed' && candidates.length === 3;
  const labelClass: Record<string, string> = { '偏可行': 'bg-[#e8f7ed] text-[#24704a]', '偏创新': 'bg-[#fff0dd] text-[#9a5c19]', '较平衡': 'bg-[#eeeaff] text-[#5f4aa4]' };
  return <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-10"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">Step 02</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">交叉研究候选课题选取</h2><p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#617da9]">AI 会读取研究领域的文献，梳理热点、竞争较激烈的方向、长期常青的主题以及研究空白，然后生成三个可选课题。请选择最中意的一个。</p></div><div className="rounded-2xl bg-[#edf4ff] px-4 py-3 text-xs font-black text-[#315a98]">输入：{task?.counts?.deduplicated ?? 0} 条文献</div></div>{!task || task.status !== 'completed' ? <State icon={FileSearch} title="还没有试检索结果" description="请先在第一步填写研究方向，并点击「开始试检索」。有文献结果后，这里才能生成三个候选课题。" /> : !complete && !running && <div className="mt-8 rounded-2xl border border-dashed border-[#b9d0ef] bg-[#f7faff] p-9 text-center"><Sparkles className="mx-auto size-8 text-[#6594ce]" /><h3 className="mt-4 text-sm font-black text-[#315a98]">准备好比较三个方向了吗？</h3><p className="mx-auto mt-2 max-w-xl text-xs font-semibold leading-5 text-[#7189aa]">会实际调用本机 Codex CLI 读取 CSV；没有合适证据时，结果会标记待核验，不会自动补齐。</p><Button onClick={onGenerate} className="mt-5 rounded-xl bg-[#1f4dcb] font-black text-white hover:bg-[#11357f]"><Sparkles />用全部检索结果生成三个课题</Button></div>}{running && <div className="mt-8 rounded-2xl border border-[#c9dcf7] bg-[#f5f9ff] p-7" role="status"><div className="flex items-center gap-3 text-sm font-black text-[#285c9f]"><LoaderCircle className="size-5 animate-spin" />Codex CLI 正在阅读文献并生成候选课题</div><p className="mt-3 text-xs font-semibold leading-5 text-[#7089ac]">后端只允许 CLI 读取本地检索 CSV，完成后会校验 JSON 是否恰好包含三类课题。</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dfebfb]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#1f4dcb]" /></div></div>}{task?.candidateStatus === 'failed' && <State icon={AlertCircle} title="候选课题没有生成" description={task.candidateError ?? 'Codex CLI 输出无法使用，请重试。'} action={<Button variant="outline" onClick={onGenerate} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><RotateCcw />重试生成</Button>} />}{complete && <div className="mt-8 grid gap-4 lg:grid-cols-3">{candidates.map((candidate) => <article key={candidate.label} className={`rounded-2xl border p-5 transition ${selectedCandidate === candidate.label ? 'border-[#1f4dcb] bg-[#f4f8ff] shadow-[0_10px_24px_rgba(31,77,203,0.13)]' : 'border-[#d8e5f6] bg-[#fbfdff]'}`}><div className="flex items-start justify-between gap-3"><span className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${labelClass[candidate.label]}`}>{candidate.label}</span><button type="button" onClick={() => setSelectedCandidate(selectedCandidate === candidate.label ? null : candidate.label)} className="text-xs font-black text-[#1f4dcb] underline underline-offset-4">{selectedCandidate === candidate.label ? '已选择' : '选择此题'}</button></div><h3 className="mt-4 text-base font-black leading-6 text-[#244a7d]">{candidate.title}</h3><Info label="一句话定义" value={candidate.oneSentenceDefinition} /><Info label="研究设计与技术路线" value={candidate.researchDesign} /><Info label="预期创新性与价值" value={candidate.expectedInnovation} /><Info label="立论依据" value={candidate.rationale} /></article>)}</div>}{error && <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#fff1f1] p-3 text-xs font-semibold leading-5 text-[#b64d57]" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}<div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3ecf8] pt-5"><Button variant="outline" onClick={onBack} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><ArrowLeft />返回上一步</Button><Button disabled={!selectedCandidate} onClick={onNext} className="rounded-xl bg-[#1f4dcb] font-black text-white disabled:opacity-50">继续核心文献分析<ArrowRight /></Button></div></section>;
}

export function CoreLiteraturePage({ task, artifacts, projectId, error, onStart, onBack }: { task: ResearchTaskSnapshot | null; artifacts: ResearchArtifact[]; projectId: string | null; error: string; onStart: () => Promise<void>; onBack: () => void }) { const status = task?.coreStatus ?? 'idle'; const manifest = task?.coreManifest; const files = Array.isArray(manifest?.files) ? manifest.files as string[] : []; const counts = manifest?.counts as Record<string, unknown> | undefined; const running = status === 'queued' || status === 'running'; const imported = task?.runId === 'workspace-import'; const [selectedArtifact, setSelectedArtifact] = useState<ResearchArtifact | null>(null); const visibleArtifacts = artifacts.filter((artifact) => /(^|\/)topic\//i.test(artifact.path) || /core|literature|reference|download|handoff|\.pdf$/i.test(`${artifact.role}/${artifact.path}`)); return <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-10"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e7f0ff] text-[#1f4dcb]"><FlaskConical className="size-6" /></div><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">Step 03</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">核心参考文献</h2><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#617da9]">确定课题后，AI 会查找最相关的参考文献及可获取的全文。这些文献可用于开题报告里的相关工作，也是实验方案的主要来源。</p></div></div>{imported && <div className="mt-6 rounded-2xl border border-[#b9d0ef] bg-[#f5f9ff] px-4 py-3 text-xs font-semibold leading-5 text-[#55749f]">这是已导入的历史结果：系统不会强制重新检索。请在使用前核对文献是否与当前研究方向匹配。</div>}{status === 'idle' && (task?.status !== 'completed' ? <State icon={FileSearch} title="还没有试检索结果" description="请先在第一步填写研究方向，并点击「开始试检索」。选定课题后，这里才会检索核心文献。" /> : <State icon={FlaskConical} title="已选择课题，准备开始深度检索" description="点击开始后，系统会按核心文献 Skill 契约生成 references.csv、references.bib、PDF 下载报告和交接说明。" action={<Button onClick={onStart} className="rounded-xl bg-[#1f4dcb] font-black text-white">开始核心文献检索<Search /></Button>} />)}{running && <div className="mt-8 rounded-2xl border border-[#c9dcf7] bg-[#f5f9ff] p-7" role="status"><div className="flex items-center gap-3 text-sm font-black text-[#285c9f]"><LoaderCircle className="size-5 animate-spin" />核心文献任务正在运行</div><p className="mt-3 text-xs font-semibold leading-5 text-[#7089ac]">任务已落盘，刷新页面后会自动恢复。</p></div>}{status === 'failed' && <State icon={AlertCircle} title="核心文献检索失败" description={task?.coreError ?? error ?? '请重试。'} action={<Button variant="outline" onClick={onStart} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><RotateCcw />重试</Button>} />}{(status === 'completed' || status === 'partial') && <div className="mt-8 space-y-4"><div className="rounded-2xl border border-[#b9d0ef] bg-[#f5f9ff] p-5 text-sm font-bold text-[#315a98]">核心文献：{String(counts?.references ?? '—')} 篇 · 有效 OA PDF：{String(counts?.pdfDownloaded ?? 0)} 篇 · 状态：{status === 'partial' ? '部分完成，按实际数量交接' : '已完成'}</div><div className="grid gap-3 sm:grid-cols-2">{(visibleArtifacts.length ? visibleArtifacts : files.map((file) => ({ artifactId: file, name: file, path: file, role: 'output', mediaType: '', size: 0, simulated: false } as ResearchArtifact))).map((artifact) => <button type="button" key={artifact.artifactId} onClick={() => setSelectedArtifact(artifact)} className="rounded-xl border border-[#d8e5f6] bg-[#fbfdff] px-4 py-3 text-left transition hover:border-[#8eb1e6] hover:bg-[#f3f8ff]"><span className="block text-xs font-black text-[#315a98]">{artifact.name}</span><span className="mt-1 block text-[11px] font-semibold text-[#7892b7]">{artifact.path} · {formatArtifactSize(artifact.size)} · 点击查看或下载</span></button>)}</div><p className="text-xs font-semibold leading-5 text-[#7189aa]">PDF 下载遵守公开 OA 域名白名单；未获取的 PDF 会保留具体失败状态，不会伪造文件。</p></div>}{error && <div className="mt-5 rounded-xl bg-[#fff1f1] p-3 text-xs font-semibold text-[#b64d57]" role="alert">{error}</div>}{selectedArtifact && projectId && <ArtifactPreviewDialog projectId={projectId} artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} />}<div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3ecf8] pt-5"><Button variant="outline" onClick={onBack} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><ArrowLeft />返回候选课题</Button><GoToExperimentButton /></div></section>; }

export function GoToExperimentButton() {
  const navigate = useNavigate();
  const { projectId, artifacts, loading: artifactsLoading } = useWorkspaceArtifacts();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const handleClick = async () => {
    if (!projectId || artifactsLoading) return;
    let runId = window.sessionStorage.getItem(`${ACTIVE_RUN_KEY}:${projectId}`);
    // Older opening runs may have lost the sessionStorage pointer. Recover the
    // run id from the persisted candidate-state artifact before navigating.
    if (!runId || !/^[0-9a-f-]{36}$/i.test(runId)) {
      const stateArtifact = findLatestByRole(artifacts, 'project-intake');
      if (stateArtifact) {
        try {
          const raw = await fetchArtifactText(projectId, stateArtifact.artifactId);
          const parsed = JSON.parse(raw) as { runId?: unknown; coreStatus?: unknown };
          if (typeof parsed.runId === 'string' && /^[0-9a-f-]{36}$/i.test(parsed.runId)) {
            runId = parsed.runId;
            window.sessionStorage.setItem(`${ACTIVE_RUN_KEY}:${projectId}`, runId);
          }
        } catch {
          // Fall through to the normal direct navigation when no task can be recovered.
        }
      }
    }
    if (!runId || !/^[0-9a-f-]{36}$/i.test(runId)) {
      await navigate({ to: '/research/experiment' });
      return;
    }
    setImporting(true);
    setImportError('');
    try {
      const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(runId)}/import`), { method: 'POST', headers: { 'Content-Type': 'application/json', ...authorizationHeaders() }, body: JSON.stringify({ projectId }) });
      if (!response.ok) throw new Error(response.status === 400 ? '核心文献任务尚未完成，暂时无法导入。' : '核心文献导入失败，请稍后重试。');
      await response.json();
      await navigate({ to: '/research/experiment' });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '核心文献导入失败，请稍后重试。');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button disabled={importing} onClick={() => void handleClick()} className="rounded-xl bg-[#1f4dcb] font-black text-white hover:bg-[#11357f]">
        {importing ? '正在导入开题数据…' : '导入开题数据并进入实验'}
        <ArrowRight />
      </Button>
      {importError && <p className="max-w-sm text-right text-xs font-semibold text-[#b64d57]" role="alert">{importError}</p>}
    </div>
  );
}

export function Info({ label, value }: { label: string; value: string }) { return <div className="mt-4"><p className="text-[11px] font-black tracking-wide text-[#6b89b3]">{label}</p><p className="mt-1 text-xs font-semibold leading-5 text-[#526e98]">{value}</p></div>; }

export function FuturePage({ number, title, icon: Icon, description, detail, onBack }: { number: string; title: string; icon: typeof Sparkles; description: string; detail: string; onBack: () => void }) { return <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_15px_40px_rgba(42,83,143,0.14)] sm:p-10"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e7f0ff] text-[#1f4dcb]"><Icon className="size-6" /></div><div><p className="text-xs font-black tracking-[0.16em] text-[#5f85b8] uppercase">Step {number} · 待接入</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#183b70]">{title}</h2><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#617da9]">{description}</p></div></div><div className="mt-8 rounded-2xl border border-dashed border-[#b9d0ef] bg-[#f7faff] p-8 text-center"><Icon className="mx-auto size-8 text-[#6594ce]" /><h3 className="mt-4 text-sm font-black text-[#315a98]">当前功能尚未接入</h3><p className="mx-auto mt-2 max-w-xl text-xs font-semibold leading-5 text-[#7189aa]">{detail}</p></div><div className="mt-7 border-t border-[#e3ecf8] pt-5"><Button variant="outline" onClick={onBack} className="rounded-xl border-[#9bbce8] font-black text-[#1f4dcb]"><ArrowLeft />返回上一步</Button></div></section>; }
