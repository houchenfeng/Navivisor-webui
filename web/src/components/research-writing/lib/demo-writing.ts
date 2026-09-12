import { filesReadFile } from '@/generated/api/sdk.gen';
import type { FileReadResponseDto } from '@/generated/api/types.gen';
import { useResearchProjectStore } from '@/stores/research-project-store';

type WritingSection =
  | 'title-abstract'
  | 'intro'
  | 'related'
  | 'algorithm'
  | 'experiment'
  | 'discussion';

const METRIC_TABLES = [
  {
    title: '结果表格',
    paths: ['experiment/metrics/main.csv', 'experiment/metrics/comparison.csv'],
  },
  {
    title: '消融实验表格',
    paths: ['experiment/metrics/ablation.csv'],
  },
  {
    title: '鲁棒性表格',
    paths: ['experiment/metrics/robustness.csv', 'experiment/metrics/seeds.csv'],
  },
] as const;

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const split = (line: string) =>
    line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
  return { headers: split(lines[0]), rows: lines.slice(1).map(split) };
}

async function loadDemoMetricTables(rootPath: string) {
  const tables: Array<{ title: string; headers: string[]; rows: string[][] }> = [];
  for (const spec of METRIC_TABLES) {
    const raw = await readFirst(rootPath, [...spec.paths]);
    if (!raw) continue;
    const parsed = parseCsv(raw);
    if (parsed.headers.length === 0) continue;
    tables.push({ title: spec.title, ...parsed });
  }
  return tables;
}

const SECTION_FILES: Record<Exclude<WritingSection, 'title-abstract'>, string[]> = {
  intro: [
    'writing/source/cvpr-paper/en/sec/1_intro.tex',
    'writing/sections/introduction.md',
  ],
  related: [
    'writing/source/cvpr-paper/en/sec/2_related.tex',
    'writing/sections/related.md',
  ],
  algorithm: [
    'writing/source/cvpr-paper/en/sec/3_method.tex',
    'writing/sections/method.md',
  ],
  experiment: [
    'writing/source/cvpr-paper/en/sec/4_experiments.tex',
    'writing/sections/experiments.md',
  ],
  discussion: [
    'writing/source/cvpr-paper/en/sec/5_conclusion.tex',
    'writing/sections/conclusion.md',
  ],
};

function joinWorkspacePath(root: string, relative: string): string {
  const slash = root.includes('\\') ? '\\' : '/';
  return `${root.replace(/[\\/]+$/, '')}${slash}${relative.replace(/[/\\]/g, slash)}`;
}

async function readWorkspaceText(
  rootPath: string,
  relative: string,
): Promise<string | null> {
  try {
    const response = await filesReadFile({
      query: { path: joinWorkspacePath(rootPath, relative) },
      throwOnError: true,
    });
    const content = (response.data as FileReadResponseDto | undefined)?.content;
    return content?.trim() ? content : null;
  } catch {
    return null;
  }
}

async function readFirst(
  rootPath: string,
  relatives: string[],
): Promise<string | null> {
  for (const relative of relatives) {
    const text = await readWorkspaceText(rootPath, relative);
    if (text) return text;
  }
  return null;
}

function cleanupTex(text: string): string {
  return text
    .replace(/\\noindent\s*/g, '')
    .replace(/\\vspace\{[^}]+\}/g, '')
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\emph\{([^}]*)\}/g, '$1')
    .replace(/\\citeauthor\{[^}]*\}/g, '')
    .replace(/\\cite[a-z]*\{[^}]*\}/g, '')
    .replace(/\\evivad\{\}/gi, 'EviVAD')
    .replace(/\\label\{[^}]*\}/g, '')
    .replace(/\\(sub)*section\*?\{([^}]*)\}/g, '\n\n$2\n')
    .replace(/\\paragraph\{([^}]*)\}/g, '\n\n$1\n')
    .replace(/\\[a-zA-Z]+(?:\[[^\]]*\])?\{([^}]*)\}/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function unwrapSectionBody(text: string): string {
  const abstract = text.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
  if (abstract) return cleanupTex(abstract[1]);
  const fenced = text.match(/```(?:tex)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() || text;
  return cleanupTex(body.replace(/^#\s+.+\n+/, ''));
}

/**
 * When a Demo workspace is bound, fill writing from packaged files
 * instead of calling Codex (whose prompt often exceeds the 20k limit).
 */
export async function tryLoadDemoWritingSection(
  section: WritingSection,
): Promise<string | null> {
  const rootPath = useResearchProjectStore.getState().project?.rootPath?.trim();
  if (!rootPath) return null;

  if (section === 'title-abstract') {
    const [metadataText, abstractRaw] = await Promise.all([
      readWorkspaceText(rootPath, 'writing/paper-metadata.json'),
      readFirst(rootPath, [
        'writing/source/cvpr-paper/en/sec/0_abstract.tex',
        'writing/sections/abstract.md',
      ]),
    ]);
    let title = '';
    let abstractFromMeta = '';
    if (metadataText) {
      try {
        const parsed = JSON.parse(metadataText) as {
          title?: string;
          abstract?: string;
        };
        title = parsed.title?.trim() ?? '';
        abstractFromMeta = parsed.abstract?.trim() ?? '';
      } catch {
        // ignore malformed metadata
      }
    }
    const abstract = abstractRaw ? unwrapSectionBody(abstractRaw) : abstractFromMeta;
    if (!title && !abstract) return null;
    return JSON.stringify({ title, abstract });
  }

  const raw = await readFirst(rootPath, SECTION_FILES[section]);
  if (!raw && section !== 'experiment') return null;
  const text = raw ? unwrapSectionBody(raw) : '';
  if (section === 'experiment') {
    const tables = await loadDemoMetricTables(rootPath);
    if (!text && tables.length === 0) return null;
    return JSON.stringify({ text, tables });
  }
  return text;
}
