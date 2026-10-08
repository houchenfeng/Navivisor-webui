/**
 * Prompt: 指令一 · 深度文献分析与初步报告生成（飞书第3.1期原文）。
 *
 * 来源：飞书文档《科研论开题》→【第3.1期】提示词 → 指令一。
 * 原文照抄，仅把「上传一个文献文件」改为把批次正文内联进 prompt，
 * 并在末尾追加 JSON 契约（原文的矩阵表格用 Markdown 表达，这里同时给出
 * 结构化字段，便于跨批次合并）。
 */

export type BatchAnalysisVars = {
  direction: string;
  batchIndex: number;
  batchTotal: number;
  /** Topic count requested for the per-batch proposals. */
  proposalCount?: number;
  papers: Array<{
    refId: string;
    title: string;
    year?: number;
    venue?: string;
    /** Extracted PDF text, already truncated by the caller. */
    content: string;
  }>;
};

export const BATCH_ANALYSIS_SYSTEM = `你是一位顶尖的科研分析师，具备敏锐的洞察力和严谨的逻辑思维。`;

export function buildBatchAnalysisPrompt(vars: BatchAnalysisVars): string {
  const proposalCount = vars.proposalCount ?? 5;
  const papers = vars.papers
    .map(
      (paper) =>
        `### ${paper.refId}\n` +
        `题名：${paper.title}\n` +
        `期刊：${paper.venue ?? '未知'}｜年份：${paper.year ?? '未知'}\n` +
        `正文：\n${paper.content}\n`,
    )
    .join('\n');

  return `你是一位顶尖的科研分析师，具备敏锐的洞察力和严谨的逻辑思维。你的核心任务是深入分析我提供的论文集，围绕我的研究方向，帮我梳理研究现状，识别研究空白，最终为我构思出具有创新性的研究课题。

我的核心研究焦点是：【${vars.direction}】。

这是第 ${vars.batchIndex} / ${vars.batchTotal} 批，共 ${vars.papers.length} 篇论文。

请按照以下两个步骤完成任务：

第一步：深度信息提取与表格化呈现

请仔细阅读每一篇论文，并根据以下"进阶分析矩阵"，为我提取关键信息。请确保内容详实、精准，避免使用过于简略的短语。每篇论文都需要出现在表格中。

| 论文编号 | 关键研究方法与材料 | 核心性能指标 (量化) | 创新性与局限性分析 | 对我课题的启发点 |
| :--- | :--- | :--- | :--- | :--- |
| | (详细描述研究方法与策略) | (必须包含具体的数值来支撑结论。) | (以批判性视角，分析其方法或结论的创新之处。同时，指出其理论或实验设计的潜在局限性或未被讨论的关键问题。) | (明确指出该论文的策略，可以如何被我【具体地】借鉴、组合或改进，用于解决我研究焦点中的挑战) |

在完成上述表格后，请基于表格中的所有信息，从全局视角提供一份综合分析报告，包含以下三个部分：

1. 研究趋势总结：
   - 当前领域，最主流的研究方法与内容分别是什么？
   - 当前研究者主要采用什么方法来解决我研究焦点的主要问题。
2. 研究空白识别：
   - 综合所有论文，当前研究普遍忽略了哪些关键问题？
   - 哪些有潜力的技术路线或材料体系在这些论文中被提及较少，可能构成机会？
3. 生成"论文级别"的详细研究课题提案

现在，请基于对于论文集的分析，为我生成 [${proposalCount}] 个不同难度的详细研究课题提案。

- 论文标题：请提供一个精确、有吸引力、信息量大、且能直接用作最终论文标题的题目。
- 核心科学问题：请用一句话清晰地定义这个研究要回答的、最关键的科学问题。这是整个研究的灵魂。
- 研究设计与技术路线：请分点列出具体、可操作的实验步骤，就像一份迷你实验计划。
- 预期创新性与价值：明确阐述这项研究的新颖之处在哪里，以及它将如何推动该领域的发展。
- 立论依据：请简要说明这个课题的构思是基于您在第一步中分析出的哪个具体机会点，主要依据哪些参考文献。这使得您的建议有理有据。

请开始分析。请一次性给我所有回复。

【本批论文】
${papers}

【输出 JSON 契约】除上述文字与表格外，最后再输出一段严格 JSON（不要加 Markdown 围栏），字段与上面各节一一对应：

{
  "matrix": [
    {
      "refId": "RE-001",
      "methodAndMaterials": "...",
      "metrics": "...",
      "innovationAndLimitations": "...",
      "inspiration": "..."
    }
  ],
  "report": {
    "trends": { "mainstreamMethods": ["..."], "mainstreamTopics": ["..."], "approachesToMyFocus": ["..."] },
    "gaps": { "ignoredProblems": ["..."], "underExploredRoutes": ["..."] },
    "proposals": [
      {
        "title": "...",
        "scientificQuestion": "...",
        "technicalRoute": ["..."],
        "innovationAndValue": "...",
        "rationale": { "opportunity": "...", "references": ["RE-001"] }
      }
    ]
  }
}`;
}
