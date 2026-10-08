import { describe, expect, it, vi } from 'vitest';
import {
  buildReverseCitationUrl,
  dedupeHits,
  fetchReverseCitations,
  monthsAgo,
  renderReverseCitationsMarkdown,
  type ReverseCitationHit,
} from './reverse-citations';
import type { ResearchTopicPaper } from './research-topic.types';

function paper(overrides: Partial<ResearchTopicPaper> = {}): ResearchTopicPaper {
  return {
    openalexId: 'W1',
    title: 'Seed paper',
    authors: [],
    institutions: [],
    source: 'CVPR',
    publicationYear: 2020,
    citedByCount: 100,
    abstract: '',
    doi: '',
    landingUrl: '',
    sourceStatus: 'openalex_public_api',
    ...overrides,
  };
}

/** Minimal stand-in for the service's normalizer. */
function normalize(work: Record<string, unknown>): ResearchTopicPaper {
  return paper({
    openalexId: String(work.id ?? ''),
    title: String(work.title ?? ''),
  });
}

const noSleep = async () => undefined;

describe('monthsAgo', () => {
  it('subtracts whole months in UTC', () => {
    expect(monthsAgo(new Date('2026-10-08T00:00:00Z'), 6)).toBe('2026-04-08');
  });

  it('rolls back across a year boundary', () => {
    expect(monthsAgo(new Date('2026-02-15T00:00:00Z'), 6)).toBe('2025-08-15');
  });
});

describe('buildReverseCitationUrl', () => {
  it('uses the cites filter plus the recent window', () => {
    const url = buildReverseCitationUrl('W123', '2026-04-08');
    expect(url).toContain('filter=cites%3AW123%2Cfrom_publication_date%3A2026-04-08');
    expect(url).toContain('per-page=100');
    expect(url).toContain('cursor=*');
  });

  it('passes the cursor through for paging', () => {
    expect(buildReverseCitationUrl('W1', '2026-01-01', 'CURSOR')).toContain(
      'cursor=CURSOR',
    );
  });
});

describe('fetchReverseCitations', () => {
  it('collects citing works for each seed', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          meta: { next_cursor: null },
          results: [{ id: 'W900', title: 'Citing paper' }],
        }),
        { status: 200 },
      ),
    );

    const { hits, failures } = await fetchReverseCitations(
      [paper({ openalexId: 'https://openalex.org/W123' })],
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleepImpl: noSleep,
        normalize,
        now: new Date('2026-10-08T00:00:00Z'),
      },
    );

    expect(failures).toEqual([]);
    expect(hits).toHaveLength(1);
    expect(hits[0].seedWorkId).toBe('W123');
    expect(hits[0].paper.title).toBe('Citing paper');
  });

  it('skips arXiv seeds, which have no OpenAlex id to cite', async () => {
    const fetchImpl = vi.fn();
    const { hits } = await fetchReverseCitations(
      [paper({ openalexId: 'arxiv:2401.01234' })],
      { fetchImpl: fetchImpl as unknown as typeof fetch, sleepImpl: noSleep, normalize },
    );
    expect(hits).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reports a per-seed failure instead of pretending there were no citations', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 400 }));
    const { hits, failures } = await fetchReverseCitations(
      [paper({ openalexId: 'W1' })],
      { fetchImpl: fetchImpl as unknown as typeof fetch, sleepImpl: noSleep, normalize },
    );
    expect(hits).toEqual([]);
    expect(failures).toEqual([{ seedWorkId: 'W1', reason: 'HTTP_400' }]);
  });

  it('keeps going when one seed fails and another succeeds', async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call === 1) return new Response('bad', { status: 400 });
      return new Response(
        JSON.stringify({ meta: { next_cursor: null }, results: [{ id: 'W901', title: 'T' }] }),
        { status: 200 },
      );
    });

    const { hits, failures } = await fetchReverseCitations(
      [paper({ openalexId: 'W1' }), paper({ openalexId: 'W2' })],
      { fetchImpl: fetchImpl as unknown as typeof fetch, sleepImpl: noSleep, normalize },
    );

    expect(failures).toHaveLength(1);
    expect(hits).toHaveLength(1);
  });
});

describe('dedupeHits', () => {
  const hit = (openalexId: string, doi = ''): ReverseCitationHit => ({
    seedWorkId: 'W1',
    paper: paper({ openalexId, doi }),
  });

  it('keeps the first occurrence of each work', () => {
    expect(dedupeHits([hit('W1'), hit('W1'), hit('W2')])).toHaveLength(2);
  });

  it('deduplicates by DOI when present', () => {
    expect(dedupeHits([hit('W1', '10.1/a'), hit('W2', '10.1/a')])).toHaveLength(1);
  });
});

describe('renderReverseCitationsMarkdown', () => {
  it('lists hits and always discloses seed failures', () => {
    const md = renderReverseCitationsMarkdown(
      [{ seedWorkId: 'W123', paper: paper({ title: 'Citing paper' }) }],
      [{ seedWorkId: 'W999', reason: 'HTTP_500' }],
      '单图地理定位',
    );
    expect(md).toContain('# 反向引用（近 6 个月） · 单图地理定位');
    expect(md).toContain('[引用 W123] Citing paper');
    expect(md).toContain('## 检索失败的种子（不代表该种子没有近期引用）');
    expect(md).toContain('W999：HTTP_500');
  });

  it('omits the failure section when nothing failed', () => {
    expect(renderReverseCitationsMarkdown([], [], 'x')).not.toContain('检索失败的种子');
  });
});
