/**
 * Research gap identification (T26).
 *
 * Derived from the landscape payload rather than a second model call: the
 * landscape stage already classifies every concept combination as
 * strong / weak / zero co-occurrence and runs the red-team pass, so re-asking
 * would cost another full-context call and risk contradicting the first answer.
 *
 * The one rule enforced here rather than trusted to the model: a zero
 * co-occurrence combination must carry the explicit "no direct title-level
 * evidence" caveat, because it is the easiest claim to over-sell.
 */
import type { ResearchGaps } from './research-topic.types';

export class ResearchGapsError extends Error {
  readonly code = 'RESEARCH_GAPS_FAILED';

  constructor(message: string) {
    super(message);
    this.name = 'ResearchGapsError';
  }
}

/** Required caveat on every zero-co-occurrence gap. */
export const ZERO_COOCCURRENCE_CAVEAT = '无直接题名共现证据';

type CombinationEntry = {
  combination?: unknown;
  relation?: unknown;
  maxUncertainty?: unknown;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Projects the landscape payload into the gap view.
 *
 * - `crowded`      ← combinations the model marked saturated/crowded
 * - `crossGaps`    ← the model's candidate directions (already red-teamed)
 * - `zeroCooccurrence` ← zero-relation combinations, always with the caveat
 * - `redteam`      ← the red-team findings, verbatim
 */
export function deriveResearchGaps(landscapePayload: unknown): ResearchGaps {
  if (!landscapePayload || typeof landscapePayload !== 'object') {
    throw new ResearchGapsError('研究空白识别失败：缺少态势分析结果。');
  }
  const record = landscapePayload as Record<string, unknown>;

  const combinations = asArray(record.combinationMatrix) as CombinationEntry[];
  const crowded: string[] = [];
  const zeroCooccurrence: string[] = [];

  for (const entry of combinations) {
    if (!entry || typeof entry !== 'object') continue;
    const name = text(entry.combination);
    if (!name) continue;
    const relation = text(entry.relation).toLowerCase();

    if (relation === 'zero') {
      const uncertainty = text(entry.maxUncertainty);
      const caveat = uncertainty.includes(ZERO_COOCCURRENCE_CAVEAT)
        ? uncertainty
        : `${ZERO_COOCCURRENCE_CAVEAT}；${uncertainty || '组合关系完全靠外部逻辑推断'}`;
      zeroCooccurrence.push(`${name}（${caveat}）`);
    } else if (relation === 'strong') {
      // Strong co-occurrence plus a "crowded" signal is the saturated case.
      const signal = text((entry as Record<string, unknown>).signal);
      if (signal.includes('饱和') || signal.includes('拥挤')) {
        crowded.push(`${name}（${signal}）`);
      }
    }
  }

  // The landscape stage also emits explicit saturation signals; fold them in.
  const signals = (record.signals ?? {}) as Record<string, unknown>;
  for (const item of asArray(signals.saturated)) {
    const value = text(item);
    if (value && !crowded.some((entry) => entry.startsWith(value))) {
      crowded.push(value);
    }
  }

  const crossGaps: string[] = [];
  for (const item of asArray(record.candidates)) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Record<string, unknown>;
    const name = text(candidate.name);
    if (!name) continue;
    const strength = text(candidate.evidenceStrength) || '未知';
    const relation = text(candidate.relation) || '未知';
    crossGaps.push(`${name}（关系：${relation}，证据强度：${strength}）`);
  }
  for (const item of asArray(record.priorities)) {
    if (!item || typeof item !== 'object') continue;
    const priority = item as Record<string, unknown>;
    const name = text(priority.name);
    if (!name) continue;
    const line = `优先方向：${name}（新颖性：${text(priority.novelty) || '未说明'}）`;
    if (!crossGaps.some((entry) => entry.includes(name))) crossGaps.push(line);
  }

  const redteam: string[] = [];
  for (const item of asArray(record.redTeam)) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    const misjudgement = text(entry.misjudgement);
    if (!misjudgement) continue;
    redteam.push(
      `${misjudgement}（${entry.intercepted === true ? '已被前置自筛拦截' : '未拦截，需人工复核'}）`,
    );
  }

  if (!crossGaps.length && !zeroCooccurrence.length) {
    throw new ResearchGapsError(
      '研究空白识别失败：态势分析结果里没有可用的候选方向或组合矩阵。',
    );
  }

  return { crowded, crossGaps, zeroCooccurrence, redteam };
}

/** Renders the gap view as the Markdown file persisted next to the others. */
export function renderResearchGapsMarkdown(
  gaps: ResearchGaps,
  direction: string,
): string {
  const section = (title: string, items: string[], empty: string): string =>
    `## ${title}\n\n${items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${empty}`}\n`;

  return [
    `# 研究空白识别 · ${direction}`,
    '',
    section('过于拥挤的方向', gaps.crowded, '未识别到明确饱和的方向。'),
    section('交叉空白与候选方向', gaps.crossGaps, '未识别到候选方向。'),
    section(
      '零共现推测组合（高风险）',
      gaps.zeroCooccurrence,
      '未发现零共现组合。',
    ),
    section('红队复核', gaps.redteam, '未给出红队复核意见。'),
  ].join('\n');
}
