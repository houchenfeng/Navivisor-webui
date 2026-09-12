// web/src/components/research-writing/writing-page.tsx
import { CurrentPaperCard } from '@/components/research-workflow/current-paper-card';
import { LoadWorkspaceDemoButton } from '@/components/research-workflow/load-workspace-demo-button';
import EditorPage from './pages/EditorPage';

export function WritingPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-start justify-end gap-2 px-4 pt-3">
        <CurrentPaperCard slim defaultOpen={false} className="w-full max-w-md" />
        <LoadWorkspaceDemoButton compact />
      </div>
      <EditorPage />
    </div>
  );
}
