/**
 * Batch AI analysis (T39–T42).
 *
 * Runs 指令一 over each 50-paper batch, then 指令二 (or the 降维 variant) over
 * the collected batch reports.
 *
 * Two properties matter more than speed here:
 *  - Resume: a batch whose report already exists on disk is skipped, so a run
 *    that dies at batch 7 of 12 does not re-pay for batches 1-6.
 *  - Sequential execution: Codex CLI rate-limits, and a batch is a large
 *    prompt, so batches run one at a time rather than in parallel.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AiProviderError, extractJsonPayload } from './ai/ai-provider';
import type { AiProviderFactory } from './ai/ai-provider.factory';
import {
  BATCH_ANALYSIS_SYSTEM,
  buildBatchAnalysisPrompt,
} from './prompts/batch-analysis';
import {
  META_ANALYSIS_SYSTEM,
  buildMetaAnalysisPrompt,
} from './prompts/meta-analysis';
import {
  FEASIBLE_TOPICS_SYSTEM,
  buildFeasibleTopicsPrompt,
} from './prompts/feasible-topics';
import { parseCsvRows } from './batch-prep';

export class BatchAnalysisError extends Error {
  readonly code = 'BATCH_ANALYSIS_FAILED';

  constructor(message: string) {
    super(message);
    this.code = 'BATCH_ANALYSIS_FAILED';
    this.name = 'BatchAnalysisError';
  }
}

export type BatchStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type BatchProgress = {
  totalBatches: number;
  completedBatches: number;
  batches: Array<{
    index: number;
    name: string;
    status: BatchStatus;
    error?: string;
  }>;
  updatedAt: string;
};

export type BatchPaper = {
  refId: string;
  title: string;
  year?: number;
  venue?: string;
  content: string;
};

/** `batch-07.csv` → 7; returns null for anything else. */
export function parseBatchIndex(fileName: string): number | null {
  const match = fileName.match(/^batch-(\d+)\.csv$/);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isInteger(index) && index > 0 ? index : null;
}

/**
 * Reads a batch CSV back into papers.
 *
 * The CSV is written by batch-prep, so the column order is known; `content`
 * (full text) is not in the CSV — it is filled by the caller from the PDF.
 */
export function parseBatchCsv(csv: string): Array<Omit<BatchPaper, 'content'>> {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map((value) => value.trim());
  const index = (name: string) => headers.indexOf(name);

  const parsed: Array<Omit<BatchPaper, 'content'>> = [];
  for (const row of rows.slice(1)) {
    const refId = row[index('refId')]?.trim() ?? '';
    const title = row[index('title')]?.trim() ?? '';
    if (!refId || !title) continue;
    const yearRaw = row[index('year')]?.trim() ?? '';
    const year = Number(yearRaw);
    parsed.push({
      refId,
      title,
      year: Number.isFinite(year) && year > 0 ? year : undefined,
      venue: row[index('venue')]?.trim() || undefined,
    });
  }
  return parsed;
}

/**
 * Decides which batches still need work.
 *
 * A batch counts as done when its report file exists and is non-empty — an
 * empty file means a previous attempt died mid-write.
 */
export async function findPendingBatches(
  analysisDirectory: string,
  batchNames: string[],
): Promise<string[]> {
  const pending: string[] = [];
  for (const name of batchNames) {
    const index = parseBatchIndex(name);
    if (index === null) continue;
    const reportPath = join(
      analysisDirectory,
      `batch-${String(index).padStart(2, '0')}.report.md`,
    );
    try {
      const content = await readFile(reportPath, 'utf8');
      if (content.trim().length > 0) continue;
    } catch {
      // Missing report: needs work.
    }
    pending.push(name);
  }
  return pending;
}

