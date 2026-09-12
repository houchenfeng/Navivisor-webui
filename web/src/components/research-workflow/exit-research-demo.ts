import { clearData } from '@/components/research-writing/lib/storage';
import { useExperimentStore } from '@/stores/experiment-store';
import { useResearchProjectStore } from '@/stores/research-project-store';

/** Leave Demo mode: drop the bound workspace and reset module drafts. */
export function exitResearchDemo() {
  const { project, clearProject } = useResearchProjectStore.getState();
  clearData(project?.projectId);
  useExperimentStore.getState().reset();
  clearProject();
}
