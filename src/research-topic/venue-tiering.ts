/**
 * Venue tiering (T24).
 *
 * Aggregates the candidate pool by venue, asks the model to tier them, and
 * reports what share of the pool sits in tier 1 — the number the landscape and
 * gap stages use to distinguish "crowded" from "crowded *and* high quality".
 *
 * The tier list is never hard-coded: the model answers against the venues that
 * actually appeared in this run.
 */
import { AiProviderError, extractJsonPayload } from './ai/ai-provider';
import type { AiProviderFactory } from './ai/ai-provider.factory';
import {
  VENUE_TIERING_SYSTEM,
  buildVenueTieringPrompt,
} from './prompts/venue-tiering';
import type { ResearchTopicPaper, VenueTier, VenueTiering } from './research-topic.types';

export class VenueTieringError extends Error {
  readonly code = 'VENUE_TIERING_FAILED';

  constructor(message: string) {
    super(message);
    this.name = 'VenueTieringError';
  }
}

/** Venues with fewer than this many papers still get tiered, but are flagged. */
export const MIN_VENUE_SAMPLE = 2;

export type VenueStat = {
  name: string;
  paperCount: number;
  yearFrom?: number;
  yearTo?: number;
  sampleTitles: string[];
};

/**
 * Counts papers per venue.
 *
 * Papers without a source are bucketed under `未标注来源` rather than dropped,
 * so `topVenueRatio` still has a correct denominator.
 */
export function aggregateVenues(papers: ResearchTopicPaper[]): VenueStat[] {
  const stats = new Map<string, VenueStat>();

  for (const paper of papers) {
    const name = paper.source?.trim() || '未标注来源';
    const existing = stats.get(name) ?? {
      name,
      paperCount: 0,
      sampleTitles: [],
    };
    existing.paperCount += 1;
    if (paper.publicationYear !== null) {
      existing.yearFrom =
        existing.yearFrom === undefined
          ? paper.publicationYear
          : Math.min(existing.yearFrom, paper.publicationYear);
      existing.yearTo =
        existing.yearTo === undefined
          ? paper.publicationYear
          : Math.max(existing.yearTo, paper.publicationYear);
    }
    if (existing.sampleTitles.length < 3 && paper.title) {
      existing.sampleTitles.push(paper.title);
    }
    stats.set(name, existing);
  }

  return [...stats.values()].sort((a, b) => b.paperCount - a.paperCount);
}

const TIER_BY_LABEL: Record<string, 1 | 2 | 3> = {
  顶会顶刊: 1,
  一流: 1,
  主流: 2,
  一般: 3,
  预印本或无正式出版: 3,
  无法判断: 3,
};

/** Parses the tiering response and joins it against the aggregated counts. */
export function parseVenueTiering(
  raw: string,
  venues: VenueStat[],
): VenueTiering {
  let payload: unknown;
  try {
    payload = extractJsonPayload(raw);
  } catch (error) {
    throw new VenueTieringError(`期刊分层失败：${(error as Error).message}`);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new VenueTieringError('期刊分层失败：模型返回的不是 JSON 对象。');
  }

  const record = payload as Record<string, unknown>;
  const countByName = new Map(venues.map((venue) => [venue.name, venue.paperCount]));
  const rawTiers = Array.isArray(record.tiers) ? record.tiers : [];

  const tiers: VenueTier[] = [];
  for (const item of rawTiers) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (!name) continue;
    const label = typeof entry.tier === 'string' ? entry.tier.trim() : '';
    const tier = TIER_BY_LABEL[label] ?? 3;
    tiers.push({
      tier,
      name,
      // Trust the model's label, but the count always comes from our own data.
      count: countByName.get(name) ?? 0,
    });
  }

  tiers.sort((a, b) => a.tier - b.tier || b.count - a.count);

  const total = venues.reduce((sum, venue) => sum + venue.paperCount, 0);
  const tier1 = tiers
    .filter((tier) => tier.tier === 1)
    .reduce((sum, tier) => sum + tier.count, 0);

  return {
    tiers,
    topVenueRatio: total > 0 ? tier1 / total : 0,
    note:
      typeof record.summary === 'string'
        ? record.summary.trim()
        : '',
  };
}

export async function runVenueTiering(
  factory: AiProviderFactory,
  papers: ResearchTopicPaper[],
  direction: string,
): Promise<{ tiering: VenueTiering; provider: 'codex' | 'http'; fallbackUsed: boolean }> {
  const venues = aggregateVenues(papers);
  if (!venues.length) {
    return {
      tiering: { tiers: [], topVenueRatio: 0, note: '候选池为空，未做分层。' },
      provider: 'codex',
      fallbackUsed: false,
    };
  }

  const prompt = buildVenueTieringPrompt({
    direction,
    venues: venues.map((venue) => ({
      name: venue.name,
      paperCount: venue.paperCount,
      yearFrom: venue.yearFrom,
      yearTo: venue.yearTo,
      sampleTitles: venue.sampleTitles,
    })),
  });

  try {
    const completion = await factory.complete(prompt, {
      system: VENUE_TIERING_SYSTEM,
    });
    return {
      tiering: parseVenueTiering(completion.text, venues),
      provider: completion.provider,
      fallbackUsed: completion.fallbackUsed,
    };
  } catch (error) {
    if (error instanceof VenueTieringError) throw error;
    if (error instanceof AiProviderError) {
      throw new VenueTieringError(`期刊分层失败：${error.message}`);
    }
    throw new VenueTieringError(`期刊分层失败：${(error as Error).message}`);
  }
}
