/**
 * Per-paper relevance scoring (T33).
 *
 * Titles and abstracts only — full text is not available at this point, and
 * the score exists to decide which papers are worth downloading, so judging
 * from the abstract is the right granularity.
 *
 * Papers are scored in batches of 10 so a single bad response only costs one
 * batch, and every batch is retried once before the paper is marked unscored.
 */
import { AiProviderError, extractJsonPayload } from './ai/ai-provider';
import type { AiProviderFactory } from './ai/ai-provider.factory';
import type { ResearchTopicPaper } from './research-topic.types';

export class RelevanceScoringError extends Error {
  readonly code = 'RELEVANCE_SCORING_FAILED';

  constructor(message: string) {
    super(message);
    this.name = 'RelevanceScoringError';
  }
}

/** Papers per model call. */
export const SCORING_BATCH_SIZE = 10;
/** Scores at or above this are treated as relevant. */
export const DEFAULT_SCORE_THRESHOLD = 4;

export type PaperScore = {
  openalexId: string;
  relevant: boolean;
  /** 0 = irrelevant, 5 = directly on target. */
  score: 0 | 1 | 2 | 3 | 4 | 5;
  reason: string;
  /** True when the method could be reused even if the topic differs. */
  transferable: boolean;
  /** True when the paper looks like a usable baseline / comparison method. */
  baselineCandidate: boolean;
};

export const SCORING_SYSTEM = `你是文献相关性评审员。你只根据给出的标题与摘要判断，摘要没写的一律不推断。你只输出 JSON，不要解释。`;

export function buildScoringPrompt(
  direction: string,
  papers: Array<{ openalexId: string; title: string; abstract: string }>,
): string {
  const list = papers
    .map(
      (paper, index) =>
        `${index + 1}. [${paper.openalexId}] ${paper.title}\n   摘要：${paper.abstract || '（无摘要）'}`,
    )
    .join('\n');

  return `研究课题：${direction}

请逐篇判断下列文献与该课题的相关性。判据：
- score 5：研究对象、问题、方法都直接对应，必须精读。
- score 4：高度相关，方法或问题之一直接可用。
- score 3：部分相关，可作为背景或对比。
- score 2：仅同一大领域，方法与问题都不同。
- score 1：几乎无关。
- score 0：完全无关（例如同名词但不同学科）。

另外判断两项：
- transferable：方法能否迁移到本课题（即使研究对象不同）。
- baselineCandidate：是否可能作为可复现的 baseline / 对比算法（需有明确方法描述或公开实现线索）。

严格输出 JSON（不要 Markdown 围栏）：
{"scores":[{"openalexId":"W123","score":4,"reason":"中文说明，60 字以内","transferable":true,"baselineCandidate":false}]}

待评文献：
${list}`;
}

function clampScore(value: unknown): 0 | 1 | 2 | 3 | 4 | 5 {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const rounded = Math.round(numeric);
  if (rounded <= 0) return 0;
  if (rounded >= 5) return 5;
  return rounded as 1 | 2 | 3 | 4 | 5;
}

/**
 * Parses one batch response.
 *
 * Scores for ids that were not in the batch are dropped, so a hallucinated id
 * cannot inject a paper into the final list.
 */
export function parseScoreBatch(
  raw: string,
  expectedIds: string[],
  threshold = DEFAULT_SCORE_THRESHOLD,
): PaperScore[] {
  let payload: unknown;
  try {
    payload = extractJsonPayload(raw);
  } catch (error) {
    throw new RelevanceScoringError(
      `相关性判定失败：${(error as Error).message}`,
    );
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new RelevanceScoringError('相关性判定失败：模型返回的不是 JSON 对象。');
  }

  const record = payload as Record<string, unknown>;
  const allowed = new Set(expectedIds);
  const rawScores = Array.isArray(record.scores) ? record.scores : [];
  const scores: PaperScore[] = [];

  for (const item of rawScores) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    const openalexId =
      typeof entry.openalexId === 'string' ? entry.openalexId.trim() : '';
    if (!openalexId || !allowed.has(openalexId)) continue;
    const score = clampScore(entry.score);
    scores.push({
      openalexId,
      score,
      relevant: score >= threshold,
      reason: typeof entry.reason === 'string' ? entry.reason.trim() : '',
      transferable: entry.transferable === true,
      baselineCandidate: entry.baselineCandidate === true,
    });
  }

  return scores;
}

