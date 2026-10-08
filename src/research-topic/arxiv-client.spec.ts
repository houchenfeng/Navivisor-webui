import { describe, expect, it, vi } from 'vitest';
import { parseArxivFeed, searchArxiv } from './arxiv-client';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2401.01234v2</id>
    <updated>2024-02-01T00:00:00Z</updated>
    <published>2024-01-03T00:00:00Z</published>
    <title>Single-image geolocalization
      with cross-view matching</title>
    <summary>We present a method for &lt;single image&gt; geolocalization.</summary>
    <author><name>Ada Lovelace</name></author>
    <author><name>Alan Turing</name></author>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.CV"/>
    <link title="pdf" href="http://arxiv.org/pdf/2401.01234v2"/>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2312.09999v1</id>
    <published>2023-12-15T00:00:00Z</published>
    <title>Street view retrieval</title>
    <summary>Retrieval at scale.</summary>
    <author><name>Grace Hopper</name></author>
    <link title="pdf" href="http://arxiv.org/pdf/2312.09999v1"/>
  </entry>
</feed>`;

describe('parseArxivFeed', () => {
  it('extracts every entry with its metadata', () => {
    const papers = parseArxivFeed(FEED);
    expect(papers).toHaveLength(2);

    const [first, second] = papers;
    expect(first.arxivId).toBe('2401.01234');
    expect(first.title).toBe('Single-image geolocalization with cross-view matching');
    expect(first.abstract).toBe('We present a method for <single image> geolocalization.');
    expect(first.published).toBe('2024-01-03T00:00:00Z');
    expect(first.authors).toEqual(['Ada Lovelace', 'Alan Turing']);
    expect(first.pdfUrl).toBe('http://arxiv.org/pdf/2401.01234v2');
    expect(first.primaryCategory).toBe('cs.CV');

    expect(second.arxivId).toBe('2312.09999');
    expect(second.authors).toEqual(['Grace Hopper']);
  });

  it('returns an empty array for a feed with no entries', () => {
    expect(parseArxivFeed('<feed></feed>')).toEqual([]);
  });

  it('skips entries without an id', () => {
    expect(parseArxivFeed('<feed><entry><title>x</title></entry></feed>')).toEqual([]);
  });
});

describe('searchArxiv', () => {
  const noSleep = async () => undefined;

  it('builds the documented query string and returns parsed papers', async () => {
    const fetchImpl = vi.fn(async () => new Response(FEED, { status: 200 }));
    const papers = await searchArxiv('all:"geolocalization"', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    });

    expect(papers).toHaveLength(2);
    const url = fetchImpl.mock.calls[0][0] as string;
    expect(url).toContain('search_query=all%3A%22geolocalization%22');
    expect(url).toContain('start=0');
    expect(url).toContain('max_results=100');
    expect(url).toContain('sortBy=submittedDate');
    expect(url).toContain('sortOrder=descending');
  });

  it('retries 429 and eventually succeeds', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls < 3) return new Response('slow down', { status: 429 });
      return new Response(FEED, { status: 200 });
    });

    const papers = await searchArxiv('all:"x"', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    });

    expect(papers).toHaveLength(2);
    expect(calls).toBe(3);
  });

  it('does not retry a 400 and throws instead of returning empty', async () => {
    const fetchImpl = vi.fn(async () => new Response('bad query', { status: 400 }));
    await expect(
      searchArxiv('all:"x"', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleepImpl: noSleep,
      }),
    ).rejects.toThrow(/HTTP_400/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns an empty array for an empty query without calling the network', async () => {
    const fetchImpl = vi.fn();
    await expect(
      searchArxiv('   ', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleepImpl: noSleep,
      }),
    ).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
