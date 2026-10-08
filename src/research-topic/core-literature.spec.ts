import { describe, expect, it } from 'vitest';
import {
  FILLER_TERMS,
  buildConceptGroups,
  buildCoreCombinations,
  combinationToOql,
  stripFiller,
} from './core-query';
import { selectSeedPapers, toOpenAlexWorkId } from './seed-papers';
import {
  DEFAULT_SCORE_THRESHOLD,
  parseScoreBatch,
} from './relevance-scoring';
import {
  buildLadder,
  renderFallbackLog,
  runLadder,
} from './fallback-ladder';
import {
  MIN_BASELINES,
  parseBaselineResponse,
  pickFallbackBaselines,
} from './baseline-finder';
import {
  BATCH_SIZE,
  assignReferenceIds,
  renderBibtex,
  renderCsv,
  splitIntoBatches,
} from './batch-prep';
import type { ResearchTopicPaper } from './research-topic.types';

function paper(overrides: Partial<ResearchTopicPaper> = {}): ResearchTopicPaper {
  return {
    openalexId: 'W1',
    title: 'A paper',
    authors: ['Jane Doe'],
    institutions: [],
    source: 'CVPR',
    publicationYear: 2023,
    citedByCount: 5,
    abstract: '',
    doi: '',
    landingUrl: 'https://openalex.org/W1',
    sourceStatus: 'openalex_public_api',
    ...overrides,
  };
}

describe('stripFiller', () => {
  it('removes the abstract filler words the course workflow calls out', () => {
    expect(stripFiller('协同机制')).toBe('');
    expect(stripFiller('锌离子电池')).toBe('锌离子电池');
  });

  it('keeps real concepts that merely contain a filler character sequence', () => {
    // 界面工程 must survive: it is a genuine concept, not filler.
    expect(stripFiller('界面工程')).toBe('界面工程');
  });

  it('exposes the filler list so it can be reviewed', () => {
    expect(FILLER_TERMS).toContain('机制');
    expect(FILLER_TERMS).toContain('赋能');
  });
});

describe('buildConceptGroups', () => {
  it('splits a "+"-joined topic into three groups and strips filler', () => {
    const groups = buildConceptGroups(
      '超高负载电极+多价离子共嵌阴极+水系锌离子电池',
    );
    expect(groups.A).toEqual(['超高负载电极']);
    expect(groups.B).toEqual(['多价离子共嵌阴极']);
    expect(groups.C).toEqual(['水系锌离子电池']);
  });

  it('drops filler-only parts rather than keeping empty groups', () => {
    const groups = buildConceptGroups('协同机制+锌离子电池');
    expect(groups.A).toEqual(['锌离子电池']);
    expect(groups.B).toEqual([]);
  });

  it('falls back to comma splitting for prose topics', () => {
    const groups = buildConceptGroups('锌离子电池，高负载电极');
    expect(groups.A).toEqual(['锌离子电池']);
    expect(groups.B).toEqual(['高负载电极']);
  });
});

describe('buildCoreCombinations', () => {
  it('orders combinations from most to least specific', () => {
    const combinations = buildCoreCombinations({
      A: ['a'],
      B: ['b'],
      C: ['c'],
    });
    expect(combinations.map((entry) => entry.id)).toEqual([
      'A+B+C',
      'A+B',
      'A+C',
      'B+C',
      'A',
    ]);
  });

  it('skips combinations that would search on nothing', () => {
    const combinations = buildCoreCombinations({ A: ['a'], B: [], C: [] });
    expect(combinations.map((entry) => entry.id)).toEqual(['A']);
  });

  it('renders each combination into an OQL string', () => {
    const [first] = buildCoreCombinations({ A: ['a'], B: ['b'], C: [] });
    expect(combinationToOql(first, 2021, 2026)).toContain(
      'title/abstract has ("a")',
    );
  });
});