/** Renders the two artifacts 指令一 produces per batch. */
export function renderBatchArtifacts(
  payload: unknown,
  fallbackText: string,
): { matrixMarkdown: string; reportMarkdown: string } {
  const record =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;

  if (!record) {
    // The model answered in prose despite the contract; keep it rather than
    // discarding the work, and say so.
    return {
      matrixMarkdown: `> 模型未返回结构化矩阵，以下为原始输出。\n\n${fallbackText}`,
      reportMarkdown: `> 模型未返回结构化报告，以下为原始输出。\n\n${fallbackText}`,
    };
  }

  const matrix = Array.isArray(record.matrix) ? record.matrix : [];
  const report = (record.report ?? {}) as Record<string, unknown>;
  const trends = (report.trends ?? {}) as Record<string, unknown>;
  const gaps = (report.gaps ?? {}) as Record<string, unknown>;
  const proposals = Array.isArray(report.proposals) ? report.proposals : [];

  const list = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.map((item) => String(item)).filter(Boolean)
      : [];

  const matrixMarkdown = [
    '| 编号 | 关键研究方法与材料 | 核心性能指标(量化) | 创新性与局限性 | 对我课题的启发点 |',
    '| --- | --- | --- | --- | --- |',
    ...matrix.map((item) => {
      const entry = (item ?? {}) as Record<string, unknown>;
      return `| ${entry.refId ?? ''} | ${entry.methodAndMaterials ?? ''} | ${entry.metrics ?? ''} | ${entry.innovationAndLimitations ?? ''} | ${entry.inspiration ?? ''} |`;
    }),
  ].join('\n');

  const reportMarkdown = [
    '## 1. 研究趋势总结',
    '',
    `- 主流方法与内容：${list(trends.mainstreamMethods).join('；') || '未给出'}`,
    `- 主流研究主题：${list(trends.mainstreamTopics).join('；') || '未给出'}`,
    `- 解决本课题问题的常用方法：${list(trends.approachesToMyFocus).join('；') || '未给出'}`,
    '',
    '## 2. 研究空白识别',
    '',
    `- 普遍忽略的问题：${list(gaps.ignoredProblems).join('；') || '未给出'}`,
    `- 被提及较少的技术路线或材料体系：${list(gaps.underExploredRoutes).join('；') || '未给出'}`,
    '',
    '## 3. 论文级课题提案',
    '',
    ...proposals.flatMap((item, index) => {
      const entry = (item ?? {}) as Record<string, unknown>;
      const rationale = (entry.rationale ?? {}) as Record<string, unknown>;
      return [
        `### 提案 ${index + 1}：${entry.title ?? ''}`,
        '',
        `- 核心科学问题：${entry.scientificQuestion ?? ''}`,
        `- 研究设计与技术路线：${list(entry.technicalRoute).join('；') || '未给出'}`,
        `- 预期创新性与价值：${entry.innovationAndValue ?? ''}`,
        `- 立论依据：${rationale.opportunity ?? ''}（依据：${list(rationale.references).join('、') || '未标注'}）`,
        '',
      ];
    }),
  ].join('\n');

  return { matrixMarkdown, reportMarkdown };
}

/** Extracts the report half of a batch report file for the synthesis input. */
export function extractReportSection(batchReportMarkdown: string): string {
  const marker = batchReportMarkdown.indexOf('## 1. 研究趋势总结');
  return marker === -1 ? batchReportMarkdown.trim() : batchReportMarkdown.slice(marker).trim();
}

export type AnalyzeBatchesOptions = {
  runDirectory: string;
  direction: string;
  /** PDF text per refId; missing entries are analysed on the title alone. */
  contentByRefId?: Map<string, string>;
  /** Injectable for tests. */
  readFileImpl?: typeof readFile;
  writeFileImpl?: typeof writeFile;
  mkdirImpl?: typeof mkdir;
  readdirImpl?: typeof readdir;
};

export type AnalyzeBatchesResult = {
  progress: BatchProgress;
  /** Batch indexes that were already done and therefore skipped. */
  skipped: number[];
  provider: 'codex' | 'http';
  fallbackUsed: boolean;
};

/**
 * Runs 指令一 across every pending batch, sequentially.
 *
 * Progress is written after every batch so an interrupted run can be resumed
 * by calling this again with the same directory.
 */
