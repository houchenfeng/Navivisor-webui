/**
 * Classic seed papers (T30).
 *
 * The most-cited papers in the merged pool are the field's anchor works; the
 * reverse-citation stage (T31) walks forward from them to find what is being
 * built on top right now.
 */
import type { ResearchTopicPaper } from './research-topic.types';

/** How many seeds the reverse-citation stage will walk from. */
export const SEED_COUNT = 20;

/**
 * Picks the highest-cited papers.
 *
 * Ties break on publication year (older first — a paper that accumulated the
 * same citations over more years is the more established work), then on the
 * OpenAlex id so the result is deterministic across runs.
 */
export function selectSeedPapers(
  papers: ResearchTopicPaper[],
  limit = SEED_COUNT,
): ResearchTopicPaper[] {
  return [...papers]
    .sort((a, b) => {
      if (b.citedByCount !== a.citedByCount) {
        return b.citedByCount - a.citedByCount;
      }
      const yearA = a.publicationYear ?? Number.MAX_SAFE_INTEGER;
      const yearB = b.publicationYear ?? Number.MAX_SAFE_INTEGER;
      if (yearA !== yearB) return yearA - yearB;
      return a.openalexId.localeCompare(b.openalexId);
    })
    .slice(0, limit);
}

/**
 * Extracts the bare OpenAlex work id used by the `cites:` filter.
 *
 * Accepts a full URL (`https://openalex.org/W123`) or a bare id, and rejects
 * arXiv-sourced entries because they have no OpenAlex id to cite.
 */
export function toOpenAlexWorkId(paper: ResearchTopicPaper): string | null {
  const raw = paper.openalexId?.trim();
  if (!raw || raw.startsWith('arxiv:')) return null;
  const match = raw.match(/(W\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

export function renderSeedPapersMarkdown(
  seeds: ResearchTopicPaper[],
  direction = '',
): string {
  return [
    `# 经典种子文献（被引 Top ${seeds.length}） · ${direction}`,
    '',
    ...seeds.map((paper, index) => {
      const year = paper.publicationYear ?? '未知';
      const venue = paper.source?.trim() || '未标注来源';
      const workId = toOpenAlexWorkId(paper) ?? '（无 OpenAlex ID）';
      return [
        `${index + 1}. **${paper.title}**`,
        `   - ${venue} · ${year} · 被引 ${paper.citedByCount} 次`,
        `   - OpenAlex：${workId}`,
        paper.doi ? `   - DOI：${paper.doi}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }),
  ].join('\n');
}
