/**
 * Build WritingData patch from experiment module outputs (demo-ready).
 */
import {
  DEMO_ARCHITECTURE_MARKDOWN,
  DEMO_BIBTEX,
  DEMO_COMPARISON_HEADERS,
  DEMO_COMPARISON_ROWS,
  DEMO_RESULTS_MARKDOWN,
} from '@/components/research-experiment/demo-artifacts';
import type { WritingData } from '@/components/research-writing/data/writingSteps';
import { useExperimentStore } from '@/stores/experiment-store';

export type ExperimentFillResult = {
  patch: Partial<WritingData>;
  source: 'store' | 'demo-fallback';
  topic: string;
};

/** Ensure experiment store has usable demo topic, then map artifacts into writing fields. */
export function fillWritingFromExperiment(): ExperimentFillResult {
  const store = useExperimentStore.getState();
  let source: ExperimentFillResult['source'] = 'store';

  if (!store.researchTopic.trim()) {
    store.loadDemo();
    source = 'demo-fallback';
  }

  // Mark completed so later modules can treat handoff as ready.
  const latest = useExperimentStore.getState();
  if (!latest.completed) {
    latest.setFields({ completed: true, planConfirmed: true, disclaimerAccepted: true });
  }

  const state = useExperimentStore.getState();
  const winners = state.ideas.filter((idea) => idea.status === '成功');
  const ideaBlock = winners
    .map(
      (idea, index) =>
        `### 创新点 ${index + 1}: ${idea.name}\n` +
        `- 假设：${idea.hypothesis}\n` +
        `- 改动：${idea.modification}\n` +
        `- 模拟贡献：${idea.gain}\n` +
        `- Go/No-Go：${idea.goNoGo.join('；')}`,
    )
    .join('\n\n');

  const detail = [
    `# ${state.researchTopic}`,
    '',
    `## 研究目标`,
    state.researchGoal || '（未填写）',
    '',
    `## 项目`,
    state.projectName || 'RoadCrack-SAM-MVP',
    '',
    `## 成功创新点摘要`,
    ideaBlock || '（暂无成功 Idea）',
    '',
    `## 算法架构文档`,
    DEMO_ARCHITECTURE_MARKDOWN,
  ].join('\n');

  const resultDoc = [
    DEMO_RESULTS_MARKDOWN,
    '',
    '## 主实验结果表（Demo）',
    '',
    `| ${DEMO_COMPARISON_HEADERS.join(' | ')} |`,
    `| ${DEMO_COMPARISON_HEADERS.map(() => '---').join(' | ')} |`,
    ...DEMO_COMPARISON_ROWS.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

  const references = winners.flatMap((idea, ideaIndex) =>
    idea.references.map((text, refIndex) => ({
      key: `${idea.id}-${refIndex + 1}`,
      text: `[${ideaIndex + 1}.${refIndex + 1}] ${text}`,
    })),
  );

  const patch: Partial<WritingData> = {
    topic: state.researchTopic,
    experimentDetail: detail,
    experimentResult: resultDoc,
    bibContent: DEMO_BIBTEX,
    experimentTable: {
      headers: [...DEMO_COMPARISON_HEADERS],
      rows: DEMO_COMPARISON_ROWS.map((row) => [...row]),
    },
    references:
      references.length > 0
        ? references
        : [
            {
              key: 'sam2023',
              text: '[1] Kirillov et al. Segment Anything. arXiv:2304.02643, 2023.',
            },
          ],
  };

  return { patch, source, topic: state.researchTopic };
}
