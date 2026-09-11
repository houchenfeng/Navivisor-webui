import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ExperimentStep = 'intake' | 'plan' | 'mode' | 'simulate' | 'run' | 'results';

export interface ExperimentIdea {
  id: string;
  name: string;
  layer: string;
  hypothesis: string;
  gain: string;
  status?: '成功' | '失败' | '淘汰';
  score?: number;
  summary: string;
  modification: string;
  stepLocation: string;
  optimizationGoal: string;
  mainPlan: string[];
  alternatives: Array<{ name: string; approach: string; pros: string; cons: string }>;
  recommendation: string;
  resources: string[];
  goNoGo: string[];
  references: string[];
}

export type ExperimentRunMode = 'simulated' | 'real';
export type ExperimentRuntimeTarget = 'local' | 'ssh';

export interface ExperimentRealRuntimeConfig {
  target: ExperimentRuntimeTarget;
  sshHost: string;
  sshPort: string;
  sshUser: string;
  cpuCores: string;
  gpuCount: string;
  gpuModel: string;
  memoryGb: string;
  diskGb: string;
  codeDir: string;
  dataDir: string;
  resultsDir: string;
  selectedGpus: string;
  apiEndpoint: string;
  apiKeyHint: string;
}

interface ExperimentState {
  projectName: string;
  researchTopic: string;
  researchGoal: string;
  paperCount: number;
  planConfirmed: boolean;
  disclaimerAccepted: boolean;
  runMode: ExperimentRunMode;
  seed: number;
  repeatCount: number;
  realRuntime: ExperimentRealRuntimeConfig;
  completed: boolean;
  ideas: ExperimentIdea[];
  setFields: (fields: Partial<ExperimentState>) => void;
  loadDemo: () => void;
  reset: () => void;
}

