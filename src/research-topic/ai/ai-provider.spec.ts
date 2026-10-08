import { describe, expect, it } from 'vitest';
import { AiProviderError, extractJsonPayload } from './ai-provider';

describe('extractJsonPayload', () => {
  it('parses a bare JSON object', () => {
    expect(extractJsonPayload('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips a Markdown json fence', () => {
    expect(extractJsonPayload('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('extracts JSON embedded in prose', () => {
    expect(
      extractJsonPayload('好的，结果如下：\n{"terms":["a","b"]}\n以上。'),
    ).toEqual({ terms: ['a', 'b'] });
  });

  it('parses a bare JSON array', () => {
    expect(extractJsonPayload('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('prefers the outer object when the body contains nested braces', () => {
    expect(
      extractJsonPayload('{"outer":{"inner":1}}'),
    ).toEqual({ outer: { inner: 1 } });
  });

  it('throws a typed error when no JSON is present', () => {
    expect(() => extractJsonPayload('没有 JSON')).toThrow(AiProviderError);
  });
});
