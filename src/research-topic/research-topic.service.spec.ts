import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResearchTopicService, validateFirstSearchInput } from './research-topic.service';

describe('ResearchTopicService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to 300 and rejects targets outside 300-800', () => {
    expect(validateFirstSearchInput({ researchInterest: 'computer vision' }).targetCount).toBe(300);
    expect(validateFirstSearchInput({ researchInterest: 'computer vision', targetCount: 300 }).targetCount).toBe(300);
    expect(validateFirstSearchInput({ researchInterest: 'computer vision', targetCount: 800 }).targetCount).toBe(800);
    expect(() => validateFirstSearchInput({ researchInterest: 'computer vision', targetCount: 299 })).toThrow('INVALID_LIMIT');
    expect(() => validateFirstSearchInput({ researchInterest: 'computer vision', targetCount: 801 })).toThrow('INVALID_LIMIT');
  });

  it('accumulates cursor pages and de-duplicates DOI before reaching the target', async () => {
    const pages = [
      Array.from({ length: 100 }, (_, index) => work(`W-${index}`, `10.1000/${index}`)),
      [work('W-duplicate-1', '10.1000/0'), ...Array.from({ length: 99 }, (_, index) => work(`W-${100 + index}`, `10.1000/${100 + index}`))],
      [work('W-duplicate-2', '10.1000/1'), ...Array.from({ length: 99 }, (_, index) => work(`W-${199 + index}`, `10.1000/${199 + index}`))],
      [work('W-298', '10.1000/298'), work('W-299', '10.1000/299')],
    ];
    const fetchMock = vi.fn(async (url: string) => {
      const cursor = new URL(url).searchParams.get('cursor');
      const pageIndex = cursor === '*' ? 0 : Number(cursor?.replace('cursor-', ''));
      return { ok: true, json: async () => ({ results: pages[pageIndex], meta: { next_cursor: pageIndex < pages.length - 1 ? `cursor-${pageIndex + 1}` : null } }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new ResearchTopicService();
    const started = service.start(validateFirstSearchInput({ researchInterest: 'computer vision' }));
    let task = await service.get(started.runId);
    for (let attempt = 0; attempt < 100 && (task?.status === 'running' || task?.status === 'queued'); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      task = await service.get(started.runId);
    }

    expect(task?.status).toBe('completed');
    expect(task?.counts).toMatchObject({ requested: 300, returned: 302, deduplicated: 300, previewed: 20, targetReached: true });
    expect(task?.papers).toHaveLength(20);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    await rm(join(process.cwd(), 'work', 'research-topic', 'runs', started.runId), { recursive: true, force: true });
  });
});

function work(id: string, doi: string) {
  return {
    id: `https://openalex.org/${id}`,
    doi: `https://doi.org/${doi}`,
    title: `Test paper ${id}`,
    publication_year: 2024,
    authorships: [],
    primary_location: { landing_page_url: `https://openalex.org/${id}`, source: { display_name: 'Test venue' } },
    abstract_inverted_index: { vision: [0] },
    cited_by_count: 0,
  };
}
