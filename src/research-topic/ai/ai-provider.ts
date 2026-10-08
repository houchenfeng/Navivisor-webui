/**
 * Provider-agnostic contract for the topic module's AI calls.
 *
 * The topic pipeline needs a single "give me text for this prompt" primitive.
 * Everything else (prompt templates, JSON parsing, fallbacks) lives in the
 * callers so that swapping Codex CLI for an HTTP model never changes the
 * research logic.
 */

/** Which provider actually produced a completion. */
export type AiProviderName = 'codex' | 'http';

export type AiCompletion = {
  text: string;
  /** Provider that produced the text. */
  provider: AiProviderName;
  /** True when the primary provider failed and the fallback answered. */
  fallbackUsed: boolean;
  /** Model identifier when the provider can report one. */
  model?: string;
};

export type AiCompleteOptions = {
  /** Hard timeout for a single call. Defaults to the provider's own default. */
  timeoutMs?: number;
  /** Working directory for CLI-backed providers. */
  cwd?: string;
  /** Optional system-style instruction prepended to the prompt. */
  system?: string;
};

export interface AiProvider {
  readonly name: AiProviderName;
  /** Cheap check that the provider is usable in this environment. */
  isAvailable(): Promise<boolean>;
  complete(prompt: string, options?: AiCompleteOptions): Promise<AiCompletion>;
}

/** Error codes the factory understands when deciding whether to fall back. */
export const AI_ERROR_CODES = {
  notFound: 'AI_PROVIDER_NOT_FOUND',
  timeout: 'AI_PROVIDER_TIMEOUT',
  failed: 'AI_PROVIDER_FAILED',
  emptyOutput: 'AI_PROVIDER_EMPTY_OUTPUT',
  notConfigured: 'AI_PROVIDER_NOT_CONFIGURED',
} as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[keyof typeof AI_ERROR_CODES];

export class AiProviderError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
  }
}

/**
 * Extracts the first JSON object/array from a model response.
 *
 * Models routinely wrap JSON in prose or Markdown fences; every caller in this
 * module needs the same tolerant extraction, so it lives here.
 */
export function extractJsonPayload(raw: string): unknown {
  const normalized = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const candidates = [normalized];
  const objectStart = normalized.indexOf('{');
  const objectEnd = normalized.lastIndexOf('}');
  if (objectStart !== -1 && objectEnd > objectStart) {
    candidates.push(normalized.slice(objectStart, objectEnd + 1));
  }
  const arrayStart = normalized.indexOf('[');
  const arrayEnd = normalized.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    candidates.push(normalized.slice(arrayStart, arrayEnd + 1));
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Try the next shape.
    }
  }
  throw new AiProviderError(
    AI_ERROR_CODES.failed,
    'AI 输出不是合法 JSON，无法解析。',
  );
}
