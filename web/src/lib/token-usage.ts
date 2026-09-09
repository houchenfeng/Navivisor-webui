/**
 * Token usage formatting and ratio calculation helpers.
 * Shared by TokenUsageRing (ChatInput donut) and TurnTokenFooter.
 */
import type { ThreadTokenUsage } from '@/types/codex-notifications';

/**
 * Calculates context window usage ratio (0–1).
 * Uses `last.inputTokens` as numerator because it represents the actual
 * prompt size sent to the model (i.e. how much of the context window is
 * currently occupied by conversation history). `total` is cumulative across
 * all turns and would overcount.
 *
 * @returns Ratio clamped to [0, 1], or null if window is unavailable.
 */
export function getContextRatio(usage: ThreadTokenUsage): number | null {
  const window = usage.modelContextWindow;
  if (!window || window <= 0) return null;
  return Math.min(usage.last.inputTokens / window, 1);
}

/** Formats token count with K/M suffix for compact display. */
export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}
