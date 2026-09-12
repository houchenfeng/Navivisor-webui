/**
 * Seed submission SimulationContext from workspace review/rebuttal/decision artifacts.
 */
import type { ResearchArtifact } from '@/components/research-workflow/research-workflow-types';
import {
  fetchArtifactText,
  findLatestByPathHint,
  findLatestByRole,
  useWorkspaceArtifacts,
} from '@/components/research-workflow/use-research-project';
import type { IReviewer } from '@/components/research-submission/data/reviewersRound1';
import type { IRound2Reviewer } from '@/components/research-submission/data/mockData';

type WorkspaceReviewQuestion = { id?: string; text?: string };
type WorkspaceReviewer = {
  id?: string;
  score?: number;
  confidence?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  questions?: WorkspaceReviewQuestion[] | string[];
};

type WorkspaceReviewsPayload = {
  reviewers?: WorkspaceReviewer[];
};

type WorkspaceDecisionPayload = {
  decision?: string;
  reasons?: string[];
};

function ratingLabelForScore(score: number): string {
  if (score >= 8) return 'Accept';
  if (score >= 6) return 'Borderline Accept';
  if (score >= 5) return 'Borderline Reject';
  if (score >= 3) return 'Weak Reject';
  return 'Reject';
}

function mapWorkspaceReviewer(reviewer: WorkspaceReviewer, index: number): IReviewer {
  const score = typeof reviewer.score === 'number' ? reviewer.score : 5;
  const questions = (reviewer.questions ?? []).map((item) =>
    typeof item === 'string' ? item : item.text || item.id || '',
  );
  return {
    id: reviewer.id || String(index + 1),
    name: `Reviewer ${reviewer.id || String.fromCharCode(65 + index)}`,
    score,
    ratingLabel: ratingLabelForScore(score),
    summary: reviewer.summary || '',
    strengths: reviewer.strengths ?? [],
    weaknesses: reviewer.weaknesses ?? [],
    questions: questions.filter(Boolean),
    limitations: '',
    confidence: typeof reviewer.confidence === 'number' ? reviewer.confidence : 3,
    confidenceLabel: `Confidence ${reviewer.confidence ?? 3}`,
    ethicalConcerns: 'No particular issues noted in workspace artifact.',
    finalJustification: reviewer.summary || '',
  };
}

export type SubmissionWorkspaceSeed = {
  source: 'workspace' | 'local-mock';
  loading: boolean;
  title: string;
  rebuttal: string;
  round1Reviewers: IReviewer[];
  round2Reviewers: IRound2Reviewer[];
  decision: string;
  round1AvgScore: number;
  round2AvgScore: number;
  error: string | null;
};

export async function loadSubmissionWorkspaceSeed(
  projectId: string | null,
  artifacts: ResearchArtifact[],
): Promise<SubmissionWorkspaceSeed> {
  if (!projectId) {
    return {
      source: 'local-mock',
      loading: false,
      title: '',
      rebuttal: '',
      round1Reviewers: [],
      round2Reviewers: [],
      decision: '',
      round1AvgScore: 0,
      round2AvgScore: 0,
      error: null,
    };
  }

  const reviewsArt =
    findLatestByPathHint(artifacts, 'submission/reviews.json') ??
    findLatestByPathHint(artifacts, 'reviews.json') ??
    findLatestByRole(artifacts, 'review-round1');
  const rebuttalArt =
    findLatestByPathHint(artifacts, 'submission/rebuttal.md') ??
    findLatestByPathHint(artifacts, 'rebuttal.md') ??
    findLatestByRole(artifacts, 'rebuttal');
  const decisionArt = findLatestByRole(artifacts, 'submission-decision');
  const confirmedArt = findLatestByRole(artifacts, 'confirmed-topic');

  if (!reviewsArt && !rebuttalArt && !decisionArt) {
    return {
      source: 'local-mock',
      loading: false,
      title: '',
      rebuttal: '',
      round1Reviewers: [],
      round2Reviewers: [],
      decision: '',
      round1AvgScore: 0,
      round2AvgScore: 0,
      error: null,
    };
  }

  const [reviewsText, rebuttalText, decisionText, confirmedText] = await Promise.all([
    reviewsArt ? fetchArtifactText(projectId, reviewsArt.artifactId) : Promise.resolve(''),
    rebuttalArt ? fetchArtifactText(projectId, rebuttalArt.artifactId) : Promise.resolve(''),
    decisionArt ? fetchArtifactText(projectId, decisionArt.artifactId) : Promise.resolve(''),
    confirmedArt
      ? fetchArtifactText(projectId, confirmedArt.artifactId)
      : Promise.resolve(''),
  ]);

  let reviewers: IReviewer[] = [];
  if (reviewsText) {
    try {
      const parsed = JSON.parse(reviewsText) as WorkspaceReviewsPayload;
      reviewers = (parsed.reviewers ?? []).map(mapWorkspaceReviewer);
    } catch {
      reviewers = [];
    }
  }

  let decision = '';
  if (decisionText) {
    try {
      const parsed = JSON.parse(decisionText) as WorkspaceDecisionPayload;
      decision = parsed.decision || '';
      if (parsed.reasons?.length) {
        decision = `${decision}${decision ? ' — ' : ''}${parsed.reasons.join('; ')}`;
      }
    } catch {
      decision = decisionText.trim();
    }
  }

  let title = '';
  if (confirmedText) {
    try {
      const parsed = JSON.parse(confirmedText) as { title?: string };
      title = parsed.title?.trim() || '';
    } catch {
      // ignore
    }
  }

  const avg =
    reviewers.length > 0
      ? reviewers.reduce((sum, reviewer) => sum + reviewer.score, 0) / reviewers.length
      : 0;

  const round2Reviewers: IRound2Reviewer[] = reviewers.map((reviewer) => ({
    id: reviewer.id,
    name: reviewer.name,
    round1Score: reviewer.score,
    round2Score: reviewer.score,
    round1Comment: reviewer.summary,
    round2Comment: reviewer.summary,
    rebuttalResponse: '',
  }));

  return {
    source: 'workspace',
    loading: false,
    title,
    rebuttal: rebuttalText.trim(),
    round1Reviewers: reviewers,
    round2Reviewers,
    decision,
    round1AvgScore: avg,
    round2AvgScore: avg,
    error: null,
  };
}

export function useSubmissionArtifactPresence() {
  return useWorkspaceArtifacts();
}
