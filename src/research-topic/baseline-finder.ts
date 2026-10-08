/**
 * Baseline guarantee (T35).
 *
 * Every topic needs at least one runnable comparison method, otherwise the
 * proposal is not actionable. The AI picks the transferable ones; when it
 * cannot, we fall back to the highest-cited seeds with an open-access PDF and
 * mark them `fallback: true` so the operator knows the choice was mechanical.
 */
import { AiProviderError, extractJsonPayload } from './ai/ai-provider';
import type { AiProviderFactory } from './ai/ai-provider.factory';
import type { ResearchTopicPaper } from './research-topic.types';
import { selectSeedPapers } from './seed-papers';

export class BaselineFinderError extends Error {
  readonly code = 'BASELINE_FINDER_FAILED';

  constructor(message: string) {
    super(message);
    this.name = 'BaselineFinderError';
  }
}

/** Baselines the AI should aim for. */
export const MIN_BASELINES = 3;
export const MAX_BASELINES = 5;
/** How many mechanical fallbacks to offer when the AI cannot decide. */
export const FALLBACK_BASELINE_COUNT = 3;

export type BaselineCandidate = {
  title: string;
  method: string;
  metrics: string;
  dataset: string;
  codeUrl: string;
  whyTransferable: string;
  /** True when this came from the mechanical fallback rather than the model. */
  fallback: boolean;
};

export const BASELINE_SYSTEM = `你是实验方法顾问，擅长判断一篇论文能否被直接复现为 baseline。你只根据给出的信息判断，不确定就写“待核验”。你只输出 JSON，不要解释。`;

export function buildBaselinePrompt(
  direction: string,
  papers: Array<{ title: string; abstract: string; year: number | null; venue: string }>,
): string {
  const list = papers
    .map(
      (paper, index) =>
        `${index + 1}. ${paper.title}\n   ${paper.venue} · ${paper.year ?? '未知'}\n   摘要：${paper.abstract || '（无摘要）'}`,
    )
    .join('\n');

  return `研究课题：${direction}

请从下列文献中挑出 ${MIN_BASELINES}-${MAX_BASELINES} 篇可以直接作为 baseline / 对比算法的论文。

判据（缺一不可）：
1. 有公开代码，或方法描述足够详细到可以复现。
2. 评测指标与本课题可比。
3. 使用的数据集与本课题一致或高度接近。

不要为了凑数而降低标准；如果确实不足 ${MIN_BASELINES} 篇，返回你能确认的那些，并在 note 里说明为什么。

严格输出 JSON（不要 Markdown 围栏）：
{
  "baselines": [
    {
      "title": "论文标题（与输入完全一致）",
      "method": "方法名称与核心思路",
      "metrics": "评测指标",
      "dataset": "数据集",
      "codeUrl": "代码链接，没有就写空字符串",
      "whyTransferable": "为什么可以直接迁移，80 字以内"
    }
  ],
  "note": "中文说明，包括为什么没有凑够数量（如果没凑够）"
}

待选文献：
${list}`;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Parses the model response; titles not present in the input are dropped. */
export function parseBaselineResponse(
  raw: string,
  availableTitles: string[],
): { baselines: BaselineCandidate[]; note: string } {
  let payload: unknown;
  try {
    payload = extractJsonPayload(raw);
  } catch (error) {
    throw new BaselineFinderError(`baseline 识别失败：${(error as Error).message}`);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new BaselineFinderError('baseline 识别失败：模型返回的不是 JSON 对象。');
  }

  const record = payload as Record<string, unknown>;
  const allowed = new Set(availableTitles);
  const rawBaselines = Array.isArray(record.baselines) ? record.baselines : [];
  const baselines: BaselineCandidate[] = [];

  for (const item of rawBaselines) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    const title = asText(entry.title);
    // Guard against a hallucinated paper being presented as runnable.
    if (!title || !allowed.has(title)) continue;
    baselines.push({
      title,
      method: asText(entry.method),
      metrics: asText(entry.metrics),
      dataset: asText(entry.dataset),
      codeUrl: asText(entry.codeUrl),
      whyTransferable: asText(entry.whyTransferable),
      fallback: false,
    });
    if (baselines.length >= MAX_BASELINES) break;
  }

  return { baselines, note: asText(record.note) };
}

/**
 * Mechanical fallback: highest-cited seeds that have an open-access PDF.
 *
 * These are marked `fallback: true` because they are picked on citation count
 * alone — they have not been checked for reproducibility.
 */
