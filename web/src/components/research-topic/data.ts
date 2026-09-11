import type { KeywordGroup } from './types';

/** User-editable starter input. It is an example, not a research fact. */
export const demoInterest = '我对计算机视觉中的语义分割很感兴趣，想了解复杂街景场景下小目标与边界精细分割的方法。';
export const demoContext = '教学演示：从 Cityscapes、ADE20K 等公开数据集开始，了解语义分割的主流方法和常见评测指标（如 mIoU）。';

export const demoTaskSnapshot = {
  runId: 'demo-opening-20260911',
  stage: 'first-search' as const,
  status: 'completed' as const,
  files: [{ name: 'first-search-papers.csv', path: 'first-search-papers.csv', kind: 'csv' as const }],
  errors: [],
  updatedAt: '2026-09-11T00:00:00.000Z',
  counts: { papers: 4, requested: 4, returned: 4, deduplicated: 4, previewed: 4, targetReached: true },
  isDemo: true,
  papers: [
    { openalexId: 'https://openalex.org/W639708223', title: 'Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks', authors: [], institutions: [], source: 'OpenAlex teaching snapshot', publicationYear: 2016, citedByCount: 0, abstract: '公开元数据演示条目；摘要未在本地快照中保存。', doi: '10.1109/TPAMI.2016.2577031', landingUrl: 'https://openalex.org/W639708223', sourceStatus: 'openalex_public_api' as const },
    { openalexId: 'https://openalex.org/W2806070179', title: 'Mask R-CNN', authors: [], institutions: [], source: 'OpenAlex teaching snapshot', publicationYear: 2017, citedByCount: 0, abstract: '公开元数据演示条目；摘要未在本地快照中保存。', doi: '', landingUrl: 'https://openalex.org/W2806070179', sourceStatus: 'openalex_public_api' as const },
    { openalexId: 'https://openalex.org/W4400014661', title: 'Deep Residual Learning for Image Recognition', authors: [], institutions: [], source: 'OpenAlex teaching snapshot', publicationYear: 2016, citedByCount: 0, abstract: '公开元数据演示条目；摘要未在本地快照中保存。', doi: '', landingUrl: 'https://openalex.org/W4400014661', sourceStatus: 'openalex_public_api' as const },
    { openalexId: 'https://openalex.org/W2995726119', title: 'Identification of Tomato Disease Types and Detection of Infected Areas Based on Deep Convolutional Neural Networks and Object Detection Techniques', authors: [], institutions: [], source: 'OpenAlex teaching snapshot', publicationYear: 2019, citedByCount: 0, abstract: '公开元数据演示条目；摘要未在本地快照中保存。', doi: '', landingUrl: 'https://openalex.org/W2995726119', sourceStatus: 'openalex_public_api' as const },
  ],
  candidateStatus: 'completed' as const,
  candidates: [
    { label: '偏可行' as const, title: '复杂街景中的边界感知语义分割基线比较', oneSentenceDefinition: '研究轻量边界增强模块能否在 Cityscapes 和 ADE20K 上改善街景目标边界的语义分割质量。', researchDesign: '以 U-Net 或 SegFormer 作为基线，加入边界监督或边界损失，在 Cityscapes、ADE20K 上比较 mIoU、边界 F-score 和推理速度，并进行模块消融。', expectedInnovation: '将边界质量作为可控变量进行增强，预期以较小工程成本改善细长目标和相邻物体边界；具体效果仍待真实实验验证。', rationale: '语义分割、边界精细分割与公开数据集方向来自教学研究兴趣；相关论文和 OpenAlex ID 需要结合实际检索结果进一步核验。' },
    { label: '偏创新' as const, title: '场景记忆增强的复杂街景语义分割', oneSentenceDefinition: '研究通过检索相似街景记忆辅助视觉模型判断复杂区域，从而提升跨场景语义分割的稳定性和可解释性。', researchDesign: '建立包含 Cityscapes、ADE20K 场景特征和历史预测案例的记忆库，对低置信度区域检索相似样本，再与分割模型特征融合；比较无记忆基线、不同检索策略和不同置信度阈值的 mIoU、边界 F-score 与校准误差。', expectedInnovation: '把场景记忆和不确定性触发引入语义分割复核流程，预期改善域变化下的困难样本表现，但检索成本和泛化能力需要实验确认。', rationale: '该方向是基于语义分割、场景解析和记忆增强思路形成的候选假设，不能替代对 OpenAlex 文献全文和方法细节的核验。' },
    { label: '较平衡' as const, title: '面向公开街景数据集的语义分割鲁棒性评测', oneSentenceDefinition: '研究光照、尺度和遮挡变化如何影响 Cityscapes 与 ADE20K 上的语义分割结果，并定位最值得优化的失败类型。', researchDesign: '按光照、目标尺度、遮挡和边界复杂度划分测试子集，固定一个主流分割基线，比较增强策略、边界模块和轻量解码器的 mIoU、类别 IoU、边界 F-score 与显存/速度开销。', expectedInnovation: '将复杂街景中的失败模式拆成可复现的评测维度，预期形成兼顾精度、边界质量和资源成本的入门级比较框架。', rationale: 'Cityscapes、ADE20K 和语义分割评测指标构成教学演示的事实输入；具体研究空白、论文依据和创新性仍需打开来源逐项确认。' },
  ],
  coreRunId: 'demo-core-literature-20260911',
  coreStatus: 'completed' as const,
  coreManifest: {
    status: 'completed',
    files: ['references.csv', 'references.bib', 'download-report.json', 'handoff.md', 'manifest.json'],
    counts: { references: 3, pdfDownloaded: 0 },
  },
  demoCoreLiterature: [
    { title: 'Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks', openalexId: 'https://openalex.org/W639708223', whyRelevant: '帮助理解目标检测如何定位图像中的行人与自行车；需打开原文确认模型和数据集。' },
    { title: 'Mask R-CNN', openalexId: 'https://openalex.org/W2806070179', whyRelevant: '提供目标检测与实例分割的对照线索；不在 Demo 中替代原文证据。' },
    { title: 'Deep Residual Learning for Image Recognition', openalexId: 'https://openalex.org/W4400014661', whyRelevant: '提供深层视觉特征提取的基础线索；模型迁移到校园场景前需要验证。' },
  ],
};

export const starterKeywordGroups: KeywordGroup[] = [
  { label: '研究对象', description: '你观察谁或什么', items: ['街景图像', '小目标与物体边界'] },
  { label: '研究任务', description: '你想弄清什么', items: ['语义分割', '边界精细分割'] },
  { label: '研究场景', description: '问题发生在哪里', items: ['Cityscapes', 'ADE20K'] },
];

export const topicSteps = [
  { number: 1, label: '兴趣与边界', short: '从模糊想法开始' },
  { number: 2, label: '策略与试搜', short: '先检查方向是否找对' },
  { number: 3, label: '证据与空白', short: '决定哪些证据值得保留' },
  { number: 4, label: '候选方向', short: '比较三种取舍' },
  { number: 5, label: '深化与确认', short: '修改并交接下一步' },
] as const;

export const emptyResearchMessage = '还没有开始真实检索。输入研究方向后，系统会调用已接入的公开文献检索服务。';
