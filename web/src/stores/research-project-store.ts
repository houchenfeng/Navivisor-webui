/**
 * Shared research paper project context (one paper = one workspace directory).
 *
 * Note: any unsaved drafts / local editor state should be keyed by projectId
 * so switching papers never leaks draft A into project B (full draft system TBD).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ResearchProjectSummary = {
  projectId: string;
  title: string;
  rootPath: string;
  description?: string;
  demoComplete?: boolean | null;
  missing?: string[];
};

type ResearchProjectState = {
  activeProjectId: string | null;
  project: ResearchProjectSummary | null;
  /** Bumped after workspace demo load/unload so modules remount/hydrate. */
  demoEpoch: number;
  setProject: (project: ResearchProjectSummary | null) => void;
  clearProject: () => void;
  bumpDemoEpoch: () => void;
};

export const useResearchProjectStore = create<ResearchProjectState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      project: null,
      demoEpoch: 0,
      setProject: (project) =>
        set({ project, activeProjectId: project?.projectId ?? null }),
      clearProject: () =>
        set((state) => ({
          project: null,
          activeProjectId: null,
          demoEpoch: state.demoEpoch + 1,
        })),
      bumpDemoEpoch: () => set((state) => ({ demoEpoch: state.demoEpoch + 1 })),
    }),
    {
      name: 'navivisor-research-project',
      partialize: (state) => ({
        activeProjectId: state.activeProjectId,
        project: state.project,
      }),
    },
  ),
);

export function isResearchDemoMode(
  project: ResearchProjectSummary | null | undefined,
): boolean {
  if (!project) return false;
  if (project.demoComplete != null) return true;
  const root = project.rootPath.replace(/\\/g, '/').toLowerCase();
  return (
    root.includes('/demo-workspaces/') ||
    root.includes('evivad-surveillance-demo')
  );
}
