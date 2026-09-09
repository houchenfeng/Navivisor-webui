/** Terminal status bar — displays metadata for the active terminal below the pane. */
import { Download, Edit3, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useTerminalStore } from '@/stores/terminal-store';
import { cn } from '@/lib/utils';

interface Props {
  contextKey: string;
  activeTerminalId: string | null;
  className?: string;
}

export function TerminalStatusBar({ contextKey, activeTerminalId, className }: Props) {
  const { t } = useTranslation();
  const terminals = useTerminalStore((s) => s.terminals);
  const renameTerminal = useTerminalStore((s) => s.renameTerminal);
  const downloadTerminal = useTerminalStore((s) => s.downloadTerminal);

  const terminal = activeTerminalId ? terminals[activeTerminalId] : null;
  if (!terminal) return null;

  const handleRename = async () => {
    const title = window.prompt(t('Rename terminal'), terminal.title)?.trim();
    if (title) await renameTerminal(contextKey, terminal.id, title);
  };

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-2 border-t border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground',
        className,
      )}
    >
      <span className="min-w-0 truncate" title={terminal.cwd}>
        {terminal.shell} · {terminal.cwd}
      </span>
      <span className="inline-flex items-center gap-1" title={t('Attached clients')}>
        <Users className="h-3 w-3" />
        {terminal.attachedCount}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => void handleRename()}
          title={t('Rename terminal')}
        >
          <Edit3 />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => void downloadTerminal(contextKey, terminal.id)}
          title={t('Download terminal output')}
        >
          <Download />
        </Button>
      </div>
    </div>
  );
}
