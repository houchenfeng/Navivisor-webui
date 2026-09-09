/** Settings tab for Codex account/provider auth state and login flows. */
import { useEffect, useState } from 'react';
import { KeyRound, Loader2, LogOut, RefreshCw, UserRound } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  accountReadAccount,
  accountLogout,
  accountReadRateLimits,
} from '@/generated/api/sdk.gen';
import {
  accountReadAccountQueryKey,
  accountReadRateLimitsQueryKey,
} from '@/generated/api/@tanstack/react-query.gen';
import type { AccountReadResponseDto } from '@/generated/api/types.gen';
import { showSnackbar } from '@/stores/snackbar-store';
import { useAccountStore } from '@/stores/account-store';
import { AccountLoginDialog } from './account-login-dialog';
import { RateLimitsCard, InfoRow } from './rate-limits-card';

export function AccountSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const setAccount = useAccountStore((s) => s.setAccount);
  const setRateLimits = useAccountStore((s) => s.setRateLimits);
  const storedAccount = useAccountStore((s) => s.account);
  const storedRateLimits = useAccountStore((s) => s.rateLimits);
  const [loginOpen, setLoginOpen] = useState(false);

  const accountQuery = useQuery({
    queryKey: accountReadAccountQueryKey(),
    queryFn: async () => {
      const { data } = await accountReadAccount({ throwOnError: true });
      return data;
    },
    refetchOnWindowFocus: true,
  });

  const account = accountQuery.data ?? storedAccount;
  const isChatGpt = account?.account?.type === 'chatgpt';
  const canLogout = Boolean(account?.account);

  const rateLimitsQuery = useQuery({
    queryKey: accountReadRateLimitsQueryKey(),
    queryFn: async () => {
      const { data } = await accountReadRateLimits({ throwOnError: true });
      return data;
    },
    enabled: isChatGpt,
    retry: false,
  });

  useEffect(() => {
    if (accountQuery.data) setAccount(accountQuery.data);
  }, [accountQuery.data, setAccount]);

  useEffect(() => {
    if (rateLimitsQuery.data) setRateLimits(rateLimitsQuery.data);
  }, [rateLimitsQuery.data, setRateLimits]);

  const invalidateAccount = () => {
    void queryClient.invalidateQueries({ queryKey: accountReadAccountQueryKey() });
    void queryClient.invalidateQueries({ queryKey: accountReadRateLimitsQueryKey() });
  };

  const logoutMutation = useMutation({
    mutationFn: () => accountLogout({ throwOnError: true }),
    onSuccess: () => {
      setAccount(null);
      setRateLimits(null);
      invalidateAccount();
      showSnackbar(t('Codex account logged out'), 'success');
    },
  });

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t('Codex Account')}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t('Manage Codex app-server auth separately from the WebUI session login.')}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={accountQuery.isFetching}
          onClick={() => accountQuery.refetch()}
        >
          {accountQuery.isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {t('Refresh')}
        </Button>
      </div>

      {accountQuery.isLoading && !account && (
        <div className="rounded-lg border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
          {t('Loading...')}
        </div>
      )}

      {account && <AccountSummary account={account} />}

      {isChatGpt && (
        <RateLimitsCard
          snapshot={storedRateLimits?.rateLimits ?? rateLimitsQuery.data?.rateLimits ?? null}
          isLoading={rateLimitsQuery.isLoading}
          isError={rateLimitsQuery.isError}
        />
      )}

      {!isChatGpt && (
        <div className="rounded-lg border border-border bg-card/50 px-4 py-3 text-xs text-muted-foreground">
          {t('Rate limits are not shown for API key or custom provider proxy mode.')}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="h-8" onClick={() => setLoginOpen(true)}>
          <KeyRound className="h-3.5 w-3.5" />
          {isChatGpt ? t('Switch account') : t('Login with ChatGPT or API Key')}
        </Button>
        {canLogout && (
          <Button
            size="sm"
            variant="destructive"
            className="h-8"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            {logoutMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            {t('Logout Codex account')}
          </Button>
        )}
      </div>

      {loginOpen && (
        <AccountLoginDialog
          open={loginOpen}
          onOpenChange={setLoginOpen}
          onChanged={invalidateAccount}
        />
      )}
    </section>
  );
}

/** Displays current account type, provider metadata, and ChatGPT identity. */
function AccountSummary({ account }: { account: AccountReadResponseDto }) {
  const { t } = useTranslation();
  const provider = account.provider;
  const isChatGpt = account.account?.type === 'chatgpt';
  const isApiKeyMode =
    account.account?.type === 'apiKey' || (!account.account && Boolean(provider.id));

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {isChatGpt ? (
          <UserRound className="h-4 w-4" />
        ) : (
          <KeyRound className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isChatGpt
            ? t('ChatGPT mode')
            : isApiKeyMode
              ? t('API Key mode')
              : t('Not logged in')}
        </span>
        <Badge variant={isChatGpt ? 'default' : 'secondary'}>
          {isChatGpt ? t('ChatGPT') : t('Provider')}
        </Badge>
      </div>

      {account.account?.type === 'chatgpt' && (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <InfoRow label={t('Email')} value={account.account.email ?? ''} />
          <InfoRow label={t('Plan')} value={account.account.planType ?? t('unknown')} />
        </div>
      )}

      <Separator />

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <InfoRow
          label={t('Provider')}
          value={provider.name ?? provider.id ?? t('unknown')}
        />
        <InfoRow
          label={t('Base URL')}
          value={provider.baseUrlMasked ?? t('not configured')}
        />
        <InfoRow
          label={t('Env key')}
          value={provider.envKey ?? t('not configured')}
        />
        <InfoRow
          label={t('Credential')}
          value={
            provider.envPresent === true
              ? t('present')
              : provider.envPresent === false
                ? t('missing')
                : t('unknown')
          }
        />
      </div>
    </div>
  );
}
