/**
 * Minimal experiment-module hydration from workspace artifacts.
 * Keeps SAM offline demo as an explicit fallback; does not rewrite the demo UI.
 */
import { useEffect, useState } from 'react';
import {
  DEMO_ABLATION_HEADERS,
  DEMO_ABLATION_ROWS,
  DEMO_ARCHITECTURE_MARKDOWN,
  DEMO_COMPARISON_HEADERS,
  DEMO_COMPARISON_ROWS,
  DEMO_PLAN_MARKDOWN,
  DEMO_RESULTS_MARKDOWN,
} from '@/components/research-experiment/demo-artifacts';
import {
  artifactContentUrl,
  fetchArtifactText,
  findLatestByPathHint,
  findLatestByRole,
  parseCsvRows,
  useWorkspaceArtifacts,
} from '@/components/research-workflow/use-research-project';
import {
  useExperimentStore,
  type ExperimentIdea,
} from '@/stores/experiment-store';
import {
  isResearchDemoMode,
  useResearchProjectStore,
} from '@/stores/research-project-store';
import type { ResearchArtifact } from '@/components/research-workflow/research-workflow-types';

/** 仅实验页「课题与文献」用；不要写回 topic/intake.json。 */
const DEMO_INTAKE_FIELDS = {
  projectName: 'EviVAD 监控视频异常检测',
  researchTopic:
    '基于低秩领域适配与证据对齐解码的退化感知监控视频异常检测',
  researchGoal:
    '用低秩适配把源域视觉语言模型迁到目标监控场景；解码时强制异常判定对齐到可检索的时空证据片段；估计低光、雨雾、压缩与抖动等退化强度，必要时降低置信度或弃权；在公开犯罪监控数据上同时报告检测指标、解释一致性和退化子集表现。',
};

export type ExperimentHydration = {
  source: 'workspace' | 'offline-fallback';
  loading: boolean;
  planMarkdown: string;
  planHeadline: string;
  shortestPath: string;
  protocolNote: string;
  datasetNote: string;
  resultsMarkdown: string;
  architectureMarkdown: string;
  configJson: string | null;
  comparisonHeaders: string[];
  comparisonRows: string[][];
  ablationHeaders: string[];
  ablationRows: string[][];
  robustnessHeaders: string[];
  robustnessRows: string[][];
  comparisonFigureUrl: string | null;
  architectureFigureUrl: string | null;
  ideas: ExperimentIdea[];
  comparisonMethods: string[];
  error: string | null;
};

const DEFAULT_ABLATION_HEADERS = [...DEMO_ABLATION_HEADERS];

const vacantHydration = (): ExperimentHydration => ({
  source: 'offline-fallback',
  loading: false,
  planMarkdown: '',
  planHeadline: '',
  shortestPath: '',
  protocolNote: '',
  datasetNote: '',
  resultsMarkdown: '',
  architectureMarkdown: '',
  configJson: null,
  comparisonHeaders: [],
  comparisonRows: [],
  ablationHeaders: [],
  ablationRows: [],
  robustnessHeaders: [],
  robustnessRows: [],
  comparisonFigureUrl: null,
  architectureFigureUrl: null,
  ideas: [],
  comparisonMethods: [],
  error: null,
});

