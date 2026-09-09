/**
 * Chat view for the index route (no thread selected).
 * Only clears visible selection; running threads remain subscribed and recoverable.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimelineStore } from '@/stores/timeline-store';

export function ChatView() {
  const { t } = useTranslation();
  const threadId = useTimelineStore((s) => s.threadId);
  const selectThread = useTimelineStore((s) => s.selectThread);

  useEffect(() => {
    if (threadId) selectThread(null);
  }, [threadId, selectThread]);

  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground">
      <p className="text-sm">{t('Select or create a thread to start chatting.')}</p>
    </div>
  );
}
