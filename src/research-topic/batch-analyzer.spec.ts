import { describe, expect, it } from 'vitest';
import {
  extractReportSection,
  parseBatchCsv,
  parseBatchIndex,
  renderBatchArtifacts,
} from './batch-analyzer';
import { parseCsvRows, renderCsv, assignReferenceIds } from './batch-prep';
import type { ResearchTopicPaper } from './research-topic.types';

describe('parseBatchIndex', () => {
  it('reads the numeric part of a batch file name', () => {
    expect(parseBatchIndex('batch-01.csv')).toBe(1);
    expect(parseBatchIndex('batch-12.csv')).toBe(12);
  });

  it('rejects anything that is not a batch file', () => {
    expect(parseBatchIndex('batch-.csv')).toBeNull();
    expect(parseBatchIndex('progress.json')).toBeNull();
    expect(parseBatchIndex('batch-00.csv')).toBeNull();
    expect(parseBatchIndex('batch-01.matrix.md')).toBeNull();
  });
});

describe('parseCsvRows', () => {
  it('round-trips a value containing a comma and a quote', () => {
    const rows = parseCsvRows('a,b\n"x, ""y""",z');
    expect(rows).toEqual([
      ['a', 'b'],
      ['x, "y"', 'z'],
    ]);
  });

  it('handles an embedded newline inside a quoted field', () => {
    expect(parseCsvRows('a\n"line1\nline2"')).toEqual([['a'], ['line1\nline2']]);
  });

  it('treats CRLF as a single terminator', () => {
    expect(parseCsvRows('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('drops blank rows', () => {
    expect(parseCsvRows('a\n\n\nb')).toEqual([['a'], ['b']]);
  });

  it('round-trips what renderCsv writes', () => {
    const papers = assignReferenceIds([
      paper({ title: 'A, "quoted" title' }),
      paper({ openalexId: 'W2', title: 'Plain' }),
    ]);
    const rows = parseCsvRows(renderCsv(papers));
    expect(rows[1][2]).toBe('A, "quoted" title');
    expect(rows[2][2]).toBe('Plain');
  });
});

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
    doi: '',
    landingUrl: '',
    sourceStatus: 'openalex_public_api',
    ...overrides,
  };
}

describe('parseBatchCsv', () => {
  it('reads refId, title, year and venue from a generated batch file', () => {
    const csv = renderCsv(
      assignReferenceIds([
        paper({ title: 'First', publicationYear: 2021, source: 'CVPR' }),
      ]),
    );
    expect(parseBatchCsv(csv)).toEqual([
      { refId: 'RE001', title: 'First', year: 2021, venue: 'CVPR' },
    ]);
  });

  it('skips rows without a refId or a title', () => {
    const csv = ['refId,title,year,venue', 'RE001,,2021,CVPR', 'RE002,Ok,,', ''].join('\n');
    expect(parseBatchCsv(csv)).toEqual([
      { refId: 'RE002', title: 'Ok', year: undefined, venue: undefined },
    ]);
  });

  it('returns an empty list for a header-only file', () => {
    expect(parseBatchCsv('refId,title')).toEqual([]);
  });
});

describe('renderBatchArtifacts', () => {
  const payload = {
    matrix: [
      {
        refId: 'RE001',
        methodAndMaterials: 'SAM + adapter',
        metrics: 'IoU 0.71',
        innovationAndLimitations: '创新点…局限…',
        inspiration: '可借鉴 adapter',
      },
    ],
    report: {
      trends: {
        mainstreamMethods: ['adapter tuning'],
        mainstreamTopics: ['crack segmentation'],
        approachesToMyFocus: ['轻量化适配'],
      },
      gaps: {
        ignoredProblems: ['小样本'],
        underExploredRoutes: ['跨数据集迁移'],
      },
      proposals: [
        {
          title: '提案一',
          scientificQuestion: '问题',
          technicalRoute: ['步骤1', '步骤2'],
          innovationAndValue: '价值',
          rationale: { opportunity: '机会', references: ['RE001'] },
        },
      ],
    },
  };

  it('renders the five-column matrix and the three-section report', () => {
    const { matrixMarkdown, reportMarkdown } = renderBatchArtifacts(payload, '');
    expect(matrixMarkdown).toContain('| 编号 | 关键研究方法与材料 |');
    expect(matrixMarkdown).toContain('RE001');
    expect(reportMarkdown).toContain('## 1. 研究趋势总结');
    expect(reportMarkdown).toContain('## 2. 研究空白识别');
    expect(reportMarkdown).toContain('## 3. 论文级课题提案');
    expect(reportMarkdown).toContain('依据：RE001');
  });

  it('keeps the raw text instead of discarding work when the model answers in prose', () => {
    const { matrixMarkdown, reportMarkdown } = renderBatchArtifacts(null, '一段散文');
    expect(matrixMarkdown).toContain('一段散文');
    expect(reportMarkdown).toContain('模型未返回结构化报告');
  });

  it('marks missing sub-fields rather than emitting empty bullets', () => {
    const { reportMarkdown } = renderBatchArtifacts({ report: {} }, '');
    expect(reportMarkdown).toContain('未给出');
  });
});

describe('extractReportSection', () => {
  it('slices from the report heading onward', () => {
    const markdown = '| matrix |\n\n## 1. 研究趋势总结\n\n正文';
    expect(extractReportSection(markdown)).toBe('## 1. 研究趋势总结\n\n正文');
  });

  it('returns the whole text when there is no report heading', () => {
    expect(extractReportSection('散文')).toBe('散文');
  });
});
