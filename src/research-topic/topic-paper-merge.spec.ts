import { describe, expect, it } from 'vitest';
import type { ArxivPaper } from './arxiv-client';
import { mergeTopicPapers } from './research-topic.service';
import type { ResearchTopicPaper } from './research-topic.types';

function openAlex(overrides: Partial<ResearchTopicPaper> = {}): ResearchTopicPaper {
  return {
    openalexId: 'W1',
    title: 'Single-image geolocalization',
    authors: ['A'],
    institutions: [],
    source: 'CVPR',
    publicationYear: 2023,
    citedByCount: 10,
    abstract: '',
    doi: '10.1000/abc',
    landingUrl: 'https://openalex.org/W1',
    sourceStatus: 'openalex_public_api',
    ...overrides,
  };
}

function arxiv(overrides: Partial<ArxivPaper> = {}): ArxivPaper {
  return {
    id: 'http://arxiv.org/abs/2401.01234v1',
    arxivId: '2401.01234',
    title: 'Cross-view matching for geolocalization',
    abstract: 'abstract',
    published: '2024-01-03T00:00:00Z',
    authors: ['B'],
    pdfUrl: 'http://arxiv.org/pdf/2401.01234v1',
    ...overrides,
  };
}

describe('mergeTopicPapers', () => {
  it('concatenates both sources when there is no overlap', () => {
    const merged = mergeTopicPapers([openAlex()], [arxiv()], 2020, 2026);
    expect(merged).toHaveLength(2);
    expect(merged[1].openalexId).toBe('arxiv:2401.01234');
    expect(merged[1].publicationYear).toBe(2024);
    expect(merged[1].isOpenAccess).toBe(true);
  });

  it('drops the arXiv entry when the same work already came from OpenAlex', () => {
    // arXiv entries carry no DOI, so the normalized title is the join key.
    const merged = mergeTopicPapers(
      [openAlex({ title: 'Single-image geolocalization' })],
      [arxiv({ title: 'Single-Image  Geolocalization!' })],
      2020,
      2026,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].openalexId).toBe('W1');
  });

  it('keeps genuinely different arXiv papers', () => {
    const merged = mergeTopicPapers(
      [openAlex({ title: 'Single-image geolocalization' })],
      [arxiv({ title: 'A different paper entirely' })],
      2020,
      2026,
    );
    expect(merged).toHaveLength(2);
  });

  it('excludes papers outside the year window', () => {
    const merged = mergeTopicPapers(
      [openAlex({ publicationYear: 2010 })],
      [arxiv({ published: '2009-05-01T00:00:00Z' })],
      2020,
      2026,
    );
    expect(merged).toEqual([]);
  });

  it('keeps papers whose year is unknown rather than guessing', () => {
    const merged = mergeTopicPapers(
      [openAlex({ publicationYear: null })],
      [],
      2020,
      2026,
    );
    expect(merged).toHaveLength(1);
  });

  it('skips entries without a title', () => {
    const merged = mergeTopicPapers([openAlex({ title: '' })], [], 2020, 2026);
    expect(merged).toEqual([]);
  });

  it('deduplicates within the OpenAlex list by DOI', () => {
    const merged = mergeTopicPapers(
      [openAlex({ openalexId: 'W1' }), openAlex({ openalexId: 'W2' })],
      [],
      2020,
      2026,
    );
    expect(merged).toHaveLength(1);
  });
});
