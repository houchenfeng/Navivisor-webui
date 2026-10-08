/**
 * Prompt: 检索式调整提示词（飞书原文）。
 *
 * 来源：飞书文档《科研论开题》→【第二期第2次训练】提示词本体 →
 * 「检索式调整提示词」。原文照抄，仅把「前50篇 / 前20篇」的样本以变量注入，
 * 并把「优化检索式」的输出契约补成 JSON，便于程序解析。
 */

export type QueryRefinementVars = {
  direction: string;
  /** The plan that produced the off-target hits. */
  currentPlan: {
    concepts: { A: string[]; B: string[]; C: string[] };
    exclusions: string[];
  };
  /** Titles (+ abstracts, when available) of the inspected results. */
  offTargetSamples: string[];
  /** How many of the inspected results were judged irrelevant. */
  offTargetCount: number;
  /** Total results inspected. */
  inspectedCount: number;
  /** Which attempt this is (1-based). */
  attempt: number;
};

export const QUERY_REFINEMENT_SYSTEM = `你是学术检索专家，擅长诊断检索式为什么召回不准并给出修正版。`;

export function buildQueryRefinementPrompt(vars: QueryRefinementVars): string {
  const samples = vars.offTargetSamples
    .slice(0, 50)
    .map((sample, index) => `${index + 1}. ${sample}`)
    .join('\n');

  return `研究方向：「${vars.direction}」

这是我用你给的检索式搜到的前 ${vars.inspectedCount} 篇文章，但很多不相关（其中 ${vars.offTargetCount} 篇明显不相关）。请分析为什么这些不相关的论文会被检索出来，并基于这些错误，帮我优化检索式。

【上传的样本：按时间倒序排列后的标题、摘要、关键字】
${samples}

当前检索式使用的概念组：
- A 组（研究对象）：${vars.currentPlan.concepts.A.join(' | ') || '（空）'}
- B 组（方法路线）：${vars.currentPlan.concepts.B.join(' | ') || '（空）'}
- C 组（场景模态）：${vars.currentPlan.concepts.C.join(' | ') || '（空）'}
- 排除项：${vars.currentPlan.exclusions.join(' | ') || '（无）'}

这是第 ${vars.attempt} 次调整。请按检索式设计总则（最小非冗余词集、概念正交、剔除生僻缩写、不使用邻近运算符）给出修正版：
1. 优先修正术语本身，而不是简单叠加排除词。
2. 如果某组术语导致大量误召回，替换而不是追加。
3. 排除项只针对被证据证明的误召回来源，最多 5 个。
4. 修正后仍要保证能召回该方向的经典工作，不要收得过窄。

【输出 JSON 契约】除文字诊断外，最后输出一段严格 JSON（不要加 Markdown 围栏）：

{
  "diagnosis": "用中文说明误召回原因，150 字以内",
  "concepts": { "A": ["..."], "B": ["..."], "C": ["..."] },
  "exclusions": ["..."],
  "rationale": "用中文说明这次改动相比上一版的关键差异，150 字以内"
}`;
}