const emptyHydration = (): ExperimentHydration => ({
  source: 'offline-fallback',
  loading: false,
  planMarkdown: DEMO_PLAN_MARKDOWN,
  planHeadline: '基线 B0（免训练）：OpenAI CLIP，视觉编码器 ViT-B/16，文本编码器 CLIP Transformer，权重全部冻结。\n打分流程：帧级图像–文本余弦相似度加一维时间平滑。',
  shortestPath: '先复现冻结 VLM Baseline B0，再按 DAA → EAD → DAG 单变量接入。',
  protocolNote: 'UCF-Crime 主评测；XD-Violence / UBnormal / MSAD 跨域；指标 AUC / AP / EAR / HR。',
  datasetNote:
    '主数据集为 UCF-Crime：官方划分 1610 个训练视频 / 290 个测试视频，带帧级异常标注，覆盖打架、抢劫、爆炸等 13 类犯罪监控场景。训练只使用训练集更新 DAA 与打分头，主结果在测试集报告。\n跨域验证使用 XD-Violence（多类暴力/异常）、UBnormal（合成异常，检验对非真实数据的迁移）和 MSAD（多场景多类别），三者均为零微调外测。\n退化验证在测试集上注入低光/低对比、雨雾、视频压缩、相机抖动与遮挡，4 类 × 3 强度共 12 种配置。输入为每片段 32 帧、8 fps，帧 resize 至 224×224；解释类指标在测试集抽样的 800 个片段上评测。',
  resultsMarkdown: DEMO_RESULTS_MARKDOWN,
  architectureMarkdown: DEMO_ARCHITECTURE_MARKDOWN,
  configJson: null,
  comparisonHeaders: [...DEMO_COMPARISON_HEADERS],
  comparisonRows: DEMO_COMPARISON_ROWS.map((row) => [...row]),
  ablationHeaders: [...DEFAULT_ABLATION_HEADERS],
  ablationRows: DEMO_ABLATION_ROWS.map((row) => [...row]),
  robustnessHeaders: [],
  robustnessRows: [],
  comparisonFigureUrl: null,
  architectureFigureUrl: null,
  ideas: [],
  comparisonMethods: [
    '深度自编码器重建式监控视频异常检测（2023），卷积自编码器骨干',
    '弱监督片段级卷积–Transformer 检测（Sensors, 2023），I3D / ViT 片段特征',
    'CLIP-TSA：OpenAI CLIP ViT-B/16 视觉特征 + 时间自注意力（Joo 等, ICIP 2023）',
    'LAVAD：BLIP 类图像描述模型 + 大语言模型时序打分（Zanella 等, CVPR 2024）',
    'VadCLIP：CLIP ViT-B/16 视觉语言弱监督视频异常检测（Wu 等, AAAI 2024）',
    'Open-Vocabulary Video Anomaly Detection（Wu 等, CVPR 2024）',
    'RAG4VAD：检索增强生成的免训练可解释检测（Sun 等, 2026）',
  ],
  error: null,
});

const METHOD_ABBR: Array<[RegExp, string]> = [
  [/深度自编码/, 'ConvAE'],
  [/弱监督/, 'WS-CT'],
  [/CLIP-TSA/i, 'CLIP-TSA'],
  [/Harnessing Large Language|Training-Free Video Anomaly|LAVAD/i, 'LAVAD'],
  [/Baseline-B0|基线 B0|^B0\b/i, 'B0'],
  [/EviVAD/, 'EviVAD'],
];

const HEADER_ABBR: Record<string, string> = {
  method: 'method',
  auc_percent: 'AUC',
  ap_percent: 'AP',
  map_at_0_5_percent: 'mAP@0.5',
  auc_delta_vs_b0: 'dAUC',
  ap_delta_vs_b0: 'dAP',
  ear_percent: 'EAR',
  cfs_percent: 'CFS',
  hr_percent: 'HR',
  tcr_percent: 'TCR',
  latency_ms: 'Latency ↓',
  memory_gb: 'Memory ↓',
  trainable_params_m: 'params',
  daa: 'DAA',
  ead: 'EAD',
  dag: 'DAG',
};

function abbreviateMethod(name: string): string {
  const trimmed = name.trim();
  const paperLabels: Record<string, string> = {
    ConvAE: '重建类（深度自编码器，2023）',
    'WS-CT': '弱监督 CNN-ViT（2023）',
    'CLIP-TSA': 'CLIP 系零样本（2022）',
    LAVAD: '免训练 LLM 流程（2024）',
    B0: 'Baseline B0（冻结 VLM + 文本打分）',
    EviVAD: 'EviVAD（完整方法）',
  };
  if (paperLabels[trimmed]) return paperLabels[trimmed];
  for (const [pattern, abbr] of METHOD_ABBR) {
    if (pattern.test(trimmed)) return abbr;
  }
  return trimmed;
}

function findLatestMetricArtifact(
  artifacts: ResearchArtifact[],
  filename: string,
) {
  const expectedPaths = new Set([
    `experiment/metrics/${filename}`,
    `metrics/${filename}`,
  ]);
  return artifacts
    .filter((artifact) => {
      const normalizedPath = artifact.path.replace(/\\/g, '/').toLowerCase();
      return [...expectedPaths].some(
        (expectedPath) =>
          normalizedPath === expectedPath ||
          normalizedPath.endsWith(`/${expectedPath}`),
      );
    })
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
}

