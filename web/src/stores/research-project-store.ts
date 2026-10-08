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
};

type ResearchProjectState = {
  activeProjectId: string | null;
  project: ResearchProjectSummary | null;
  /** Bumped when the bound workspace changes so modules remount/hydrate. */
  projectEpoch: number;
  setProject: (project: ResearchProjectSummary | null) => void;
  clearProject: () => void;
};

export const useResearchProjectStore = create<ResearchProjectState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      project: null,
      projectEpoch: 0,
      setProject: (project) =>
        set((state) => ({
          project,
          activeProjectId: project?.projectId ?? null,
          projectEpoch: state.projectEpoch + 1,
        })),
      clearProject: () =>
        set((state) => ({
          project: null,
          activeProjectId: null,
          projectEpoch: state.projectEpoch + 1,
        })),
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
