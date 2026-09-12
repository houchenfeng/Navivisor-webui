/**
 * Minimal experiment-module hydration from workspace artifacts.
 * Keeps SAM offline demo as an explicit fallback; does not rewrite the demo UI.
 */
import { useEffect, useState } from 'react';
import {
  DEMO_ABLATION_ROWS,
  DEMO_ARCHITECTURE_MARKDOWN,
  DEMO_COMPARISON_HEADERS,
  DEMO_COMPARISON_ROWS,
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
import { useExperimentStore } from '@/stores/experiment-store';

export type ExperimentHydration = {
  source: 'workspace' | 'offline-fallback';
  loading: boolean;
  planMarkdown: string;
  resultsMarkdown: string;
  architectureMarkdown: string;
  configJson: string | null;
  comparisonHeaders: string[];
  comparisonRows: string[][];
  ablationHeaders: string[];
  ablationRows: string[][];
  comparisonFigureUrl: string | null;
  architectureFigureUrl: string | null;
  error: string | null;
};

const DEFAULT_ABLATION_HEADERS = [
  'DLA',
  'BED',
  'CMP',
  'mIoU ↑',
  'Dice ↑',
  'Boundary-F1 ↑',
  '延迟 ms',
];

const emptyHydration = (): ExperimentHydration => ({
  source: 'offline-fallback',
  loading: false,
  planMarkdown: '',
  resultsMarkdown: DEMO_RESULTS_MARKDOWN,
  architectureMarkdown: DEMO_ARCHITECTURE_MARKDOWN,
  configJson: null,
  comparisonHeaders: [...DEMO_COMPARISON_HEADERS],
  comparisonRows: DEMO_COMPARISON_ROWS.map((row) => [...row]),
  ablationHeaders: [...DEFAULT_ABLATION_HEADERS],
  ablationRows: DEMO_ABLATION_ROWS.map((row) => [...row]),
  comparisonFigureUrl: null,
  architectureFigureUrl: null,
  error: null,
});

function splitCsv(text: string): { headers: string[]; rows: string[][] } {
  const all = parseCsvRows(text);
  if (all.length === 0) return { headers: [], rows: [] };
  return { headers: all[0], rows: all.slice(1) };
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

      const plan = findLatestByRole(artifacts, 'experiment-plan');
      const results = findLatestByRole(artifacts, 'experiment-results');
      const architecture = findLatestByRole(artifacts, 'method-architecture');
      const config = findLatestByRole(artifacts, 'experiment-config');
      const confirmed = findLatestByRole(artifacts, 'confirmed-topic');
      const coreReferences = findLatestByRole(artifacts, 'core-references');
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

      if (!plan && !results && !config && !confirmed) {
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
        }
        if (Object.keys(patch).length > 0) setFields(patch);

        const mainCsvParsed = mainText ? splitCsv(mainText) : { headers: [], rows: [] };
        const ablationCsvParsed = ablationText
          ? splitCsv(ablationText)
          : { headers: [], rows: [] };

        setHydration({
          source: 'workspace',
          loading: false,
          planMarkdown: planText,
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
