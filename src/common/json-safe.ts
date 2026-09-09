/**
 * Recursively converts generated schema values into JSON-safe values.
 * Handles bigint→number, non-finite→null, symbol→string, function→name.
 */
export type JsonSafeValue =
  | string
  | number
  | boolean
  | null
  | JsonSafeValue[]
  | { [key: string]: JsonSafeValue };

export function toJsonSafe(value: unknown): JsonSafeValue {
  if (value === null || value === undefined) return null;

  if (typeof value === 'bigint') return Number(value);

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item));
  }

  if (typeof value === 'object') {
    const result: Record<string, JsonSafeValue> = {};
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      result[key] = toJsonSafe(child);
    }
    return result;
  }

  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'function') return value.name || 'anonymous';
  return null;
}
