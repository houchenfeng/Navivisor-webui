/**
 * Candidate topic generation (T27).
 *
 * The three candidates are deliberately differentiated by risk appetite rather
 * than by topic: 偏创新 / 偏可行 / 较平衡. Each one must cite the reference ids
 * that support it, so a reviewer can check the claim against the pool instead
 * of trusting the model's prose.
 */
import type { ResearchTopicCandidate } from './research-topic.types';

export const CANDIDATE_SYSTEM = `你是启航科研智能体的开题候选课题分析器。你只输出一个 JSON 对象，不要 Markdown，不要解释。`;

export type CandidatePromptInput = {
  direction: string;
  context?: string;
  /** Absolute path of the pooled CSV, for provenance only. */
  csvPath: string;
  /** Optional upstream analysis, already rendered as Markdown. */
  gapsMarkdown?: string;
  landscapeMarkdown?: string;
  venueTiersMarkdown?: string;
};

function section(title: string, body: string | undefined): string {
  const trimmed = body?.trim();
  if (!trimmed) return '';
  return `\n【${title}】\n${trimmed}\n`;
}

export function buildCandidatePrompt(input: CandidatePromptInput): string {
  return [
    '你是启航科研智能体的开题候选课题分析器。',
    `请读取本地 CSV：${input.csvPath}`,
    `用户最初填写的研究方向：${input.direction}`,
    input.context
      ? `用户补充上下文：${input.context}`
      : '用户没有补充上下文。',
    'CSV 是第一环节从 OpenAlex / arXiv 公开 API 检索并去重后的文献元数据，可能有几百条；只能把它当作证据，不得补写不存在的论文、作者、DOI、指标或实验结果。',
    section('研究空白识别（已生成，优先据此选题）', input.gapsMarkdown),
    section('研究态势分析（已生成）', input.landscapeMarkdown),
    section('期刊分层（已生成）', input.venueTiersMarkdown),
    '请生成且只生成三个候选课题，分类必须分别为“偏可行”“偏创新”“较平衡”。',
    '三者的区别在于风险取向，而不是题材：偏可行要能直接用现成数据集与 baseline 启动；偏创新要针对上面识别出的空白或争议；较平衡居中。',
    '每个课题必须严格包含：title、oneSentenceDefinition、researchDesign、expectedInnovation、rationale。',
    'oneSentenceDefinition 是一句话定义；researchDesign 必须具体写出技术路线、数据集、对比/消融实验和评测指标；expectedInnovation 要写成待验证的候选创新性与实际价值。',
    'rationale 必须引用上面材料里可定位的文献编号（形如 RE-001）或 CSV 中可定位的论文标题 / OpenAlex ID；如果摘要或证据不足，要明确写“待核验”，不能猜测。',
    '请只输出一个 JSON 对象，不要 Markdown，不要解释。格式：{"candidates":[{"label":"偏可行","title":"...","oneSentenceDefinition":"...","researchDesign":"...","expectedInnovation":"...","rationale":"..."},{"label":"偏创新",...},{"label":"较平衡",...}]}',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Renders the candidates as the Markdown artifact the UI card reads. */
export function renderCandidateMarkdown(
  candidates: ResearchTopicCandidate[],
  direction = '',
): string {
  return [
    `# 候选课题 · ${direction}`,
    '',
    ...candidates.flatMap((candidate) => [
      `## ${candidate.label}｜${candidate.title}`,
      '',
      `**一句话定义**：${candidate.oneSentenceDefinition}`,
      '',
      `**研究设计**：${candidate.researchDesign}`,
      '',
      `**预期创新性**：${candidate.expectedInnovation}`,
      '',
      `**立论依据**：${candidate.rationale}`,
      '',
    ]),
  ].join('\n');
}
