/**
 * HTTP provider — OpenAI-compatible chat completions.
 *
 * Used as the fallback when Codex CLI is unavailable or fails. Configured for
 * DashScope's OpenAI-compatible endpoint (qwen3.8-max-0902) but works with any
 * `/chat/completions` server.
 */
import {
  AI_ERROR_CODES,
  AiProviderError,
  type AiCompleteOptions,
  type AiCompletion,
  type AiProvider,
} from './ai-provider';

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MODEL = 'qwen3.8-max-0902';
const MAX_ATTEMPTS = 3;

export type HttpProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

/** Reads configuration from the environment; returns null when incomplete. */
export function readHttpProviderConfig(): HttpProviderConfig | null {
  const baseUrl = process.env.NAVIVISOR_AI_HTTP_BASE_URL?.trim();
  const apiKey = process.env.NAVIVISOR_AI_HTTP_KEY?.trim();
  if (!baseUrl || !apiKey) return null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey,
    model: process.env.NAVIVISOR_AI_HTTP_MODEL?.trim() || DEFAULT_MODEL,
  };
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

export class HttpProvider implements AiProvider {
  readonly name = 'http' as const;

  constructor(private readonly config: HttpProviderConfig | null = readHttpProviderConfig()) {}

  async isAvailable(): Promise<boolean> {
    return this.config !== null;
  }

  async complete(
    prompt: string,
    options: AiCompleteOptions = {},
  ): Promise<AiCompletion> {
    const config = this.config;
    if (!config) {
      throw new AiProviderError(
        AI_ERROR_CODES.notConfigured,
        '未配置 HTTP AI provider（缺少 NAVIVISOR_AI_HTTP_BASE_URL 或 NAVIVISOR_AI_HTTP_KEY）。',
      );
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const messages: Array<{ role: string; content: string }> = [];
    if (options.system) messages.push({ role: 'system', content: options.system });
    messages.push({ role: 'user', content: prompt });

    let lastError = 'UNKNOWN';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const payload = (await response.json()) as ChatCompletionResponse;
          const text = payload.choices?.[0]?.message?.content ?? '';
          if (!text.trim()) {
            throw new AiProviderError(
              AI_ERROR_CODES.emptyOutput,
              `${config.model} 没有返回任何内容。`,
            );
          }
          return {
            text,
            provider: 'http',
            fallbackUsed: false,
            model: config.model,
          };
        }

        lastError = `HTTP_${response.status}`;
        // 4xx other than 429 will not succeed on retry.
        if (response.status !== 429 && response.status < 500) break;
      } catch (error) {
        if (error instanceof AiProviderError) throw error;
        lastError =
          error instanceof DOMException && error.name === 'AbortError'
            ? 'TIMEOUT'
            : 'NETWORK_ERROR';
      } finally {
        clearTimeout(timer);
      }
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }

    throw new AiProviderError(
      lastError === 'TIMEOUT' ? AI_ERROR_CODES.timeout : AI_ERROR_CODES.failed,
      `${config.model} 调用失败（${lastError}）。`,
    );
  }
}