const demoIdeas: ExperimentIdea[] = [
  {
    id: 'I1', name: '低秩道路领域适配器', layer: '结构', gain: '+1.2%–2.4%', status: '成功', score: 93,
    hypothesis: '冻结 SAM 主体，仅训练低秩适配器即可学习裂缝纹理与尺度特征。',
    summary: '以最低训练成本验证 SAM 是否具备道路裂缝领域迁移价值。',
    modification: '在 SAM 图像编码器最后 4 个 Transformer Block 的 Q/V 投影层插入 LoRA，保持原权重冻结。',
    stepLocation: '步骤 1：建立轻量 SAM Baseline 后的首个单变量结构改造。',
    optimizationGoal: '不更换 SAM、不堆叠额外网络，仅验证少量可训练参数能否带来稳定的裂缝分割增益。',
    mainPlan: ['固定 SAM ViT-B 编码器和输入尺寸 1024×1024，只训练 Mask Decoder 与 LoRA。', '在最后 4 个 Block 的 Query/Value 线性层加入 rank=4、alpha=8 的 LoRA；这是领域建议值，需真实实验核实。', '保持数据划分、增强、优化器和训练轮数与 Baseline 完全一致，运行 3 个随机种子。', '记录 Dice、mIoU、可训练参数量、峰值显存与单图延迟。'],
    alternatives: [{ name: '增强置信度方案', approach: '将 LoRA 扩展到最后 8 个 Block。', pros: '领域适配容量更高。', cons: '训练参数和过拟合风险增加。' }, { name: '极致简化方案', approach: '只训练原 Mask Decoder，不插入 LoRA。', pros: '最快建立下界。', cons: '可能无法充分适配裂缝纹理。' }],
    recommendation: '先执行 rank=4、最后 4 个 Block 的主方案；只有增益不足且训练未过拟合时才扩大注入范围。',
    resources: ['SAM ViT-B 官方权重', '单卡消费级 GPU', 'LoRA 线性层实现'],
    goNoGo: ['Go：Dice 相对 Baseline 提升 ≥1.0 个百分点，新增可训练参数 ≤10%。', 'No-Go：3 个种子平均增益 <0.5 个百分点，或标准差大于平均增益。'],
    references: ['P001：SAM 的可提示分割与跨分布迁移能力。', '开源代码：https://github.com/facebookresearch/segment-anything（参数以官方实现为准）。'],
  },
  {
    id: 'I2', name: '细长结构边界一致性损失', layer: '损失', gain: '+1.0%–2.0%', status: '成功', score: 91,
    hypothesis: '区域损失之外加入边界监督，可减少细长裂缝断裂和边缘偏移。',
    summary: '只修改损失函数，快速验证错误是否主要集中在裂缝边界。',
    modification: '将 Baseline 的 BCE + Dice Loss 改为 BCE + Dice + 0.2×Boundary Loss，其余设置不变。',
    stepLocation: '步骤 2：在固定 SAM Baseline 上进行单变量目标函数验证。',
    optimizationGoal: '用最小代码改动验证边界建模是否能直接改善裂缝连续性。',
    mainPlan: ['由二值 Mask 通过形态学梯度生成 3 像素宽边界标签。', '保持 BCE:Dice=1:1，新增 Boundary Loss 权重从 0.2 起步。', '仅修改损失计算，不改变数据增强、网络结构和采样策略。', '同时报告 Dice、mIoU、Boundary-F1 与断裂连通分量数量。'],
    alternatives: [{ name: '更高置信度方案', approach: '比较边界权重 0.1/0.2/0.3。', pros: '可确认结论不依赖单一权重。', cons: '实验数量增至 3 倍。' }, { name: '极简方案', approach: '使用 Sobel 边缘 BCE。', pros: '实现最快。', cons: '对标注噪声更敏感。' }],
    recommendation: '先用固定权重 0.2 完成有无边界损失的单变量对照，确认有效后再调权重。',
    resources: ['Mask 形态学运算', 'Boundary-F1 评测脚本'],
    goNoGo: ['Go：Boundary-F1 提升 ≥1.5 个百分点且 Dice 不下降。', 'No-Go：边界提升伴随 Dice 下降 >0.3 个百分点。'],
    references: ['P001：SAM 输出高质量分割 Mask；道路裂缝边界权重为领域建议值，需核对更多裂缝分割文献。'],
  },
  {
    id: 'I3', name: '粗到细多尺度提示细化', layer: '推理', gain: '+0.8%–1.8%', status: '成功', score: 88,
    hypothesis: '由粗 Mask 自动生成点/框提示并二次细化，可提升小裂缝召回率。',
    summary: '复用 SAM 原生提示机制，不训练新网络，验证提示细化的直接收益。',
    modification: '第一次预测生成粗 Mask；从连通域提取正点和外接框，缩放到两个尺度后再次解码。',
    stepLocation: '步骤 3：Baseline 推理后的提示生成与二次解码。',
    optimizationGoal: '忠于 SAM 的提示式分割思路，以最少额外模块验证小裂缝漏检能否被修复。',
    mainPlan: ['对粗 Mask 取置信度最高的 3 个连通域。', '每个连通域生成中心正点与外接框，不引入人工提示。', '原尺度与 1.5 倍局部裁剪各执行一次解码，按置信度融合。', '固定编码特征缓存，只重复 Mask Decoder，记录额外延迟。'],
    alternatives: [{ name: '更稳健方案', approach: '增加负点提示抑制路面标线。', pros: '复杂背景误检更少。', cons: '提示生成逻辑更复杂。' }, { name: '低成本方案', approach: '只使用单尺度外接框。', pros: '延迟较低。', cons: '小裂缝召回提升可能有限。' }],
    recommendation: '优先验证双尺度自动提示；若延迟超过预算，退回单尺度框提示。',
    resources: ['连通域分析', 'SAM Prompt Encoder 与 Mask Decoder'],
    goNoGo: ['Go：小裂缝 Recall 提升 ≥2 个百分点且延迟增加 ≤25%。', 'No-Go：总体 Dice 提升 <0.3 个百分点或延迟超过 1.5 倍。'],
    references: ['P001：SAM 支持点、框等提示输入；提示数量与尺度为待核实的领域建议值。'],
  },
  {
    id: 'I4', name: '裂缝拓扑连续性约束', layer: '损失', gain: '+0.4%–1.2%', status: '淘汰', score: 70,
    hypothesis: '骨架连续性约束可能减少裂缝预测中的非物理断点。', summary: '在前三项之后评估拓扑损失是否提供独立贡献。',
    modification: '对预测概率图和真值骨架计算软连通性损失，权重暂设 0.1。', stepLocation: '步骤 4：边界损失之后的增量消融。', optimizationGoal: '验证拓扑信息是否超越边界监督，而不是过早构造复杂图网络。',
    mainPlan: ['离线生成真值骨架缓存。', '加入可微软骨架损失，其他配置沿用 Idea 2。', '检查细裂缝断点数、Dice 和训练稳定性。'],
    alternatives: [{ name: '后处理方案', approach: '使用形态学闭运算连接短断点。', pros: '无需训练。', cons: '可能错误连接相邻裂缝。' }], recommendation: '仅当 Idea 2 仍存在明显断裂时执行；主流程不依赖该项。', resources: ['骨架化工具', '连通性评测脚本'], goNoGo: ['Go：断点数下降 ≥15%，mIoU 提升 ≥0.5。', 'No-Go：训练波动增大或与边界损失贡献重复。'], references: ['P001 未提供道路裂缝拓扑参数；所有参数均为领域建议值，需真实验证。'],
  },
  {
    id: 'I5', name: '困难样本课程学习', layer: '训练', gain: '+0.3%–1.0%', status: '淘汰', score: 66,
    hypothesis: '逐步加入阴影、标线和低对比样本，可降低复杂背景误检。', summary: '验证困难样本排序是否值得引入额外训练流程。',
    modification: '前 30% epoch 使用清晰裂缝样本，随后逐步加入困难样本，最终使用全量数据。', stepLocation: '步骤 5：基础结构和损失稳定后的训练策略验证。', optimizationGoal: '仅改变样本进入顺序，观察困难子集收益。',
    mainPlan: ['按对比度和标注裂缝长度生成固定难度分数。', '训练阶段按 30%/30%/40% 逐步开放样本。', '与随机采样使用相同 epoch 和更新次数。'], alternatives: [{ name: '极简方案', approach: '对困难样本使用 2×采样权重。', pros: '无需阶段调度。', cons: '可能加剧噪声过拟合。' }], recommendation: '作为低优先级独立验证，不与前三个结构/损失 Idea 同时启用。', resources: ['样本难度索引文件'], goNoGo: ['Go：困难子集 F1 提升 ≥1 个百分点且普通子集不下降。', 'No-Go：总体收益有限或随机种子间不稳定。'], references: ['课程设置未由 P001 给出，属于领域建议值。'],
  },
  {
    id: 'I6', name: '测试时增强与置信融合', layer: '推理', gain: '+0.1%–0.5%', status: '失败', score: 55,
    hypothesis: '翻转和尺度变换融合可能带来无需训练的稳定增益。', summary: '作为低开发成本备选，验证精度收益是否值得推理开销。',
    modification: '对原图、水平翻转和 0.75×尺度分别推理，逆变换后按 Mask 置信度加权。', stepLocation: '步骤 6：最终模型确定后的推理阶段。', optimizationGoal: '不修改训练，用简单变换建立可量化的精度—延迟权衡。',
    mainPlan: ['固定三种输入变换。', '将预测恢复到原尺寸后按置信度归一化融合。', '同时记录 Dice 和端到端延迟。'], alternatives: [{ name: '极简方案', approach: '只做水平翻转双路融合。', pros: '开销较低。', cons: '收益可能更小。' }], recommendation: '只在前三个核心 Idea 确认后作为可选增强；若延迟超预算立即淘汰。', resources: ['无需新增训练资源'], goNoGo: ['Go：Dice 提升 ≥0.3 个百分点且延迟 <1.5 倍。', 'No-Go：延迟超过 2 倍或收益不足 0.3 个百分点。'], references: ['P001 未规定测试时增强配置，参数需真实测量。'],
  },
];