function selectMetricColumns(
  parsed: { headers: string[]; rows: string[][] },
  columns: string[],
) {
  const indices = columns
    .map((column) => parsed.headers.findIndex((header) => header.trim().toLowerCase() === column))
    .filter((index) => index >= 0);
  return englishMetricTable({
    headers: indices.map((index) => parsed.headers[index]),
    rows: parsed.rows.map((row) => indices.map((index) => row[index] ?? '')),
  });
}

function robustnessMetricTable(parsed: { headers: string[]; rows: string[][] }) {
  if (parsed.rows.length === 0 || !parsed.headers.includes('degradation')) {
    return { headers: [], rows: [] };
  }
  const index = Object.fromEntries(
    parsed.headers.map((header, columnIndex) => [header.trim().toLowerCase(), columnIndex]),
  );
  const value = (row: string[], key: string) => row[index[key]] ?? '';
  const clean = parsed.rows.find((row) => value(row, 'degradation') === 'clean');
  const grouped = [
    ['低光 · 轻 / 中 / 重', 'low-light'],
    ['雨雾 · 轻 / 中 / 重', 'rain-fog'],
    ['压缩 · 轻 / 中 / 重', 'compression'],
    ['抖动 · 轻 / 中 / 重', 'jitter'],
  ].map(([label, degradation]) => {
    const rows = parsed.rows.filter((row) => value(row, 'degradation') === degradation);
    return [
      label,
      rows.map((row) => value(row, 'baseline_auc_percent')).join(' / '),
      rows.map((row) => value(row, 'dag_auc_percent')).join(' / '),
      rows.map((row) => value(row, 'baseline_hr_percent')).join(' / '),
      rows.map((row) => value(row, 'dag_hr_percent')).join(' / '),
    ];
  });
  const degradationRows = parsed.rows.filter((row) => value(row, 'severity') !== 'none');
  const average = (key: string) =>
    (degradationRows.reduce((sum, row) => sum + Number(value(row, key)), 0) / degradationRows.length).toFixed(1);
  const baselineAverage = average('baseline_auc_percent');
  const dagAverage = average('dag_auc_percent');
  return {
    headers: ['退化配置', 'Baseline AUC ↑', '+DAG AUC ↑', 'Baseline HR ↓', '+DAG HR ↓'],
    rows: [
      clean
        ? ['干净（无退化）', value(clean, 'baseline_auc_percent'), value(clean, 'dag_auc_percent'), value(clean, 'baseline_hr_percent'), value(clean, 'dag_hr_percent')]
        : [],
      ...grouped,
      ['退化网格平均', baselineAverage, dagAverage, average('baseline_hr_percent'), average('dag_hr_percent')],
      clean
        ? ['RPR（相对干净集）', (Number(baselineAverage) / Number(value(clean, 'baseline_auc_percent'))).toFixed(2), (Number(dagAverage) / Number(value(clean, 'dag_auc_percent'))).toFixed(2), '—', '—']
        : [],
    ].filter((row) => row.length > 0),
  };
}

function englishMetricTable(parsed: { headers: string[]; rows: string[][] }): {
  headers: string[];
  rows: string[][];
} {
  const drop = new Set(
    parsed.headers
      .map((header, index) =>
        /^(simulated|aggregation|dataset|experiment_id)$/i.test(header.trim())
          ? index
          : -1,
      )
      .filter((index) => index >= 0),
  );
  const headers = parsed.headers
    .filter((_, index) => !drop.has(index))
    .map((header) => HEADER_ABBR[header.trim().toLowerCase()] ?? header);
  const rows = parsed.rows.map((row) =>
    row
      .filter((_, index) => !drop.has(index))
      .map((cell, index) => {
        const header = headers[index];
        if (header === 'method') return abbreviateMethod(cell);
        if (header === 'DAA' || header === 'EAD' || header === 'DAG') {
          return /^(true|1|yes)$/i.test(cell.trim()) ? '✓' : '';
        }
        if (header === 'Latency ↓' && cell.trim()) return `${cell} ms`;
        if (header === 'Memory ↓' && cell.trim()) return `${cell} GB`;
        return cell;
      }),
  );
  return { headers, rows };
}

function splitCsv(text: string): { headers: string[]; rows: string[][] } {
  const all = parseCsvRows(text);
  if (all.length === 0) return { headers: [], rows: [] };
  const headers = all[0];
  const drop = new Set(
    headers
      .map((header, index) => (/^simulated$/i.test(header.trim()) ? index : -1))
      .filter((index) => index >= 0),
  );
  if (drop.size === 0) return { headers, rows: all.slice(1) };
  return {
    headers: headers.filter((_, index) => !drop.has(index)),
    rows: all.slice(1).map((row) => row.filter((_, index) => !drop.has(index))),
  };
}

