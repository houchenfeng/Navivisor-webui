import { useState } from 'react';
import { ArrowLeft, Wand2, Loader2, Lightbulb, Check, AlertCircle, FileText } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSimulation } from '../../context/SimulationContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import GuideBubble from '../../components/GuideBubble';
import { submitRebuttal, generateRebuttal } from '../../services/apiClient';

export default function Step5Rebuttal() {
  const { t } = useI18n();
  const {
    form,
    setFormField,
    goToStep,
    round1Reviewers,
    setRound2Reviewers,
    setRound2Decision,
    submissionNumber,
    apiError,
    setApiError,
    isDemoLoaded,
    fillDemoRebuttal,
    round2Reviewers,
    round2Decision,
    round2AvgScore,
    round1AvgScore,
  } = useSimulation();
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [isSubmittingRebuttal, setIsSubmittingRebuttal] = useState(false);
  const reviewers = round1Reviewers.length > 0 ? round1Reviewers : [];
  const displayTitle = form.title || 'Untitled Submission';
  const charCount = form.rebuttal.length;

  const handleAIAssist = async () => {
    if (isAIGenerating || reviewers.length === 0) return;
    setIsAIGenerating(true);
    setApiError(null);
    try {
      if (isDemoLoaded && (await fillDemoRebuttal())) {
        return;
      }
      const rebuttalText = await generateRebuttal({
        reviews: reviewers.map((r) => ({
          id: r.id,
          rating: r.score,
          confidence: r.confidence,
          summary: r.summary,
          strengths: r.strengths,
          weaknesses: r.weaknesses,
          questions: r.questions,
          limitations: r.limitations,
          ethicalConcerns: r.ethicalConcerns,
          finalJustification: r.finalJustification,
          focus: r.trackLabel,
        })),
        currentText: form.rebuttal || '',
      });
      if (rebuttalText) setFormField('rebuttal', rebuttalText);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI 生成失败';
      setApiError(msg);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleSubmitRebuttal = async () => {
    if (isSubmittingRebuttal || !form.rebuttal) return;
    setIsSubmittingRebuttal(true);
    setApiError(null);
    try {
      if (isDemoLoaded && round2Reviewers.length > 0) {
        setRound2Reviewers(round2Reviewers);
        setRound2Decision(
          round2Decision || 'Poster Accept',
          round2AvgScore || round1AvgScore,
          round1AvgScore,
        );
        await new Promise((resolve) => setTimeout(resolve, 1800));
        goToStep(6);
        return;
      }
      const result = await submitRebuttal({
        rebuttal: form.rebuttal,
        paperTitle: displayTitle,
        round1Reviews: reviewers,
      });
      setRound2Reviewers(result.reviewers);
      setRound2Decision(result.decision, result.averageScore, result.firstRoundAverage);
      // Brief “reviewing” feel, then final result
      await new Promise((resolve) => setTimeout(resolve, 1800));
      goToStep(6);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Rebuttal 提交失败';
      setApiError(msg);
    } finally {
      setIsSubmittingRebuttal(false);
    }
  };

  return (
    <>
      {isSubmittingRebuttal && <LoadingOverlay text={t.reviewing} fullscreen />}
      <div className="mx-auto max-w-5xl px-4 py-6">
        <button
          type="button"
          onClick={() => goToStep(4)}
          className="mb-4 flex items-center gap-1 text-sm text-[#336699] hover:underline"
        >
          <ArrowLeft className="size-4" />
          返回初审结果
        </button>

        {apiError && (
          <div className="mb-4 flex items-start gap-2 rounded border border-[#e0b4b4] bg-[#fdecec] px-3 py-2 text-xs text-[#8b0000]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>操作失败：</strong> {apiError}
            </span>
          </div>
        )}

        <div className="mb-4">
          <h1 className="mb-2 text-2xl font-bold text-[#222]">{displayTitle}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#666]">
            <span className="flex items-center gap-1">
              <FileText className="size-3" />
              {t.submissionNo}: {submissionNumber || '—'}
            </span>
            <span>Rebuttal · CVPR 2026 Conference</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-3">
            <h2 className="text-xl font-bold text-[#800000]">{t.authorRebuttal}</h2>
            <p className="mt-1 text-sm text-[#555]">{t.authorRebuttalDesc}</p>
          </div>

          <div className="mb-4 rounded-xl border-2 border-[#f59e0b] bg-gradient-to-br from-[#fff7ed] via-[#fef3c7] to-[#fde68a] p-4 shadow-[0_8px_20px_rgba(245,158,11,0.28)]">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="size-5 text-[#d97706]" />
              <span className="text-base font-extrabold text-[#7c2d12]">{t.rebuttalTips}</span>
            </div>
            <ul className="space-y-1.5 text-sm font-semibold text-[#7c2d12]">
              {[t.rebuttalTip1, t.rebuttalTip2, t.rebuttalTip3, t.rebuttalTip4, t.rebuttalTip5].map(
                (tip, i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#d97706]" />
                    <span>{tip}</span>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="border-2 border-[#9a2c22] bg-[#fef9e7]">
            <div className="flex items-center justify-between border-b-2 border-[#9a2c22] bg-[#fef3c7] px-3 py-2">
              <span className="text-sm font-bold text-[#800000]">Rebuttal by Authors</span>
              <span className="relative inline-flex">
                <button
                  type="button"
                  onClick={handleAIAssist}
                  disabled={isAIGenerating || reviewers.length === 0}
                  className="flex items-center gap-1.5 rounded-md border-2 border-[#800000] bg-white px-3 py-1.5 text-sm font-bold text-[#800000] hover:bg-[#fff5f5] disabled:opacity-60"
                >
                  {isAIGenerating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t.generating}
                    </>
                  ) : (
                    <>
                      <Wand2 className="size-4" />
                      {t.aiAssist}
                    </>
                  )}
                </button>
                {!form.rebuttal && !isAIGenerating && (
                  <GuideBubble text={t.guideAiAssist} position="left" />
                )}
              </span>
            </div>
            <div className="p-3">
              <textarea
                value={form.rebuttal}
                onChange={(e) => setFormField('rebuttal', e.target.value)}
                rows={14}
                placeholder="Type your rebuttal here. Respond to reviewer comments point by point..."
                className="w-full resize-y rounded-sm border border-[#ccc] bg-white p-3 text-sm leading-relaxed text-[#333] focus:outline-none focus:ring-1 focus:ring-[#9a2c22]"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-[#888]">
                <span>
                  {charCount} {t.characters}
                </span>
                <span>{t.rebuttalEditTip}</span>
              </div>
              <div className="relative mt-3 inline-block">
                <button
                  type="button"
                  onClick={handleSubmitRebuttal}
                  disabled={isSubmittingRebuttal || !form.rebuttal}
                  className="rounded-md bg-[#9a2c22] px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#7a1f17] disabled:opacity-60"
                >
                  {t.submitRebuttal}
                </button>
                {!form.rebuttal && (
                  <GuideBubble text={t.guideSubmitRebuttal} position="top" className="mb-1" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-[#ddd] pt-4 text-center text-[11px] text-[#888]">
          <p className="font-semibold text-[#666]">{t.disclaimer}</p>
        </div>
      </div>
    </>
  );
}
