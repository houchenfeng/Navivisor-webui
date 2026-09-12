/**
 * Shared helpers for the four research modules to read one workspace projectId
 * and hydrate from loaded demo / stage artifacts.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { researchWorkflowClient } from '@/components/research-workflow/research-workflow-client';
import type { ResearchArtifact } from '@/components/research-workflow/research-workflow-types';
import { useResearchProjectStore } from '@/stores/research-project-store';

export class ResearchProjectRequiredError extends Error {
  constructor(
    message = '请先在首页注册并选择论文工作目录（projectId）后再执行此操作。',
  ) {
    super(message);
    this.name = 'ResearchProjectRequiredError';
  }
}

/** Current shared workspace projectId, or throw a clear register-first error. */
export function requireProjectId(): string {
  const projectId = useResearchProjectStore
    .getState()
    .project?.projectId?.trim();
  if (!projectId) throw new ResearchProjectRequiredError();
  return projectId;
}

export async function loadArtifacts(
  projectId: string,
): Promise<ResearchArtifact[]> {
  return researchWorkflowClient.listArtifacts(projectId);
}

export function findLatestByRole(
  artifacts: ResearchArtifact[],
  role: string,
): ResearchArtifact | undefined {
  return artifacts
    .filter((artifact) => artifact.role === role)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
}

export function findLatestByPathHint(
  artifacts: ResearchArtifact[],
  hint: string,
): ResearchArtifact | undefined {
  const needle = hint.toLowerCase();
  return artifacts
    .filter(
      (artifact) =>
        artifact.path.toLowerCase().includes(needle) ||
        artifact.name.toLowerCase().includes(needle),
    )
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
}

export async function fetchArtifactText(
  projectId: string,
  artifactId: string,
): Promise<string> {
  return researchWorkflowClient.getArtifactContent(projectId, artifactId);
}

export async function fetchLatestArtifactText(
  projectId: string,
  artifacts: ResearchArtifact[],
  role: string,
): Promise<string | null> {
  const artifact = findLatestByRole(artifacts, role);
  if (!artifact) return null;
  return fetchArtifactText(projectId, artifact.artifactId);
}

export function artifactContentUrl(
  projectId: string,
  artifactId: string,
): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/api/research/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(artifactId)}/content`;
}

/** Prefer confirmed-topic / experiment-results / literature as writing inputs. */
export function collectInputArtifactIds(
  artifacts: ResearchArtifact[],
  roles: string[] = [
    'confirmed-topic',
    'experiment-results',
    'experiment-plan',
    'core-references',
    'literature-handoff',
    'method-architecture',
  ],
): string[] {
  const ids: string[] = [];
  for (const role of roles) {
    const artifact = findLatestByRole(artifacts, role);
    if (artifact) ids.push(artifact.artifactId);
  }
  return ids;
}

/** Shared by writing draft / translate / figure runs. */
export async function resolveWritingRunContext(): Promise<{
  projectId: string;
  inputArtifactIds: string[];
}> {
  const projectId = requireProjectId();
  try {
    const artifacts = await loadArtifacts(projectId);
    return { projectId, inputArtifactIds: collectInputArtifactIds(artifacts) };
  } catch {
    return { projectId, inputArtifactIds: [] };
  }
}

export function parseCsvRows(text: string): string[][] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  return lines.map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === ',' && !inQuotes) {
        cells.push(current);
        current = '';
        continue;
      }
      current += ch;
    }
    cells.push(current);
    return cells;
  });
}

export type WorkspaceArtifactsState = {
  projectId: string | null;
  artifacts: ResearchArtifact[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/** List artifacts for the shared project; refreshes when demoEpoch bumps. */
export function useWorkspaceArtifacts(): WorkspaceArtifactsState {
  const projectId = useResearchProjectStore(
    (s) => s.project?.projectId ?? null,
  );
  const demoEpoch = useResearchProjectStore((s) => s.demoEpoch);
  const [artifacts, setArtifacts] = useState<ResearchArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!projectId) {
      setArtifacts([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await loadArtifacts(projectId);
      if (
        version !== requestVersion.current ||
        useResearchProjectStore.getState().activeProjectId !== projectId
      )
        return;
      setArtifacts(next);
    } catch (err) {
      if (version !== requestVersion.current) return;
      setArtifacts([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const refresh = window.setTimeout(() => void reload(), 0);
    return () => {
      window.clearTimeout(refresh);
      requestVersion.current += 1;
    };
  }, [reload, demoEpoch]);

  return { projectId, artifacts, loading, error, reload };
}
