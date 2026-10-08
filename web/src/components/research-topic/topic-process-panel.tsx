/**
 * The two-section process panel (T49).
 *
 * Renders every stage card in execution order so the operator can see the whole
 * pipeline at once. It is a pure component: it takes the stage snapshot and
 * callbacks, and owns no fetching. That keeps the ordering and the
 * "which card gets which stage payload" mapping testable without a server.
 */
import { CandidateTopicCard } from './cards/candidate-topic-card';
import { CoreQueryCard } from './cards/core-query-card';
import { BaselineCard } from './cards/baseline-card';
import { BatchAnalysisCard, summarizeBatches } from './cards/batch-analysis-card';
import { BatchPrepCard } from './cards/batch-prep-card';
import { FallbackLogCard } from './cards/fallback-log-card';
import { LandscapeCard } from './cards/landscape-card';
import { PdfDownloadCard } from './cards/pdf-download-card';
import { QueryPlanCard } from './cards/query-plan-card';
import { RelevanceCard } from './cards/relevance-card';
import { RelevanceScoreCard } from './cards/relevance-score-card';
import { ResearchGapCard } from './cards/research-gap-card';
import { ReverseCitationCard } from './cards/reverse-citation-card';
import { SearchResultCard } from './cards/search-result-card';
import { SeedPapersCard } from './cards/seed-papers-card';
import { SynthesisCard } from './cards/synthesis-card';
import { VenueTierCard } from './cards/venue-tier-card';
import { toStageStatus, type StageStatus } from './cards/stage-card';
import {
  asStageData,
  type BaselineCandidate,
  type BatchAnalysisEntry,
  type BatchPrepSummary,
  type CandidateTopic,
  type CoreCombinationHit,
  type FallbackAttempt,
  type Landscape,
  type PaperScore,
  type PdfDownloadReport,
  type QueryPlanArtifact,
  type RelevanceCheck,
  type ResearchGaps,
  type ReverseCitationHit,
  type SearchStageData,
  type SeedPaper,
  type VenueTiering,
} from './cards/types';
import type { CoreAnalysisProgress, StageSnapshot } from './topic-workflow-contract';

export type TopicProcessPanelProps = {
  stages: Record<string, StageSnapshot> | undefined;
  warnings?: string[];
  candidates?: CandidateTopic[] | null;
  selectedCandidateLabel?: string | null;
  onSelectCandidate?: (candidate: CandidateTopic) => void;
  coreProgress?: CoreAnalysisProgress | null;
  /** Optional payloads the backend has not yet wired into `stages`. */
  coreCombinations?: CoreCombinationHit[] | null;
  seeds?: SeedPaper[] | null;
  reverseCitations?: ReverseCitationHit[] | null;
  reverseFailures?: Array<{ seedWorkId: string; reason: string }>;
  arxivLatest?: Array<{ title: string; arxivId: string; published: string }>;
  arxivFailed?: boolean;
  scores?: PaperScore[] | null;
  unscored?: string[];
  fallbackAttempts?: FallbackAttempt[] | null;
  fallbackSatisfied?: boolean;
  baselines?: BaselineCandidate[] | null;
  baselineNote?: string;
  pdfReport?: PdfDownloadReport | null;
  batchPrep?: BatchPrepSummary | null;
  metaMarkdown?: string | null;
  feasibleMarkdown?: string | null;
  /** Actions wired to the T28/T43 routes. */
  onRunStage?: (stage: string) => void;
  onSynthesize?: (mode: 'meta' | 'feasible') => void;
  onViewArtifact?: (name: string) => void;
  busyStage?: string | null;
};

/** Execution order of the first-search section. */
export const FIRST_SEARCH_ORDER = [
  'query-plan',
  'search',
  'relevance-check',
  'venue-tiering',
  'landscape',
  'research-gaps',
  'candidates',
] as const;

/**
 * Derives per-batch card entries from the analysis progress. The backend
 * reports batches by name; the ref-id range is only known once the prep stage
 * has run, so it is left unset rather than faked.
 */
