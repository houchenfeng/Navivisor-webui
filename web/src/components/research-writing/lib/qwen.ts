import { threadsListTurnItems, threadsListTurns } from '@/generated/api/sdk.gen';
import type { WritingData } from '@/components/research-writing/data/writingSteps';
import { researchWorkflowClient } from '@/components/research-workflow/research-workflow-client';

export type WritingSection =
  | 'title-abstract'
  | 'intro'
  | 'related'
  | 'algorithm'
  | 'experiment'
  | 'discussion';

/** @deprecated Prefer WritingSection — kept for existing Step imports */
export type QwenSection = WritingSection;

const PROJECT_STORAGE_KEY = 'navivisor-writing-research-project-id';
const PROJECT_NAME = 'Navivisor Writing';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
    if (typeof record.error === 'string') return record.error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown Codex error';
  }
}

async function ensureWritingProjectId(): Promise<string> {
  const cached = localStorage.getItem(PROJECT_STORAGE_KEY)?.trim();
  if (cached) {
    try {
      const projects = await researchWorkflowClient.listProjects();
      if (projects.some((project) => project.projectId === cached)) return cached;
    } catch {
      // fall through and recreate
    }
  }

  const projects = await researchWorkflowClient.listProjects();
  const existing = projects.find((project) => project.name === PROJECT_NAME);
  if (existing) {
    localStorage.setItem(PROJECT_STORAGE_KEY, existing.projectId);
    return existing.projectId;
  }

  const created = await researchWorkflowClient.createProject(PROJECT_NAME);
  localStorage.setItem(PROJECT_STORAGE_KEY, created.projectId);
  return created.projectId;
}

function buildSectionInstructions(section: WritingSection, data: WritingData): string {
  const context = {
    topic: data.topic,
    experimentDetail: data.experimentDetail?.slice(0, 12000) ?? '',
    experimentResult: data.experimentResult?.slice(0, 12000) ?? '',
    bibContent: data.bibContent?.slice(0, 4000) ?? '',
    title: data.title,
    abstract: data.abstract,
    intro: data.intro,
    related: data.related,
    algorithm: data.algorithm,
    experiment: data.experiment,
    discussion: data.discussion,
    experimentTable: data.experimentTable,
  };

  const formatHint =
    section === 'title-abstract'
      ? 'Return ONLY a JSON object: {"title":"...","abstract":"..."}'
      : section === 'experiment'
        ? 'Return ONLY a JSON object: {"text":"...","table":{"headers":["Method","..."],"rows":[["...",...]]}}'
        : 'Return ONLY the English section body as plain text (no title heading, no surrounding JSON).';

  return [
    'ACTION: draft-section',
    `SECTION_ID: ${section}`,
    'Write English CVPR-style manuscript content for this section only.',
    'Ground claims in the provided WritingData snapshot. Do not invent citations, metrics, or datasets.',
    'Mark uncertain claims explicitly rather than fabricating evidence.',
    '',
    'DELIVERABLE FOR THE UI (highest priority):',
    formatHint,
    'Put that deliverable in your FINAL agent message with no preamble.',
    '',
    'ALSO write workflow files in the temporary output directory when possible:',
    '1) section-output.json containing the same deliverable (use {"text":"..."} for plain sections)',
    '2) result.json with schemaVersion=1, matching runId/stage from this prompt, status=completed,',
    '   outputs=[{path:"section-output.json",role:"paper-source",mediaType:"application/json",simulated:true}], warnings=[]',
    '',
    'WritingData snapshot (JSON):',
    JSON.stringify(context),
  ].join('\n');
}

async function extractTurnText(threadId: string, turnId: string): Promise<string> {
  const response = await threadsListTurnItems({
    path: { threadId, turnId },
    throwOnError: true,
  });
  const items = (response.data as { items?: Array<{ type?: string; text?: string; phase?: string | null }> })?.items ?? [];
  const messages = items.filter((item) => item.type === 'agentMessage' && typeof item.text === 'string' && item.text.trim());
  if (messages.length === 0) return '';
  const finalAnswer = [...messages].reverse().find((item) => item.phase === 'final_answer');
  return (finalAnswer ?? messages[messages.length - 1]).text!.trim();
}

