/** Shared frontend terminal socket types. */

export type TerminalStatus = 'running' | 'exited' | 'expired';

export interface TerminalConfig {
  maxSessions: number;
  graceMs: number;
  scrollback: number;
  defaultCwd: string | null;
}

export interface TerminalMetadata {
  id: string;
  contextKey: string;
  title: string;
  cwd: string;
  shell: string;
  status: TerminalStatus;
  exitCode: number | null;
  signal: number | null;
  attachedCount: number;
  cols: number;
  rows: number;
  createdAt: string;
  error?: string | null;
}

export interface TerminalContextState {
  terminalIds: string[];
  activeTerminalId: string | null;
  hydrated: boolean;
}

export interface TerminalAck<T = unknown> {
  ok: boolean;
  error?: string;
  terminal?: TerminalMetadata;
  terminals?: TerminalMetadata[];
  state?: string;
  config?: TerminalConfig;
  data?: T;
}

export interface TerminalDownloadPayload {
  filename: string;
  content: string;
}