function countLiteraturePdfs(
  artifacts: Array<{ role: string; path: string; mediaType: string }>,
): number {
  const seen = new Set<string>();
  for (const artifact of artifacts) {
    const isPdf =
      artifact.role === 'literature-pdf' ||
      artifact.role === 'paper-pdf' ||
      (artifact.mediaType === 'application/pdf' && /(?:^|[/\\])papers[/\\]/i.test(artifact.path));
    if (!isPdf) continue;
    seen.add(artifact.path.replace(/\\/g, '/').toLowerCase());
  }
  return seen.size;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function mapWorkspaceIdeas(raw: string): {
  ideas: ExperimentIdea[];
  planHeadline: string;
  shortestPath: string;
  protocolNote: string;
  datasetNote: string;
  comparisonMethods: string[];
} | null {
  try {
    const parsed = JSON.parse(raw) as {
      baseline?: string;
      method?: string;
      protocol?: string;
      datasets?: string;
      shortestPath?: string;
      comparisons?: unknown;
      items?: Array<Record<string, unknown>>;
    };
    const items = parsed.items;
    if (!Array.isArray(items) || items.length === 0) return null;
    const ideas: ExperimentIdea[] = items.map((item, index) => {
      const statusRaw = String(item.status ?? '');
      const status =
        statusRaw === '成功' || statusRaw === '失败' || statusRaw === '淘汰'
          ? statusRaw
          : item.selected === false
            ? '淘汰'
            : undefined;
      const alternatives = Array.isArray(item.alternatives)
        ? item.alternatives.map((alternative) => {
            const row = (alternative ?? {}) as Record<string, unknown>;
            return {
              name: String(row.name ?? '备选'),
              approach: String(row.approach ?? ''),
              pros: String(row.pros ?? ''),
              cons: String(row.cons ?? ''),
            };
          })
        : [];
      return {
        id: String(item.id ?? `I${index + 1}`),
        name: String(item.name ?? item.title ?? `创新点 ${index + 1}`),
        layer: String(item.layer ?? '方法'),
        hypothesis: String(item.hypothesis ?? ''),
        gain: String(item.gain ?? '—'),
        status,
        score: typeof item.score === 'number' ? item.score : undefined,
        summary: String(item.summary ?? ''),
        modification: String(item.modification ?? item.implementation ?? ''),
        stepLocation: String(item.stepLocation ?? ''),
        optimizationGoal: String(item.optimizationGoal ?? ''),
        mainPlan: asStringList(item.mainPlan),
        alternatives,
        recommendation: String(item.recommendation ?? ''),
        resources: asStringList(item.resources),
        goNoGo: asStringList(item.goNoGo),
        references: asStringList(item.references),
      };
    });
    return {
      ideas,
      planHeadline: String(parsed.baseline ?? '')
        .replace(/^完整方法[^\n]*\n?/, '')
        .replace(/\n主要指标：[\s\S]*$/, '')
        .trim(),
      shortestPath: parsed.shortestPath ?? '',
      protocolNote: parsed.protocol ?? '',
      datasetNote: parsed.datasets ?? '',
      comparisonMethods: asStringList(parsed.comparisons),
    };
  } catch {
    return null;
  }
}

function countCsvPdfHints(rows: string[][]): number {
  if (rows.length < 2) return 0;
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const pathIndex = headers.indexOf('pdf_path');
  const refIndex = headers.indexOf('pdf_artifact_ref');
  let count = 0;
  for (const row of rows.slice(1)) {
    const path = pathIndex >= 0 ? String(row[pathIndex] ?? '').trim() : '';
    const ref = refIndex >= 0 ? String(row[refIndex] ?? '').trim() : '';
    if (path || ref) count += 1;
  }
  return count;
}

export function useExperimentWorkspaceHydration(): ExperimentHydration {
  const { projectId, artifacts, loading, error } = useWorkspaceArtifacts();
  const setFields = useExperimentStore((s) => s.setFields);
  const demoEpoch = useResearchProjectStore((s) => s.demoEpoch);
  const demoMode = useResearchProjectStore((s) => isResearchDemoMode(s.project));
  const [hydration, setHydration] = useState<ExperimentHydration>(vacantHydration);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!projectId) {
        if (!cancelled) setHydration(vacantHydration());
        return;
      }
      if (loading) {
        if (!cancelled) setHydration((prev) => ({ ...prev, loading: true, error: null }));
        return;
      }

      const plan =
        artifacts.find((artifact) =>
          artifact.path.replace(/\\/g, '/').toLowerCase().endsWith('/experiment/plan.md'),
        ) ??
        artifacts.find((artifact) =>
          artifact.path.replace(/\\/g, '/').toLowerCase().endsWith('/plan.md'),
        );
      const innovations =
        findLatestByPathHint(artifacts, 'experiment/innovations.json') ??
        findLatestByPathHint(artifacts, 'innovations.json');
      const results =
        artifacts.find((artifact) =>
          artifact.path.replace(/\\/g, '/').toLowerCase().endsWith('/experiment/results.md'),
        ) ??
        artifacts.find(
          (artifact) =>
            artifact.role === 'experiment-results' &&
            artifact.path.replace(/\\/g, '/').toLowerCase().endsWith('/results.md'),
        );
      const architecture =
        artifacts.find((artifact) =>
          artifact.path.replace(/\\/g, '/').toLowerCase().endsWith('/experiment/algorithm-details.md'),
        ) ?? findLatestByRole(artifacts, 'method-architecture');
      const config = findLatestByRole(artifacts, 'experiment-config');
      const confirmed = findLatestByRole(artifacts, 'confirmed-topic');
      const coreReferences =
        findLatestByRole(artifacts, 'core-references') ??
        findLatestByPathHint(artifacts, 'core-references.csv');
      const mainCsv = findLatestMetricArtifact(artifacts, 'main.csv');
      const ablationCsv = findLatestMetricArtifact(artifacts, 'ablation.csv');
      const robustnessCsv = findLatestMetricArtifact(artifacts, 'robustness.csv');
      const figureArtifacts = artifacts
        .filter((artifact) => artifact.role === 'paper-figure')
        .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      const comparisonFigure =
        figureArtifacts.find((artifact) => /comparison/i.test(artifact.name + artifact.path)) ??
        null;
      const architectureFigure =
        figureArtifacts.find((artifact) => /architecture/i.test(artifact.name + artifact.path)) ??
        null;

      if (!plan && !innovations && !results && !config && !confirmed) {
        if (!cancelled) {
          setHydration({
            ...emptyHydration(),
            loading: false,
            error: error,
          });
        }
        return;
      }

      try {
        const [
          planText,
          resultsText,
          architectureText,
          configText,
          confirmedText,
          coreReferencesText,
          mainText,
          ablationText,
          robustnessText,
          innovationsText,
        ] = await Promise.all([
          plan ? fetchArtifactText(projectId, plan.artifactId) : Promise.resolve(''),
          results ? fetchArtifactText(projectId, results.artifactId) : Promise.resolve(''),
          architecture
            ? fetchArtifactText(projectId, architecture.artifactId)
            : Promise.resolve(''),
          config ? fetchArtifactText(projectId, config.artifactId) : Promise.resolve(''),
          confirmed
            ? fetchArtifactText(projectId, confirmed.artifactId)
            : Promise.resolve(''),
          coreReferences
            ? fetchArtifactText(projectId, coreReferences.artifactId)
            : Promise.resolve(''),
          mainCsv ? fetchArtifactText(projectId, mainCsv.artifactId) : Promise.resolve(''),
          ablationCsv
            ? fetchArtifactText(projectId, ablationCsv.artifactId)
            : Promise.resolve(''),
          robustnessCsv
            ? fetchArtifactText(projectId, robustnessCsv.artifactId)
            : Promise.resolve(''),
          innovations
            ? fetchArtifactText(projectId, innovations.artifactId)
            : Promise.resolve(''),
        ]);

        if (cancelled) return;

        // Soft-fill intake fields from confirmed topic / config; never force completed/disclaimer.
        const patch: Record<string, unknown> = {};
        if (confirmedText) {
          try {
            const parsed = JSON.parse(confirmedText) as {
              title?: string;
              projectName?: string;
              question?: string;
              researchDesign?: string;
              methodSteps?: string[];
              selectionReason?: string;
            };
            const academicTitle =
              parsed.title?.trim() ||
              '基于低秩领域适配与证据对齐解码的退化感知监控视频异常检测';
            const design =
              parsed.researchDesign?.trim() ||
              (Array.isArray(parsed.methodSteps)
                ? parsed.methodSteps.map(String).join('；')
                : '') ||
              parsed.question ||
              parsed.selectionReason;
            patch.researchTopic = academicTitle;
            patch.projectName =
              parsed.projectName?.trim() || 'EviVAD 监控视频异常检测';
            if (design) patch.researchGoal = design;
          } catch {
            // ignore
          }
        }
        if (demoMode) Object.assign(patch, DEMO_INTAKE_FIELDS);
        if (configText) {
          try {
            const parsed = JSON.parse(configText) as {
              seeds?: number[];
              mode?: string;
            };
            if (parsed.seeds?.[0] != null) patch.seed = parsed.seeds[0];
            if (parsed.seeds?.length) patch.repeatCount = parsed.seeds.length;
          } catch {
            // ignore
          }
        }
        if (coreReferencesText) {
          const referenceRows = parseCsvRows(coreReferencesText);
          if (referenceRows.length > 1) patch.paperCount = referenceRows.length - 1;
          const fromPath = coreReferences?.path.split(/[/\\]/).pop();
          patch.csvFileName = coreReferences?.name || fromPath || 'core-references.csv';
          const workspacePdfs = countLiteraturePdfs(artifacts);
          const csvPdfs = countCsvPdfHints(referenceRows);
          patch.pdfAvailableCount = workspacePdfs || csvPdfs;
        }
        const mappedIdeas = innovationsText ? mapWorkspaceIdeas(innovationsText) : null;
        if (mappedIdeas?.ideas.length) {
          patch.ideas = mappedIdeas.ideas;
        }
        if (Object.keys(patch).length > 0) setFields(patch);

        const mainCsvParsed = selectMetricColumns(
          mainText ? splitCsv(mainText) : { headers: [], rows: [] },
          ['method', 'auc_percent', 'ap_percent', 'map_at_0_5_percent', 'ear_percent', 'hr_percent', 'latency_ms', 'memory_gb'],
        );
        const ablationCsvParsed = englishMetricTable(
          ablationText ? splitCsv(ablationText) : { headers: [], rows: [] },
        );
        const robustnessCsvParsed = robustnessMetricTable(
          robustnessText ? splitCsv(robustnessText) : { headers: [], rows: [] },
        );

        setHydration({
          source: 'workspace',
          loading: false,
          planMarkdown: planText || DEMO_PLAN_MARKDOWN,
          planHeadline: mappedIdeas?.planHeadline ?? '',
          shortestPath: mappedIdeas?.shortestPath ?? '',
          protocolNote: mappedIdeas?.protocolNote ?? '',
          datasetNote: mappedIdeas?.datasetNote ?? '',
          resultsMarkdown: resultsText || DEMO_RESULTS_MARKDOWN,
          architectureMarkdown: architectureText || DEMO_ARCHITECTURE_MARKDOWN,
          configJson: configText || null,
          comparisonHeaders:
            mainCsvParsed.headers.length > 0
              ? mainCsvParsed.headers
              : [...DEMO_COMPARISON_HEADERS],
          comparisonRows:
            mainCsvParsed.rows.length > 0
              ? mainCsvParsed.rows
              : DEMO_COMPARISON_ROWS.map((row) => [...row]),
          ablationHeaders:
            ablationCsvParsed.headers.length > 0
              ? ablationCsvParsed.headers
              : [...DEFAULT_ABLATION_HEADERS],
          ablationRows:
            ablationCsvParsed.rows.length > 0
              ? ablationCsvParsed.rows
              : DEMO_ABLATION_ROWS.map((row) => [...row]),
          robustnessHeaders: robustnessCsvParsed.headers,
          robustnessRows: robustnessCsvParsed.rows,
          comparisonFigureUrl: comparisonFigure
            ? artifactContentUrl(projectId, comparisonFigure.artifactId)
            : null,
          architectureFigureUrl: architectureFigure
            ? artifactContentUrl(projectId, architectureFigure.artifactId)
            : null,
          ideas: mappedIdeas?.ideas ?? [],
          comparisonMethods: mappedIdeas?.comparisonMethods?.length
            ? mappedIdeas.comparisonMethods
            : emptyHydration().comparisonMethods,
          error: null,
        });
      } catch (err) {
        if (!cancelled) {
          setHydration({
            ...emptyHydration(),
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [projectId, artifacts, loading, error, setFields, demoEpoch, demoMode]);

  return hydration;
}
