/**
 * Shared research paper project context (one paper = one workspace directory).
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
  project: ResearchProjectSummary | null;
  setProject: (project: ResearchProjectSummary | null) => void;
  clearProject: () => void;
};

export const useResearchProjectStore = create<ResearchProjectState>()(
  persist(
    (set) => ({
      project: null,
      setProject: (project) => set({ project }),
      clearProject: () => set({ project: null }),
    }),
    { name: 'navivisor-research-project' },
  ),
);
