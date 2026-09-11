import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  FirstSearchInput,
  ResearchTopicManifest,
  ResearchTopicPaper,
  ResearchTopicTask,
} from './research-topic.types';

const OPENALEX_WORKS_URL = 'https://api.openalex.org/works';
const OUTPUT_ROOT = join(process.cwd(), 'work', 'research-topic', 'runs');
const MAX_INTEREST_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 4000;
const DEFAULT_TARGET_COUNT = 300;
const MIN_TARGET_COUNT = 300;
const MAX_TARGET_COUNT = 800;
const PREVIEW_COUNT = 20;
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 3;
const SELECT = 'id,doi,title,publication_year,authorships,primary_location,abstract_inverted_index,cited_by_count';

type OpenAlexPayload = {
  meta?: { count?: number; next_cursor?: string | null };
  results?: Array<Record<string, unknown>>;
};

@Injectable()
export class ResearchTopicService {
  private readonly tasks = new Map<string, ResearchTopicTask>();

  start(input: FirstSearchInput): ResearchTopicTask {
    const runId = randomUUID();
    const now = new Date().toISOString();
    const task: ResearchTopicTask = {
      runId,
      status: 'queued',
      files: [],
      errors: [],
      papers: [],
      counts: { papers: 0, requested: input.targetCount, returned: 0, deduplicated: 0, previewed: 0, targetReached: false },
      createdAt: now,
      updatedAt: now,
      cancelRequested: false,
    };
    this.tasks.set(runId, task);
    void this.execute(task, input);
    return this.publicTask(task);
  }

  get(runId: string): ResearchTopicTask | undefined {
    const task = this.tasks.get(runId);
    return task ? this.publicTask(task) : undefined;
  }

  cancel(runId: string): boolean {
    const task = this.tasks.get(runId);
    if (!task || ['completed', 'failed', 'cancelled'].includes(task.status)) return false;
    task.cancelRequested = true;
    task.updatedAt = new Date().toISOString();
    return true;
  }

  private async execute(task: ResearchTopicTask, input: FirstSearchInput) {
    task.status = 'running';
    task.updatedAt = new Date().toISOString();
    const sourceQueries: Array<Record<string, unknown>> = [];
    try {
      let cursor = '*';
      let nextCursor: string | null | undefined = cursor;
      const seenKeys = new Set<string>();
      const papers: ResearchTopicPaper[] = [];
      let dateFilter: string | undefined;
      if (input.yearRange?.from || input.yearRange?.to) {
        const from = input.yearRange.from ?? 1900;
        const to = input.yearRange.to ?? new Date().getUTCFullYear();
        dateFilter = `from_publication_date:${from}-01-01,to_publication_date:${to}-12-31`;
      }
      while (nextCursor && papers.length < input.targetCount) {
        if (task.cancelRequested) {
          task.status = 'cancelled';
          break;
        }
        cursor = nextCursor;
        const params = new URLSearchParams({ search: input.researchInterest.trim(), 'per-page': String(PAGE_SIZE), select: SELECT, cursor });
        if (dateFilter) params.set('filter', dateFilter);
        const payload = await this.request(`${OPENALEX_WORKS_URL}?${params.toString()}`);
        const rawResults = payload.results ?? [];
        task.counts.returned += rawResults.length;
        for (const rawWork of rawResults) {
          const paper = normalizeWork(rawWork);
          if (!paper.title || !paper.openalexId) continue;
          const key = deduplicationKey(paper);
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          papers.push(paper);
          if (papers.length >= input.targetCount) break;
        }
        sourceQueries.push({ source: 'OpenAlex', endpoint: OPENALEX_WORKS_URL, search: input.researchInterest.trim(), yearRange: input.yearRange ?? null, targetCount: input.targetCount, perPage: PAGE_SIZE, cursor, returned: rawResults.length, deduplicated: papers.length, status: 'completed' });
        nextCursor = payload.meta?.next_cursor;
        if (!nextCursor || nextCursor === cursor || rawResults.length === 0) break;
      }
      task.papers = papers;
      task.counts.papers = papers.length;
      task.counts.deduplicated = papers.length;
      task.counts.previewed = Math.min(papers.length, PREVIEW_COUNT);
      task.counts.targetReached = papers.length >= input.targetCount;
    } catch (error) {
      task.status = task.cancelRequested ? 'cancelled' : 'failed';
      task.errors = [{ code: 'OPENALEX_REQUEST_FAILED', message: safeErrorMessage(error) }];
      sourceQueries.push({ source: 'OpenAlex', endpoint: OPENALEX_WORKS_URL, search: input.researchInterest.trim(), targetCount: input.targetCount, status: 'failed' });
    }
    await this.persist(task, sourceQueries);
    if (task.status === 'running') {
      task.status = 'completed';
    }
    task.updatedAt = new Date().toISOString();
  }