export async function analyzeBatches(
  factory: AiProviderFactory,
  options: AnalyzeBatchesOptions,
): Promise<AnalyzeBatchesResult> {
  const analysisDirectory = join(options.runDirectory, 'analysis');
  const batchesDirectory = join(options.runDirectory, 'batches');
  const read = options.readFileImpl ?? readFile;
  const write = options.writeFileImpl ?? writeFile;
  const makeDirectory = options.mkdirImpl ?? mkdir;
  const readDirectory = options.readdirImpl ?? readdir;

  await makeDirectory(analysisDirectory, { recursive: true });

  let batchNames: string[] = [];
  try {
    batchNames = (await readDirectory(batchesDirectory))
      .filter((name) => parseBatchIndex(name) !== null)
      .sort();
  } catch {
    batchNames = [];
  }

  const pending = new Set(
    await findPendingBatches(analysisDirectory, batchNames),
  );
  const progress: BatchProgress = {
    totalBatches: batchNames.length,
    completedBatches: batchNames.length - pending.size,
    batches: batchNames.map((name) => {
      const index = parseBatchIndex(name) ?? 0;
      return {
        index,
        name,
        status: pending.has(name) ? 'pending' : 'skipped',
      };
    }),
    updatedAt: new Date().toISOString(),
  };

  let provider: 'codex' | 'http' = 'codex';
  let fallbackUsed = false;

  for (const name of batchNames) {
    const index = parseBatchIndex(name);
    if (index === null) continue;
    const entry = progress.batches.find((batch) => batch.name === name);
    if (!pending.has(name)) continue;

    if (entry) entry.status = 'running';
    try {
      const csv = await read(join(batchesDirectory, name), 'utf8');
      const papers = parseBatchCsv(csv).map((paper) => ({
        ...paper,
        content: options.contentByRefId?.get(paper.refId) ?? '（未获取到全文，仅依据标题分析）',
      }));

      const completion = await factory.complete(
        buildBatchAnalysisPrompt({
          direction: options.direction,
          batchIndex: index,
          batchTotal: batchNames.length,
          papers,
        }),
        { system: BATCH_ANALYSIS_SYSTEM, timeoutMs: 600_000 },
      );
      provider = completion.provider;
      fallbackUsed = fallbackUsed || completion.fallbackUsed;

      const { matrixMarkdown, reportMarkdown } = renderBatchArtifacts(
        safeExtract(completion.text),
        completion.text,
      );
      const padded = String(index).padStart(2, '0');
      await write(
        join(analysisDirectory, `batch-${padded}.matrix.md`),
        matrixMarkdown,
        'utf8',
      );
      await write(
        join(analysisDirectory, `batch-${padded}.report.md`),
        reportMarkdown,
        'utf8',
      );

      if (entry) entry.status = 'completed';
      progress.completedBatches += 1;
    } catch (error) {
      if (entry) {
        entry.status = 'failed';
        entry.error =
          error instanceof AiProviderError || error instanceof Error
            ? error.message
            : '未知错误';
      }
    }

    progress.updatedAt = new Date().toISOString();
    // Written after every batch: this is what makes resume possible.
    await write(
      join(analysisDirectory, 'progress.json'),
      JSON.stringify(progress, null, 2),
      'utf8',
    );
  }

  return {
    progress,
    skipped: progress.batches
      .filter((batch) => batch.status === 'skipped')
      .map((batch) => batch.index),
    provider,
    fallbackUsed,
  };
}

/**
 * Runs 指令二 or the 降维 variant over the collected batch reports.
 *
 * `mode` selects the prompt; both consume the same synthesis input, so an
 * operator can generate both views without re-running the batches.
 */
export async function synthesizeAnalysis(
  factory: AiProviderFactory,
  options: {
    runDirectory: string;
    direction: string;
    totalPapers: number;
    mode: 'meta' | 'feasible';
    baselineCandidates?: string[];
  },
): Promise<{ markdown: string; provider: 'codex' | 'http'; fallbackUsed: boolean }> {
  const analysisDirectory = join(options.runDirectory, 'analysis');
  const names = (await readdir(analysisDirectory))
    .filter((name) => /^batch-\d+\.report\.md$/.test(name))
    .sort();

  if (!names.length) {
    throw new BatchAnalysisError('还没有任何批次报告，请先执行分批分析。');
  }

  const sections: string[] = [];
  for (const name of names) {
    const content = await readFile(join(analysisDirectory, name), 'utf8');
    sections.push(`### ${name}\n\n${extractReportSection(content)}`);
  }
  const synthesisInput = sections.join('\n\n');
  await writeFile(
    join(analysisDirectory, 'synthesis-input.txt'),
    synthesisInput,
    'utf8',
  );

  const batchReports = names.map((name, order) => ({
    batchIndex: order + 1,
    paperCount: 0,
    report: sections[order],
  }));

  const prompt =
    options.mode === 'meta'
      ? buildMetaAnalysisPrompt({
          direction: options.direction,
          batchReports,
          totalPapers: options.totalPapers,
        })
      : buildFeasibleTopicsPrompt({
          direction: options.direction,
          opportunities: synthesisInput,
          baselineCandidates: options.baselineCandidates ?? [],
        });

  try {
    const completion = await factory.complete(prompt, {
      system:
        options.mode === 'meta' ? META_ANALYSIS_SYSTEM : FEASIBLE_TOPICS_SYSTEM,
      timeoutMs: 600_000,
    });

    const fileName =
      options.mode === 'meta' ? 'meta-analysis.md' : 'feasible-topics.md';
    await writeFile(
      join(analysisDirectory, fileName),
      completion.text,
      'utf8',
    );

    return {
      markdown: completion.text,
      provider: completion.provider,
      fallbackUsed: completion.fallbackUsed,
    };
  } catch (error) {
    if (error instanceof AiProviderError) {
      throw new BatchAnalysisError(`综合分析失败：${error.message}`);
    }
    throw new BatchAnalysisError(`综合分析失败：${(error as Error).message}`);
  }
}

function safeExtract(raw: string): unknown {
  try {
    return extractJsonPayload(raw);
  } catch {
    return null;
  }
}
