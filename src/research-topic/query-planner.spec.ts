import { describe, expect, it, vi } from 'vitest';
import { AI_ERROR_CODES, AiProviderError } from './ai/ai-provider';
import type { AiProviderFactory } from './ai/ai-provider.factory';
import {
  QueryPlanError,
  buildQueryPlan,
  parseQueryPlan,
} from './query-planner';

const VALID_PAYLOAD = JSON.stringify({
  concepts: {
    A: ['image geolocalization', 'image geolocation'],
    B: ['cross-view matching'],
    C: ['street view'],
  },
  openalex: { versionA: 'oql-a', versionB: 'oql-b' },
  arxiv: { versionA: 'ax-a', versionB: 'ax-b' },
  scopus: { versionA: 'sc-a', versionB: 'sc-b' },
  exclusions: ['medical imaging'],
  rationale: '拆成对象/方法/场景三组',
});

function factoryReturning(text: string): AiProviderFactory {
  return {
    complete: vi.fn(async () => ({
      text,
      provider: 'codex' as const,
      fallbackUsed: false,
      model: 'codex',
    })),
  } as unknown as AiProviderFactory;
}

function factoryThrowing(error: Error): AiProviderFactory {
  return {
    complete: vi.fn(async () => {
      throw error;
    }),
  } as unknown as AiProviderFactory;
}

describe('parseQueryPlan', () => {
  it('parses a bare JSON payload', () => {
    const plan = parseQueryPlan(VALID_PAYLOAD, {
      provider: 'codex',
      fallbackUsed: false,
    });
    expect(plan.concepts.A).toEqual(['image geolocalization', 'image geolocation']);
    expect(plan.exclusions).toEqual(['medical imaging']);
    expect(plan.provider).toBe('codex');
    expect(plan.fallbackUsed).toBe(false);
  });

  it('parses a payload wrapped in a Markdown fence', () => {
    const plan = parseQueryPlan('```json\n' + VALID_PAYLOAD + '\n```', {
      provider: 'http',
      fallbackUsed: true,
    });
    expect(plan.openalex.versionA).toBe('oql-a');
    expect(plan.fallbackUsed).toBe(true);
  });

  it('rejects a payload whose A group is empty', () => {
    const bad = JSON.stringify({ concepts: { A: [], B: ['b'], C: [] } });
    expect(() =>
      parseQueryPlan(bad, { provider: 'codex', fallbackUsed: false }),
    ).toThrow(QueryPlanError);
  });

  it('rejects a payload that is not JSON', () => {
    expect(() =>
      parseQueryPlan('抱歉，我无法完成', { provider: 'codex', fallbackUsed: false }),
    ).toThrow(QueryPlanError);
  });
});

describe('buildQueryPlan', () => {
  it('returns a parsed plan on success', async () => {
    const plan = await buildQueryPlan(factoryReturning(VALID_PAYLOAD), {
      direction: '单图地理定位',
      yearFrom: 2021,
      yearTo: 2026,
    });
    expect(plan.concepts.A).toHaveLength(2);
  });

  it('wraps provider errors in QueryPlanError', async () => {
    const factory = factoryThrowing(
      new AiProviderError(AI_ERROR_CODES.notFound, '本机未找到 Codex CLI。'),
    );
    await expect(
      buildQueryPlan(factory, { direction: 'x', yearFrom: 2021, yearTo: 2026 }),
    ).rejects.toThrow(QueryPlanError);
  });

  it('passes the year window into the prompt', async () => {
    const factory = factoryReturning(VALID_PAYLOAD);
    await buildQueryPlan(factory, {
      direction: '单图地理定位',
      yearFrom: 2019,
      yearTo: 2025,
    });
    const prompt = (factory.complete as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(prompt).toContain('2019-01-01 至 2025-12-31');
    expect(prompt).toContain('单图地理定位');
  });
});