async function waitForTurnText(
  threadId: string,
  turnId: string,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000;
  const intervalMs = options?.intervalMs ?? 2000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const turnsResponse = await threadsListTurns({
      path: { threadId },
      query: { limit: 20, sortDirection: 'desc', itemsView: 'summary' },
      throwOnError: true,
    });
    const turns = (turnsResponse.data as { data?: Array<{ id?: string; status?: string; error?: { message?: string } | null }> })?.data ?? [];
    const turn = turns.find((entry) => entry.id === turnId);

    if (turn?.status === 'failed' || turn?.status === 'interrupted') {
      throw new Error(turn.error?.message || `Codex turn ${turn.status}`);
    }

    if (turn?.status === 'completed') {
      const text = await extractTurnText(threadId, turnId);
      if (text) return text;
      return '';
    }

    // Turn may already have useful partial/final text before status flips.
    const early = await extractTurnText(threadId, turnId);
    if (early && turn?.status !== 'inProgress') return early;

    await sleep(intervalMs);
  }

  throw new Error('Timed out waiting for Codex turn');
}

async function extractArtifactText(projectId: string, runId: string): Promise<string> {
  const artifacts = await researchWorkflowClient.listArtifacts(projectId);
  const forRun = artifacts
    .filter((artifact) => artifact.runId === runId)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

  const preferred =
    forRun.find((artifact) => artifact.role === 'paper-source') ??
    forRun.find((artifact) => artifact.role === 'paper-metadata') ??
    forRun[0];

  if (!preferred) return '';
  const content = await researchWorkflowClient.getArtifactContent(projectId, preferred.artifactId);
  return content.trim();
}

function unwrapSectionPayload(raw: string, section: WritingSection): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Prefer fenced JSON / bare JSON when present.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1]?.trim() || trimmed;
  if (section === 'title-abstract' || section === 'experiment') {
    const match = candidate.match(/\{[\s\S]*\}/);
    if (match) return match[0];
  }

  if (candidate.startsWith('{')) {
    try {
      const parsed = JSON.parse(candidate) as { text?: unknown; content?: unknown };
      if (typeof parsed.text === 'string') return parsed.text;
      if (typeof parsed.content === 'string') return parsed.content;
    } catch {
      // keep raw text
    }
  }

  return candidate;
}

/**
 * Draft one writing section through Research Workflow → Codex (`research-writing` skill).
 * Prefers the Codex turn final message; falls back to finalized paper-source artifacts.
 */
export async function generateWritingSection(
  section: WritingSection,
  data: WritingData,
): Promise<string> {
  const projectId = await ensureWritingProjectId();
  const started = await researchWorkflowClient.startAgentRun({
    projectId,
    stage: 'writing.draft',
    mode: 'simulated',
    inputArtifactIds: [],
    instructions: buildSectionInstructions(section, data),
    effort: 'medium',
  });

  let turnText = '';
  let turnFailure: unknown;
  try {
    turnText = await waitForTurnText(started.threadId, started.turnId);
  } catch (error) {
    turnFailure = error;
    turnText = '';
  }

  if (turnText) return unwrapSectionPayload(turnText, section);

  const run = await researchWorkflowClient.waitForRun(projectId, started.runId, {
    timeoutMs: 60_000,
    intervalMs: 2000,
  });

  if (run.status === 'completed') {
    const artifactText = await extractArtifactText(projectId, started.runId);
    if (artifactText) return unwrapSectionPayload(artifactText, section);
  }

  if (run.status === 'needs_credentials' || run.status === 'unavailable') {
    throw new Error(`Codex 暂不可用（${run.status}）。请确认本机 Codex 已登录且后端已连接。`);
  }

  throw new Error(
    turnFailure
      ? `写作生成失败：${errorMessage(turnFailure)}`
      : `写作生成失败：Research run ${run.status}`,
  );
}

