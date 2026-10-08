/**
 * Core-literature pre-processing (T38).
 *
 * Assigns the stable RE-nnn ids that every downstream AI analysis cites, then
 * slices the list into batches the model can actually hold. The id scheme is
 * zero-padded to three digits so lexical sort matches numeric order up to 999
 * papers — beyond that the padding is extended automatically.
 */
import type { ResearchTopicPaper } from './research-topic.types';

/** Papers per batch file. */
export const BATCH_SIZE = 50;

export type NumberedPaper = ResearchTopicPaper & {
  /** e.g. RE001 */
  refId: string;
  /** 1-based position in the final list. */
  order: number;
};

/**
 * Assigns `refId` in list order.
 *
 * Padding follows the list size so RE001..RE100 keeps its alignment for a
 * typical run while a 1000-paper list still sorts correctly.
 */
export function assignReferenceIds(papers: ResearchTopicPaper[]): NumberedPaper[] {
  const width = Math.max(3, String(papers.length).length);
  return papers.map((paper, index) => ({
    ...paper,
    refId: `RE${String(index + 1).padStart(width, '0')}`,
    order: index + 1,
  }));
}

/** Slices the numbered list into batches of `size`. */
export function splitIntoBatches(
  papers: NumberedPaper[],
  size = BATCH_SIZE,
): NumberedPaper[][] {
  if (size < 1) throw new Error('BATCH_SIZE_INVALID');
  const batches: NumberedPaper[][] = [];
  for (let index = 0; index < papers.length; index += size) {
    batches.push(papers.slice(index, index + size));
  }
  return batches;
}

const CSV_HEADERS = [
  'refId',
  'paper_id',
  'title',
  'authors',
  'year',
  'venue',
  'doi',
  'cited_by',
  'abstract',
  'pdf_path',
  'source_url',
] as const;

/** Escapes a CSV field: quotes, commas and newlines. */
function csvField(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * Renders the CSV used both for the batch files and `references.csv`.
 *
 * `pdf_path` stays empty when the PDF was not downloaded — a missing path must
 * never be filled with a guess, because the downstream validator checks it.
 */
export function renderCsv(
  papers: NumberedPaper[],
  pdfPathFor: (paper: NumberedPaper) => string = () => '',
): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const paper of papers) {
    lines.push(
      [
        paper.refId,
        // paper_id is what the experiment module validates on; keep it equal
        // to refId so the two systems agree without a mapping table.
        paper.refId,
        paper.title,
        paper.authors.join('; '),
        paper.publicationYear ?? '',
        paper.source ?? '',
        paper.doi,
        paper.citedByCount,
        paper.abstract,
        pdfPathFor(paper),
        paper.landingUrl,
      ]
        .map(csvField)
        .join(','),
    );
  }
  return lines.join('\n');
}

/**
 * Parses CSV text back into rows.
 *
 * Handles quoted fields containing commas, escaped double quotes and embedded
 * newlines — `renderCsv` emits all three, so a naive `split(',')` would corrupt
 * any title that contains a comma.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      // Treat CRLF as one terminator.
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  // Flush the final field unless the text ended exactly on a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.trim() !== ''));
}

/** Escapes a BibTeX field value. */
function bibField(value: string): string {
  return value.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

/** Renders a minimal but valid BibTeX entry per paper. */
export function renderBibtex(papers: NumberedPaper[]): string {
  return papers
    .map((paper) => {
      const firstAuthor = paper.authors[0]?.split(/\s+/).pop() ?? 'unknown';
      const year = paper.publicationYear ?? 'n.d.';
      const key = `${firstAuthor}${year}${paper.refId}`.replace(/[^A-Za-z0-9]/g, '');
      const fields = [
        `  title = {${bibField(paper.title)}}`,
        paper.authors.length
          ? `  author = {${bibField(paper.authors.join(' and '))}}`
          : '',
        paper.publicationYear ? `  year = {${paper.publicationYear}}` : '',
        paper.source ? `  journal = {${bibField(paper.source)}}` : '',
        paper.doi ? `  doi = {${bibField(paper.doi)}}` : '',
        paper.landingUrl ? `  url = {${bibField(paper.landingUrl)}}` : '',
      ].filter(Boolean);
      return `@article{${key},\n${fields.join(',\n')}\n}`;
    })
    .join('\n\n');
}

export type BatchPrepManifest = {
  topic: string;
  totalPapers: number;
  batchSize: number;
  batchCount: number;
  referenceIds: string[];
  createdAt: string;
};

export function buildBatchManifest(
  topic: string,
  papers: NumberedPaper[],
  size = BATCH_SIZE,
): BatchPrepManifest {
  return {
    topic,
    totalPapers: papers.length,
    batchSize: size,
    batchCount: Math.ceil(papers.length / size),
    referenceIds: papers.map((paper) => paper.refId),
    createdAt: new Date().toISOString(),
  };
}

/** Renders the handoff note that explains the package to the next module. */
export function renderHandoff(
  topic: string,
  papers: NumberedPaper[],
  batchCount: number,
  pdfCount: number,
): string {
  return [
    `# 核心文献交接说明 · ${topic}`,
    '',
    `- 文献总数：${papers.length}`,
    `- 分批数量：${batchCount} 份（每份最多 ${BATCH_SIZE} 篇）`,
    `- 已下载全文：${pdfCount} 篇`,
    `- 编号范围：${papers[0]?.refId ?? '—'} … ${papers[papers.length - 1]?.refId ?? '—'}`,
    '',
    '## 文件说明',
    '',
    '- `references.csv`：全量题录，含 `refId` / `paper_id` 双列，供实验模块校验。',
    '- `references.bib`：BibTeX 题录。',
    '- `batches/batch-NN.csv`：分批文件，每份最多 50 篇，供分批 AI 分析。',
    '- `pdf/`：已通过四重校验的全文 PDF；未下载成功的条目不在此目录。',
    '',
    '## 使用约定',
    '',
    '1. 后续所有 AI 分析结论必须引用 `refId`（如 RE001），以便回溯原文。',
    `2. 编号在本次运行内稳定，重跑会重新编号。`,
    `3. 未下载到全文的文献仍保留在题录中，但不可用于需要原文的分析。`,
  ].join('\n');
}
