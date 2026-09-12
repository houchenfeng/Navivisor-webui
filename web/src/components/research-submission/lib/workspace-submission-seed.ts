/**
 * Seed submission SimulationContext from workspace review/rebuttal/decision artifacts.
 */
import type { ResearchArtifact } from '@/components/research-workflow/research-workflow-types';
import { researchWorkflowClient } from '@/components/research-workflow/research-workflow-client';
import {
  fetchArtifactText,
  findLatestByRole,
  useWorkspaceArtifacts,
} from '@/components/research-workflow/use-research-project';
import {
  tryLoadDemoPaperPdfAsFile,
  tryLoadDemoPaperInfo,
  tryLoadDemoRebuttalEn,
} from '@/components/research-writing/lib/demo-writing';
import type { IReviewer } from '@/components/research-submission/data/reviewersRound1';
import type { IRound2Reviewer } from '@/components/research-submission/data/mockData';

type WorkspaceReviewQuestion = { id?: string; text?: string };
type WorkspaceReviewer = {
  id?: string | number;
  name?: string;
  score?: number;
  rating?: number;
  confidence?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  questions?: WorkspaceReviewQuestion[] | string[];
  limitations?: string[] | string;
  ethical_concerns?: string;
  ethicalConcerns?: string;
  focus?: string;
  finalJustification?: string;
  final_justification?: string;
};

type WorkspaceReviewsPayload = {
  paper_title?: string;
  reviewers?: WorkspaceReviewer[];
};

type WorkspaceDecisionPayload = {
  decision?: string;
  reasons?: string[];
};

function isZhArtifactPath(path: string): boolean {
  const p = path.toLowerCase().replace(/\\/g, '/');
  return (
    p.includes('-zh.') ||
    p.includes('/zh/') ||
    p.includes('/cn/') ||
    p.includes('zh-cn')
  );
}

