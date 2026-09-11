/**
 * Submission API client.
 *
 * Default: local Demo mock (no external cpolar / localhost:3001).
 * Optional remote: set VITE_SUBMISSION_API_BASE_URL to a full origin, e.g. https://example.com
 */
import type { IReviewer } from '../data/reviewersRound1';
import { MOCK_REVIEWERS_ROUND1 } from '../data/reviewersRound1';
import {
  MOCK_PAPER_CONTENT,
  MOCK_REBUTTAL_CONTENT,
  MOCK_REVIEWERS_ROUND2,
  type IRound2Reviewer,
} from '../data/mockData';

export const API_BASE_URL = (import.meta.env.VITE_SUBMISSION_API_BASE_URL as string | undefined)?.trim() || '';

const USE_REMOTE = Boolean(API_BASE_URL);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`HTTP ${response.status}: ${errText || response.statusText}`);
  }
  return (await response.json()) as T;
}

export interface SubmitPaperPayload {
  title: string;
  authors: string;
  keywords: string;
  abstract: string;
  tldr: string;
  pdfFile: File | null;
}

export interface SubmitRebuttalPayload {
  rebuttal: string;
  paperTitle: string;
  round1Reviews: IReviewer[];
}

export interface ISubmitPaperResult {
  reviewers: IReviewer[];
  paperTitle: string;
  averageScore: number;
  decision: string;
}

export interface ISubmitRebuttalResponse {
  reviewers: IRound2Reviewer[];
  averageScore: number;
  firstRoundAverage: number;
  decision: string;
  decisionType: string | null;
  enhancedRebuttal: string;
}

function ratingToLabel(rating: number): string {
  if (rating >= 6) return 'Accept';
  if (rating >= 5) return 'Weak Accept';
  if (rating >= 4) return 'Borderline Accept';
  if (rating >= 3) return 'Borderline Reject';
  if (rating >= 2) return 'Weak Reject';
  return 'Reject';
}

function confidenceToLabel(confidence: number): string {
  const labels = ['Very Low', 'Low', 'Moderately Confident', 'Quite Confident', 'Very Confident'];
  const idx = Math.max(0, Math.min(4, Math.round(confidence) - 1));
  return `${confidence}: ${labels[idx]}`;
}

function mapBackendReviewer(br: any, index: number): IReviewer {
  const idStr = String(br.id ?? index + 1);
  return {
    id: idStr,
    name: `Reviewer ${idStr}`,
    score: br.rating,
    ratingLabel: ratingToLabel(br.rating),
    trackLabel: br.focus || '',
    summary: br.summary,
    strengths: br.strengths,
    weaknesses: br.weaknesses,
    questions: br.questions,
    limitations: br.limitations,
    confidence: br.confidence,
    confidenceLabel: confidenceToLabel(br.confidence),
    ethicalConcerns: br.ethicalConcerns,
    finalJustification: br.finalJustification,
  };
}

function mapBackendRound2Reviewer(br: any, index: number): IRound2Reviewer {
  const idStr = String(br.id ?? index + 1);
  return {
    id: idStr,
    name: `Reviewer ${idStr}`,
    round1Score: br.rating,
    round2Score: br.updatedRating,
    round1Comment: '',
    rebuttalResponse: '',
    round2Comment: br.comment,
  };
}

function averageScore(reviewers: Array<{ score: number }>): number {
  if (!reviewers.length) return 0;
  return Number(
    (reviewers.reduce((sum, reviewer) => sum + reviewer.score, 0) / reviewers.length).toFixed(2),
  );
}

export async function submitPaper(payload: SubmitPaperPayload): Promise<ISubmitPaperResult> {
  if (!USE_REMOTE) {
    await delay(900);
    const reviewers = MOCK_REVIEWERS_ROUND1;
    return {
      reviewers,
      paperTitle: payload.title || MOCK_PAPER_CONTENT.title,
      averageScore: averageScore(reviewers),
      decision: 'Demo · Borderline (local mock)',
    };
  }

  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('authors', payload.authors);
  formData.append('keywords', payload.keywords);
  formData.append('abstract', payload.abstract);
  formData.append('tldr', payload.tldr);
  if (payload.pdfFile) formData.append('pdf', payload.pdfFile);

  const response = await fetch(`${API_BASE_URL}/api/submit-paper`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`HTTP ${response.status}: ${errText || response.statusText}`);
  }
  const data = await response.json();
  return {
    reviewers: data.reviewers.map((br: any, i: number) => mapBackendReviewer(br, i)),
    paperTitle: data.paper_title || payload.title,
    averageScore: data.averageScore ?? 0,
    decision: data.decision || '',
  };
}