const defaultRealRuntime: ExperimentRealRuntimeConfig = {
  target: 'local',
  sshHost: '',
  sshPort: '22',
  sshUser: '',
  cpuCores: '16',
  gpuCount: '1',
  gpuModel: 'NVIDIA RTX 4090 24GB',
  memoryGb: '64',
  diskGb: '1024',
  codeDir: './experiment/code',
  dataDir: './experiment/datasets',
  resultsDir: './experiment/results',
  selectedGpus: '0',
  apiEndpoint: '',
  apiKeyHint: '',
};

const initial = {
  projectName: '', researchTopic: '', researchGoal: '', paperCount: 0,
  planConfirmed: false, disclaimerAccepted: false, runMode: 'simulated' as ExperimentRunMode,
  seed: 42, repeatCount: 3, realRuntime: defaultRealRuntime,
  completed: false, ideas: demoIdeas,
};

export const useExperimentStore = create<ExperimentState>()(
  persist(
    (set) => ({
      ...initial,
      setFields: (fields) => set(fields),
      loadDemo: () => set({
        projectName: 'RoadCrack-SAM-MVP',
        researchTopic: '面向小样本道路裂缝分割的轻量化 SAM 适配方法',
        researchGoal: '基于 Segment Anything 的可提示分割能力，设计适用于道路裂缝的低成本领域适配方案，重点提升细长结构连续性和小裂缝召回率，并通过消融实验验证各模块贡献。',
        paperCount: 1,
        planConfirmed: false,
        disclaimerAccepted: false,
        runMode: 'simulated',
        realRuntime: defaultRealRuntime,
        completed: false,
        ideas: demoIdeas,
      }),
      reset: () => set(initial),
    }),
    { name: 'navivisor-experiment-mvp' },
  ),
);
