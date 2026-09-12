/** Turn API/SDK throw values into a readable message (never "[object Object]"). */
export function formatUnknownError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim() && error !== '[object Object]') {
    return error.trim();
  }
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const nested = record.error;
    const candidates = [record.message, record.detail, record.title];
    if (nested && typeof nested === 'object') {
      const inner = nested as Record<string, unknown>;
      candidates.unshift(inner.message, inner.detail);
    } else if (typeof nested === 'string') {
      candidates.unshift(nested);
    }
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim() && candidate !== '[object Object]') {
        return candidate.trim();
      }
      if (Array.isArray(candidate) && candidate.length) {
        return candidate.map((item) => formatUnknownError(item)).join('; ');
      }
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== '{}' && json !== '[object Object]') return json;
    } catch {
      // ignore
    }
  }
  return '请求失败，请稍后重试';
}