export async function submitRebuttal(payload: SubmitRebuttalPayload): Promise<ISubmitRebuttalResponse> {
  if (!USE_REMOTE) {
    await delay(900);
    const firstRoundAverage = averageScore(payload.round1Reviews);
    const reviewers = MOCK_REVIEWERS_ROUND2.map((reviewer, index) => ({
      ...reviewer,
      id: reviewer.id || String(index + 1),
      round1Score: payload.round1Reviews[index]?.score ?? reviewer.round1Score,
    }));
    const avg = Number(
      (
        reviewers.reduce((sum, reviewer) => sum + reviewer.round2Score, 0) /
        Math.max(1, reviewers.length)
      ).toFixed(2),
    );
    return {
      reviewers,
      averageScore: avg,
      firstRoundAverage,
      decision: 'Demo · Accept with minor revision (local mock)',
      decisionType: 'accept',
      enhancedRebuttal: payload.rebuttal || MOCK_REBUTTAL_CONTENT,
    };
  }

  const data = await fetchJson<any>('/api/submit-rebuttal', {
    method: 'POST',
    body: JSON.stringify({
      rebuttalText: payload.rebuttal,
      reviews: payload.round1Reviews.map((r) => ({
        id: Number(r.id) || 0,
        rating: r.score,
        confidence: r.confidence,
        summary: r.summary,
        strengths: r.strengths,
        weaknesses: r.weaknesses,
        questions: r.questions,
        limitations: r.limitations,
        ethicalConcerns: r.ethicalConcerns,
        finalJustification: r.finalJustification,
        focus: r.trackLabel,
      })),
      paperTitle: payload.paperTitle,
    }),
  });
  return {
    reviewers: data.reviewers.map((br: any, i: number) => mapBackendRound2Reviewer(br, i)),
    averageScore: data.averageScore,
    firstRoundAverage: data.firstRoundAverage,
    decision: data.decision,
    decisionType: data.decisionType,
    enhancedRebuttal: data.enhancedRebuttal,
  };
}

export async function extractPaperInfo(pdfFile: File): Promise<{
  title: string; authors: string; keywords: string; abstract: string; tldr: string;
}> {
  if (!USE_REMOTE) {
    await delay(700);
    return {
      title: MOCK_PAPER_CONTENT.title || pdfFile.name.replace(/\.pdf$/i, ''),
      authors: MOCK_PAPER_CONTENT.authors,
      keywords: MOCK_PAPER_CONTENT.keywords,
      abstract: MOCK_PAPER_CONTENT.abstract,
      tldr: MOCK_PAPER_CONTENT.tldr,
    };
  }

  const formData = new FormData();
  formData.append('pdf', pdfFile);
  const response = await fetch(`${API_BASE_URL}/api/extract-paper-info`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`HTTP ${response.status}: ${errText || response.statusText}`);
  }
  const data = await response.json();
  return {
    title: data.title ?? '',
    authors: data.authors ?? '',
    keywords: data.keywords ?? '',
    abstract: data.abstract ?? '',
    tldr: data.tldr ?? '',
  };
}

export interface IGenerateRebuttalRequest {
  reviews: any[];
  currentText: string;
}

export async function generateRebuttal(payload: IGenerateRebuttalRequest): Promise<string> {
  if (!USE_REMOTE) {
    await delay(800);
    return payload.currentText?.trim() || MOCK_REBUTTAL_CONTENT;
  }

  const data = await fetchJson<{ rebuttal: string }>('/api/generate-rebuttal', {
    method: 'POST',
    body: JSON.stringify({
      reviews: payload.reviews.map((r) => ({
        id: Number(r.id) || 0,
        rating: r.rating,
        confidence: r.confidence,
        summary: r.summary,
        strengths: r.strengths,
        weaknesses: r.weaknesses,
        questions: r.questions,
        limitations: r.limitations,
        ethicalConcerns: r.ethicalConcerns,
        finalJustification: r.finalJustification,
        focus: r.focus,
      })),
      currentText: payload.currentText,
    }),
  });
  return data.rebuttal || '';
}

const apiClient = {
  API_BASE_URL,
  submitPaper,
  submitRebuttal,
  generateRebuttal,
  extractPaperInfo,
};

export default apiClient;
