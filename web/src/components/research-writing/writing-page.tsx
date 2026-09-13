// web/src/components/research-writing/writing-page.tsx
import { LoadWorkspaceDemoButton } from '@/components/research-workflow/load-workspace-demo-button';
import { WritingPrimerDialog } from './writing-primer-dialog';
import EditorPage from './pages/EditorPage';

export function WritingPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-start justify-end gap-2 px-4 pt-3">
        <LoadWorkspaceDemoButton compact />
        <WritingPrimerDialog />
      </div>
      <EditorPage />
    </div>
  );
}
