/** Global multi-terminal route component. */
import { useNavigate } from '@tanstack/react-router';
import { TerminalRiskGate } from '@/components/terminal/terminal-risk-gate';
import { TerminalWorkspace } from '@/components/terminal/terminal-workspace';
import { useTimelineStore } from '@/stores/timeline-store';

export function TerminalRoute() {
  const navigate = useNavigate();
  const threadId = useTimelineStore((s) => s.threadId);

  const navigateBack = () => {
    if (threadId) {
      void navigate({ to: '/t/$threadId', params: { threadId } });
    } else {
      void navigate({ to: '/' });
    }
  };

  return (
    <div className="min-h-0 flex-1">
      <TerminalRiskGate onCancel={navigateBack}>
        <TerminalWorkspace contextKey="global" />
      </TerminalRiskGate>
    </div>
  );
}
