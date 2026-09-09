/** MCP aggregate status badge with server detail popover and reload action. */
import { AlertCircle, CheckCircle2, Loader2, PlugZap, RefreshCw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  mcpServersListServers,
  mcpServersReloadAll,
} from '@/generated/api/sdk.gen';
import { mcpServersListServersQueryKey } from '@/generated/api/@tanstack/react-query.gen';
import type { McpServerStartupState, McpServerStatus } from '@/types/mcp';
import { cn } from '@/lib/utils';
import { showSnackbar } from '@/stores/snackbar-store';
import { useMcpStore, type McpServerRuntimeStatus } from '@/stores/mcp-store';

type Mode = 'input' | 'header';

interface McpRow {
  name: string;
  status: McpServerStartupState;
  error: string | null;
  authStatus?: McpServerStatus['authStatus'];
  toolCount?: number;
}

interface Props {
  mode?: Mode;
}

/** Header mode only appears for starting/failed; input mode always shows aggregate status. */
export function McpStatusBadge({ mode = 'input' }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const runtimeStatuses = useMcpStore((s) => s.statuses);
  const shouldFetchInventory = mode === 'input';

  const serversQuery = useQuery({
    queryKey: mcpServersListServersQueryKey(),
    queryFn: async () => {
      const { data } = await mcpServersListServers({
        query: { detail: 'toolsAndAuthOnly' },
        throwOnError: true,
      });
      return data;
    },
    enabled: shouldFetchInventory,
    staleTime: 30_000,
  });

  const reloadMutation = useMutation({
    mutationFn: () => mcpServersReloadAll({ throwOnError: true }),
    onSuccess: () => {
      showSnackbar(t('MCP servers reloading'), 'success');
      void queryClient.invalidateQueries({ queryKey: mcpServersListServersQueryKey() });
    },
  });

  const rows = buildRows(
    (serversQuery.data?.data ?? []) as unknown as McpServerStatus[],
    runtimeStatuses,
  );
  const failed = rows.filter((row) => row.status === 'failed').length;
  const starting = rows.filter((row) => row.status === 'starting').length;
  const ready = rows.filter((row) => row.status === 'ready').length;
  const total = rows.length;

  if (mode === 'header') {
    if (failed === 0 && starting === 0) return null;
    return (
      <Badge variant={failed > 0 ? 'destructive' : 'secondary'} className="text-xs">
        {failed > 0 ? <AlertCircle className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
        {failed > 0
          ? t('MCP {{count}} failed', { count: failed })
          : t('MCP starting')}
      </Badge>
    );
  }

  if (serversQuery.isLoading && total === 0) {
    return (
      <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-lg px-2 text-xs" disabled>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t('MCP')}
      </Button>
    );
  }

  const label = total > 0 ? t('{{ready}}/{{total}} ready', { ready, total }) : t('MCP unavailable');
  const risky = failed > 0;
  const busy = starting > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 gap-1 rounded-lg px-2 text-xs',
            risky && 'text-destructive',
          )}
          title={t('MCP servers')}
        >
          {risky ? (
            <AlertCircle className="h-3.5 w-3.5" />
          ) : busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <PlugZap className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-80 space-y-3 p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground">{t('MCP Servers')}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={reloadMutation.isPending}
            onClick={() => reloadMutation.mutate()}
          >
            {reloadMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {t('Reload All')}
          </Button>
        </div>

        {serversQuery.isError && (
          <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            {t('Failed to load MCP servers')}
          </p>
        )}

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {rows.map((row) => (
            <ServerRow key={row.name} row={row} />
          ))}
          {rows.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              {t('No MCP servers reported')}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ServerRow({ row }: { row: McpRow }) {
  const { t } = useTranslation();
  const Icon = row.status === 'failed' ? AlertCircle : row.status === 'starting' ? Loader2 : CheckCircle2;

  return (
    <div className="rounded-md border border-border/50 px-2.5 py-2">
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            row.status === 'failed' && 'text-destructive',
            row.status === 'ready' && 'text-green-500',
            row.status === 'starting' && 'animate-spin text-blue-500',
          )}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
        <Badge variant={row.status === 'failed' ? 'destructive' : 'secondary'}>
          {t(row.status)}
        </Badge>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 pl-5 text-[11px] text-muted-foreground">
        {row.authStatus && <span>{t('auth')}: {t(row.authStatus)}</span>}
        {row.toolCount !== undefined && <span>{t('tools')}: {row.toolCount}</span>}
      </div>
      {row.error && (
        <p className="mt-1 pl-5 text-xs text-destructive">{row.error}</p>
      )}
    </div>
  );
}

function buildRows(
  servers: McpServerStatus[],
  runtimeStatuses: Record<string, McpServerRuntimeStatus>,
): McpRow[] {
  const rows = new Map<string, McpRow>();
  for (const server of servers) {
    const runtime = runtimeStatuses[server.name];
    rows.set(server.name, {
      name: server.name,
      status: runtime?.status ?? 'ready',
      error: runtime?.error ?? null,
      authStatus: server.authStatus,
      toolCount: Object.keys(server.tools ?? {}).length,
    });
  }
  for (const runtime of Object.values(runtimeStatuses)) {
    if (!rows.has(runtime.name)) {
      rows.set(runtime.name, {
        name: runtime.name,
        status: runtime.status,
        error: runtime.error,
      });
    }
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}