describe('selectSeedPapers', () => {
  it('sorts by citation count descending', () => {
    const seeds = selectSeedPapers([
      paper({ openalexId: 'W1', citedByCount: 1 }),
      paper({ openalexId: 'W2', citedByCount: 99 }),
    ]);
    expect(seeds[0].openalexId).toBe('W2');
  });

  it('breaks citation ties on older year first, then id', () => {
    const seeds = selectSeedPapers([
      paper({ openalexId: 'W9', citedByCount: 5, publicationYear: 2020 }),
      paper({ openalexId: 'W3', citedByCount: 5, publicationYear: 2018 }),
      paper({ openalexId: 'W1', citedByCount: 5, publicationYear: 2018 }),
    ]);
    expect(seeds.map((entry) => entry.openalexId)).toEqual(['W1', 'W3', 'W9']);
  });

  it('respects the limit and returns everything when the pool is smaller', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      paper({ openalexId: `W${i}`, citedByCount: i }),
    );
    expect(selectSeedPapers(many, 20)).toHaveLength(20);
    expect(selectSeedPapers([paper()], 20)).toHaveLength(1);
  });
});

describe('toOpenAlexWorkId', () => {
  it('extracts the bare work id from a URL or a bare id', () => {
    expect(toOpenAlexWorkId(paper({ openalexId: 'https://openalex.org/W123' }))).toBe('W123');
    expect(toOpenAlexWorkId(paper({ openalexId: 'w456' }))).toBe('W456');
  });

  it('returns null for arXiv-sourced entries that have no OpenAlex id', () => {
    expect(toOpenAlexWorkId(paper({ openalexId: 'arxiv:2401.01234' }))).toBeNull();
  });
});

describe('parseScoreBatch', () => {
  const ids = ['W1', 'W2'];

  it('marks papers at or above the threshold as relevant', () => {
    const scores = parseScoreBatch(
      JSON.stringify({
        scores: [
          { openalexId: 'W1', score: 5, reason: 'x' },
          { openalexId: 'W2', score: 3, reason: 'y' },
        ],
      }),
      ids,
    );
    expect(scores[0].relevant).toBe(true);
    expect(scores[1].relevant).toBe(false);
  });

  it('drops ids that were not in the batch, so a hallucinated id cannot inject a paper', () => {
    const scores = parseScoreBatch(
      JSON.stringify({ scores: [{ openalexId: 'W999', score: 5 }] }),
      ids,
    );
    expect(scores).toEqual([]);
  });

  it('clamps out-of-range scores', () => {
    const scores = parseScoreBatch(
      JSON.stringify({
        scores: [
          { openalexId: 'W1', score: 42 },
          { openalexId: 'W2', score: -3 },
        ],
      }),
      ids,
    );
    expect(scores[0].score).toBe(5);
    expect(scores[1].score).toBe(0);
  });

  it('exposes the default threshold', () => {
    expect(DEFAULT_SCORE_THRESHOLD).toBe(4);
  });
});

describe('buildLadder', () => {
  const input = {
    groups: { A: ['a'], B: ['b'], C: ['c'] },
    yearFrom: 2021,
    yearTo: 2026,
    targetCount: 20,
    scoreThreshold: 4,
  };

  it('walks combinations first, then widens years, types and threshold', () => {
    const ladder = buildLadder(input);
    expect(ladder.map((step) => step.kind)).toEqual([
      'combination',
      'combination',
      'combination',
      'combination',
      'combination',
      'year-window',
      'document-type',
      'score-threshold',
    ]);
  });

  it('widens the year window on the year step', () => {
    const ladder = buildLadder(input);
    const yearStep = ladder.find((step) => step.kind === 'year-window');
    expect(yearStep?.yearFrom).toBe(2019);
  });

  it('relaxes the score threshold only on the last rung', () => {
    const ladder = buildLadder(input);
    expect(ladder[ladder.length - 1].scoreThreshold).toBe(3);
    expect(ladder[0].scoreThreshold).toBe(4);
  });

  it('returns nothing when there are no concepts to search', () => {
    expect(buildLadder({ ...input, groups: { A: [], B: [], C: [] } })).toEqual([]);
  });
});

