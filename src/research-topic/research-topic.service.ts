import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type {
  FirstSearchInput,
  ResearchTopicManifest,
  ResearchTopicPaper,
  ResearchTopicTask,
  ResearchTopicCandidate,
} from './research-topic.types';
import { buildOpenAlexQueryPlan, buildOpenAlexQueryPlans } from './openalex-query';

const OPENALEX_API_URL = 'https://api.openalex.org/';
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
const SELECT = 'id,doi,title,publication_year,authorships,primary_location,best_oa_location,locations,open_access,has_content,content_urls,abstract_inverted_index,cited_by_count';

type OpenAlexPayload = {
  meta?: { count?: number; next_cursor?: string | null };
  results?: Array<Record<string, unknown>>;
};

@Injectable()
export class ResearchTopicService implements OnModuleInit {
  private readonly tasks = new Map<string, ResearchTopicTask>();

  constructor(private readonly config?: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      const runIds = await readdir(OUTPUT_ROOT, { withFileTypes: true });
      for (const entry of runIds) {
        if (!entry.isDirectory()) continue;
        const task = await this.restore(entry.name);
        if (task && ['queued', 'running'].includes(task.candidateStatus)) {
          void this.executeCandidateGeneration(task);
        }
      }
    } catch {
      // The runs directory is created when the first search is persisted.
    }
  }

  start(input: FirstSearchInput): ResearchTopicTask {
    const runId = randomUUID();
    const now = new Date().toISOString();
    const task: ResearchTopicTask = {
      runId,
      researchInterest: input.researchInterest,
      status: 'queued',
      files: [],
      errors: [],
      papers: [],
      counts: { papers: 0, requested: input.targetCount, returned: 0, deduplicated: 0, previewed: 0, targetReached: false },
      createdAt: now,
      updatedAt: now,
      cancelRequested: false,
      candidateStatus: 'idle',
    };
    this.tasks.set(runId, task);
    void this.execute(task, input);
    return this.publicTask(task);
  }

  async generateCandidates(runId: string): Promise<ResearchTopicTask> {
    await this.get(runId);
    const task = this.tasks.get(runId);
    if (!task) throw new Error('TASK_NOT_FOUND');
    if (task.status !== 'completed') throw new Error('SEARCH_NOT_COMPLETED');
    if (task.candidateStatus === 'running' || task.candidateStatus === 'queued') return this.publicTask(task);
    if (!task.counts.deduplicated) throw new Error('NO_SEARCH_RESULTS');

    task.candidateStatus = 'queued';
    task.candidateError = undefined;
    task.candidates = undefined;
    task.updatedAt = new Date().toISOString();
    await this.persistCandidateState(task);
    void this.executeCandidateGeneration(this.tasks.get(runId) ?? task);
    return this.publicTask(task);
  }

  async generateCoreLiterature(runId: string, label: string): Promise<ResearchTopicTask> {
    await this.get(runId);
    const task = this.tasks.get(runId);
    if (!task) throw new Error('TASK_NOT_FOUND');
    if (task.status !== 'completed' || task.candidateStatus !== 'completed') throw new Error('TOPIC_NOT_CONFIRMED');
    const candidate = task.candidates?.find((item) => item.label === label);
    if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');
    if (task.coreStatus === 'running' || task.coreStatus === 'queued') return this.publicTask(task);
    task.coreStatus = 'queued'; task.coreError = undefined; task.coreManifest = undefined; task.coreRunId = randomUUID(); task.updatedAt = new Date().toISOString();
    await this.persistCandidateState(task);
    void this.executeCoreLiterature(task, candidate.title);
    return this.publicTask(task);
  }

  private async executeCoreLiterature(task: ResearchTopicTask, confirmedTopic: string): Promise<void> {
    const runDirectory = join(OUTPUT_ROOT, task.runId, 'core-literature');
    const inputDirectory = join(runDirectory, 'normalized-input');
    const configPath = join(runDirectory, 'input.json');
    const scriptPath = join(process.cwd(), 'research-tools', 'core-literature', 'core_pack.py');
    try {
      task.coreStatus = 'running'; task.updatedAt = new Date().toISOString();
      await this.persistCandidateState(task);
      await mkdir(inputDirectory, { recursive: true });
      const coreSourceQueries: Array<Record<string, unknown>> = [];
      const coreSearchText = [task.researchInterest, confirmedTopic].filter(Boolean).join(' ');
      const queryPlan = buildOpenAlexQueryPlan(coreSearchText);
      const papers = await this.searchCorePapers(coreSearchText, 100, coreSourceQueries);
      await writeFile(join(inputDirectory, 'papers.json'), JSON.stringify(papers, null, 2), 'utf8');
      await writeFile(configPath, JSON.stringify({
        runId: task.coreRunId, confirmedTopic,
        selection: { targetCount: 100, rankingRule: 'OpenAlex relevance order' },
        pdfPolicy: { allowedPdfHosts: ['content.openalex.org', 'arxiv.org', 'europepmc.org', 'pmc.ncbi.nlm.nih.gov'], maxBytes: 25 * 1024 * 1024 },
        downloadPolicy: { targetSuccessfulPdfs: 100, maxCandidatesToAttempt: 100, maxWorkers: 4, maxWorkersPerHost: 2 },
        sourcePolicy: { allowedHosts: ['api.openalex.org'] }, queries: coreSourceQueries.length > 0 ? coreSourceQueries : [{ source: 'OpenAlex', oql: queryPlan.oql, includeTerms: queryPlan.includeTerms, excludeTitleTerms: queryPlan.excludeTitleTerms, targetCount: 100 }],
      }, null, 2), 'utf8');
      await new Promise<void>((resolve) => {
        const child = spawn('python', [scriptPath, '--config', configPath, '--mode', 'run', '--input-dir', inputDirectory, '--output-dir', runDirectory, '--download-oa'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = ''; child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
        child.on('error', (error) => { task.coreStatus = 'failed'; task.coreError = error.message; task.updatedAt = new Date().toISOString(); void this.persistCandidateState(task); resolve(); });
        child.on('close', async (code) => {
          try { task.coreManifest = JSON.parse(await readFile(join(runDirectory, 'manifest.json'), 'utf8')) as Record<string, unknown>; } catch { task.coreManifest = undefined; }
          if (code !== 0 && !task.coreManifest) { task.coreStatus = 'failed'; task.coreError = `核心文献 Skill 执行失败。${stderr.trim().slice(-300)}`; }
          else { task.coreStatus = task.coreManifest?.status === 'partial' ? 'partial' : 'completed'; task.coreError = undefined; }
          task.updatedAt = new Date().toISOString(); await this.persistCandidateState(task); resolve();
        });
      });
    } catch (error) { task.coreStatus = 'failed'; task.coreError = error instanceof Error ? error.message : '核心文献检索失败。'; task.updatedAt = new Date().toISOString(); await this.persistCandidateState(task); }
  }

  private async searchCorePapers(input: string, target: number, sourceQueries: Array<Record<string, unknown>>): Promise<Array<Record<string, unknown>>> {
    const papers = await this.searchAdaptivePapers(input, target, sourceQueries);
    return papers.map((paper) => ({ ...paper, year: paper.publicationYear, sourceUrl: paper.landingUrl, openAccessUrl: paper.pdfUrl, isOpenAccess: Boolean(paper.isOpenAccess), pdfUrl: paper.pdfUrl }));
  }

  private async searchAdaptivePapers(input: string, target: number, sourceQueries: Array<Record<string, unknown>>, task?: ResearchTopicTask, dateFilter?: string): Promise<ResearchTopicPaper[]> {
    const papers: ResearchTopicPaper[] = [];
    const seenKeys = new Set<string>();
    const plans = buildOpenAlexQueryPlans(input);
    for (const [planIndex, plan] of plans.entries()) {
      let cursor: string | null | undefined = '*';
      let page = 0;
      let total: number | undefined;
      while (cursor && papers.length < target) {
        if (task?.cancelRequested) break;
        const currentCursor = cursor;
        const params = new URLSearchParams({ oql: plan.oql, 'per-page': String(PAGE_SIZE), select: SELECT, cursor: currentCursor });
        if (dateFilter) params.set('filter', dateFilter);
        const payload = await this.request(`${OPENALEX_API_URL}?${params.toString()}`);
        total = typeof payload.meta?.count === 'number' ? payload.meta.count : total;
        const rawResults = payload.results ?? [];
        for (const rawWork of rawResults) {
          const paper = normalizeWork(rawWork);
          if (!paper.title || !paper.openalexId) continue;
          const key = deduplicationKey(paper);
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          papers.push(paper);
          if (papers.length >= target) break;
        }
        sourceQueries.push({ source: 'OpenAlex', endpoint: OPENALEX_API_URL, tier: plan.tier, reason: plan.reason, oql: plan.oql, includeTerms: plan.includeTerms, excludeTitleTerms: plan.excludeTitleTerms, targetCount: target, page, cursor: currentCursor, matchedCount: total ?? null, returned: rawResults.length, deduplicated: papers.length, status: 'completed' });
        if (task) task.counts.returned += rawResults.length;
        const next = payload.meta?.next_cursor;
        if (!next || next === currentCursor || rawResults.length === 0) break;
        cursor = next;
        page += 1;
      }
      if (papers.length >= target || task?.cancelRequested) break;
      if (planIndex < plans.length - 1) sourceQueries.push({ source: 'OpenAlex', tier: plan.tier, reason: `去重后仅得到 ${papers.length} 条，切换到下一层检索。`, matchedCount: total ?? null, deduplicated: papers.length, status: 'fallback' });
    }
    return papers;
  }

  private async executeCandidateGeneration(task: ResearchTopicTask): Promise<void> {
    const inputPath = join(OUTPUT_ROOT, task.runId, 'first-search', 'first-search-papers.csv');
    const outputDirectory = join(OUTPUT_ROOT, task.runId, 'candidates');
    const outputPath = join(outputDirectory, 'codex-output.json');
    try {
      await mkdir(outputDirectory, { recursive: true });
    } catch (error) {
      task.candidateStatus = 'failed';
      task.candidateError = `无法准备 Codex CLI 输出目录：${error instanceof Error ? error.message : '未知错误'}`;
      task.updatedAt = new Date().toISOString();
      await this.persistCandidateState(task);
      return;
    }
    task.candidateStatus = 'running';
    task.updatedAt = new Date().toISOString();
    await this.persistCandidateState(task);

    const prompt = [
      '你是启航科研智能体的开题候选课题分析器。',
      `请读取本地 CSV：${inputPath}`,
      'CSV 是第一环节从 OpenAlex 公开 API 检索并去重后的文献元数据，可能有几百条；只能把它当作证据，不得补写不存在的论文、作者、DOI、指标或实验结果。',
      '请生成且只生成三个候选课题，分类必须分别为“偏可行”“偏创新”“较平衡”。每个课题必须严格包含：title、oneSentenceDefinition、researchDesign、expectedInnovation、rationale。',
      'oneSentenceDefinition 是一句话定义；researchDesign 必须具体写出技术路线、数据集、对比/消融实验和评测指标；expectedInnovation 要写成待验证的候选创新性与实际价值；rationale 必须引用 CSV 中可定位的论文标题或 OpenAlex ID，如果摘要或证据不足，要明确写“待核验”，不能猜测。',
      '请只输出一个 JSON 对象，不要 Markdown，不要解释。格式：{"candidates":[{"label":"偏可行","title":"...","oneSentenceDefinition":"...","researchDesign":"...","expectedInnovation":"...","rationale":"..."},{"label":"偏创新",...},{"label":"较平衡",...}]}',
    ].join('\n');

    await new Promise<void>((resolve) => {
      const child = spawn('codex', [
        'exec',
        '--cd', process.cwd(),
        '--sandbox', 'read-only',
        '--skip-git-repo-check',
        '--output-last-message', outputPath,
        prompt,
      ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
      child.on('error', (error) => {
        task.candidateStatus = 'failed';
        task.candidateError = error.message.includes('ENOENT') ? '本机未找到 Codex CLI，请先确认 codex 已加入 PATH。' : `Codex CLI 启动失败：${error.message}`;
        task.updatedAt = new Date().toISOString();
        void this.persistCandidateState(task);
        resolve();
      });
      child.on('close', async (code) => {
        if (code !== 0) {
          task.candidateStatus = 'failed';
          task.candidateError = `Codex CLI 未完成候选课题生成（退出码 ${code ?? '未知'}）。${stderr.trim() ? ` ${stderr.trim().slice(-300)}` : ''}`;
          task.updatedAt = new Date().toISOString();
          await this.persistCandidateState(task);
          resolve();
          return;
        }
        try {
          const raw = await readFile(outputPath, 'utf8');
          const parsed = parseCandidates(raw);
          task.candidates = parsed;
          task.candidateStatus = 'completed';
          task.updatedAt = new Date().toISOString();
          await this.persistCandidateState(task);
        } catch (error) {
          task.candidateStatus = 'failed';
          task.candidateError = error instanceof Error ? error.message : 'Codex 输出无法解析，请重试。';
          task.updatedAt = new Date().toISOString();
          await this.persistCandidateState(task);
        }
        resolve();
      });
    });
  }

  async get(runId: string): Promise<ResearchTopicTask | undefined> {
    const task = this.tasks.get(runId);
    if (task) return this.publicTask(task);
    const restored = await this.restore(runId);
    return restored ? this.publicTask(restored) : undefined;
  }

  async cancel(runId: string): Promise<boolean> {
    await this.get(runId);
    const task = this.tasks.get(runId);
    if (!task || ['completed', 'failed', 'cancelled'].includes(task.status)) return false;
    task.cancelRequested = true;
    task.updatedAt = new Date().toISOString();
    await this.persistCandidateState(task);
    return true;
  }

  private async execute(task: ResearchTopicTask, input: FirstSearchInput) {
    task.status = 'running';
    task.updatedAt = new Date().toISOString();
    const sourceQueries: Array<Record<string, unknown>> = [];
    try {
      let dateFilter: string | undefined;
      if (input.yearRange?.from || input.yearRange?.to) {
        const from = input.yearRange.from ?? 1900;
        const to = input.yearRange.to ?? new Date().getUTCFullYear();
        dateFilter = `from_publication_date:${from}-01-01,to_publication_date:${to}-12-31`;
      }
      const papers = await this.searchAdaptivePapers(input.researchInterest, input.targetCount, sourceQueries, task, dateFilter);
      if (task.cancelRequested) task.status = 'cancelled';
      task.papers = papers;
      task.counts.papers = papers.length;
      task.counts.deduplicated = papers.length;
      task.counts.previewed = Math.min(papers.length, PREVIEW_COUNT);
      task.counts.targetReached = papers.length >= input.targetCount;
    } catch (error) {
      task.status = task.cancelRequested ? 'cancelled' : 'failed';
      task.errors = [{ code: 'OPENALEX_REQUEST_FAILED', message: safeErrorMessage(error) }];
      const queryPlan = buildOpenAlexQueryPlan(input.researchInterest);
      sourceQueries.push({ source: 'OpenAlex', endpoint: OPENALEX_API_URL, tier: queryPlan.tier, oql: queryPlan.oql, includeTerms: queryPlan.includeTerms, excludeTitleTerms: queryPlan.excludeTitleTerms, targetCount: input.targetCount, status: 'failed' });
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
        const requestUrl = new URL(url);
        const apiKey = this.config?.get<string>('OPENALEX_API_KEY') ?? process.env.OPENALEX_API_KEY;
        if (apiKey) requestUrl.searchParams.set('api_key', apiKey);
        const response = await fetch(requestUrl, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': 'qihang-research-topic/1.0' } });
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
    await writeFile(join(directory, 'papers-preview.json'), JSON.stringify(task.papers.slice(0, PREVIEW_COUNT), null, 2), 'utf8');
    await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  }

  private async persistCandidateState(task: ResearchTopicTask): Promise<void> {
    const directory = join(OUTPUT_ROOT, task.runId, 'candidates');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'candidate-state.json'), JSON.stringify({
      runId: task.runId,
      researchInterest: task.researchInterest ?? null,
      status: task.candidateStatus,
      candidates: task.candidates ?? null,
      error: task.candidateError ?? null,
      coreRunId: task.coreRunId ?? null,
      coreStatus: task.coreStatus ?? 'idle',
      coreManifest: task.coreManifest ?? null,
      coreError: task.coreError ?? null,
      updatedAt: task.updatedAt,
    }, null, 2), 'utf8');
  }

  private async restore(runId: string): Promise<ResearchTopicTask | undefined> {
    if (!/^[0-9a-f-]{36}$/i.test(runId)) return undefined;
    const directory = join(OUTPUT_ROOT, runId, 'first-search');
    try {
      const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')) as ResearchTopicManifest;
      let papers: ResearchTopicPaper[] = [];
      try {
        papers = JSON.parse(await readFile(join(directory, 'papers-preview.json'), 'utf8')) as ResearchTopicPaper[];
      } catch {
        // Older runs did not persist previews; counts and files remain recoverable.
      }
      const task: ResearchTopicTask = {
        runId, researchInterest: undefined, status: manifest.status, files: manifest.files, errors: manifest.errors ?? [], papers,
        counts: manifest.counts, createdAt: manifest.createdAt, updatedAt: manifest.createdAt,
        cancelRequested: false, candidateStatus: 'idle',
      };
      try {
        const state = JSON.parse(await readFile(join(OUTPUT_ROOT, runId, 'candidates', 'candidate-state.json'), 'utf8')) as { researchInterest?: string | null; status?: ResearchTopicTask['candidateStatus']; candidates?: ResearchTopicCandidate[] | null; error?: string | null; coreStatus?: ResearchTopicTask['coreStatus']; coreRunId?: string; coreManifest?: Record<string, unknown> | null; coreError?: string | null; updatedAt?: string };
        if (state.researchInterest) task.researchInterest = state.researchInterest;
        if (state.status) task.candidateStatus = state.status;
        if (Array.isArray(state.candidates)) task.candidates = state.candidates;
        if (state.error) task.candidateError = state.error;
        if (state.coreStatus) task.coreStatus = state.coreStatus;
        if (state.coreRunId) task.coreRunId = state.coreRunId;
        if (state.coreManifest) task.coreManifest = state.coreManifest;
        if (state.coreError) task.coreError = state.coreError;
        if (state.updatedAt) task.updatedAt = state.updatedAt;
      } catch {
        try {
          const raw = await readFile(join(OUTPUT_ROOT, runId, 'candidates', 'codex-output.json'), 'utf8');
          task.candidates = parseCandidates(raw);
          task.candidateStatus = 'completed';
        } catch {
          // Candidate generation may not have started yet.
        }
      }
      this.tasks.set(runId, task);
      return task;
    } catch {
      return undefined;
    }
  }

  private publicTask(task: ResearchTopicTask): ResearchTopicTask {
    const { cancelRequested: _cancelRequested, researchInterest: _researchInterest, ...publicTask } = task;
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
  const bestOaLocation = work.best_oa_location && typeof work.best_oa_location === 'object' ? work.best_oa_location as Record<string, unknown> : {};
  const locations = Array.isArray(work.locations) ? work.locations.filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object')) : [];
  const source = location.source && typeof location.source === 'object' ? location.source as Record<string, unknown> : {};
  const openAccess = work.open_access && typeof work.open_access === 'object' ? work.open_access as Record<string, unknown> : {};
  const hasContent = work.has_content && typeof work.has_content === 'object' ? work.has_content as Record<string, unknown> : {};
  const contentUrls = work.content_urls && typeof work.content_urls === 'object' ? work.content_urls as Record<string, unknown> : {};
  const contentPdfUrl = typeof contentUrls.pdf === 'string' ? contentUrls.pdf : '';
  const isOpenAccess = openAccess.is_oa === true || bestOaLocation.is_oa === true || locations.some((value) => value.is_oa === true) || (hasContent.pdf === true && contentPdfUrl.length > 0);
  const pdfUrl = firstNonEmptyString([
    contentPdfUrl,
    bestOaLocation.pdf_url,
    ...locations.map((value) => value.pdf_url),
    location.pdf_url,
  ]);
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
    isOpenAccess,
    pdfUrl,
  };
}

function firstNonEmptyString(values: unknown[]): string {
  const value = values.find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0);
  return value ?? '';
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

function parseCandidates(raw: string): ResearchTopicCandidate[] {
  const normalized = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const value = JSON.parse(normalized) as { candidates?: unknown };
  if (!Array.isArray(value.candidates) || value.candidates.length !== 3) throw new Error('Codex 未返回恰好三个候选课题，请重试。');
  const labels = new Set(['偏可行', '偏创新', '较平衡']);
  const result = value.candidates.map((candidate) => {
    if (!candidate || typeof candidate !== 'object') throw new Error('候选课题格式无效，请重试。');
    const item = candidate as Record<string, unknown>;
    const fields = ['title', 'oneSentenceDefinition', 'researchDesign', 'expectedInnovation', 'rationale'];
    if (typeof item.label !== 'string' || !labels.has(item.label) || fields.some((field) => typeof item[field] !== 'string' || !(item[field] as string).trim())) throw new Error('候选课题缺少必要字段，请重试。');
    return { label: item.label, ...Object.fromEntries(fields.map((field) => [field, (item[field] as string).trim()])) } as ResearchTopicCandidate;
  });
  if (new Set(result.map((candidate) => candidate.label)).size !== 3) throw new Error('候选课题分类不完整，请重试。');
  return result;
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
