import { useRef, useState, useMemo } from 'react';
import { ArrowLeft, Trophy, RotateCcw, TrendingUp, FileText, FileUp, CheckCircle, Loader2, Sparkles, XCircle, Lightbulb, Home } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useI18n } from '../../context/I18nContext';
import { useSimulation } from '../../context/SimulationContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type DecisionType = 'oral' | 'poster' | 'rejected';

export default function Step6FinalResult() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { form, goToStep, resetSimulation, round2Reviewers, round2Decision, round2AvgScore, round1AvgScore, submissionNumber, isDemoLoaded, pickDemoPdf } = useSimulation();
  const displayTitle = form.title || 'Untitled Submission';
  const [cameraReadyFile, setCameraReadyFile] = useState<File | null>(null);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [finalSubmitted, setFinalSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [acknowledgments, setAcknowledgments] = useState('');
  const [isGeneratingAck, setIsGeneratingAck] = useState(false);
  const reviewers = round2Reviewers;

  const avgScore = useMemo(() => { if (reviewers.length === 0) return 0; return reviewers.reduce((s, r) => s + r.round2Score, 0) / reviewers.length; }, [reviewers]);

  const decision: DecisionType = useMemo(() => {
    if (reviewers.length === 0) return 'rejected';
    if (round2Decision) { const dec = round2Decision.toLowerCase(); if (dec.includes('oral')) return 'oral'; if (dec.includes('accept') || dec.includes('poster')) return 'poster'; return 'rejected'; }
    if (avgScore >= 5.5) return 'oral'; if (avgScore >= 4.5) return 'poster'; return 'rejected';
  }, [avgScore, reviewers.length, round2Decision]);

  const isAccepted = decision !== 'rejected';
  const decisionColors = { oral: { border: 'border-[#2e7d32]', bg: 'bg-[#e8f5e9]', text: 'text-[#2e7d32]', barBg: 'bg-gradient-to-r from-[#e8f5e9] to-[#c8e6c9]' }, poster: { border: 'border-[#00838f]', bg: 'bg-[#e0f7fa]', text: 'text-[#00838f]', barBg: 'bg-gradient-to-r from-[#e0f7fa] to-[#b2ebf2]' }, rejected: { border: 'border-[#c62828]', bg: 'bg-[#ffebee]', text: 'text-[#c62828]', barBg: 'bg-gradient-to-r from-[#ffebee] to-[#ffcdd2]' } };
  const colors = decisionColors[decision];

  const handleSubmitFinal = async () => { if (!cameraReadyFile || isSubmittingFinal || finalSubmitted) return; setIsSubmittingFinal(true); await new Promise((r) => setTimeout(r, 1800)); setIsSubmittingFinal(false); setFinalSubmitted(true); };
  const handleGenerateAck = async () => {
    if (isGeneratingAck) return;
    setIsGeneratingAck(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      const ackText = isDemoLoaded
        ? `We thank the reviewers and the area chair for their careful reading of EviVAD. Their comments on rank/α sensitivity, real-surveillance calibration, annotator agreement for EAR/CFS, and cross-camera consistency will be addressed in the camera-ready version.`
        : `We sincerely thank all ${reviewers.length} reviewers and the area chair for their time, effort, and constructive feedback throughout the review process.`;
      setAcknowledgments(ackText);
    } finally {
      setIsGeneratingAck(false);
    }
  };
  const handleChooseCameraReady = async () => {
    if (isDemoLoaded) {
      const file = await pickDemoPdf();
      if (file) {
        setCameraReadyFile(file);
        return;
      }
    }
    fileInputRef.current?.click();
  };
  const decisionLabel = () => { if (decision === 'oral') return t.acceptedOral.toUpperCase(); if (decision === 'poster') return t.acceptedPoster.toUpperCase(); return t.rejected.toUpperCase(); };
  const avgChange = useMemo(() => { if (reviewers.length === 0) return 0; const r1 = round1AvgScore > 0 ? round1AvgScore : reviewers.reduce((s, r) => s + r.round1Score, 0) / reviewers.length; const r2 = round2AvgScore > 0 ? round2AvgScore : reviewers.reduce((s, r) => s + r.round2Score, 0) / reviewers.length; return r2 - r1; }, [reviewers, round1AvgScore, round2AvgScore]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <button type="button" onClick={() => goToStep(4)} className="mb-4 flex items-center gap-1 text-sm text-[#336699] hover:underline"><ArrowLeft className="size-4" />{t.goBackHome}</button>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><h1 className="mb-2 text-2xl font-bold text-[#222]">{displayTitle}</h1><div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#666]"><span className="flex items-center gap-1"><FileText className="size-3" />{t.submissionNo}: {submissionNumber || '—'}</span><span>Submitted to CVPR 2026 Conference</span></div></div>
      </div>
      <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 border-2 ${colors.border} ${colors.barBg} px-4 py-3`}>
        <div className="flex items-center gap-3">{isAccepted ? <Trophy className={`size-7 ${colors.text}`} /> : <XCircle className={`size-7 ${colors.text}`} />}<div><span className="text-sm font-bold text-[#333]">{t.decision}: </span><span className={`text-xl font-bold ${colors.text}`}>{decisionLabel()}</span></div></div>
        <div className={`flex items-center gap-1 text-sm ${colors.text}`}>{avgChange >= 0 ? <><TrendingUp className="size-4" /><span className="font-medium">+{avgChange.toFixed(2)} avg score improvement</span></> : <><TrendingUp className="size-4 rotate-180" /><span className="font-medium">{avgChange.toFixed(2)} avg score change</span></>}</div>
      </div>
      <div className={`mb-6 border ${colors.border} bg-white`}>
        <div className={`flex items-center gap-2 border-b ${colors.border} ${colors.bg} px-3 py-2`}>{isAccepted ? <Trophy className={`size-4 ${colors.text}`} /> : <XCircle className={`size-4 ${colors.text}`} />}<span className={`text-sm font-bold ${colors.text}`}>Final Decision by Program Chairs</span></div>
        <div className="p-4">{isAccepted ? <><p className={`mb-2 text-lg font-semibold ${colors.text}`}>🎉 {t.congratulations}</p><p className="text-sm leading-relaxed text-[#444]">After rebuttal and discussion, the committee has decided to accept your paper as an <strong>{decision === 'oral' ? 'Oral Presentation' : 'Poster Presentation'}</strong>.</p></> : <><p className={`mb-2 text-lg font-semibold ${colors.text}`}>{t.rejectedMessage}</p><p className="text-sm leading-relaxed text-[#444]">The Area Chair and reviewers appreciate the effort you put into this submission. While the paper was not accepted this time, the reviewer comments contain valuable feedback.</p></>}</div>
      </div>
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-[#333]">Reviews (Round 2) — Score Comparison</h2>
        <div className="w-full overflow-x-auto border border-[#ccc] bg-white">
          <Table>
            <TableHeader className="bg-[#f5f0e0]"><TableRow><TableHead className="whitespace-nowrap font-bold text-[#333]">{t.reviewer}</TableHead><TableHead className="whitespace-nowrap font-bold text-[#c62828]">{t.round1Score}</TableHead><TableHead className="whitespace-nowrap font-bold text-[#2e7d32]">{t.round2Score}</TableHead><TableHead className="whitespace-nowrap font-bold text-[#333]">Change</TableHead><TableHead className="min-w-[280px] font-bold text-[#333]">{t.round2Comment}</TableHead></TableRow></TableHeader>
            <TableBody>{reviewers.map((r) => { const change = r.round2Score - r.round1Score; return (<TableRow key={r.id}><TableCell className="whitespace-nowrap font-medium">{r.name}</TableCell><TableCell className="whitespace-nowrap font-bold text-[#c62828]">{r.round1Score}</TableCell><TableCell className="whitespace-nowrap font-bold text-[#2e7d32]">{r.round2Score}</TableCell><TableCell className={`whitespace-nowrap font-semibold ${change >= 0 ? 'text-[#2e7d32]' : 'text-[#c62828]'}`}>{change >= 0 ? `+${change} ↑` : `${change} ↓`}</TableCell><TableCell className="min-w-[280px] align-top text-sm text-[#333]">{r.round2Comment}</TableCell></TableRow>); })}</TableBody>
          </Table>
        </div>
      </div>
      <div className="mb-6 border border-[#ccc] bg-white">
        <div className="flex items-center justify-between border-b border-[#ccc] bg-[#f5f0e0] px-3 py-2"><span className="text-sm font-bold text-[#800000]">{t.acknowledgments}</span><button type="button" onClick={handleGenerateAck} disabled={isGeneratingAck} className="flex items-center gap-1 rounded bg-[#800000] px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#6a1a18] disabled:cursor-not-allowed disabled:opacity-60">{isGeneratingAck ? <><Loader2 className="size-3.5 animate-spin" />{t.generating}</> : <><Sparkles className="size-3.5" />{t.aiAssist}</>}</button></div>
        <div className="p-4"><textarea value={acknowledgments} onChange={(e) => setAcknowledgments(e.target.value)} placeholder={t.acknowledgmentsPlaceholder} className="h-40 w-full resize-y rounded border border-[#ccc] bg-white px-3 py-2 text-sm text-[#333] placeholder:text-[#999] focus:border-[#9a2c22] focus:outline-none focus:ring-1 focus:ring-[#9a2c22]" /><div className="mt-2 text-right text-xs text-[#888]">{acknowledgments.length} {t.wordCount}</div></div>
      </div>
      {isAccepted && (
        <div className={`mb-6 border ${colors.border} bg-white`}>
          <div className={`flex items-center gap-2 border-b ${colors.border} ${colors.bg} px-3 py-2`}><FileText className={`size-4 ${colors.text}`} /><span className={`text-sm font-bold ${colors.text}`}>{t.cameraReady}</span></div>
          <div className="p-4"><p className="mb-1 text-sm text-[#666]">{t.cameraReadyHint}</p><p className="mb-4 text-xs text-[#666]"><strong>{t.cameraReadyDeadline}:</strong> Dec 15, 2026</p>{finalSubmitted ? <div className={`flex items-center gap-2 rounded border ${colors.border} ${colors.bg} px-4 py-3 text-sm font-semibold ${colors.text}`}><CheckCircle className="size-5" />{t.finalSubmitted}</div> : <><button type="button" onClick={handleChooseCameraReady} className="mb-2 flex items-center gap-2 rounded-sm bg-[#2c5f7a] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1a4055]"><FileUp className="size-4" />{t.choosePdf}</button><input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setCameraReadyFile(file); }} />{cameraReadyFile && <p className="mb-3 text-xs text-[#555]">已选择: {cameraReadyFile.name} ({(cameraReadyFile.size / 1024 / 1024).toFixed(2)} MB)</p>}<button type="button" onClick={handleSubmitFinal} disabled={!cameraReadyFile || isSubmittingFinal} className="flex items-center gap-2 rounded-md bg-[#2e7d32] px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1b5e20] disabled:cursor-not-allowed disabled:opacity-50">{isSubmittingFinal ? <><Loader2 className="size-4 animate-spin" />{t.submitting}</> : <>{t.submitFinal}</>}</button></>}</div>
        </div>
      )}
      {!isAccepted && (
        <div className={`mb-6 border ${colors.border} bg-white`}>
          <div className={`flex items-center gap-2 border-b ${colors.border} ${colors.bg} px-3 py-2`}><Lightbulb className={`size-4 ${colors.text}`} /><span className={`text-sm font-bold ${colors.text}`}>{t.nextSteps}</span></div>
          <div className="p-4"><div className="space-y-3">{[t.nextStep1, t.nextStep2, t.nextStep3].map((step, idx) => <div key={idx} className="flex gap-3 rounded-md border border-[#e0e0e0] bg-[#fafafa] p-3"><div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${colors.bg} text-sm font-bold ${colors.text}`}>{idx + 1}</div><p className="pt-0.5 text-sm leading-relaxed text-[#444]">{step}</p></div>)}</div></div>
        </div>
      )}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="border border-[#ccc] bg-white p-4"><h3 className="mb-3 text-sm font-bold text-[#333]">Average Score Progression</h3><div className="space-y-3"><div><div className="mb-1 flex justify-between text-xs"><span className="text-[#666]">{t.round1Score}</span><span className="font-bold text-[#c62828]">{(reviewers.reduce((s, r) => s + r.round1Score, 0) / reviewers.length).toFixed(2)}/6</span></div><div className="h-3 w-full rounded-full bg-[#f0f0f0]"><div className="h-full rounded-full bg-[#c62828]" style={{ width: `${((reviewers.reduce((s, r) => s + r.round1Score, 0) / reviewers.length / 6) * 100).toFixed(1)}%` }} /></div></div><div><div className="mb-1 flex justify-between text-xs"><span className="text-[#666]">{t.round2Score}</span><span className="font-bold text-[#2e7d32]">{(reviewers.reduce((s, r) => s + r.round2Score, 0) / reviewers.length).toFixed(2)}/6</span></div><div className="h-3 w-full rounded-full bg-[#f0f0f0]"><div className="h-full rounded-full bg-[#2e7d32]" style={{ width: `${((reviewers.reduce((s, r) => s + r.round2Score, 0) / reviewers.length / 6) * 100).toFixed(1)}%` }} /></div></div></div></div>
        <div className="border border-[#ccc] bg-white p-4"><h3 className="mb-3 text-sm font-bold text-[#333]">Per-Reviewer Score Change</h3><div className="space-y-2">{reviewers.map((r) => { const change = r.round2Score - r.round1Score; return (<div key={r.id} className="flex items-center gap-2 text-xs"><span className="w-28 shrink-0 truncate text-[#555]">{r.name}</span><span className="font-bold text-[#c62828]">{r.round1Score}</span>{change >= 0 ? <TrendingUp className="size-3 text-[#2e7d32]" /> : <TrendingUp className="size-3 rotate-180 text-[#c62828]" />}<span className="font-bold text-[#2e7d32]">{r.round2Score}</span><span className={`ml-auto rounded px-1.5 py-0.5 font-semibold ${change >= 0 ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#ffebee] text-[#c62828]'}`}>{change >= 0 ? `+${change}` : change}</span></div>); })}</div></div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={resetSimulation} className="flex items-center gap-2 rounded-md bg-[#2e7d32] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#1b5e20]"><RotateCcw className="size-4" />{t.restart}</button>
        <button type="button" onClick={() => void navigate({ to: '/research/home' })} className="flex items-center gap-2 rounded-md border-2 border-[#2c5f7a] bg-white px-6 py-2.5 text-sm font-bold text-[#2c5f7a] shadow-md hover:bg-[#eef5f8]"><Home className="size-4" />{t.returnHome}</button>
      </div>
    </div>
  );
}
