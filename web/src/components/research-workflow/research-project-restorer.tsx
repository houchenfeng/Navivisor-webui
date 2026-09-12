import { useEffect, type ReactNode } from 'react';
import { researchWorkflowClient } from './research-workflow-client';
import { useResearchProjectStore } from '@/stores/research-project-store';

export function ResearchProjectRestorer({ children }: { children: ReactNode }) {
  const activeProjectId = useResearchProjectStore(
    (state) => state.activeProjectId,
  );
  const project = useResearchProjectStore((state) => state.project);
  const setProject = useResearchProjectStore((state) => state.setProject);
  const clearProject = useResearchProjectStore((state) => state.clearProject);

  useEffect(() => {
    if (!activeProjectId || project?.projectId === activeProjectId) return;
    let cancelled = false;
    void researchWorkflowClient
      .getWorkspace(activeProjectId)
      .then((workspace) => {
        if (
          cancelled ||
          useResearchProjectStore.getState().activeProjectId !== activeProjectId
        )
          return;
        setProject({
          projectId: workspace.projectId,
          title: workspace.title,
          rootPath: workspace.rootPath,
          description: workspace.description,
          demoComplete: workspace.index.demo?.complete ?? null,
          missing: (workspace.index.demo?.missing ?? []).map((item) =>
            typeof item === 'string' ? item : item.path,
          ),
        });
      })
      .catch(() => {
        if (
          !cancelled &&
          useResearchProjectStore.getState().activeProjectId === activeProjectId &&
          !useResearchProjectStore.getState().project?.rootPath
        )
          clearProject();
      });
    return () => {
      cancelled = true;
    };
  }, [activeProjectId, clearProject, project?.projectId, setProject]);

  return children;
}