describe('runLadder', () => {
  const steps = buildLadder({
    groups: { A: ['a'], B: [], C: [] },
    yearFrom: 2021,
    yearTo: 2026,
    targetCount: 10,
    scoreThreshold: 4,
  });

  it('stops at the first step that reaches the target', async () => {
    const outcome = await runLadder(
      steps,
      async (step) => ({ found: 50, accepted: step.index === 1 ? 12 : 0 }),
      10,
    );
    expect(outcome.satisfied).toBe(true);
    expect(outcome.attempts).toHaveLength(1);
    expect(outcome.attempts[0].stopped).toBe(true);
  });

  it('walks the whole ladder and reports insufficient_results rather than padding', async () => {
    const outcome = await runLadder(steps, async () => ({ found: 3, accepted: 1 }), 10);
    expect(outcome.satisfied).toBe(false);
    expect(outcome.warning).toBe('insufficient_results');
    expect(outcome.attempts).toHaveLength(steps.length);
  });

  it('names the narrowing step in the log when the target is missed', async () => {
    const outcome = await runLadder(
      steps,
      async (step) => ({ found: 0, accepted: step.index === 1 ? 0 : 1 }),
      10,
    );
    const log = renderFallbackLog(outcome, 10);
    expect(log).toContain('## 收窄原因');
    expect(log).toContain('第 1 步');
  });

  it('omits the narrowing section when the target is met', async () => {
    const outcome = await runLadder(steps, async () => ({ found: 50, accepted: 50 }), 10);
    expect(renderFallbackLog(outcome, 10)).not.toContain('## 收窄原因');
  });
});

describe('parseBaselineResponse', () => {
  it('keeps only baselines whose title exists in the input', () => {
    const { baselines } = parseBaselineResponse(
      JSON.stringify({
        baselines: [
          { title: 'Real paper', method: 'm', metrics: 'F1', dataset: 'D' },
          { title: 'Invented paper', method: 'm' },
        ],
      }),
      ['Real paper'],
    );
    expect(baselines).toHaveLength(1);
    expect(baselines[0].title).toBe('Real paper');
    expect(baselines[0].fallback).toBe(false);
  });

  it('caps the list at five', () => {
    const titles = Array.from({ length: 9 }, (_, i) => `P${i}`);
    const { baselines } = parseBaselineResponse(
      JSON.stringify({ baselines: titles.map((title) => ({ title })) }),
      titles,
    );
    expect(baselines).toHaveLength(5);
  });
});

describe('pickFallbackBaselines', () => {
  it('picks the highest-cited open-access papers and flags them', () => {
    const fallback = pickFallbackBaselines([
      paper({ openalexId: 'W1', citedByCount: 1, isOpenAccess: true }),
      paper({ openalexId: 'W2', citedByCount: 99, isOpenAccess: true }),
      paper({ openalexId: 'W3', citedByCount: 50, pdfUrl: 'https://x/y.pdf' }),
      paper({ openalexId: 'W4', citedByCount: 80 }),
    ]);
    expect(fallback).toHaveLength(3);
    expect(fallback[0].title).toBe('A paper');
    expect(fallback.every((entry) => entry.fallback)).toBe(true);
  });

  it('returns fewer than requested when nothing is open access', () => {
    expect(pickFallbackBaselines([paper()], MIN_BASELINES)).toEqual([]);
  });
});

describe('batch prep', () => {
  const papers = assignReferenceIds(
    Array.from({ length: 120 }, (_, i) =>
      paper({ openalexId: `W${i}`, title: `Paper ${i}`, citedByCount: i }),
    ),
  );

  it('assigns zero-padded sequential ids', () => {
    expect(papers[0].refId).toBe('RE001');
    expect(papers[119].refId).toBe('RE120');
  });

  it('splits into batches of 50', () => {
    const batches = splitIntoBatches(papers);
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(BATCH_SIZE);
    expect(batches[2]).toHaveLength(20);
  });

  it('rejects a non-positive batch size', () => {
    expect(() => splitIntoBatches(papers, 0)).toThrow('BATCH_SIZE_INVALID');
  });

  it('emits a CSV with paper_id mirroring refId', () => {
    const csv = renderCsv(papers.slice(0, 1));
    const [header, row] = csv.split('\n');
    expect(header.startsWith('refId,paper_id,title')).toBe(true);
    expect(row.startsWith('RE001,RE001,')).toBe(true);
  });

  it('quotes CSV fields containing commas or quotes', () => {
    const csv = renderCsv(
      assignReferenceIds([paper({ title: 'A, "quoted" title' })]),
    );
    expect(csv).toContain('"A, ""quoted"" title"');
  });

  it('leaves pdf_path empty when no PDF was downloaded', () => {
    const csv = renderCsv(papers.slice(0, 1));
    const row = csv.split('\n')[1];
    expect(row).toContain(',,https://openalex.org/W1');
  });

  it('renders a BibTeX entry per paper with a stable key', () => {
    const bib = renderBibtex(papers.slice(0, 1));
    expect(bib).toContain('@article{');
    expect(bib).toContain('title = {Paper 0}');
    expect(bib).toContain('author = {Jane Doe}');
  });
});
