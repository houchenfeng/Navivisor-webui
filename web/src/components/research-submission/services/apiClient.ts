// Backend API Client
// All calls go to the real backend at API_BASE_URL. No mock fallback.
// Base URL can be configured via VITE_API_BASE_URL environment variable

import type { IReviewer } from '../data/reviewersRound1';
import type { IRound2Reviewer } from '../data/mockData';

export const API_BASE_URL = 'https://6e20ae7d.r12.vip.cpolar.cn';

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

export async function submitPaper(payload: SubmitPaperPayload): Promise<ISubmitPaperResult> {
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
