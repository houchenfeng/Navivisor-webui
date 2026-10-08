/**
 * Landscape analysis (T25).
 *
 * Only four fields per paper (编号 / 标题 / 期刊 / 年份) are sent — abstracts
 * would blow the context budget for a 1000-paper pool and the prompt is
 * explicitly title-level by design.
 */
import { AiProviderError, extractJsonPayload } from './ai/ai-provider';
import type { AiProviderFactory } from './ai/ai-provider.factory';
import {
  LANDSCAPE_ANALYSIS_SYSTEM,
  buildLandscapeAnalysisPrompt,
} from './prompts/landscape-analysis';
import type { Landscape, ResearchTopicPaper } from './research-topic.types';

export class LandscapeAnalysisError extends Error {
  readonly code = 'LANDSCAPE_ANALYSIS_FAILED';

  constructor(message: string) {
    super(message);
    this.name = 'LandscapeAnalysisError';
  }
}

/** Upper bound on papers sent to the model, to keep the prompt bounded. */
export const MAX_LANDSCAPE_PAPERS = 1200;

/**
 * Renders the four-field view the prompt expects.
 *
 * `refId` must be stable across runs because every claim the model makes cites
 * it; the pool order is the only ordering the model sees.
 */
export function renderPaperLines(
  papers: ResearchTopicPaper[],
  limit = MAX_LANDSCAPE_PAPERS,
): string[] {
  return papers.slice(0, limit).map((paper, index) => {
    const refId = `RE-${String(index + 1).padStart(3, '0')}`;
    const year = paper.publicationYear ?? '未知';
    const venue = paper.source?.trim() || '未标注来源';
    return `${refId} | ${paper.title} | ${venue} | ${year}`;
  });
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function asBlock(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return JSON.stringify(value, null, 2);
}

/** Parses the nine-section response into the five files we persist. */
export function parseLandscape(raw: string): Landscape {
  let payload: unknown;
  try {
    payload = extractJsonPayload(raw);
  } catch (error) {
    throw new LandscapeAnalysisError(
      `态势分析失败：${(error as Error).message}`,
    );
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new LandscapeAnalysisError('态势分析失败：模型返回的不是 JSON 对象。');
  }

  const record = payload as Record<string, unknown>;
  const framework = (record.framework ?? {}) as Record<string, unknown>;

  return {
    diagnosis: [
      `采用框架：${asBlock(framework.chosen) || '未给出'}`,
      `适配度：${asBlock(framework.fit) || '未给出'}`,
      `理由：${asBlock(framework.reason) || '未给出'}`,
      `舍弃的候选框架：${asStringArray(framework.rejected).join('；') || '无'}`,
      asBlock((record.inputAudit as Record<string, unknown>)?.anomalies) !== ''
        ? `输入审计异常：${asBlock((record.inputAudit as Record<string, unknown>)?.anomalies)}`
        : '输入审计异常：无',
    ].join('\n'),
    conceptDictionary: asBlock(record.glossary),
    trendMatrix: [
      asBlock(record.trendMatrix),
      asBlock(record.venuePreference) ? `\n【期刊×方向偏好】\n${asBlock(record.venuePreference)}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    venuePreference: asBlock(record.venuePreference),
    combinationMatrix: asBlock(record.combinationMatrix),
    signals: asBlock(record.signals),
  };
}

export type LandscapeResult = {
  landscape: Landscape;
  /** Raw structured payload, kept for the gap stage. */
  payload: unknown;
  provider: 'codex' | 'http';
  fallbackUsed: boolean;
};

export async function runLandscapeAnalysis(
  factory: AiProviderFactory,
  papers: ResearchTopicPaper[],
  input: { direction: string; yearFrom: number; yearTo: number },
): Promise<LandscapeResult> {
  const prompt = buildLandscapeAnalysisPrompt({
    direction: input.direction,
    yearFrom: input.yearFrom,
    yearTo: input.yearTo,
    totalPapers: papers.length,
    paperLines: renderPaperLines(papers),
  });

  try {
    const completion = await factory.complete(prompt, {
      system: LANDSCAPE_ANALYSIS_SYSTEM,
      // Landscape analysis reads up to 1200 titles; give it more headroom.
      timeoutMs: 300_000,
    });
    return {
      landscape: parseLandscape(completion.text),
      payload: safeExtract(completion.text),
      provider: completion.provider,
      fallbackUsed: completion.fallbackUsed,
    };
  } catch (error) {
    if (error instanceof LandscapeAnalysisError) throw error;
    if (error instanceof AiProviderError) {
      throw new LandscapeAnalysisError(`态势分析失败：${error.message}`);
    }
    throw new LandscapeAnalysisError(`态势分析失败：${(error as Error).message}`);
  }
}

/** Best-effort raw payload extraction; the parsed view is the source of truth. */
function safeExtract(raw: string): unknown {
  try {
    return extractJsonPayload(raw);
  } catch {
    return null;
  }
}
