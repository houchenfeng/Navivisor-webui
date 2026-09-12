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

export type ExperimentHydration = {
  source: 'workspace' | 'offline-fallback';
  loading: boolean;
  planMarkdown: string;
  planHeadline: string;
  shortestPath: string;
  protocolNote: string;
  resultsMarkdown: string;
  architectureMarkdown: string;
  configJson: string | null;
  comparisonHeaders: string[];
  comparisonRows: string[][];
  ablationHeaders: string[];
  ablationRows: string[][];
  comparisonFigureUrl: string | null;
  architectureFigureUrl: string | null;
  ideas: ExperimentIdea[];
  error: string | null;
};

const DEFAULT_ABLATION_HEADERS = [...DEMO_ABLATION_HEADERS];

const emptyHydration = (): ExperimentHydration => ({
  source: 'offline-fallback',
  loading: false,
  planMarkdown: DEMO_PLAN_MARKDOWN,
  planHeadline: 'EviVAD = B0 + DAA + EAD + DAG · Baseline B0：冻结 VLM + 文本侧打分',
  shortestPath: '先复现冻结 VLM Baseline B0，再按 DAA → EAD → DAG 单变量接入。',
  protocolNote: 'UCF-Crime 主评测；XD-Violence / UBnormal / MSAD 跨域；指标 AUC / AP / EAR / HR。',
  resultsMarkdown: DEMO_RESULTS_MARKDOWN,
  architectureMarkdown: DEMO_ARCHITECTURE_MARKDOWN,
  configJson: null,
  comparisonHeaders: [...DEMO_COMPARISON_HEADERS],
  comparisonRows: DEMO_COMPARISON_ROWS.map((row) => [...row]),
  ablationHeaders: [...DEFAULT_ABLATION_HEADERS],
  ablationRows: DEMO_ABLATION_ROWS.map((row) => [...row]),
  comparisonFigureUrl: null,
  architectureFigureUrl: null,
  ideas: [],
  error: null,
});

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
} | null {
  try {
    const parsed = JSON.parse(raw) as {
      baseline?: string;
      method?: string;
      protocol?: string;
      shortestPath?: string;
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
      planHeadline: [parsed.method, parsed.baseline].filter(Boolean).join(' · '),
      shortestPath: parsed.shortestPath ?? '',
      protocolNote: parsed.protocol ?? '',
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
  const [hydration, setHydration] = useState<ExperimentHydration>(emptyHydration);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!projectId) {
        if (!cancelled) setHydration(emptyHydration());
        return;
      }
      if (loading) {
        if (!cancelled) setHydration((prev) => ({ ...prev, loading: true, error: null }));
        return;
      }

      const plan =
        findLatestByPathHint(artifacts, 'experiment/plan.md') ??
        artifacts
          .filter(
            (artifact) =>
              artifact.role === 'experiment-plan' && /\.md$/i.test(artifact.path),
          )
          .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
      const innovations =
        findLatestByPathHint(artifacts, 'experiment/innovations.json') ??
        findLatestByPathHint(artifacts, 'innovations.json');
      const results = findLatestByRole(artifacts, 'experiment-results');
      const architecture = findLatestByRole(artifacts, 'method-architecture');
      const config = findLatestByRole(artifacts, 'experiment-config');
      const confirmed = findLatestByRole(artifacts, 'confirmed-topic');
      const coreReferences =
        findLatestByRole(artifacts, 'core-references') ??
        findLatestByPathHint(artifacts, 'core-references.csv');
      const mainCsv =
        findLatestByPathHint(artifacts, 'metrics/main.csv') ??
        findLatestByPathHint(artifacts, 'main.csv');
      const ablationCsv =
        findLatestByPathHint(artifacts, 'metrics/ablation.csv') ??
        findLatestByPathHint(artifacts, 'ablation.csv');
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
              question?: string;
              selectionReason?: string;
            };
            if (parsed.title) patch.researchTopic = parsed.title;
            if (parsed.question || parsed.selectionReason) {
              patch.researchGoal = parsed.question || parsed.selectionReason;
            }
            if (parsed.title) patch.projectName = parsed.title.slice(0, 48);
          } catch {
            // ignore
          }
        }
        if (configText) {
          try {
            const parsed = JSON.parse(configText) as {
              seeds?: number[];
              mode?: string;
            };
            if (parsed.seeds?.[0] != null) patch.seed = parsed.seeds[0];
            if (parsed.seeds?.length) patch.repeatCount = parsed.seeds.length;
            if (parsed.mode === 'simulated' || parsed.mode === 'real') {
              patch.runMode = parsed.mode;
            }
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

        const mainCsvParsed = mainText ? splitCsv(mainText) : { headers: [], rows: [] };
        const ablationCsvParsed = ablationText
          ? splitCsv(ablationText)
          : { headers: [], rows: [] };

        setHydration({
          source: 'workspace',
          loading: false,
          planMarkdown: planText || DEMO_PLAN_MARKDOWN,
          planHeadline: mappedIdeas?.planHeadline ?? '',
          shortestPath: mappedIdeas?.shortestPath ?? '',
          protocolNote: mappedIdeas?.protocolNote ?? '',
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
          comparisonFigureUrl: comparisonFigure
            ? artifactContentUrl(projectId, comparisonFigure.artifactId)
            : null,
          architectureFigureUrl: architectureFigure
            ? artifactContentUrl(projectId, architectureFigure.artifactId)
            : null,
          ideas: mappedIdeas?.ideas ?? [],
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
  }, [projectId, artifacts, loading, error, setFields]);

  return hydration;
}
