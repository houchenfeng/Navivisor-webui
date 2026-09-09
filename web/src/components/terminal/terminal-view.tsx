/** Compatibility wrapper around the new global terminal workspace. */
import { TerminalWorkspace } from '@/components/terminal/terminal-workspace';

interface Props {
  /** Working directory fallback for the initial global terminal. */
  cwd?: string;
  /** Optional CSS class for the container. */
  className?: string;
}

export function TerminalView({ cwd, className }: Props) {
  return <TerminalWorkspace contextKey="global" cwd={cwd} className={className} />;
}
