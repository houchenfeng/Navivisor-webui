/**
 * Pure helpers and network calls for the topic workflow (T44).
 *
 * Parsing, sizing, draft persistence and the three poll loops live here so the
 * page component reads as orchestration rather than plumbing.
 */
import type { Dispatch, SetStateAction } from 'react';
import { getApiToken } from '@/auth-token';
import { findLatestByRole } from '@/components/research-workflow/use-research-project';
import { withBasePath } from '@/base-path';
import type { ResearchTaskSnapshot } from './topic-workflow-contract';

export const ACTIVE_RUN_KEY = 'navivisor:research-topic:active-run:v2';

export function formatArtifactSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return '大小未知';
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function parseCandidateTopics(value: unknown): NonNullable<ResearchTaskSnapshot['candidates']> {
  const raw = value && typeof value === 'object' && Array.isArray((value as { candidates?: unknown }).candidates) ? (value as { candidates: unknown[] }).candidates : [];
  const labels: Record<string, '偏可行' | '偏创新' | '较平衡'> = { feasible: '偏可行', innovative: '偏创新', balanced: '较平衡', '偏可行': '偏可行', '偏创新': '偏创新', '较平衡': '较平衡' };
  return raw.map((item) => {
    const candidate = item as Record<string, unknown>;
    const label = labels[String(candidate.profile ?? candidate.label ?? '')];
    if (!label || !String(candidate.title ?? '').trim()) return null;
    const researchDesign = String(candidate.researchDesign ?? '').trim()
      || (Array.isArray(candidate.methodSteps) ? candidate.methodSteps.map(String).join('；') : '');
    const expectedInnovation = String(candidate.expectedInnovation ?? '').trim()
      || (Array.isArray(candidate.innovations) ? candidate.innovations.map(String).join('；') : '');
    const rationale = String(candidate.rationale ?? '').trim()
      || (Array.isArray(candidate.evidencePaperTitles) ? `依据文献：${candidate.evidencePaperTitles.map(String).join('；')}` : '')
      || (Array.isArray(candidate.evidencePaperIds) ? `依据文献：${candidate.evidencePaperIds.map(String).join('、')}` : '');
    return { label, title: String(candidate.title), oneSentenceDefinition: String(candidate.question ?? '候选研究方向'), researchDesign, expectedInnovation, rationale };
  }).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
}

export function parseCoreLiterature(rows: string[][]): Array<{ title: string; openalexId: string; whyRelevant: string }> {
  const headers = rows[0]?.map((value) => value.trim().toLowerCase()) ?? [];
  const index = (name: string) => headers.indexOf(name);
  return rows.slice(1).map((row, offset) => ({ title: row[index('title')] || '无标题', openalexId: row[index('source_url')] || row[index('doi')] || `core-${offset + 1}`, whyRelevant: row[index('relevance_reason')] || row[index('method_relation')] || '核心文献条目，需打开来源进一步核验。' })).filter((paper) => paper.title !== '无标题');
}

export function findArtifactFile(artifacts: Parameters<typeof findLatestByRole>[0], stem: string, extension: string) {
  return artifacts.filter((artifact) => artifact.role === stem && artifact.path.toLowerCase().endsWith(extension)).sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
}

export function persistTopicDraft(key: string, interest: string, context: string) {
  window.sessionStorage.setItem(key, JSON.stringify({ interest, context }));
}


export function authorizationHeaders(): Record<string, string> { const token = getApiToken(); return token ? { Authorization: `Bearer ${token}` } : {}; }

export async function pollTask(runId: string, setTask: Dispatch<SetStateAction<ResearchTaskSnapshot | null>>) { for (let attempt = 0; attempt < 600; attempt += 1) { await new Promise((resolve) => window.setTimeout(resolve, 500)); const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(runId)}`), { headers: authorizationHeaders() }); if (!response.ok) throw new Error('无法读取检索任务状态，请重试。'); const snapshot = await response.json() as ResearchTaskSnapshot; setTask(snapshot); if (!['queued', 'running'].includes(snapshot.status)) return; } throw new Error('后台任务仍在运行，稍后可刷新页面恢复结果。'); }

export async function pollCandidates(runId: string, setTask: React.Dispatch<React.SetStateAction<ResearchTaskSnapshot | null>>) { for (let attempt = 0; attempt < 600; attempt += 1) { await new Promise((resolve) => window.setTimeout(resolve, 1000)); const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(runId)}`), { headers: authorizationHeaders() }); if (!response.ok) throw new Error('无法读取候选课题任务状态，请重试。'); const snapshot = await response.json() as ResearchTaskSnapshot; setTask(snapshot); if (!['queued', 'running'].includes(snapshot.candidateStatus ?? 'idle')) return; } throw new Error('后台任务仍在运行，稍后可刷新页面恢复候选课题。'); }

export function isStillRunningMessage(message: string): boolean { return message.startsWith('后台任务仍在运行'); }

export async function pollCore(runId: string, setTask: React.Dispatch<React.SetStateAction<ResearchTaskSnapshot | null>>) { for (let attempt = 0; attempt < 600; attempt += 1) { await new Promise((resolve) => window.setTimeout(resolve, 1000)); const response = await fetch(withBasePath(`/api/research/topic/tasks/${encodeURIComponent(runId)}`), { headers: authorizationHeaders() }); if (!response.ok) throw new Error('无法读取核心文献任务状态，请重试。'); const snapshot = await response.json() as ResearchTaskSnapshot; setTask(snapshot); if (!['queued', 'running'].includes(snapshot.coreStatus ?? 'idle')) return; } throw new Error('后台任务仍在运行，稍后可刷新页面恢复核心文献结果。'); }
