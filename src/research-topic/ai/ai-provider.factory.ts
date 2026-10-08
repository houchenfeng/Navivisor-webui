/**
 * Resolves which AI provider answers a prompt, and handles the fallback.
 *
 * Default policy (configurable):
 *   NAVIVISOR_AI_PROVIDER=codex   primary
 *   NAVIVISOR_AI_FALLBACK=http    fallback when the primary fails
 *
 * Fallback is never silent: every completion carries `fallbackUsed`, and the
 * callers persist that flag into their stage state so the UI can show which
 * model actually answered.
 */
import { Injectable } from '@nestjs/common';
import {
  AiProviderError,
  type AiCompleteOptions,
  type AiCompletion,
  type AiProvider,
  type AiProviderName,
} from './ai-provider';
import { CodexProvider } from './codex-provider';
import { HttpProvider, readHttpProviderConfig } from './http-provider';

export type AiProviderPreference = {
  primary: AiProviderName;
  fallback: AiProviderName | null;
};

export function readProviderPreference(): AiProviderPreference {
  const primary = (
    process.env.NAVIVISOR_AI_PROVIDER?.trim().toLowerCase() || 'codex'
  ) as AiProviderName;
  const fallbackRaw = process.env.NAVIVISOR_AI_FALLBACK?.trim().toLowerCase();
  const fallback =
    fallbackRaw === 'none' || fallbackRaw === 'off'
      ? null
      : ((fallbackRaw || 'http') as AiProviderName);
  return {
    primary: primary === 'http' ? 'http' : 'codex',
    fallback: fallback === 'codex' ? 'codex' : fallback === null ? null : 'http',
  };
}

@Injectable()
export class AiProviderFactory {
  private readonly codex = new CodexProvider();
  private readonly http = new HttpProvider();

  private resolve(name: AiProviderName): AiProvider {
    return name === 'http' ? this.http : this.codex;
  }

  /**
   * Runs the prompt on the primary provider; on failure (unless the failure is
   * a configuration error) retries once on the fallback.
   */
  async complete(
    prompt: string,
    options: AiCompleteOptions = {},
    preference: AiProviderPreference = readProviderPreference(),
  ): Promise<AiCompletion> {
    const primary = this.resolve(preference.primary);
    try {
      return await primary.complete(prompt, options);
    } catch (primaryError) {
      const fallbackName = preference.fallback;
      if (!fallbackName || fallbackName === preference.primary) throw primaryError;

      const fallback = this.resolve(fallbackName);
      if (!(await fallback.isAvailable())) throw primaryError;

      try {
        const completion = await fallback.complete(prompt, options);
        return { ...completion, fallbackUsed: true };
      } catch {
        // Report the primary failure — it is the one the operator configured.
        throw primaryError;
      }
    }
  }

  /** Reports whether any provider can currently answer. */
  async isAvailable(): Promise<boolean> {
    if (await this.codex.isAvailable()) return true;
    return readHttpProviderConfig() !== null;
  }

  /** Exposed for diagnostics endpoints and tests. */
  describe(): { primary: AiProviderName; fallback: AiProviderName | null; httpConfigured: boolean } {
    const preference = readProviderPreference();
    return {
      primary: preference.primary,
      fallback: preference.fallback,
      httpConfigured: readHttpProviderConfig() !== null,
    };
  }
}

export { AiProviderError };