/** @deprecated Use generateWritingSection — kept so existing Step imports keep working */
export async function generateWithQwen(
  section: WritingSection,
  data: WritingData,
): Promise<string> {
  return generateWritingSection(section, data);
}

/**
 * Generate a paper figure through Research Workflow → Codex image capability.
 * Returns a data URL (or http/https/path string) usable by <img src>.
 */
export async function generateWritingFigure(
  prompt: string,
  kind: 'algorithmFlowImage' | 'algorithmIllustImage',
): Promise<string> {
  const projectId = await ensureWritingProjectId();
  const figureKey = kind === 'algorithmFlowImage' ? 'algorithm_flow' : 'algorithm_illustration';
  const started = await researchWorkflowClient.startAgentRun({
    projectId,
    stage: 'writing.draft',
    mode: 'simulated',
    inputArtifactIds: [],
    instructions: [
      'ACTION: generate-figure',
      `FIGURE_KEY: ${figureKey}`,
      'Use the account-provided image generation capability (prefer gpt-image-2 when available).',
      'Do not call HTTP model endpoints or invent an image without the tool.',
      'Save the PNG/WebP under the temporary output directory and declare it as paper-figure in result.json.',
      'Also mention the saved relative path in your final agent message.',
      '',
      'IMAGE PROMPT:',
      prompt,
    ].join('\n'),
    effort: 'medium',
  });

  const timeoutMs = 5 * 60 * 1000;
  const intervalMs = 2500;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const itemsResponse = await threadsListTurnItems({
      path: { threadId: started.threadId, turnId: started.turnId },
      throwOnError: true,
    });
    const items =
      (itemsResponse.data as {
        items?: Array<{
          type?: string;
          status?: string;
          result?: string;
          savedPath?: string;
          text?: string;
        }>;
      })?.items ?? [];

    const imageItem = [...items]
      .reverse()
      .find((item) => item.type === 'imageGeneration' && item.status === 'completed');
    if (imageItem) {
      if (imageItem.result?.startsWith('data:')) return imageItem.result;
      if (imageItem.result && /^https?:\/\//i.test(imageItem.result)) return imageItem.result;
      if (imageItem.savedPath) {
        // Prefer finalized artifact if present.
        break;
      }
      if (imageItem.result) {
        // Some runtimes return raw base64.
        return imageItem.result.startsWith('data:')
          ? imageItem.result
          : `data:image/png;base64,${imageItem.result}`;
      }
    }

    const turnsResponse = await threadsListTurns({
      path: { threadId: started.threadId },
      query: { limit: 20, sortDirection: 'desc', itemsView: 'summary' },
      throwOnError: true,
    });
    const turns =
      (turnsResponse.data as { data?: Array<{ id?: string; status?: string }> })?.data ?? [];
    const turn = turns.find((entry) => entry.id === started.turnId);
    if (turn?.status === 'failed' || turn?.status === 'interrupted') {
      throw new Error(`生图失败：Codex turn ${turn.status}`);
    }
    if (turn?.status === 'completed') break;
    await sleep(intervalMs);
  }

  const run = await researchWorkflowClient.waitForRun(projectId, started.runId, {
    timeoutMs: 30_000,
    intervalMs: 2000,
  });
  if (run.status === 'completed') {
    const artifacts = await researchWorkflowClient.listArtifacts(projectId);
    const figure = artifacts
      .filter((artifact) => artifact.runId === started.runId && artifact.role === 'paper-figure')
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
    if (figure) {
      const content = await researchWorkflowClient.getArtifactContent(projectId, figure.artifactId);
      // Binary streamed as text may be unusable; expose content API URL instead.
      if (content.startsWith('data:') || content.startsWith('http')) return content;
      return withApiArtifactUrl(projectId, figure.artifactId);
    }
  }

  if (run.status === 'needs_credentials' || run.status === 'unavailable') {
    throw new Error(`生图暂不可用（${run.status}）。请确认 Codex 账号具备图片生成能力。`);
  }

  throw new Error('生图失败：Codex 未返回可用图片。可改用本地上传。');
}

function withApiArtifactUrl(projectId: string, artifactId: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/api/research/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(artifactId)}/content`;
}