  private async request(url: string): Promise<OpenAlexPayload> {
    let lastCode = 'NETWORK_ERROR';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': 'qihang-research-topic/1.0' } });
        if (response.ok) return await response.json() as OpenAlexPayload;
        lastCode = `HTTP_${response.status}`;
        if (response.status !== 429 && response.status < 500) break;
      } catch (error) {
        lastCode = error instanceof DOMException && error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR';
      } finally {
        clearTimeout(timer);
      }
      if (attempt < MAX_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
    throw new Error(lastCode);
  }

  private async persist(task: ResearchTopicTask, sourceQueries: Array<Record<string, unknown>>) {
    const directory = join(OUTPUT_ROOT, task.runId, 'first-search');
    const manifest: ResearchTopicManifest = {
      runId: task.runId,
      stage: 'first-search',
      status: task.status === 'failed' || task.status === 'cancelled' ? 'failed' : 'completed',
      files: [
        { name: 'first-search-papers.csv', path: 'first-search-papers.csv', kind: 'csv' },
        { name: 'manifest.json', path: 'manifest.json', kind: 'manifest' },
      ],
      counts: task.counts,
      errors: task.errors,
      warnings: task.status === 'cancelled' ? ['任务已取消，结果不完整。'] : task.counts.targetReached ? [] : [`结果不足：去重后仅返回 ${task.counts.deduplicated} 条，未达到 ${task.counts.requested} 条目标。`],
      sourceQueries,
      createdAt: task.createdAt,
    };
    task.files = manifest.files;
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'first-search-papers.csv'), toCsv(task.papers), 'utf8');
    await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  }

  private publicTask(task: ResearchTopicTask): ResearchTopicTask {
    const { cancelRequested: _cancelRequested, ...publicTask } = task;
    return { ...publicTask, papers: task.papers.slice(0, PREVIEW_COUNT), cancelRequested: false };
  }
}

function normalizeWork(work: Record<string, unknown>): ResearchTopicPaper {
  const authorships = Array.isArray(work.authorships) ? work.authorships : [];
  const authors: string[] = [];
  const institutions = new Set<string>();
  for (const entry of authorships) {
    if (!entry || typeof entry !== 'object') continue;
    const author = (entry as Record<string, unknown>).author;
    if (author && typeof author === 'object' && typeof (author as Record<string, unknown>).display_name === 'string') authors.push((author as Record<string, string>).display_name);
    const items = (entry as Record<string, unknown>).institutions;
    if (Array.isArray(items)) for (const institution of items) if (institution && typeof institution === 'object' && typeof (institution as Record<string, unknown>).display_name === 'string') institutions.add((institution as Record<string, string>).display_name);
  }
  const location = work.primary_location && typeof work.primary_location === 'object' ? work.primary_location as Record<string, unknown> : {};
  const source = location.source && typeof location.source === 'object' ? location.source as Record<string, unknown> : {};
  return {
    openalexId: typeof work.id === 'string' ? work.id : '',
    title: typeof work.title === 'string' ? work.title : '',
    authors,
    institutions: [...institutions],
    source: typeof source.display_name === 'string' ? source.display_name : '',
    publicationYear: typeof work.publication_year === 'number' ? work.publication_year : null,
    citedByCount: typeof work.cited_by_count === 'number' ? work.cited_by_count : 0,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    doi: typeof work.doi === 'string' ? work.doi : '',
    landingUrl: typeof location.landing_page_url === 'string' ? location.landing_page_url : (typeof work.id === 'string' ? work.id : ''),
    sourceStatus: 'openalex_public_api',
  };
}

