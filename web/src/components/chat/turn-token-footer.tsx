/**
 * Compact per-turn token usage row displayed after completed turns.
 * Shows the turn's token consumption (input/output/total).
 */
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTimelineStore } from '@/stores/timeline-store';
import { formatTokens } from '@/lib/token-usage';

interface Props {
  turnId: string;
}

export function TurnTokenFooter({ turnId }: Props) {
  const { t } = useTranslation();
  const usage = useTimelineStore((s) => s.tokenUsageByTurn[turnId]);

  if (!usage) return null;

  const { last } = usage;
  // inputTokens includes cachedInputTokens; split for clarity
  const billableInput = Math.max(0, last.inputTokens - last.cachedInputTokens);

  return (
    <div className="mt-1 flex items-center gap-3 text-[11px] tabular-nums text-muted-foreground">
      <Zap className="h-3 w-3" />
      <span>
        {t('Input')} {formatTokens(billableInput)}
      </span>
      {last.cachedInputTokens > 0 && (
        <span>
          {t('Cached')} {formatTokens(last.cachedInputTokens)}
        </span>
      )}
      <span>
        {t('Output')} {formatTokens(last.outputTokens)}
      </span>
      {last.reasoningOutputTokens > 0 && (
        <span>
          {t('Reasoning')} {formatTokens(last.reasoningOutputTokens)}
        </span>
      )}
      <span className="font-medium">
        {t('Total')} {formatTokens(last.totalTokens)}
      </span>
    </div>
  );
}
