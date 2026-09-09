/** Header badge for ChatGPT rate-limit and credits snapshots. */
import { useEffect } from 'react';
import { Gauge } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  accountReadAccount,
  accountReadRateLimits,
} from '@/generated/api/sdk.gen';
import {
  accountReadAccountQueryKey,
  accountReadRateLimitsQueryKey,
} from '@/generated/api/@tanstack/react-query.gen';
import { useAccountStore } from '@/stores/account-store';

export function AccountRateLimitBadge() {
  const { t } = useTranslation();
  const setAccount = useAccountStore((s) => s.setAccount);
  const setRateLimits = useAccountStore((s) => s.setRateLimits);
  const storedAccount = useAccountStore((s) => s.account);
  const storedRateLimits = useAccountStore((s) => s.rateLimits);

  const accountQuery = useQuery({
    queryKey: accountReadAccountQueryKey(),
    queryFn: async () => {
      const { data } = await accountReadAccount({ throwOnError: true });
      return data;
    },
    staleTime: 30_000,
  });

  const activeAccount = accountQuery.data ?? storedAccount;
  const isChatGpt = activeAccount?.account?.type === 'chatgpt';

  const rateLimitsQuery = useQuery({
    queryKey: accountReadRateLimitsQueryKey(),
    queryFn: async () => {
      const { data } = await accountReadRateLimits({ throwOnError: true });
      return data;
    },
    enabled: isChatGpt,
    staleTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (accountQuery.data) setAccount(accountQuery.data);
  }, [accountQuery.data, setAccount]);

  useEffect(() => {
    if (rateLimitsQuery.data) setRateLimits(rateLimitsQuery.data);
  }, [rateLimitsQuery.data, setRateLimits]);

  if (!isChatGpt) return null;

  const snapshot = storedRateLimits?.rateLimits ?? rateLimitsQuery.data?.rateLimits;
  const primary = snapshot?.primary;
  const credits = snapshot?.credits;
  if (!primary && !credits) return null;

  const used = primary ? Math.round(primary.usedPercent) : null;
  const variant = used !== null && used >= 90 ? 'destructive' : 'secondary';
  const creditLabel = credits
    ? credits.unlimited
      ? t('unlimited')
      : credits.balance ?? (credits.hasCredits ? t('credits') : t('no credits'))
    : null;

  return (
    <Badge variant={variant} className="text-xs" title={t('Account rate limits')}>
      <Gauge className="h-3 w-3" />
      {used !== null && <span>{used}%</span>}
      {creditLabel && (
        <span className="hidden sm:inline text-muted-foreground">
          {used !== null ? '· ' : ''}{creditLabel}
        </span>
      )}
    </Badge>
  );
}
