import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { IReviewer } from '../data/reviewersRound1';
import type { IRound2Reviewer } from '../data/mockData';
import { loadSubmissionWorkspaceSeed } from '../lib/workspace-submission-seed';
import { useWorkspaceArtifacts } from '@/components/research-workflow/use-research-project';

export type StepId = 1 | 2 | 3 | 4 | 5 | 6;

interface ISubmissionForm {
  title: string;
  authors: string;
  keywords: string;
  abstract: string;
  tldr: string;
  rebuttal: string;
}

interface ISimulationContext {
  step: StepId;
  goToStep: (step: StepId) => void;
  form: ISubmissionForm;
  setFormField: (field: keyof ISubmissionForm, value: string) => void;
  resetSimulation: () => void;
  round1Reviewers: IReviewer[];
  setRound1Reviewers: (reviewers: IReviewer[]) => void;
  submissionNumber: string;
  setSubmissionNumber: (num: string) => void;
  round2Reviewers: IRound2Reviewer[];
  setRound2Reviewers: (reviewers: IRound2Reviewer[]) => void;
  round2Decision: string;
  round2AvgScore: number;
  round1AvgScore: number;
  setRound2Decision: (decision: string, avgScore: number, firstRoundAvg: number) => void;
  apiError: string | null;
  setApiError: (error: string | null) => void;
  workspaceSeedSource: 'workspace' | 'local-mock' | 'loading';
}

const SimulationContext = createContext<ISimulationContext | null>(null);

const INITIAL_FORM: ISubmissionForm = {
  title: '',
  authors: '',
  keywords: '',
  abstract: '',
  tldr: '',
  rebuttal: '',
};

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { projectId, artifacts, loading: artifactsLoading } = useWorkspaceArtifacts();
  const [step, setStep] = useState<StepId>(1);
  const [form, setForm] = useState<ISubmissionForm>(INITIAL_FORM);
  const [round1Reviewers, setRound1Reviewers] = useState<IReviewer[]>([]);
  const [submissionNumber, setSubmissionNumber] = useState('');
  const [round2Reviewers, setRound2Reviewers] = useState<IRound2Reviewer[]>([]);
  const [round2Decision, setRound2DecisionState] = useState('');
  const [round2AvgScore, setRound2AvgScore] = useState(0);
  const [round1AvgScore, setRound1AvgScore] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [workspaceSeedSource, setWorkspaceSeedSource] = useState<
    'workspace' | 'local-mock' | 'loading'
  >('local-mock');
  const seededKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function seed() {
      if (artifactsLoading) {
        setWorkspaceSeedSource('loading');
        return;
      }
      const seedKey = `${projectId ?? 'none'}:${artifacts.map((a) => a.artifactId).join(',')}`;
      if (seededKeyRef.current === seedKey) return;

      try {
        const seed = await loadSubmissionWorkspaceSeed(projectId, artifacts);
        if (cancelled) return;
        seededKeyRef.current = seedKey;
        setWorkspaceSeedSource(seed.source);
        if (seed.source !== 'workspace') return;

        setForm((prev) => ({
          ...prev,
          title: seed.title || prev.title,
          rebuttal: seed.rebuttal || prev.rebuttal,
        }));
        if (seed.round1Reviewers.length > 0) {
          setRound1Reviewers(seed.round1Reviewers);
          setRound1AvgScore(seed.round1AvgScore);
        }
        if (seed.round2Reviewers.length > 0) {
          setRound2Reviewers(seed.round2Reviewers);
          setRound2AvgScore(seed.round2AvgScore);
        }
        if (seed.decision) {
          setRound2DecisionState(seed.decision);
        }
        setSubmissionNumber((prev) => prev || `WS-${(projectId ?? 'demo').slice(0, 8)}`);
      } catch (err) {
        if (!cancelled) {
          setWorkspaceSeedSource('local-mock');
          setApiError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void seed();
    return () => {
      cancelled = true;
    };
  }, [projectId, artifacts, artifactsLoading]);

  const goToStep = (nextStep: StepId) => {
    setStep(nextStep);
    setApiError(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const setFormField = (field: keyof ISubmissionForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setRound2Decision = (decision: string, avgScore: number, firstRoundAvg: number) => {
    setRound2DecisionState(decision);
    setRound2AvgScore(avgScore);
    setRound1AvgScore(firstRoundAvg);
  };

  const resetSimulation = () => {
    setStep(1);
    setForm(INITIAL_FORM);
    setRound1Reviewers([]);
    setSubmissionNumber('');
    setRound2Reviewers([]);
    setRound2DecisionState('');
    setRound2AvgScore(0);
    setRound1AvgScore(0);
    setApiError(null);
    seededKeyRef.current = null;
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <SimulationContext.Provider
      value={{
        step, goToStep, form, setFormField, resetSimulation,
        round1Reviewers, setRound1Reviewers,
        submissionNumber, setSubmissionNumber,
        round2Reviewers, setRound2Reviewers,
        round2Decision, round2AvgScore, round1AvgScore, setRound2Decision,
        apiError, setApiError,
        workspaceSeedSource,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): ISimulationContext {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}
