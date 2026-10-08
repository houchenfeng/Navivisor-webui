/**
 * Prompt: 指令二 · 元分析与最终课题孵化（飞书第3.1期原文）。
 *
 * 来源：飞书文档《科研论开题》→【第3.1期】提示词 → 指令二。
 * 原文照抄，仅把「上传整合好的文本文档」改为把各批综合报告内联进 prompt，
 * 并在末尾追加 JSON 契约。
 */

export type MetaAnalysisVars = {
  direction: string;
  /** The `report` object of each batch, in batch order. */
  batchReports: Array<{ batchIndex: number; paperCount: number; report: unknown }>;
  totalPapers: number;
  /** How many proposals to incubate. Defaults to the document's 6-9. */
  proposalCount?: number;
};

export const META_ANALYSIS_SYSTEM = `请您扮演一位顶级的科研项目孵化专家和期刊编辑。`;

export function buildMetaAnalysisPrompt(vars: MetaAnalysisVars): string {
  const proposalCount = vars.proposalCount ?? 9;
  const reports = vars.batchReports
    .map(
      (batch) =>
        `### 第 ${batch.batchIndex} 批综合报告（${batch.paperCount} 篇）\n${JSON.stringify(
          batch.report,
          null,
          2,
        )}`,
    )
    .join('\n\n');

  return `您好，请您扮演一位顶级的科研项目孵化专家和期刊编辑。

我将为您提供关于【${vars.direction}】的深度分析报告。这些报告本身已经是高质量的文献综述。

您的核心任务是穿透这些报告的表面，进行"元分析"，从中识别出最具潜力的研究缺口，并为我"孵化"出 [${proposalCount}] 个具体、新颖、可执行的科研课题。

每一个课题都应该达到可以作为一篇高影响力期刊论文核心内容的标准。

请严格遵循以下两步来完成这个任务：

第一步：全局元分析——寻找"创新机会点"

请您首先整合并审视我提供的所有分析报告，但不要仅仅是总结它们。您需要从更高维度，识别出以下三类最具价值的创新机会点，每类机会点生成2~3个：

- 共识的交叉点：找出不同报告中共同强调的、但尚未被有效结合的两个或多个关键概念。
- 分歧的融合点：找出不同报告中存在的观点分歧或技术路线争议。创新机会在于提出一个能调和或超越这种分歧的全新方案。
- 集体的盲区点：找出即使是这些详尽报告也共同忽略了的潜在方向。这通常需要最大胆的假设和跨界思维。

第二步：生成"论文级别"的详细研究课题提案

现在，请基于在第一步中识别出的"机会点"，为我生成 [${proposalCount}] 个详细的研究课题提案，研究课题应涉及不同的实施难度。

每一个提案都必须包含以下五个部分，确保其具体性和可操作性：

- 论文标题：请提供一个精确、有吸引力、信息量大、且能直接用作最终论文标题的题目。
- 核心科学问题：请用一句话清晰地定义这个研究要回答的、最关键的科学问题。这是整个研究的灵魂。
- 研究设计与技术路线：请分点列出具体、可操作的实验步骤，就像一份迷你实验计划。
- 预期创新性与价值：明确阐述这项研究的新颖之处在哪里，以及它将如何推动该领域的发展。
- 立论依据：请简要说明这个课题的构思是基于您在第一步中分析出的哪个具体机会点，主要依据哪些参考文献。这使得您的建议有理有据。

【各批次综合报告，共 ${vars.batchReports.length} 批 / ${vars.totalPapers} 篇】
${reports}

【输出 JSON 契约】除上述文字外，最后再输出一段严格 JSON（不要加 Markdown 围栏）：

{
  "opportunities": {
    "consensusIntersections": [{ "concepts": ["..."], "evidence": "..." }],
    "divergenceFusions": [{ "divergence": "...", "proposedResolution": "..." }],
    "collectiveBlindSpots": [{ "direction": "...", "reasoning": "..." }]
  },
  "proposals": [
    {
      "title": "...",
      "scientificQuestion": "...",
      "technicalRoute": ["..."],
      "innovationAndValue": "...",
      "rationale": { "opportunity": "...", "references": ["RE-001"] },
      "difficulty": "entry|mid|advanced"
    }
  ]
}`;
}
