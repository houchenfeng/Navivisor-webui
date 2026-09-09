/** Rate limits and credits display card for ChatGPT accounts. */
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { RateLimitSnapshotDto } from '@/generated/api/types.gen';

interface Props {
  snapshot: RateLimitSnapshotDto | null;
  isLoading: boolean;
  isError: boolean;
}

export function RateLimitsCard({ snapshot, isLoading, isError }: Props) {
  const { t } = useTranslation();

  if (isLoading && !snapshot) {
    return (
      <div className="rounded-lg border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
        {t('Loading...')}
      </div>
    );
  }

  if (isError && !snapshot) {
    return (
      <div className="rounded-lg border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
        {t('Rate limits unavailable')}
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{t('Rate limits and credits')}</h3>
        {snapshot.limitName && (
          <Badge variant="outline">{snapshot.limitName}</Badge>
        )}
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <InfoRow
          label={t('Primary window')}
          value={formatWindow(snapshot.primary, t)}
        />
        <InfoRow
          label={t('Secondary window')}
          value={formatWindow(snapshot.secondary, t)}
        />
        <InfoRow label={t('Plan')} value={snapshot.planType ?? t('unknown')} />
        <InfoRow
          label={t('Credits')}
          value={formatCredits(snapshot, t)}
        />
      </div>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium" title={value}>
        {value}
      </span>
    </div>
  );
}

function formatWindow(
  window: RateLimitSnapshotDto['primary'],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (!window) return t('not available');
  const reset = window.resetsAt
    ? `, ${t('resets {{time}}', { time: formatReset(window.resetsAt) })}`
    : '';
  return `${Math.round(window.usedPercent)}%${reset}`;
}

function formatCredits(
  snapshot: RateLimitSnapshotDto,
  t: (key: string) => string,
): string {
  const credits = snapshot.credits;
  if (!credits) return t('not available');
  if (credits.unlimited) return t('unlimited');
  if (!credits.hasCredits) return t('no credits');
  return credits.balance ?? t('available');
}

function formatReset(value: number): string {
  const millis = value > 10_000_000_000 ? value : value * 1000;
  return new Date(millis).toLocaleString();
}
