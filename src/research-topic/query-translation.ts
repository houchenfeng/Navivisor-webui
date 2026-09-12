import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const TRANSLATION_TIMEOUT_MS = 20_000;
const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff]/;

export type QueryTranslation = {
  terms: string[];
  status: 'not_needed' | 'codex' | 'chinese_fallback' | 'failed';
  reason?: string;
};

export async function translateResearchInterest(input: string): Promise<QueryTranslation> {
  if (!CJK_PATTERN.test(input)) return { terms: [], status: 'not_needed' };
  const fallback = extractChineseTerms(input);
  const parent = join(process.cwd(), 'work', 'research-topic');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, 'translation-'));
  const outputPath = join(directory, 'translation.json');
  const prompt = [
    '将下面的中文科研课题转换为 OpenAlex 文献检索用的英文命名词。',
    '只输出 JSON，不要 Markdown：{"terms":["term 1","term 2"]}。',
    'terms 只保留 2-5 个准确的英文短语，不要输出泛词 research、study、method、paper；优先使用论文中常见的正式术语。',
    `中文课题：${input}`,
  ].join('\n');
  try {
    const result = await runCodexTranslation(prompt, outputPath);
    const terms = parseTranslatedTerms(result);
    if (terms.length > 0) return { terms, status: 'codex' };
    return { terms: fallback, status: 'chinese_fallback', reason: '英文术语为空，改用原始中文关键词检索。' };
  } catch (error) {
    return {
      terms: fallback,
      status: fallback.length > 0 ? 'chinese_fallback' : 'failed',
      reason: error instanceof Error ? error.message : '英文检索词转换失败。',
    };
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

function extractChineseTerms(input: string): string[] {
  return [...new Set((input.match(/[\u3400-\u4dbf\u4e00-\u9fff]{2,}/g) ?? []).map((value) => value.trim()))].slice(0, 5);
}

function runCodexTranslation(prompt: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('codex', ['exec', '--cd', process.cwd(), '--sandbox', 'read-only', '--skip-git-repo-check', '--output-last-message', outputPath, prompt], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('英文检索词转换超时。')); }, TRANSLATION_TIMEOUT_MS);
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', (error) => { clearTimeout(timer); reject(error.message.includes('ENOENT') ? new Error('本机未找到 Codex CLI。') : error); });
    child.on('close', async (code) => {
      clearTimeout(timer);
      if (code !== 0) { reject(new Error(`英文检索词转换失败（退出码 ${code ?? '未知'}）。${stderr.trim() ? ` ${stderr.trim().slice(-200)}` : ''}`)); return; }
      try { resolve(await readFile(outputPath, 'utf8')); } catch { reject(new Error('英文检索词转换没有返回结果。')); }
    });
  });
}

function parseTranslatedTerms(raw: string): string[] {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { terms?: unknown };
    if (!Array.isArray(parsed.terms)) return [];
    return [...new Set(parsed.terms.filter((term): term is string => typeof term === 'string').map((term) => term.trim().toLowerCase()).filter((term) => /^[a-z][a-z0-9 -]{2,80}$/.test(term) && !/^(research|study|method|paper)$/.test(term)))].slice(0, 5);
  } catch { return []; }
}
