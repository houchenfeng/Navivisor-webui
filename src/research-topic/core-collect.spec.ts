import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ALLOWED_PDF_HOSTS,
  buildCorePackInput,
  fetchArxivLatest,
  toPythonCorePaper,
} from './core-collect';
import type { ResearchTopicPaper } from './research-topic.types';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2609.00001v1</id>
    <published>2026-09-20T00:00:00Z</published>
    <title>Fresh paper</title>
    <summary>New work.</summary>
    <author><name>Ada</name></author>
    <link title="pdf" href="http://arxiv.org/pdf/2609.00001v1"/>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2001.00002v1</id>
    <published>2020-01-02T00:00:00Z</published>
    <title>Old paper</title>
    <summary>Old work.</summary>
    <author><name>Alan</name></author>
  </entry>
</feed>`;

const noSleep = async () => undefined;

function paper(overrides: Partial<ResearchTopicPaper> = {}): ResearchTopicPaper {
  return {
    openalexId: 'W1',
    title: 'A paper',
    authors: [],
    institutions: [],
    source: 'CVPR',
    publicationYear: 2023,
    citedByCount: 0,
    abstract: '',
    doi: '10.1/a',
    landingUrl: 'https://openalex.org/W1',
    sourceStatus: 'openalex_public_api',
    ...overrides,
  };
}

describe('fetchArxivLatest', () => {
  it('keeps only submissions inside the recent window', async () => {
    const fetchImpl = vi.fn(async () => new Response(FEED, { status: 200 }));
    const result = await fetchArxivLatest(
      { A: ['geolocalization'], B: [], C: [] },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleepImpl: noSleep,
        now: new Date('2026-10-08T00:00:00Z'),
      },
    );
    expect(result.failed).toBe(false);
    expect(result.papers).toHaveLength(1);
    expect(result.papers[0].title).toBe('Fresh paper');
  });

  it('reports a failure instead of looking like "arXiv has nothing recent"', async () => {
    const fetchImpl = vi.fn(async () => new Response('bad', { status: 400 }));
    const result = await fetchArxivLatest(
      { A: ['x'], B: [], C: [] },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleepImpl: noSleep,
        now: new Date('2026-10-08T00:00:00Z'),
      },
    );
    expect(result.papers).toEqual([]);
    expect(result.failed).toBe(true);
    expect(result.reason).toContain('HTTP_400');
  });

  it('does not call the network when there are no concepts', async () => {
    const fetchImpl = vi.fn();
    const result = await fetchArxivLatest(
      { A: [], B: [], C: [] },
      { fetchImpl: fetchImpl as unknown as typeof fetch, sleepImpl: noSleep },
    );
    expect(result).toEqual({ papers: [], failed: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('toPythonCorePaper', () => {
  it('maps landing page and pdf into the packer field names', () => {
    expect(
      toPythonCorePaper(
        paper({ pdfUrl: 'https://arxiv.org/pdf/1.pdf' }),
        'RE001',
      ),
    ).toEqual({
      refId: 'RE001',
      title: 'A paper',
      doi: '10.1/a',
      year: 2023,
      sourceUrl: 'https://openalex.org/W1',
      openAccessUrl: 'https://arxiv.org/pdf/1.pdf',
      isOpenAccess: true,
      pdfUrl: 'https://arxiv.org/pdf/1.pdf',
    });
  });

  it('falls back to the pdf url when there is no landing page', () => {
    const mapped = toPythonCorePaper(
      paper({ landingUrl: '', pdfUrl: 'https://x/y.pdf' }),
      'RE002',
    );
    expect(mapped.sourceUrl).toBe('https://x/y.pdf');
  });

  it('reports isOpenAccess false only when there is no pdf', () => {
    expect(toPythonCorePaper(paper(), 'RE003').isOpenAccess).toBe(false);
    expect(
      toPythonCorePaper(paper({ isOpenAccess: true }), 'RE004').isOpenAccess,
    ).toBe(true);
  });
});

describe('buildCorePackInput', () => {
  it('sets targetCount to the number of papers actually selected', () => {
    const input = buildCorePackInput({
      runId: 'r1',
      confirmedTopic: 'topic',
      paperCount: 17,
      sourceQueries: [],
    });
    expect(input.selection.targetCount).toBe(17);
    expect(input.downloadPolicy.targetSuccessfulPdfs).toBe(17);
    expect(input.downloadPolicy.maxCandidatesToAttempt).toBe(17);
  });

  it('never asks the packer to attempt more than were selected', () => {
    const input = buildCorePackInput({
      runId: 'r1',
      confirmedTopic: 'topic',
      paperCount: 5,
      sourceQueries: [],
      maxCandidatesToAttempt: 100,
    });
    expect(input.downloadPolicy.maxCandidatesToAttempt).toBe(5);
  });

  it('handles an empty selection without producing a negative target', () => {
    const input = buildCorePackInput({
      runId: 'r1',
      confirmedTopic: 'topic',
      paperCount: 0,
      sourceQueries: [],
    });
    expect(input.selection.targetCount).toBe(0);
    expect(input.downloadPolicy.maxCandidatesToAttempt).toBe(0);
  });

  it('keeps the pdf host allowlist explicit', () => {
    const input = buildCorePackInput({
      runId: 'r1',
      confirmedTopic: 't',
      paperCount: 1,
      sourceQueries: [],
    });
    expect(input.pdfPolicy.allowedPdfHosts).toEqual(DEFAULT_ALLOWED_PDF_HOSTS);
    expect(input.pdfPolicy.maxBytes).toBeGreaterThan(0);
  });
});
