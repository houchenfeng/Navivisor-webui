/**
 * Codex CLI provider — the primary AI backend for the topic module.
 *
 * Runs `codex exec` as a read-only child process and reads the last message it
 * wrote to a temp file. This mirrors how the topic service already invoked the
 * CLI, but consolidates the spawn/timeout/error handling in one place so the
 * research logic never deals with process plumbing.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AI_ERROR_CODES,
  AiProviderError,
  type AiCompleteOptions,
  type AiCompletion,
  type AiProvider,
} from './ai-provider';

const DEFAULT_TIMEOUT_MS = 120_000;
/** Resolved once so tests can override CODEX_BIN. */
function codexBinary(): string {
  return process.env.CODEX_BIN?.trim() || 'codex';
}

export class CodexProvider implements AiProvider {
  readonly name = 'codex' as const;

  constructor(private readonly defaultCwd: string = process.cwd()) {}

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(codexBinary(), ['--version'], {
        windowsHide: true,
        stdio: ['ignore', 'ignore', 'ignore'],
      });
      const timer = setTimeout(() => {
        child.kill();
        resolve(false);
      }, 10_000);
      child.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve(code === 0);
      });
    });
  }

  async complete(
    prompt: string,
    options: AiCompleteOptions = {},
  ): Promise<AiCompletion> {
    const cwd = options.cwd ?? this.defaultCwd;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const directory = await mkdtemp(join(tmpdir(), 'navivisor-ai-'));
    const outputPath = join(directory, 'completion.txt');
    const fullPrompt = options.system
      ? `${options.system}\n\n${prompt}`
      : prompt;

    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          codexBinary(),
          [
            'exec',
            '--cd',
            cwd,
            '--sandbox',
            'read-only',
            '--skip-git-repo-check',
            '--output-last-message',
            outputPath,
            fullPrompt,
          ],
          { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] },
        );

        let stderr = '';
        const timer = setTimeout(() => {
          child.kill();
          reject(
            new AiProviderError(
              AI_ERROR_CODES.timeout,
              `Codex CLI 超时（${timeoutMs}ms）。`,
            ),
          );
        }, timeoutMs);

        child.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        child.on('error', (error) => {
          clearTimeout(timer);
          reject(
            new AiProviderError(
              error.message.includes('ENOENT')
                ? AI_ERROR_CODES.notFound
                : AI_ERROR_CODES.failed,
              error.message.includes('ENOENT')
                ? '本机未找到 Codex CLI。'
                : `Codex CLI 启动失败：${error.message}`,
            ),
          );
        });
        child.on('close', (code) => {
          clearTimeout(timer);
          if (code !== 0) {
            reject(
              new AiProviderError(
                AI_ERROR_CODES.failed,
                `Codex CLI 未正常退出（退出码 ${code ?? '未知'}）。${
                  stderr.trim() ? ` ${stderr.trim().slice(-300)}` : ''
                }`,
              ),
            );
            return;
          }
          resolve();
        });
      });

      const text = await readFile(outputPath, 'utf8').catch(() => '');
      if (!text.trim()) {
        throw new AiProviderError(
          AI_ERROR_CODES.emptyOutput,
          'Codex CLI 没有返回任何内容。',
        );
      }
      return { text, provider: 'codex', fallbackUsed: false, model: 'codex' };
    } finally {
      await rm(directory, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  }
}

/** Writes a prompt to a temp file — used by tests and by long-prompt callers. */
export async function writePromptFile(
  directory: string,
  name: string,
  content: string,
): Promise<string> {
  const path = join(directory, name);
  await writeFile(path, content, 'utf8');
  return path;
}
