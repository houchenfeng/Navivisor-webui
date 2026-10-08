import { describe, expect, it } from 'vitest';
import {
  pickVersion,
  toArxivQuery,
  toOpenAlexOql,
  toScopusQuery,
} from './query-renderers';
import type { QueryPlan } from './query-planner';

function plan(overrides: Partial<QueryPlan> = {}): QueryPlan {
  return {
    concepts: {
      A: ['image geolocalization', 'image geolocation'],
      B: ['cross-view matching'],
      C: ['street view'],
    },
    openalex: { versionA: 'A', versionB: 'B' },
    arxiv: { versionA: 'A', versionB: 'B' },
    scopus: { versionA: 'A', versionB: 'B' },
    exclusions: ['medical imaging'],
    rationale: 'test',
    provider: 'codex',
    fallbackUsed: false,
    ...overrides,
  };
}

describe('toOpenAlexOql', () => {
  it('joins concept groups with and, terms inside a group with or', () => {
    expect(toOpenAlexOql(plan(), 2021, 2026)).toBe(
      'title/abstract has ("image geolocalization" or "image geolocation") and ' +
        'title/abstract has ("cross-view matching") and ' +
        'title/abstract has ("street view") and ' +
        'title has (not ("medical imaging")) and ' +
        'from_publication_date:2021-01-01 and to_publication_date:2026-12-31',
    );
  });

  it('omits empty concept groups instead of emitting an empty clause', () => {
    const result = toOpenAlexOql(
      plan({ concepts: { A: ['alpha'], B: [], C: [] }, exclusions: [] }),
      2020,
      2024,
    );
    expect(result).toBe(
      'title/abstract has ("alpha") and from_publication_date:2020-01-01 and to_publication_date:2024-12-31',
    );
    expect(result).not.toContain('has ()');
  });

  it('strips embedded quotes so the OQL stays syntactically valid', () => {
    const result = toOpenAlexOql(
      plan({ concepts: { A: ['say "hi"'], B: [], C: [] }, exclusions: [] }),
      2020,
      2021,
    );
    expect(result).toContain('"say hi"');
  });
});

describe('toArxivQuery', () => {
  it('renders OR terms followed by ANDNOT exclusions', () => {
    expect(toArxivQuery(plan())).toBe(
      'all:"image geolocalization" OR all:"image geolocation" OR ' +
        'all:"cross-view matching" OR all:"street view" ANDNOT all:"medical imaging"',
    );
  });

  it('returns an empty string when there are no concepts', () => {
    expect(
      toArxivQuery(plan({ concepts: { A: [], B: [], C: [] }, exclusions: [] })),
    ).toBe('');
  });

  it('drops blank terms', () => {
    expect(
      toArxivQuery(plan({ concepts: { A: ['  ', 'real'], B: [], C: [] }, exclusions: [] })),
    ).toBe('all:"real"');
  });
});

describe('toScopusQuery', () => {
  it('returns needs_credentials and never claims the query ran', () => {
    const result = toScopusQuery(plan());
    expect(result.status).toBe('needs_credentials');
    expect(result.query).toBe(
      'TITLE-ABS-KEY("image geolocalization" OR "image geolocation" OR ' +
        '"cross-view matching" OR "street view") AND NOT TITLE("medical imaging")',
    );
  });

  it('omits the NOT clause when there are no exclusions', () => {
    expect(
      toScopusQuery(plan({ exclusions: [] })).query,
    ).not.toContain('AND NOT');
  });
});

describe('pickVersion', () => {
  it('returns the requested version', () => {
    expect(pickVersion(plan(), 'versionA').openalex).toBe('A');
    expect(pickVersion(plan(), 'versionB').openalex).toBe('B');
  });

  it('falls back to the other version when the requested one is blank', () => {
    const withBlank = plan({ openalex: { versionA: '', versionB: 'only-B' } });
    expect(pickVersion(withBlank, 'versionA').openalex).toBe('only-B');
  });
});