export type ScorePapersResult = {
  scores: PaperScore[];
  /** Ids the model failed to score after the retry. */
  unscored: string[];
  provider: 'codex' | 'http';
  fallbackUsed: boolean;
};

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

/**
 * Scores every paper in batches of 10.
 *
 * A batch that fails is retried once; if it still fails its papers are
 * reported in `unscored` rather than being silently treated as irrelevant.
 */
export async function scorePapers(
  factory: AiProviderFactory,
  papers: ResearchTopicPaper[],
  direction: string,
  threshold = DEFAULT_SCORE_THRESHOLD,
): Promise<ScorePapersResult> {
  const scores: PaperScore[] = [];
  const unscored: string[] = [];
  let provider: 'codex' | 'http' = 'codex';
  let fallbackUsed = false;

  for (const batch of chunk(papers, SCORING_BATCH_SIZE)) {
    const expectedIds = batch.map((paper) => paper.openalexId);
    const prompt = buildScoringPrompt(
      direction,
      batch.map((paper) => ({
        openalexId: paper.openalexId,
        title: paper.title,
        abstract: paper.abstract,
      })),
    );

    let parsed: PaperScore[] | null = null;
    for (let attempt = 1; attempt <= 2 && parsed === null; attempt += 1) {
      try {
        const completion = await factory.complete(prompt, {
          system: SCORING_SYSTEM,
        });
        provider = completion.provider;
        fallbackUsed = fallbackUsed || completion.fallbackUsed;
        parsed = parseScoreBatch(completion.text, expectedIds, threshold);
      } catch (error) {
        if (attempt === 2) {
          if (error instanceof AiProviderError || error instanceof RelevanceScoringError) {
            unscored.push(...expectedIds);
          } else {
            unscored.push(...expectedIds);
          }
        }
      }
    }

    if (!parsed) continue;

    const scoredIds = new Set(parsed.map((entry) => entry.openalexId));
    for (const id of expectedIds) {
      if (!scoredIds.has(id)) unscored.push(id);
    }
    scores.push(...parsed);
  }

  return { scores, unscored, provider, fallbackUsed };
}

/** Renders the scoring result as the persisted Markdown report. */
export function renderRelevanceScoringMarkdown(
  result: ScorePapersResult,
  papers: ResearchTopicPaper[],
  threshold = DEFAULT_SCORE_THRESHOLD,
): string {
  const byId = new Map(papers.map((paper) => [paper.openalexId, paper]));
  const sorted = [...result.scores].sort((a, b) => b.score - a.score);

  return [
    `# 逐篇相关性判定（阈值 score ≥ ${threshold}）`,
    '',
    `- 已判定：${result.scores.length} 篇`,
    `- 判定相关：${result.scores.filter((entry) => entry.relevant).length} 篇`,
    `- 判定失败（未计为不相关）：${result.unscored.length} 篇`,
    '',
    '| 分数 | 标题 | 可迁移 | 可作 baseline | 理由 |',
    '| --- | --- | --- | --- | --- |',
    ...sorted.map((entry) => {
      const title = byId.get(entry.openalexId)?.title ?? entry.openalexId;
      return `| ${entry.score} | ${title} | ${entry.transferable ? '是' : '否'} | ${entry.baselineCandidate ? '是' : '否'} | ${entry.reason} |`;
    }),
    '',
    result.unscored.length
      ? `## 未判定成功的文献（需重跑）\n\n${result.unscored.map((id) => `- ${id}`).join('\n')}`
      : '## 未判定成功的文献\n\n无。',
  ].join('\n');
}