export function toBatchEntries(
  progress: CoreAnalysisProgress | null | undefined,
  refIdRangeFor?: (index: number) => string | undefined,
): BatchAnalysisEntry[] {
  if (!progress) return [];
  return progress.batches.map((batch) => ({
    index: batch.index,
    name: batch.name,
    refIdRange: refIdRangeFor?.(batch.index),
    status: batch.status,
    error: batch.error,
  }));
}

export function TopicProcessPanel({
  stages,
  warnings,
  candidates,
  selectedCandidateLabel,
  onSelectCandidate,
  coreProgress,
  coreCombinations,
  seeds,
  reverseCitations,
  reverseFailures,
  arxivLatest,
  arxivFailed,
  scores,
  unscored,
  fallbackAttempts,
  fallbackSatisfied = false,
  baselines,
  baselineNote,
  pdfReport,
  batchPrep,
  metaMarkdown,
  feasibleMarkdown,
  onRunStage,
  onSynthesize,
  onViewArtifact,
  busyStage,
}: TopicProcessPanelProps) {
  const stage = (name: string): StageSnapshot | undefined => stages?.[name];
  const statusOf = (name: string) => toStageStatus(stage(name)?.status);
  const viewArtifact = (name: string) => () => onViewArtifact?.(name);

  /**
   * The second section's payloads are not in `stages` yet, so its status is
   * inferred from whether the data arrived. An empty list counts as "not run" —
   * only a non-empty payload can mean the stage produced something.
   */
  const dataStatus = (payload: unknown): StageStatus =>
    payload == null || (Array.isArray(payload) && payload.length === 0)
      ? 'idle'
      : 'completed';

  const queryPlan = asStageData<QueryPlanArtifact>(stage('query-plan')?.data);
  const searchData = asStageData<SearchStageData>(stage('search')?.data);
  const relevance = asStageData<RelevanceCheck>(stage('relevance-check')?.data);
  const venueTiering = asStageData<VenueTiering>(stage('venue-tiering')?.data);
  const landscapeData = asStageData<{ landscape?: Landscape }>(stage('landscape')?.data);
  const gaps = asStageData<ResearchGaps>(stage('research-gaps')?.data);

  const batches = toBatchEntries(coreProgress);
  const batchSummary = summarizeBatches(batches);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-black tracking-[-0.01em] text-[#183b70]">
          第一段 · 宽检索 → 态势 → 研究空白 → 三方向选题
        </h2>

        <QueryPlanCard
          plan={queryPlan}
          status={statusOf('query-plan')}
          error={stage('query-plan')?.error}
          fallbackUsed={stage('query-plan')?.fallbackUsed}
          provider={stage('query-plan')?.provider}
          onViewMarkdown={viewArtifact('query-plan.json')}
        />

        <SearchResultCard
          data={searchData}
          status={statusOf('search')}
          error={stage('search')?.error}
          warnings={warnings}
          onViewMarkdown={viewArtifact('candidate-papers.csv')}
        />

        <RelevanceCard
          check={relevance}
          status={statusOf('relevance-check')}
          error={stage('relevance-check')?.error}
          fallbackUsed={stage('relevance-check')?.fallbackUsed}
          provider={stage('relevance-check')?.provider}
          onRefine={onRunStage ? () => onRunStage('relevance-check') : undefined}
          refining={busyStage === 'relevance-check'}
          onViewMarkdown={viewArtifact('relevance-check.md')}
        />

        <VenueTierCard
          tiering={venueTiering}
          status={statusOf('venue-tiering')}
          error={stage('venue-tiering')?.error}
          fallbackUsed={stage('venue-tiering')?.fallbackUsed}
          provider={stage('venue-tiering')?.provider}
          onViewMarkdown={viewArtifact('venue-tiers.md')}
        />

        <LandscapeCard
          landscape={landscapeData?.landscape ?? null}
          status={statusOf('landscape')}
          error={stage('landscape')?.error}
          fallbackUsed={stage('landscape')?.fallbackUsed}
          provider={stage('landscape')?.provider}
          onViewMarkdown={viewArtifact('landscape.md')}
        />

        <ResearchGapCard
          gaps={gaps}
          status={statusOf('research-gaps')}
          error={stage('research-gaps')?.error}
          onViewMarkdown={viewArtifact('research-gaps.md')}
        />

        <CandidateTopicCard
          candidates={candidates ?? null}
          status={statusOf('candidates')}
          error={stage('candidates')?.error}
          selectedLabel={selectedCandidateLabel}
          onSelect={onSelectCandidate}
          onViewMarkdown={viewArtifact('candidate-topics.md')}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black tracking-[-0.01em] text-[#183b70]">
          第二段 · 核心文献 → 分批分析 → 课题孵化
        </h2>

        <CoreQueryCard
          combinations={coreCombinations ?? null}
          status={dataStatus(coreCombinations)}
          onViewMarkdown={viewArtifact('core-query-plan.md')}
        />

        <SeedPapersCard
          seeds={seeds ?? null}
          status={dataStatus(seeds)}
          onViewMarkdown={viewArtifact('seed-papers.md')}
        />

        <ReverseCitationCard
          hits={reverseCitations ?? null}
          failures={reverseFailures}
          arxivLatest={arxivLatest}
          arxivFailed={arxivFailed}
          status={dataStatus(reverseCitations ?? (reverseFailures?.length ? reverseFailures : null))}
          onViewMarkdown={viewArtifact('reverse-citations.md')}
        />

        <RelevanceScoreCard
          scores={scores ?? null}
          unscored={unscored}
          status={dataStatus(scores)}
          onViewMarkdown={viewArtifact('relevance-scoring.md')}
        />

        <FallbackLogCard
          attempts={fallbackAttempts ?? null}
          satisfied={fallbackSatisfied}
          status={dataStatus(fallbackAttempts)}
          onViewMarkdown={viewArtifact('fallback-log.md')}
        />

        <BaselineCard
          baselines={baselines ?? null}
          note={baselineNote}
          status={dataStatus(baselines)}
          onViewMarkdown={viewArtifact('baseline-candidates.md')}
        />

        <PdfDownloadCard
          report={pdfReport ?? null}
          status={dataStatus(pdfReport)}
          onViewMarkdown={viewArtifact('download-report.json')}
        />

        <BatchPrepCard
          summary={batchPrep ?? null}
          status={dataStatus(batchPrep)}
          onViewMarkdown={viewArtifact('handoff.md')}
        />

        {batches.length ? (
          <div className="space-y-3">
            <p className="text-[11px] font-black text-[#5f85b8]">
              分批分析进度：{batchSummary.completed}/{batchSummary.total} 完成
              {batchSummary.failed ? `，${batchSummary.failed} 批失败` : ''}
            </p>
            {batches.map((batch) => (
              <BatchAnalysisCard
                key={batch.index}
                batch={batch}
                status={toStageStatus(batch.status === 'skipped' ? 'completed' : batch.status)}
                onViewMarkdown={viewArtifact(
                  `batch-${String(batch.index).padStart(2, '0')}.report.md`,
                )}
              />
            ))}
          </div>
        ) : null}

        <SynthesisCard
          mode="meta"
          markdown={metaMarkdown ?? null}
          status={metaMarkdown ? 'completed' : 'idle'}
          onGenerate={onSynthesize ? () => onSynthesize('meta') : undefined}
          generating={busyStage === 'synthesize-meta'}
          onViewMarkdown={viewArtifact('meta-analysis.md')}
        />

        <SynthesisCard
          mode="feasible"
          markdown={feasibleMarkdown ?? null}
          status={feasibleMarkdown ? 'completed' : 'idle'}
          onGenerate={onSynthesize ? () => onSynthesize('feasible') : undefined}
          generating={busyStage === 'synthesize-feasible'}
          onViewMarkdown={viewArtifact('feasible-topics.md')}
        />
      </section>
    </div>
  );
}