export function pickFallbackBaselines(
  papers: ResearchTopicPaper[],
  count = FALLBACK_BASELINE_COUNT,
): BaselineCandidate[] {
  const seeds = selectSeedPapers(papers, papers.length).filter(
    (paper) => paper.isOpenAccess || paper.pdfUrl,
  );

  return seeds.slice(0, count).map((paper) => ({
    title: paper.title,
    method: '待核验：按被引量机械选取，未核查可复现性。',
    metrics: '待核验',
    dataset: '待核验',
    codeUrl: '',
    whyTransferable: `该方向被引最高的开放获取文献之一（被引 ${paper.citedByCount} 次）。`,
    fallback: true,
  }));
}

export type BaselineResult = {
  baselines: BaselineCandidate[];
  note: string;
  /** True when the mechanical fallback was used. */
  usedFallback: boolean;
  provider?: 'codex' | 'http';
  fallbackUsed: boolean;
};

/**
 * Finds baselines, degrading to the mechanical pick when the model returns
 * nothing usable. The degradation is always recorded, never silent.
 */
export async function findBaselines(
  factory: AiProviderFactory,
  papers: ResearchTopicPaper[],
  direction: string,
): Promise<BaselineResult> {
  if (!papers.length) {
    return {
      baselines: [],
      note: '没有可用于挑选 baseline 的文献。',
      usedFallback: false,
      fallbackUsed: false,
    };
  }

  const candidates = selectSeedPapers(papers, Math.min(papers.length, 30));
  const prompt = buildBaselinePrompt(
    direction,
    candidates.map((paper) => ({
      title: paper.title,
      abstract: paper.abstract,
      year: paper.publicationYear,
      venue: paper.source ?? '',
    })),
  );

  try {
    const completion = await factory.complete(prompt, {
      system: BASELINE_SYSTEM,
    });
    const { baselines, note } = parseBaselineResponse(
      completion.text,
      candidates.map((paper) => paper.title),
    );

    if (baselines.length >= MIN_BASELINES) {
      return {
        baselines,
        note,
        usedFallback: false,
        provider: completion.provider,
        fallbackUsed: completion.fallbackUsed,
      };
    }

    // Fewer than the minimum: top up mechanically and say so.
    const fallback = pickFallbackBaselines(
      papers,
      MIN_BASELINES - baselines.length,
    );
    const seen = new Set(baselines.map((entry) => entry.title));
    const toppedUp = [...baselines, ...fallback.filter((entry) => !seen.has(entry.title))];

    return {
      baselines: toppedUp,
      note: note
        ? `${note}（不足 ${MIN_BASELINES} 篇，已用被引量机械补齐 ${toppedUp.length - baselines.length} 篇，需人工核验）`
        : `AI 只确认了 ${baselines.length} 篇，已用被引量机械补齐，需人工核验。`,
      usedFallback: true,
      provider: completion.provider,
      fallbackUsed: completion.fallbackUsed,
    };
  } catch (error) {
    const baselines = pickFallbackBaselines(papers);
    const reason =
      error instanceof AiProviderError
        ? error.message
        : (error as Error).message;
    return {
      baselines,
      note: `AI 识别失败（${reason}），已退回按被引量机械选取，全部条目需人工核验。`,
      usedFallback: true,
      fallbackUsed: false,
    };
  }
}

export function renderBaselineMarkdown(
  result: BaselineResult,
  direction = '',
): string {
  return [
    `# 可用 baseline 候选 · ${direction}`,
    '',
    result.usedFallback
      ? '> ⚠️ 部分或全部条目为机械选取（按被引量），未核查可复现性，需人工确认。'
      : '> 全部条目由 AI 依据「有公开代码 / 可复现 / 指标可比 / 数据集一致」判据选出。',
    '',
    ...result.baselines.flatMap((baseline, index) => [
      `## ${index + 1}. ${baseline.title}`,
      '',
      `- 方法：${baseline.method}`,
      `- 指标：${baseline.metrics}`,
      `- 数据集：${baseline.dataset}`,
      `- 代码：${baseline.codeUrl || '未提供'}`,
      `- 可迁移理由：${baseline.whyTransferable}`,
      baseline.fallback ? '- 来源：机械选取（fallback）' : '',
      '',
    ]),
    result.note ? `## 说明\n\n${result.note}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
