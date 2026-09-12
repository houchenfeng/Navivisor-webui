import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { IReviewer } from '../data/reviewersRound1';
import type { IRound2Reviewer } from '../data/mockData';
import { loadSubmissionWorkspaceSeed } from '../lib/workspace-submission-seed';
import { useWorkspaceArtifacts } from '@/components/research-workflow/use-research-project';
import {
  isResearchDemoMode,
  useResearchProjectStore,
} from '@/stores/research-project-store';
import {
  tryLoadDemoPaperInfo,
  tryLoadDemoPaperPdfAsFile,
  tryLoadDemoRebuttalEn,
} from '@/components/research-writing/lib/demo-writing';

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
  isDemoLoaded: boolean;
  paperPdfFile: File | null;
  applyDemoPaperFields: (field?: 'title' | 'authors' | 'keywords' | 'abstract' | 'tldr') => void;
  applyDemoRebuttal: () => boolean;
  pickDemoPdf: () => Promise<File | null>;
  fillDemoPaperField: (field: 'title' | 'authors' | 'keywords' | 'abstract' | 'tldr') => Promise<boolean>;
  fillDemoRebuttal: () => Promise<boolean>;
  applyDemoRound1Reviews: () => boolean;
  applyDemoRound2Outcome: () => boolean;
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
  const demoLoaded = useResearchProjectStore((state) =>
    isResearchDemoMode(state.project),
  );
  const demoEpoch = useResearchProjectStore((state) => state.demoEpoch);
  const [step, setStep] = useState<StepId>(1);
  const [form, setForm] = useState<ISubmissionForm>(INITIAL_FORM);
  const [round1Reviewers, setRound1Reviewers] = useState<IReviewer[]>([]);
  const [submissionNumber, setSubmissionNumber] = useState('');
  const [round2Reviewers, setRound2Reviewers] = useState<IRound2Reviewer[]>([]);
  const [round2Decision, setRound2DecisionState] = useState('');
  const [round2AvgScore, setRound2AvgScore] = useState(0);
  const [round1AvgScore, setRound1AvgScore] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [paperPdfFile, setPaperPdfFile] = useState<File | null>(null);
  const [demoForm, setDemoForm] = useState<ISubmissionForm>(INITIAL_FORM);
  const [demoRound1, setDemoRound1] = useState<IReviewer[]>([]);
  const [demoRound1Avg, setDemoRound1Avg] = useState(0);
  const [demoRound2, setDemoRound2] = useState<IRound2Reviewer[]>([]);
  const [demoRound2Avg, setDemoRound2Avg] = useState(0);
  const [demoDecision, setDemoDecision] = useState('');
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
      const seedKey = `${projectId ?? 'none'}:${demoEpoch}:${demoLoaded}:${artifacts.map((a) => a.artifactId).join(',')}`;
      if (seededKeyRef.current === seedKey) return;

      try {
        const seed = await loadSubmissionWorkspaceSeed(projectId, artifacts, demoLoaded);
        if (cancelled) return;
        seededKeyRef.current = seedKey;
        setWorkspaceSeedSource(seed.source);
        if (seed.source !== 'workspace') {
          setPaperPdfFile(null);
          setDemoForm(INITIAL_FORM);
          setDemoRound1([]);
          setDemoRound1Avg(0);
          setDemoRound2([]);
          setDemoRound2Avg(0);
          setDemoDecision('');
          setForm(INITIAL_FORM);
          setRound1Reviewers([]);
          setRound2Reviewers([]);
          setRound2DecisionState('');
          setRound1AvgScore(0);
          setRound2AvgScore(0);
          return;
        }

        setDemoForm({
          title: seed.title,
          authors: seed.authors,
          keywords: seed.keywords,
          abstract: seed.abstract,
          tldr: seed.tldr,
          rebuttal: seed.rebuttal,
        });
        setForm(INITIAL_FORM);
        setPaperPdfFile(seed.paperPdfFile);
        setDemoRound1(seed.round1Reviewers);
        setDemoRound1Avg(seed.round1AvgScore);
        setDemoRound2(seed.round2Reviewers);
        setDemoRound2Avg(seed.round2AvgScore);
        setDemoDecision(seed.decision);
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
  }, [projectId, artifacts, artifactsLoading, demoLoaded, demoEpoch]);

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

  const paperPdfRef = useRef<File | null>(null);
  const demoFormRef = useRef<ISubmissionForm>(INITIAL_FORM);
  paperPdfRef.current = paperPdfFile;
  demoFormRef.current = demoForm;

  const pickDemoPdf = async () => {
    if (paperPdfRef.current) return paperPdfRef.current;
    const file = await tryLoadDemoPaperPdfAsFile();
    if (file) {
      paperPdfRef.current = file;
      setPaperPdfFile(file);
    }
    return file;
  };

  const fillDemoPaperField = async (
    field: 'title' | 'authors' | 'keywords' | 'abstract' | 'tldr',
  ) => {
    if (!demoLoaded) return false;
    let data = demoFormRef.current;
    if (!data[field]) {
      const info = await tryLoadDemoPaperInfo();
      if (info) {
        data = {
          ...data,
          title: info.title || data.title,
          authors: info.authors || data.authors,
          keywords: info.keywords || data.keywords,
          abstract: info.abstract || data.abstract,
          tldr: info.tldr || data.tldr,
        };
        demoFormRef.current = data;
        setDemoForm(data);
      }
    }
    const value = data[field];
    if (!value) return false;
    setForm((prev) => ({ ...prev, [field]: value }));
    return true;
  };

  const fillDemoRebuttal = async () => {
    if (!demoLoaded) return false;
    let text = demoFormRef.current.rebuttal;
    if (!text) {
      text = (await tryLoadDemoRebuttalEn()) || '';
      if (text) {
        const next = { ...demoFormRef.current, rebuttal: text };
        demoFormRef.current = next;
        setDemoForm(next);
      }
    }
    if (!text) return false;
    setForm((prev) => ({ ...prev, rebuttal: text }));
    return true;
  };

  const applyDemoPaperFields = (
    field?: 'title' | 'authors' | 'keywords' | 'abstract' | 'tldr',
  ) => {
    void (field ? fillDemoPaperField(field) : Promise.all(
      (['title', 'authors', 'keywords', 'abstract', 'tldr'] as const).map((key) =>
        fillDemoPaperField(key),
      ),
    ));
  };

  const applyDemoRebuttal = () => {
    void fillDemoRebuttal();
    return demoLoaded;
  };

  const demoRound1Ref = useRef<IReviewer[]>([]);
  const demoRound2Ref = useRef<IRound2Reviewer[]>([]);
  demoRound1Ref.current = demoRound1;
  demoRound2Ref.current = demoRound2;
  const demoRound1AvgRef = useRef(0);
  const demoRound2AvgRef = useRef(0);
  const demoDecisionRef = useRef('');
  demoRound1AvgRef.current = demoRound1Avg;
  demoRound2AvgRef.current = demoRound2Avg;
  demoDecisionRef.current = demoDecision;

  const applyDemoRound1Reviews = () => {
    if (!demoLoaded || demoRound1Ref.current.length === 0) return false;
    setRound1Reviewers(demoRound1Ref.current);
    setRound1AvgScore(demoRound1AvgRef.current);
    return true;
  };

  const applyDemoRound2Outcome = () => {
    if (!demoLoaded || demoRound2Ref.current.length === 0) return false;
    setRound2Reviewers(demoRound2Ref.current);
    setRound2DecisionState(demoDecisionRef.current || 'Poster Accept');
    setRound2AvgScore(demoRound2AvgRef.current || demoRound1AvgRef.current);
    setRound1AvgScore(demoRound1AvgRef.current);
    return true;
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
    setPaperPdfFile(null);
    setDemoForm(INITIAL_FORM);
    setDemoRound1([]);
    setDemoRound1Avg(0);
    setDemoRound2([]);
    setDemoRound2Avg(0);
    setDemoDecision('');
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
        isDemoLoaded: demoLoaded,
        paperPdfFile,
        applyDemoPaperFields,
        applyDemoRebuttal,
        pickDemoPdf,
        fillDemoPaperField,
        fillDemoRebuttal,
        applyDemoRound1Reviews,
        applyDemoRound2Outcome,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

// Hook and provider intentionally share the context module.
// eslint-disable-next-line react-refresh/only-export-components
export function useSimulation(): ISimulationContext {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}
