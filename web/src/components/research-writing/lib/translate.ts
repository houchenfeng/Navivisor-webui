import { threadsListTurnItems, threadsListTurns } from '@/generated/api/sdk.gen';
import { researchWorkflowClient } from '@/components/research-workflow/research-workflow-client';
import { resolveWritingRunContext } from '@/components/research-workflow/use-research-project';

export type TranslateDirection = 'zh2en' | 'en2zh';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
  }
  return 'Unknown Codex error';
}

async function extractTurnText(threadId: string, turnId: string): Promise<string> {
  const response = await threadsListTurnItems({
    path: { threadId, turnId },
    throwOnError: true,
  });
  const items =
    (response.data as { items?: Array<{ type?: string; text?: string; phase?: string | null }> })
      ?.items ?? [];
  const messages = items.filter(
    (item) => item.type === 'agentMessage' && typeof item.text === 'string' && item.text.trim(),
  );
  if (messages.length === 0) return '';
  const finalAnswer = [...messages].reverse().find((item) => item.phase === 'final_answer');
  return (finalAnswer ?? messages[messages.length - 1]).text!.trim();
}

async function waitForTurnText(threadId: string, turnId: string): Promise<string> {
  const timeoutMs = 5 * 60 * 1000;
  const intervalMs = 2000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const turnsResponse = await threadsListTurns({
      path: { threadId },
      query: { limit: 20, sortDirection: 'desc', itemsView: 'summary' },
      throwOnError: true,
    });
    const turns =
      (turnsResponse.data as { data?: Array<{ id?: string; status?: string; error?: { message?: string } | null }> })
        ?.data ?? [];
    const turn = turns.find((entry) => entry.id === turnId);

    if (turn?.status === 'failed' || turn?.status === 'interrupted') {
      throw new Error(turn.error?.message || `Codex turn ${turn.status}`);
    }

    if (turn?.status === 'completed') {
      return (await extractTurnText(threadId, turnId)) || '';
    }

    await sleep(intervalMs);
  }

  throw new Error('Timed out waiting for Codex translation');
}

function stripTranslationNoise(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:\w+)?\s*([\s\S]*?)```/);
  return (fence?.[1] ?? trimmed).trim();
}

export async function translateText(
  text: string,
  direction: TranslateDirection,
): Promise<string> {
  if (!text.trim()) return '';

  const { projectId, inputArtifactIds } = await resolveWritingRunContext();
  const directionLabel =
    direction === 'en2zh' ? 'English → Simplified Chinese' : 'Simplified Chinese → English';

  const started = await researchWorkflowClient.startAgentRun({
    projectId,
    stage: 'writing.draft',
    mode: 'simulated',
    inputArtifactIds,
    instructions: [
      'ACTION: translate-section',
      `DIRECTION: ${directionLabel}`,
      'Translate the source text faithfully. Preserve citations, formula tokens, and figure refs.',
      'Return ONLY the translated text in your FINAL agent message (no commentary).',
      'Also write translation.txt + result.json in the temp directory when possible, with role paper-translation.',
      '',
      'SOURCE:',
      text,
    ].join('\n'),
    effort: 'low',
  });

  try {
    const turnText = await waitForTurnText(started.threadId, started.turnId);
    if (turnText) return stripTranslationNoise(turnText);
  } catch (error) {
    throw new Error(`翻译失败：${errorMessage(error)}`, { cause: error });
  }

  throw new Error('翻译失败：Codex 未返回译文');
}

export async function translateAll(
  fields: Record<string, string>,
  direction: TranslateDirection,
): Promise<Record<string, string>> {
  const entries = Object.entries(fields);
  const result: Record<string, string> = {};
  for (const [key, value] of entries) {
    result[key] = value.trim() ? await translateText(value, direction) : value;
  }
  return result;
}
