/** Detail view: full paginated thread list for a workspace or archived. */
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ThreadDto } from '@/generated/api';
import type { SidebarView } from './sidebar-types';
import { workspaceLabel } from './sidebar-types';

interface Props {
  sidebarView: SidebarView;
  threads: ThreadDto[];
  isLoading: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  renderThreadRow: (thread: ThreadDto, archived: boolean) => React.ReactNode;
}

export function WorkspaceDetail({
  sidebarView,
  threads,
  isLoading,
  hasPrevious,
  hasNext,
  onBack,
  onPrevious,
  onNext,
  renderThreadRow,
}: Props) {
  const { t } = useTranslation();
  const archived = sidebarView.type === 'archivedDetail';

  return (
    <div className="space-y-2 pb-2">
      <button
        type="button"
        className="mb-2 flex cursor-pointer items-center gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={onBack}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {t('Back')}
      </button>
      <div className="px-2 text-sm font-medium text-foreground/80">
        {sidebarView.type === 'workspaceDetail' ? workspaceLabel(sidebarView.cwd) : t('Archived')}
      </div>
      <div className="space-y-0.5">
        {isLoading ? (
          <div className="space-y-1.5 pl-3">
            {[100, 72, 88, 64, 96].map((w, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1.5">
                <Skeleton className="h-3 w-3 shrink-0 rounded" />
                <Skeleton className="h-3 rounded" style={{ width: w }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {threads.map((thread) => renderThreadRow(thread, archived))}
            {threads.length === 0 && (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">{t('No threads yet')}</p>
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-between px-2 pt-2">
        <Button size="sm" variant="ghost" disabled={!hasPrevious || isLoading} onClick={onPrevious}>
          {t('Previous')}
        </Button>
        <Button size="sm" variant="ghost" disabled={!hasNext || isLoading} onClick={onNext}>
          {t('Next')}
        </Button>
      </div>
    </div>
  );
}
