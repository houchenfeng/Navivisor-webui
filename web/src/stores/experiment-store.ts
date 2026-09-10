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
}

interface ExperimentState {
  projectName: string;
  researchTopic: string;
  researchGoal: string;
  paperCount: number;
  planConfirmed: boolean;
  disclaimerAccepted: boolean;
  seed: number;
  repeatCount: number;
  completed: boolean;
  ideas: ExperimentIdea[];
  setFields: (fields: Partial<ExperimentState>) => void;
  loadDemo: () => void;
  reset: () => void;
}

const demoIdeas: ExperimentIdea[] = [
  { id: 'I1', name: '动态图谱长期记忆', layer: '结构', hypothesis: '长期拓扑记忆可缓解遮挡导致的轨迹断裂', gain: '+3.2%–5.1%', status: '成功', score: 92 },
  { id: 'I2', name: '跨智能体可信门控', layer: '特征融合', hypothesis: '置信门控可抑制低质量协同消息', gain: '+2.4%–4.0%', status: '成功', score: 89 },
  { id: 'I3', name: '时空一致性损失', layer: '损失', hypothesis: '跨帧一致性约束可提升动态场景稳定性', gain: '+1.8%–3.3%', status: '成功', score: 86 },
  { id: 'I4', name: '高分辨率全局注意力', layer: '结构', hypothesis: '全局注意力可能提升远距离目标感知', gain: '+0.2%–1.1%', status: '淘汰', score: 61 },
  { id: 'I5', name: '自适应多阶段蒸馏', layer: '训练', hypothesis: '教师置信度调度可改善小目标表征', gain: '-0.4%–1.5%', status: '失败', score: 54 },
];

const initial = {
  projectName: '', researchTopic: '', researchGoal: '', paperCount: 0,
  planConfirmed: false, disclaimerAccepted: false, seed: 42, repeatCount: 3,
  completed: false, ideas: demoIdeas,
};

export const useExperimentStore = create<ExperimentState>()(
  persist(
    (set) => ({
      ...initial,
      setFields: (fields) => set(fields),
      loadDemo: () => set({
        projectName: '可信多智能体视觉协同',
        researchTopic: '面向动态道路场景的图谱化长期空间记忆与可信多智能体协同推理方法',
        researchGoal: '提升遮挡、通信噪声和长时序条件下的目标检测稳定性与可解释性。',
        paperCount: 12,
        ideas: demoIdeas,
      }),
      reset: () => set(initial),
    }),
    { name: 'navivisor-experiment-mvp' },
  ),
);