function findEnglishByPathHint(
  artifacts: ResearchArtifact[],
  hint: string,
): ResearchArtifact | undefined {
  const needle = hint.toLowerCase();
  return artifacts
    .filter((artifact) => {
      if (isZhArtifactPath(artifact.path) || isZhArtifactPath(artifact.name)) return false;
      return (
        artifact.path.toLowerCase().includes(needle) ||
        artifact.name.toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
}

type PaperInfoPayload = {
  title?: string;
  authors?: string;
  keywords?: string;
  abstract?: string;
  tldr?: string;
  language?: string;
};

function ratingLabelForScore(score: number): string {
  if (score >= 6) return 'Accept';
  if (score >= 5) return 'Weak Accept';
  if (score >= 4) return 'Borderline Accept';
  if (score >= 3) return 'Borderline Reject';
  if (score >= 2) return 'Weak Reject';
  return 'Reject';
}

function mapWorkspaceReviewer(reviewer: WorkspaceReviewer, index: number): IReviewer {
  const score =
    typeof reviewer.score === 'number'
      ? reviewer.score
      : typeof reviewer.rating === 'number'
        ? reviewer.rating
        : 5;
  const questions = (reviewer.questions ?? []).map((item) =>
    typeof item === 'string' ? item : item.text || item.id || '',
  );
  const limitations = Array.isArray(reviewer.limitations)
    ? reviewer.limitations.join(' ')
    : reviewer.limitations || '';
  return {
    id: String(reviewer.id || index + 1),
    name: reviewer.name || `Reviewer ${String.fromCharCode(65 + index)}`,
    score,
    ratingLabel: ratingLabelForScore(score),
    trackLabel: reviewer.focus || '',
    summary: reviewer.summary || '',
    strengths: reviewer.strengths ?? [],
    weaknesses: reviewer.weaknesses ?? [],
    questions: questions.filter(Boolean),
    limitations,
    confidence: typeof reviewer.confidence === 'number' ? reviewer.confidence : 3,
    confidenceLabel: `Confidence ${reviewer.confidence ?? 3}`,
    ethicalConcerns: reviewer.ethicalConcerns || reviewer.ethical_concerns || 'No',
    finalJustification:
      reviewer.finalJustification || reviewer.final_justification || reviewer.summary || '',
  };
}

function stripAbstractTex(raw: string): string {
  return raw
    .replace(/\\begin\{abstract\}/gi, '')
    .replace(/\\end\{abstract\}/gi, '')
    .replace(/\\vspace\{[^}]*\}/g, '')
    .replace(/\\noindent\s*/g, '')
    .replace(/\\evivad\{\}/g, 'EviVAD')
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\emph\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type SubmissionWorkspaceSeed = {
  source: 'workspace' | 'local-mock';
  loading: boolean;
  title: string;
  authors: string;
  keywords: string;
  abstract: string;
  tldr: string;
  rebuttal: string;
  paperPdfFile: File | null;
  round1Reviewers: IReviewer[];
  round2Reviewers: IRound2Reviewer[];
  decision: string;
  round1AvgScore: number;
  round2AvgScore: number;
  error: string | null;
};

const EMPTY_SEED: SubmissionWorkspaceSeed = {
  source: 'local-mock',
  loading: false,
  title: '',
  authors: '',
  keywords: '',
  abstract: '',
  tldr: '',
  rebuttal: '',
  paperPdfFile: null,
  round1Reviewers: [],
  round2Reviewers: [],
  decision: '',
  round1AvgScore: 0,
  round2AvgScore: 0,
  error: null,
};

export async function loadSubmissionWorkspaceSeed(
  projectId: string | null,
  artifacts: ResearchArtifact[],
  demoLoaded: boolean,
): Promise<SubmissionWorkspaceSeed> {
  if (!projectId || !demoLoaded) {
    return EMPTY_SEED;
  }

  const reviewsArt =
    findEnglishByPathHint(artifacts, 'submission/reviews.json') ??
    findEnglishByPathHint(artifacts, 'reviews.json');
  const rebuttalArt =
    findEnglishByPathHint(artifacts, 'submission/rebuttal.md') ??
    findEnglishByPathHint(artifacts, 'rebuttal.md');
  const decisionArt = findLatestByRole(artifacts, 'submission-decision');
  const paperInfoArt =
    findEnglishByPathHint(artifacts, 'submission/paper-info.json') ??
    findEnglishByPathHint(artifacts, 'paper-info.json');
  const metadataArt =
    findEnglishByPathHint(artifacts, 'writing/paper-metadata.json') ??
    findLatestByRole(artifacts, 'paper-metadata');
  const abstractArt = findEnglishByPathHint(artifacts, 'cvpr-paper/en/sec/0_abstract.tex');
  const pdfArt =
    findEnglishByPathHint(artifacts, 'writing/paper.pdf') ??
    findLatestByRole(artifacts, 'paper-pdf');

  if (!reviewsArt && !rebuttalArt && !decisionArt && !pdfArt && !metadataArt && !paperInfoArt) {
    const diskInfo = await tryLoadDemoPaperInfo();
    const diskPdf = await tryLoadDemoPaperPdfAsFile();
    const diskReb = await tryLoadDemoRebuttalEn();
    if (!diskInfo && !diskPdf && !diskReb) return EMPTY_SEED;
  }

  const [reviewsText, rebuttalRaw, decisionText, paperInfoText, metadataText, abstractText] =
    await Promise.all([
      reviewsArt ? fetchArtifactText(projectId, reviewsArt.artifactId) : Promise.resolve(''),
      rebuttalArt ? fetchArtifactText(projectId, rebuttalArt.artifactId) : Promise.resolve(''),
      decisionArt ? fetchArtifactText(projectId, decisionArt.artifactId) : Promise.resolve(''),
      paperInfoArt ? fetchArtifactText(projectId, paperInfoArt.artifactId) : Promise.resolve(''),
      metadataArt ? fetchArtifactText(projectId, metadataArt.artifactId) : Promise.resolve(''),
      abstractArt ? fetchArtifactText(projectId, abstractArt.artifactId) : Promise.resolve(''),
    ]);
  let rebuttalText = rebuttalRaw;

  let paperPdfFile: File | null = null;
  if (pdfArt) {
    try {
      const blob = await researchWorkflowClient.getArtifactBlob(projectId, pdfArt.artifactId);
      paperPdfFile = new File([blob], 'paper.pdf', { type: blob.type || 'application/pdf' });
    } catch {
      paperPdfFile = null;
    }
  }
  if (!paperPdfFile) {
    paperPdfFile = await tryLoadDemoPaperPdfAsFile();
  }

  let reviewers: IReviewer[] = [];
  let reviewsTitle = '';
  if (reviewsText) {
    try {
      const parsed = JSON.parse(reviewsText) as WorkspaceReviewsPayload;
      reviewsTitle = parsed.paper_title?.trim() || '';
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

  let paperInfo: PaperInfoPayload = {};
  if (paperInfoText) {
    try {
      paperInfo = JSON.parse(paperInfoText) as PaperInfoPayload;
    } catch {
      paperInfo = {};
    }
  }
  if (!paperInfo.title && !paperInfo.abstract) {
    const fromDisk = await tryLoadDemoPaperInfo();
    if (fromDisk) paperInfo = { ...fromDisk, ...paperInfo };
  }
  if (!rebuttalText.trim()) {
    rebuttalText = (await tryLoadDemoRebuttalEn()) || '';
  }

  let metadata: PaperInfoPayload = {};
  if (metadataText) {
    try {
      metadata = JSON.parse(metadataText) as PaperInfoPayload;
    } catch {
      metadata = {};
    }
  }

  const abstractFromTex = abstractText ? stripAbstractTex(abstractText) : '';
  const title =
    paperInfo.title?.trim() ||
    metadata.title?.trim() ||
    reviewsTitle ||
    '';
  const authors =
    paperInfo.authors?.trim() || metadata.authors?.trim() || 'Anonymous Author, Second Anonymous Author';
  const keywords =
    paperInfo.keywords?.trim() ||
    metadata.keywords?.trim() ||
    'video anomaly detection, surveillance cameras, evidence-anchored explanation, domain adaptation, degradation-aware gating';
  const abstract =
    paperInfo.abstract?.trim() || metadata.abstract?.trim() || abstractFromTex;
  const tldr =
    paperInfo.tldr?.trim() ||
    metadata.tldr?.trim() ||
    'A frozen CLIP ViT-B/16 system with LoRA domain adaptation, evidence-anchored explanations, and degradation-aware abstention for surveillance VAD.';

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
    authors,
    keywords,
    abstract,
    tldr,
    rebuttal: rebuttalText.trim(),
    paperPdfFile,
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
