/**
 * Build WritingData patch from workspace artifacts or experiment module outputs.
 */
import {
  DEMO_ARCHITECTURE_MARKDOWN,
  DEMO_BIBTEX,
  DEMO_COMPARISON_HEADERS,
  DEMO_COMPARISON_ROWS,
  DEMO_RESULTS_MARKDOWN,
} from '@/components/research-experiment/demo-artifacts';
import {
  fetchArtifactText,
  findLatestByPathHint,
  findLatestByRole,
  loadArtifacts,
} from '@/components/research-workflow/use-research-project';
import type { WritingData } from '@/components/research-writing/data/writingSteps';
import { formatMaterialForReading } from '@/components/research-writing/lib/format-material';
import { useExperimentStore } from '@/stores/experiment-store';
import { useResearchProjectStore } from '@/stores/research-project-store';

export type ExperimentFillResult = {
  patch: Partial<WritingData>;
  source: 'workspace' | 'store' | 'demo-fallback';
  topic: string;
};

function buildStoreOrDemoPatch(source: 'store' | 'demo-fallback'): ExperimentFillResult {
  const state = useExperimentStore.getState();
  const topic =
    state.researchTopic.trim() ||
    (source === 'demo-fallback'
      ? '面向小样本道路裂缝分割的轻量化 SAM 适配方法'
      : '');
  const projectName = state.projectName.trim() || 'RoadCrack-SAM-MVP';
  const researchGoal = state.researchGoal.trim() || '（未填写）';
  const winners = state.ideas.filter((idea) => idea.status === '成功');
  const ideaBlock = winners
    .map(
      (idea, index) =>
        `### 创新点 ${index + 1}: ${idea.name}\n` +
        `- 假设：${idea.hypothesis}\n` +
        `- 改动：${idea.modification}\n` +
        `- 贡献：${idea.gain}\n` +
        `- Go/No-Go：${idea.goNoGo.join('；')}`,
    )
    .join('\n\n');

  const detail = [
    `# ${topic || projectName}`,
    '',
    `## 研究目标`,
    researchGoal,
    '',
    `## 项目`,
    projectName,
    '',
    `## 成功创新点摘要`,
    ideaBlock || '（暂无成功 Idea）',
    '',
    `## 算法架构文档`,
    DEMO_ARCHITECTURE_MARKDOWN,
  ].join('\n');

  const resultDoc = [
    source === 'demo-fallback'
      ? '<!-- source: demo-fallback -->'
      : '<!-- source: experiment-store -->',
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

  return {
    source,
    topic: topic || projectName,
    patch: {
      topic: topic || projectName,
      experimentDetail: detail,
      experimentResult: resultDoc,
      bibContent: DEMO_BIBTEX,
      experimentTables: [],
      experimentTable: { title: '结果表格', headers: [], rows: [] },
      references:
        references.length > 0
          ? references
          : [
              {
                key: 'sam2023',
                text: '[1] Kirillov et al. Segment Anything. arXiv:2304.02643, 2023.',
              },
            ],
    },
  };
}

/** Prefer workspace artifacts; never force experiment store completed/disclaimer. */
export async function fillWritingFromExperiment(): Promise<ExperimentFillResult> {
  const projectId = useResearchProjectStore.getState().project?.projectId?.trim();

  if (projectId) {
    try {
      const artifacts = await loadArtifacts(projectId);
      const plan =
        findLatestByPathHint(artifacts, 'experiment/plan.md') ??
        artifacts
          .filter(
            (artifact) =>
              artifact.role === 'experiment-plan' && /\.md$/i.test(artifact.path),
          )
          .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
      const innovations = findLatestByPathHint(artifacts, 'innovations.json');
      const results =
        findLatestByPathHint(artifacts, 'experiment/results.md') ??
        findLatestByPathHint(artifacts, 'results.md') ??
        findLatestByRole(artifacts, 'experiment-results');
      const confirmed = findLatestByRole(artifacts, 'confirmed-topic');
      const architecture =
        findLatestByPathHint(artifacts, 'experiment/algorithm-details.md') ??
        findLatestByPathHint(artifacts, 'algorithm-details.md') ??
        findLatestByRole(artifacts, 'method-architecture');
      const bib = findLatestByRole(artifacts, 'literature-bib');

      if (plan || results || confirmed || innovations) {
        const [
          planText,
          resultsText,
          confirmedText,
          architectureText,
          bibText,
          innovationsText,
        ] =
          await Promise.all([
            plan ? fetchArtifactText(projectId, plan.artifactId) : Promise.resolve(''),
            results
              ? fetchArtifactText(projectId, results.artifactId)
              : Promise.resolve(''),
            confirmed
              ? fetchArtifactText(projectId, confirmed.artifactId)
              : Promise.resolve(''),
            architecture
              ? fetchArtifactText(projectId, architecture.artifactId)
              : Promise.resolve(''),
            bib ? fetchArtifactText(projectId, bib.artifactId) : Promise.resolve(''),
            innovations
              ? fetchArtifactText(projectId, innovations.artifactId)
              : Promise.resolve(''),
          ]);

        let topic = useExperimentStore.getState().researchTopic.trim();
        try {
          const parsed = confirmedText
            ? (JSON.parse(confirmedText) as { title?: string; question?: string })
            : null;
          topic = parsed?.title?.trim() || parsed?.question?.trim() || topic;
        } catch {
          // keep topic
        }

        const detailParts = [
          topic ? `# ${topic}` : '',
          confirmedText
            ? ['## 确认课题', formatMaterialForReading(confirmedText)].join('\n')
            : '',
          innovationsText
            ? ['## 创新点方案', formatMaterialForReading(innovationsText)].join('\n')
            : '',
          planText
            ? ['## 实验方案', formatMaterialForReading(planText)].join('\n')
            : '',
          architectureText
            ? ['## 算法架构', formatMaterialForReading(architectureText)].join('\n')
            : '',
        ].filter(Boolean);

        return {
          source: 'workspace',
          topic: topic || '工作目录课题',
          patch: {
            topic: topic || '工作目录课题',
            experimentDetail: detailParts.join('\n\n') || planText,
            experimentResult: resultsText
              ? formatMaterialForReading(resultsText)
              : '（工作目录暂无实验结果文件）',
            bibContent: bibText || DEMO_BIBTEX,
            experimentTables: [],
            experimentTable: { title: '结果表格', headers: [], rows: [] },
          },
        };
      }
    } catch {
      // fall through to store / demo-fallback
    }
  }

  const store = useExperimentStore.getState();
  if (store.researchTopic.trim()) {
    return buildStoreOrDemoPatch('store');
  }

  return buildStoreOrDemoPatch('demo-fallback');
}