function reconstructAbstract(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const words: string[] = [];
  for (const [word, positions] of Object.entries(value)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) if (typeof position === 'number' && position >= 0 && position < 10000) words[position] = word;
  }
  return words.filter(Boolean).join(' ');
}

function toCsv(papers: ResearchTopicPaper[]): string {
  const fields = ['openalexId', 'title', 'authors', 'institutions', 'source', 'publicationYear', 'citedByCount', 'abstract', 'doi', 'landingUrl', 'sourceStatus'];
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [fields.join(','), ...papers.map((paper) => [paper.openalexId, paper.title, paper.authors.join('; '), paper.institutions.join('; '), paper.source, paper.publicationYear, paper.citedByCount, paper.abstract, paper.doi, paper.landingUrl, paper.sourceStatus].map(quote).join(','))].join('\n');
}

function safeErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : 'NETWORK_ERROR';
  return ['HTTP_429', 'HTTP_500', 'HTTP_502', 'HTTP_503', 'HTTP_504', 'TIMEOUT', 'NETWORK_ERROR'].includes(code) ? `OpenAlex 暂时不可用（${code}），请稍后重试。` : 'OpenAlex 返回了无法处理的结果，请稍后重试。';
}

export function validateFirstSearchInput(value: unknown): FirstSearchInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_INPUT');
  const input = value as Record<string, unknown>;
  const allowed = new Set(['researchInterest', 'context', 'yearRange', 'targetCount']);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new Error('INVALID_INPUT');
  if (typeof input.researchInterest !== 'string' || input.researchInterest.trim().length < 3 || input.researchInterest.length > MAX_INTEREST_LENGTH) throw new Error('INVALID_INTEREST');
  if (input.context !== undefined && (typeof input.context !== 'string' || input.context.length > MAX_CONTEXT_LENGTH)) throw new Error('INVALID_CONTEXT');
  if (input.targetCount !== undefined && (typeof input.targetCount !== 'number' || !Number.isInteger(input.targetCount) || input.targetCount < MIN_TARGET_COUNT || input.targetCount > MAX_TARGET_COUNT)) throw new Error('INVALID_LIMIT');
  let yearRange: FirstSearchInput['yearRange'];
  if (input.yearRange !== undefined) {
    if (!input.yearRange || typeof input.yearRange !== 'object' || Array.isArray(input.yearRange)) throw new Error('INVALID_YEAR_RANGE');
    const range = input.yearRange as Record<string, unknown>;
    if (Object.keys(range).some((key) => !['from', 'to'].includes(key)) || (range.from !== undefined && typeof range.from !== 'number') || (range.to !== undefined && typeof range.to !== 'number')) throw new Error('INVALID_YEAR_RANGE');
    const from = range.from as number | undefined;
    const to = range.to as number | undefined;
    if ((from !== undefined && (!Number.isInteger(from) || from < 1900 || from > 2100)) || (to !== undefined && (!Number.isInteger(to) || to < 1900 || to > 2100)) || (from !== undefined && to !== undefined && from > to)) throw new Error('INVALID_YEAR_RANGE');
    yearRange = { from, to };
  }
  return { researchInterest: input.researchInterest.trim(), context: typeof input.context === 'string' ? input.context.trim() : undefined, yearRange, targetCount: typeof input.targetCount === 'number' ? input.targetCount : DEFAULT_TARGET_COUNT };
}

function deduplicationKey(paper: ResearchTopicPaper): string {
  const doi = paper.doi.trim().toLowerCase().replace(/^https?:\/\/doi\.org\//, '');
  return doi ? `doi:${doi}` : `openalex:${paper.openalexId.toLowerCase()}`;
}
