// web/src/components/research-writing/writing-page.tsx
import { LoadWorkspaceDemoButton } from '@/components/research-workflow/load-workspace-demo-button';
import EditorPage from './pages/EditorPage';

export function WritingPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex justify-end px-4 pt-3">
        <LoadWorkspaceDemoButton compact />
      </div>
      <EditorPage />
    </div>
  );
}
