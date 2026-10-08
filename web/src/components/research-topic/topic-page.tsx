import { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { fetchArtifactText, findLatestByRole, parseCsvRows, useWorkspaceArtifacts } from '@/components/research-workflow/use-research-project';
import { useResearchProjectStore } from '@/stores/research-project-store';
import { withBasePath } from '@/base-path';
import { TopicPrimerDialog } from './topic-primer-dialog';
import { TopicProcessPanel } from './topic-process-panel';
import { CandidatesPage, CoreLiteraturePage, DirectionPage } from './topic-page-steps';
import {
  ACTIVE_RUN_KEY,
  authorizationHeaders,
  findArtifactFile,
  isStillRunningMessage,
  parseCandidateTopics,
  parseCoreLiterature,
  persistTopicDraft,
  pollCandidates,
  pollCore,
  pollTask,
} from './topic-page-utils';
import type { ResearchTaskSnapshot } from './topic-workflow-contract';

const steps = ['实验研究方向', '交叉研究候选课题选取', '核心参考文献'];

export function TopicPage() {
  const [page, setPage] = useState(1);
  const [interest, setInterest] = useState('');
  const [context, setContext] = useState('');
  const [task, setTask] = useState<ResearchTaskSnapshot | null>(null);
  const [error, setError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const { projectId, artifacts, loading: artifactsLoading } = useWorkspaceArtifacts();
  const projectEpoch = useResearchProjectStore((s) => s.projectEpoch);
  const activeRunKey = `${ACTIVE_RUN_KEY}:${projectId ?? 'unbound'}`;
  const draftKey = `navivisor:research-topic:draft:v1:${projectId ?? 'unbound'}`;

  // Keep the user's unfinished Step 1 draft across route changes/remounts.
  useEffect(() => {
    const raw = window.sessionStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { interest?: unknown; context?: unknown };
      if (typeof draft.interest === 'string') setInterest(draft.interest);
      if (typeof draft.context === 'string') setContext(draft.context);
    } catch {
      window.sessionStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  const updateInterest = (value: string) => {
    setInterest(value);
    persistTopicDraft(draftKey, value, context);
  };
  const updateContext = (value: string) => {
    setContext(value);
    persistTopicDraft(draftKey, interest, value);
  };
  useEffect(() => {
    if (projectId) return;
    setInterest('');
    setContext('');
    setTask(null);
    setSelectedCandidate(null);
    setPage(1);
    setError('');
  }, [projectId, projectEpoch]);
  useEffect(() => {
    // Workspace artifacts are the durable source of truth for imported runs.
    // An old browser-session run must not hide a complete imported workflow.
    if (artifactsLoading || findLatestByRole(artifacts, 'candidate-papers')) return;
    const runId = window.sessionStorage.getItem(activeRunKey);
    if (!runId) return;
    let cancelled = false;
    const restore = async () => {
      try {
        const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(runId)}`), { headers: authorizationHeaders() });
        if (!response.ok) { window.sessionStorage.removeItem(activeRunKey); return; }
        const snapshot = await response.json() as ResearchTaskSnapshot;
        if (cancelled) return;
        if (snapshot.researchInterest) setInterest(snapshot.researchInterest);
        if (snapshot.researchContext) setContext(snapshot.researchContext);
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
  }, [activeRunKey, artifacts, artifactsLoading]);

  useEffect(() => {
    if (!projectId || artifactsLoading) return;
    let cancelled = false;
    void (async () => {
      try {
        const intake = findLatestByRole(artifacts, 'project-intake');
        if (intake) {
          const value = JSON.parse(await fetchArtifactText(projectId, intake.artifactId)) as {
            researchDirection?: string;
            researchGoal?: string;
            researchInterest?: string;
            context?: string;
          };
          if (!cancelled) {
            const restoredInterest = value.researchDirection?.trim() || value.researchInterest?.trim() || '';
            const restoredContext = value.researchGoal?.trim() || value.context?.trim() || '';
            if (restoredInterest) setInterest(restoredInterest);
            if (restoredContext) setContext(restoredContext);
            if (restoredInterest || restoredContext) persistTopicDraft(draftKey, restoredInterest, restoredContext);
          }
        }
        const candidates = findLatestByRole(artifacts, 'candidate-papers');
        if (candidates) {
          const rows = parseCsvRows(await fetchArtifactText(projectId, candidates.artifactId));
          const headers = rows[0]?.map((value) => value.trim().toLowerCase()) ?? [];
          const index = (...names: string[]) => names.map((name) => headers.indexOf(name)).find((value) => value >= 0) ?? -1;
          const cell = (row: string[], ...names: string[]) => {
            const column = index(...names);
            return column >= 0 ? row[column] || '' : '';
          };
          const papers = rows.slice(1).map((row, offset) => ({
            openalexId: cell(row, 'paper_id', 'openalexid', 'openalex_id') || `workspace-${offset + 1}`,
            title: cell(row, 'title') || '无标题',
            authors: cell(row, 'authors').split(/[;|]/).map((value) => value.trim()).filter(Boolean),
            institutions: [], source: cell(row, 'source') || 'workspace-artifact',
            publicationYear: Number(cell(row, 'year', 'publicationyear', 'publication_year')) || null,
            citedByCount: Number(cell(row, 'citation_count', 'citedbycount', 'cited_by_count')) || 0,
            abstract: cell(row, 'abstract'), doi: cell(row, 'doi'),
            landingUrl: cell(row, 'source_url', 'landingurl', 'landing_url') || '', sourceStatus: 'openalex_public_api' as const,
          }));
          const topicsArtifact = findArtifactFile(artifacts, 'candidate-topics', '.json');
          const confirmedArtifact = findArtifactFile(artifacts, 'confirmed-topic', '.json');
          const coreArtifact = findArtifactFile(artifacts, 'core-references', '.csv');
          const topicsValue = topicsArtifact ? JSON.parse(await fetchArtifactText(projectId, topicsArtifact.artifactId)) as { simulated?: boolean; candidates?: unknown[] } : undefined;
          const topics = topicsValue ? parseCandidateTopics(topicsValue) : [];
          const confirmed = confirmedArtifact ? JSON.parse(await fetchArtifactText(projectId, confirmedArtifact.artifactId)) as { title?: string } : undefined;
          const coreLiterature = coreArtifact ? parseCoreLiterature(parseCsvRows(await fetchArtifactText(projectId, coreArtifact.artifactId))) : [];
          // Imported runs are valid workflow inputs too.  Do not require users to
          // repeat a network search merely because the data was not created by the
          // this browser session.
          const candidatesReady = topics.length === 3;
          const coreReady = coreLiterature.length > 0;
          const pdfDownloaded = artifacts.filter((artifact) => artifact.role === 'literature-pdf').length;
          if (!cancelled && papers.length) {
            setTask({
              runId: 'workspace-import', stage: 'first-search', status: 'completed',
              files: [{ name: candidates.name, path: candidates.path, kind: 'csv' }], errors: [], papers,
              counts: { papers: papers.length, previewed: Math.min(papers.length, 20), deduplicated: papers.length, returned: papers.length, requested: papers.length, targetReached: true },
              candidateStatus: candidatesReady ? 'completed' : 'idle',
              candidates: candidatesReady ? topics : undefined,
              coreStatus: coreReady ? 'completed' : 'idle',
              coreManifest: coreReady ? { status: 'completed', files: ['references.csv', 'references.bib'], counts: { references: coreLiterature.length, pdfDownloaded } } : undefined,
            });
            setPage(coreReady ? 3 : candidatesReady ? 2 : 1);
          }
          if (!cancelled && topics.length === 3) {
            const selected = confirmed?.title ? topics.find((candidate) => candidate.title === confirmed.title) : topics[0];
            if (selected) setSelectedCandidate(selected.label);
          }
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : String(requestError));
      }
    })();
    return () => { cancelled = true; };
  }, [activeRunKey, artifacts, artifactsLoading, projectId]);

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
      window.sessionStorage.setItem(activeRunKey, started.runId);
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
      window.sessionStorage.setItem(activeRunKey, started.runId);
      setTask(started);
      await pollCandidates(started.runId, setTask);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '网络错误，请稍后重试。';
      setError(message);
      if (!isStillRunningMessage(message)) setTask((current) => current ? { ...current, candidateStatus: 'failed', candidateError: message } : current);
    }
  };

  const startCoreLiterature = async () => {
    if (!task || !selectedCandidate || task.coreStatus === 'completed' || task.coreStatus === 'partial') { setPage(3); return; }
    setPage(3); setError('');
    try {
      const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(task.runId)}/core-literature`), { method: 'POST', headers: { 'Content-Type': 'application/json', ...authorizationHeaders() }, body: JSON.stringify({ label: selectedCandidate, projectId }) });
      if (!response.ok) throw new Error('核心文献检索任务创建失败，请稍后重试。');
      const started = await response.json() as ResearchTaskSnapshot; window.sessionStorage.setItem(activeRunKey, started.runId); setTask(started); await pollCore(started.runId, setTask);
    } catch (requestError) { const message = requestError instanceof Error ? requestError.message : '核心文献检索失败，请稍后重试。'; setError(message); }
  };

  const isRunning = task?.status === 'queued' || task?.status === 'running';
  const isComplete = task?.status === 'completed';

  return <main className="min-h-0 flex-1 overflow-auto bg-[linear-gradient(108deg,#f5f6f5_0%,#e5f0fd_51%,#bfdcff_100%)] text-[#19386f]">
    <div className="mx-auto min-h-full w-full max-w-[1500px] px-5 py-7 sm:px-8 lg:px-12">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#315a98]"><span className="grid size-8 place-items-center rounded-xl bg-white/80 text-[#1f4dcb]"><Sparkles className="size-4" /></span>启航 · 开题阶段</div><h1 className="text-3xl font-black tracking-[-0.04em] text-[#102f72] sm:text-4xl">开题智能体</h1><p className="mt-2 text-sm font-semibold leading-6 text-[#617da9]">输入感兴趣的模糊的研究领域，先用公开文献确认现有研究态势，寻找最可行课题。</p></div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#ddecff] px-3.5 py-2 text-xs font-black text-[#2670d1] shadow-sm"><span className={`size-2 rounded-full ${isRunning ? 'animate-pulse bg-[#1f4dcb]' : 'bg-[#4c83d0]'}`} />{isRunning ? '检索中' : 'OpenAlex · 公开试检索'}</span>
      </header>

      <nav aria-label="开题三步进度" className="mt-8 grid grid-cols-1 gap-2 rounded-2xl bg-white p-2 shadow-[0_12px_32px_rgba(38,90,167,0.12)] sm:grid-cols-3">
        {steps.map((label, index) => {
          const number = index + 1;
          const active = page === number;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setPage(number)}
              aria-current={active ? 'step' : undefined}
              className={`flex min-w-0 items-center gap-3 rounded-xl px-4 py-3 text-left transition sm:justify-center ${active ? 'bg-[#1f4dcb] text-white shadow-[0_7px_15px_rgba(31,77,203,0.2)]' : 'text-[#7890b6] hover:bg-[#f3f8ff]'}`}
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-black ${active ? 'bg-white/20' : 'bg-[#eef4fc] text-[#7187aa]'}`}>
                {number < page ? <Check className="size-4" /> : number}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{label}</span>
                <span className={`block text-[11px] font-bold ${active ? 'text-blue-100' : 'text-[#9aafd0]'}`}>
                  {active ? '当前查看' : '可查看'}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {page === 1 && <><div className="mt-5 flex flex-wrap items-start justify-end gap-2"><TopicPrimerDialog /></div><DirectionPage interest={interest} setInterest={updateInterest} context={context} setContext={updateContext} task={task} error={error} isRunning={isRunning} isComplete={isComplete} onRun={runSearch} onCancel={cancelSearch} onRetry={runSearch} onNext={() => setPage(2)} /></>}
      {page === 2 && <CandidatesPage task={task} selectedCandidate={selectedCandidate} setSelectedCandidate={setSelectedCandidate} error={error} onGenerate={generateCandidates} onBack={() => setPage(1)} onNext={startCoreLiterature} />}
      {page === 3 && (<CoreLiteraturePage task={task} artifacts={artifacts} projectId={projectId} error={error} onStart={startCoreLiterature} onBack={() => setPage(2)} />)}

      {/*
        The process panel renders every stage card. It only appears once a run
        exists, because before that every card would be an empty state.
      */}
      {task ? (
        <TopicProcessPanel
          stages={task.stages}
          warnings={task.warnings}
          candidates={task.candidates ?? null}
          selectedCandidateLabel={selectedCandidate}
          onSelectCandidate={(candidate) => setSelectedCandidate(candidate.label)}
        />
      ) : null}
    </div>
  </main>;
}
