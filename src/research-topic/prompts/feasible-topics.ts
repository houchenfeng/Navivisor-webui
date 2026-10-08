/**
 * Prompt: 降维指令 · 高可行性课题生成（飞书第3.2期原文）。
 *
 * 来源：飞书文档《科研论开题》→【第3.2期】提示词 → 高可行性课题生成指令。
 * 原文照抄，仅把「上传整合好的文本文档」改为把机会点报告内联进 prompt，
 * 并在末尾追加 JSON 契约。
 *
 * 注意：本指令在飞书流程里是**替换**第3.1期「指令二」使用的；本仓库两个
 * 阶段都实现，由调用方决定跑哪一个（高创新 vs 高可行性）。
 */

export type FeasibleTopicsVars = {
  direction: string;
  /** The `opportunities` object produced by meta-analysis. */
  opportunities: unknown;
  /** Guaranteed-available baselines gathered by the baseline stage. */
  baselineCandidates: string[];
  /** How many topics to produce. Defaults to the document's 6-9. */
  topicCount?: number;
};

export const FEASIBLE_TOPICS_SYSTEM = `请您扮演一位顶级的科研项目孵化专家和资深期刊编辑。`;

export function buildFeasibleTopicsPrompt(vars: FeasibleTopicsVars): string {
  const topicCount = vars.topicCount ?? 9;
  const baselines = vars.baselineCandidates.length
    ? vars.baselineCandidates.map((item) => `- ${item}`).join('\n')
    : '（未提供，请自行给出该领域公认的公开 baseline）';

  return `您好，请您扮演一位顶级的科研项目孵化专家和资深期刊编辑。

我将为您提供几份关于【${vars.direction}】的"创新机会点"分析报告。

您的核心任务是：基于这些机会点，为我"孵化"出 ${topicCount} 个具体、新颖、且具有高可行性的【初阶/验证性】科研课题。

核心指令：

- 难度锁定：您生成的所有课题都必须严格符合下方定义的【初阶/验证性课题】标准。
- 可行性优先：课题设计应优先考虑实验的可操作性和实现路径的清晰度，确保适合科研新手或需要快速验证想法的研究者。
- 严格遵循模板：每一个课题提案都必须完整包含"课题提案模板"中要求的所有部分。

【初阶/验证性课题】的定义与要求：

- 核心定义：风险较低，通常是将一个成熟的方法/材料应用到一个新的、但逻辑上合理的体系中，或是对现有工作的系统性优化。
- 适用人群：适合用于快速产出成果、验证初步想法，或作为本科生毕业设计/硕士生入门研究课题。
- 关键特点：
  - 实验路径清晰：有大量相似的文献可供参考和模仿。
  - 创新点明确：创新点主要在于"新的组合"（例如，材料A+策略B）、"性能的系统性优化"或"对一个已知现象进行更深入的机理验证"。

课题提案模板

对于您生成的每一个课题，都必须严格包含以下六个部分：

- 论文标题：提供一个精确、有吸引力、信息量大的题目。
- 难度等级：【初阶/验证性】
- 核心科学问题：用一句话清晰定义本研究要回答的关键科学问题。
- 研究设计与技术路线：分点列出具体、可操作的实验步骤（迷你实验计划）。
- 预期创新性与价值：明确阐述这项研究的【新颖之处】，以及它在验证可行性或为后续研究提供数据基础方面的【价值】。
- 立论依据：请简要说明这个课题的构思是基于第一步中分析出的哪个具体机会点，主要依据哪些参考文献。

【可用的公开 baseline / 数据集】
${baselines}

【创新机会点分析报告】
${JSON.stringify(vars.opportunities, null, 2)}

【输出 JSON 契约】除上述文字外，最后再输出一段严格 JSON（不要加 Markdown 围栏）：

{
  "topics": [
    {
      "title": "...",
      "difficulty": "初阶/验证性",
      "scientificQuestion": "...",
      "technicalRoute": ["..."],
      "innovationAndValue": "...",
      "rationale": { "opportunity": "...", "references": ["RE-001"] },
      "datasets": ["..."],
      "baselines": ["..."],
      "risks": [{ "risk": "...", "mitigation": "..." }]
    }
  ],
  "recommendation": "用中文说明为什么第一个课题最值得先做，200 字以内"
}`;
}
