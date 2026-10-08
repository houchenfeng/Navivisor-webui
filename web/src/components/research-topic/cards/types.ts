/**
 * Payload shapes for the first-search stage cards.
 *
 * These mirror the backend stage payloads (src/research-topic/*.ts). They are
 * declared locally rather than generated because the backend emits them as
 * opaque `data` on a generic StageSnapshot; keeping a narrow, documented view
 * here means a backend change surfaces as a type error in the card that reads
 * it, instead of silently rendering `undefined`.
 */

export type QueryPlanArtifact = {
  concepts: { A: string[]; B: string[]; C: string[] };
  openalex: { versionA: string; versionB: string };
  arxiv: { versionA: string; versionB: string };
  scopus: { versionA: string; versionB: string };
  exclusions: string[];
  rationale: string;
  provider: 'codex' | 'http';
  fallbackUsed: boolean;
  openalexOql: string;
  arxivQuery: string;
};

export type SearchStageData = {
  openalex: number;
  arxiv: number;
  merged: number;
  yearFrom: number;
  yearTo: number;
};

export type RelevanceCheck = {
  round: number;
  sampleSize: number;
  relevantRatio: number;
  irrelevantSamples: Array<{ title: string; reason: string }>;
  refinedQueryPlan?: QueryPlanArtifact;
};

export type VenueTiering = {
  tiers: Array<{ tier: 1 | 2 | 3; name: string; count: number }>;
  topVenueRatio: number;
  note: string;
};

export type Landscape = {
  diagnosis: string;
  conceptDictionary: string;
  trendMatrix: string;
  venuePreference: string;
  combinationMatrix: string;
  signals: string;
};

export type ResearchGaps = {
  crowded: string[];
  crossGaps: string[];
  zeroCooccurrence: string[];
  redteam: string[];
};

export type CandidateTopic = {
  label: '偏可行' | '偏创新' | '较平衡';
  title: string;
  oneSentenceDefinition: string;
  researchDesign: string;
  expectedInnovation: string;
  rationale: string;
};

/** Narrows an opaque stage payload without throwing on a shape mismatch. */
export function asStageData<T>(value: unknown): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as T;
}
