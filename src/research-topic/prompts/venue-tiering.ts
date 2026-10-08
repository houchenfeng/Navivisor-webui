/**
 * Prompt: 期刊分层与筛选（飞书「提示词3」原文）。
 *
 * 来源：飞书文档《科研论开题》→【第1集】本集核心提示词 → 提示词3：期刊分层与筛选。
 * 原文照抄（正文只有一句话 + 待粘贴的期刊列表），仅追加 JSON 输出契约，
 * 因为原文没有规定输出结构，而下游的 landscape-analysis 需要结构化输入。
 */

export type VenueTieringVars = {
  direction: string;
  /** Aggregated venue statistics gathered from the candidate pool. */
  venues: Array<{
    name: string;
    paperCount: number;
    yearFrom?: number;
    yearTo?: number;
    sampleTitles?: string[];
  }>;
};

export const VENUE_TIERING_SYSTEM = `你是学术出版与会议体系专家。你的判断必须基于可核验的公开信息，不确定时明确写「无法判断」，不要编造影响因子或分区数字。`;

export function buildVenueTieringPrompt(vars: VenueTieringVars): string {
  const list = vars.venues
    .map((venue) => {
      const years =
        venue.yearFrom && venue.yearTo
          ? `（年份跨度 ${venue.yearFrom}-${venue.yearTo}）`
          : '';
      return `${venue.name} — ${venue.paperCount} 篇${years}`;
    })
    .join('\n');

  return `我希望从高水平期刊中获取选题指导，请你从检索结果中帮忙筛选：

${list}

我关注的领域是：「${vars.direction}」

请对上述每一个发表场所做分层判断：
1. 给出层级标签，取值为：顶会顶刊 / 一流 / 主流 / 一般 / 预印本或无正式出版 / 无法判断。
2. 依据必须写清楚：是 CCF A/B/C 类、中科院分区，还是该领域公认的地位。
3. 会议与期刊要区分对待，不要把 workshop 当成主会。
4. 名称存在歧义（同名会议/期刊、缩写冲突）时，标注 needsReview 并说明歧义点。
5. 不要编造影响因子或分区数字；不确定就写「无法判断」。

【输出 JSON 契约】严格输出如下 JSON（不要加 Markdown 围栏）：

{
  "tiers": [
    {
      "name": "场所名称（与输入完全一致）",
      "tier": "顶会顶刊",
      "kind": "conference",
      "evidence": "中文说明依据，80 字以内",
      "needsReview": false
    }
  ],
  "summary": "用中文总结该方向的发表格局，200 字以内"
}`;
}
