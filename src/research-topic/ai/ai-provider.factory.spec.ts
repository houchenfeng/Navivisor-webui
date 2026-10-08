import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_ERROR_CODES, AiProviderError } from './ai-provider';
import { AiProviderFactory } from './ai-provider.factory';

/**
 * The factory reaches into the concrete providers for availability checks, so
 * tests stub the provider instances rather than the CLI or the network.
 */
function stubProvider(
  name: 'codex' | 'http',
  behaviour: 'ok' | 'fail' | 'unavailable',
  text = `${name}-output`,
) {
  return {
    name,
    isAvailable: vi.fn(async () => behaviour !== 'unavailable'),
    complete: vi.fn(async () => {
      if (behaviour === 'fail') {
        throw new AiProviderError(AI_ERROR_CODES.failed, `${name} failed`);
      }
      return { text, provider: name, fallbackUsed: false, model: name };
    }),
  };
}

function makeFactory(primary: ReturnType<typeof stubProvider>, fallback: ReturnType<typeof stubProvider>) {
  const factory = new AiProviderFactory();
  const internals = factory as unknown as Record<string, unknown>;
  internals.codex = primary.name === 'codex' ? primary : fallback;
  internals.http = primary.name === 'http' ? primary : fallback;
  return factory;
}

const originalEnv = { ...process.env };

describe('AiProviderFactory', () => {
  beforeEach(() => {
    delete process.env.NAVIVISOR_AI_PROVIDER;
    delete process.env.NAVIVISOR_AI_FALLBACK;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns the primary provider result without touching the fallback', async () => {
    const codex = stubProvider('codex', 'ok', 'from-codex');
    const http = stubProvider('http', 'ok', 'from-qwen');
    const factory = makeFactory(codex, http);

    const result = await factory.complete('hello', {}, { primary: 'codex', fallback: 'http' });

    expect(result.text).toBe('from-codex');
    expect(result.provider).toBe('codex');
    expect(result.fallbackUsed).toBe(false);
    expect(http.complete).not.toHaveBeenCalled();
  });

  it('falls back to the HTTP provider when codex fails and marks fallbackUsed', async () => {
    const codex = stubProvider('codex', 'fail');
    const http = stubProvider('http', 'ok', 'from-qwen');
    const factory = makeFactory(codex, http);

    const result = await factory.complete('hello', {}, { primary: 'codex', fallback: 'http' });

    expect(result.text).toBe('from-qwen');
    expect(result.provider).toBe('http');
    expect(result.fallbackUsed).toBe(true);
    expect(codex.complete).toHaveBeenCalledTimes(1);
    expect(http.complete).toHaveBeenCalledTimes(1);
  });

  it('throws the primary error when both providers fail', async () => {
    const codex = stubProvider('codex', 'fail');
    const http = stubProvider('http', 'fail');
    const factory = makeFactory(codex, http);

    await expect(
      factory.complete('hello', {}, { primary: 'codex', fallback: 'http' }),
    ).rejects.toThrow('codex failed');
  });

  it('does not attempt the fallback when the fallback provider is unavailable', async () => {
    const codex = stubProvider('codex', 'fail');
    const http = stubProvider('http', 'unavailable');
    const factory = makeFactory(codex, http);

    await expect(
      factory.complete('hello', {}, { primary: 'codex', fallback: 'http' }),
    ).rejects.toThrow('codex failed');
    expect(http.complete).not.toHaveBeenCalled();
  });

  it('honours NAVIVISOR_AI_FALLBACK=none by disabling the fallback', async () => {
    process.env.NAVIVISOR_AI_PROVIDER = 'codex';
    process.env.NAVIVISOR_AI_FALLBACK = 'none';
    const codex = stubProvider('codex', 'fail');
    const http = stubProvider('http', 'ok');
    const factory = makeFactory(codex, http);

    await expect(factory.complete('hello')).rejects.toThrow('codex failed');
    expect(http.complete).not.toHaveBeenCalled();
  });

  it('reports availability from the codex provider first, then the HTTP config', async () => {
    const codex = stubProvider('codex', 'unavailable');
    const factory = makeFactory(codex, stubProvider('http', 'ok'));

    delete process.env.NAVIVISOR_AI_HTTP_BASE_URL;
    delete process.env.NAVIVISOR_AI_HTTP_KEY;
    await expect(factory.isAvailable()).resolves.toBe(false);

    process.env.NAVIVISOR_AI_HTTP_BASE_URL = 'https://example.test/v1';
    process.env.NAVIVISOR_AI_HTTP_KEY = 'test-key';
    await expect(factory.isAvailable()).resolves.toBe(true);
  });

  it('describes the resolved configuration for diagnostics', () => {
    process.env.NAVIVISOR_AI_PROVIDER = 'http';
    process.env.NAVIVISOR_AI_FALLBACK = 'codex';
    process.env.NAVIVISOR_AI_HTTP_BASE_URL = 'https://example.test/v1';
    process.env.NAVIVISOR_AI_HTTP_KEY = 'test-key';

    const factory = new AiProviderFactory();
    expect(factory.describe()).toEqual({
      primary: 'http',
      fallback: 'codex',
      httpConfigured: true,
    });
  });
});
