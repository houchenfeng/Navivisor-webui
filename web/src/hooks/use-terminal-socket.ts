/** Connects terminal socket events to the terminal metadata store. */
import { useEffect } from 'react';
import { getSocket } from '@/socket';
import { showSnackbar } from '@/stores/snackbar-store';
import { useTerminalStore } from '@/stores/terminal-store';
import type { TerminalMetadata } from '@/types/terminal';

export function useTerminalSocketEvents() {
  useEffect(() => {
    const socket = getSocket();

    const handleMetadata = (event: { terminal: TerminalMetadata }) => {
      useTerminalStore.getState().upsertTerminal(event.terminal);
    };

    const handleExit = (event: {
      terminal?: TerminalMetadata;
      terminalId?: string;
      contextKey?: string;
      closed?: boolean;
    }) => {
      if (event.closed && event.terminalId && event.contextKey) {
        useTerminalStore.getState().markTerminalClosed(event.contextKey, event.terminalId);
        return;
      }
      if (event.terminal) {
        useTerminalStore.getState().upsertTerminal(event.terminal);
      }
    };

    const handleError = (event: { error?: string }) => {
      showSnackbar(event.error ?? 'Terminal operation failed', 'error');
    };

    socket.on('terminal.metadata', handleMetadata);
    socket.on('terminal.exit', handleExit);
    socket.on('terminal.error', handleError);

    return () => {
      socket.off('terminal.metadata', handleMetadata);
      socket.off('terminal.exit', handleExit);
      socket.off('terminal.error', handleError);
    };
  }, []);
}
