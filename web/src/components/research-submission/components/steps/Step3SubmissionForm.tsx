import { useState, useRef } from 'react';
import { ArrowLeft, FileUp, Loader2, Sparkles, Lightbulb, AlertCircle, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSimulation } from '../../context/SimulationContext';
import { submitPaper, extractPaperInfo } from '../../services/apiClient';
import GuideBubble from '../../components/GuideBubble';
import LoadingOverlay from '../../components/LoadingOverlay';

type AIField = 'title' | 'authors' | 'keywords' | 'abstract' | 'tldr';

export default function Step3SubmissionForm() {
  const { t } = useI18n();
  const {
    form,
    setFormField,
    goToStep,
    setRound1Reviewers,
    setSubmissionNumber,
    apiError,
    setApiError,
    isDemoLoaded,
    pickDemoPdf,
    fillDemoPaperField,
    applyDemoRound1Reviews,
  } = useSimulation();
  const [abstractTab, setAbstractTab] = useState<'write' | 'preview'>('write');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showTopTip, setShowTopTip] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingFields, setLoadingFields] = useState<Record<AIField, boolean>>({ title: false, authors: false, keywords: false, abstract: false, tldr: false });

  const [pdfBusy, setPdfBusy] = useState(false);

  const demoReady = isDemoLoaded;

  const handleChoosePdf = async () => {
    setPdfBusy(true);
    setApiError(null);
    try {
      const file = await pickDemoPdf();
      if (file) {
        setSelectedFile(file);
        return;
      }
      if (demoReady) {
        setApiError('未找到 Demo 论文 PDF，请重新载入研究数据。');
        return;
      }
      fileInputRef.current?.click();
    } finally {
      setPdfBusy(false);
    }
  };

  const handleAIAssist = async (field: AIField) => {
    if (loadingFields[field]) return;
    if (demoReady) {
      setLoadingFields((prev) => ({ ...prev, [field]: true }));
      setApiError(null);
      const ok = await fillDemoPaperField(field);
      if (!ok) setApiError('未找到 Demo 论文字段，请重新载入研究数据。');
      setLoadingFields((prev) => ({ ...prev, [field]: false }));
      return;
    }
    if (!selectedFile) {
      setApiError('请先上传论文 PDF，再使用 AI Assist。');
      return;
    }
    setIsExtracting(true);
    setApiError(null);
    try {
      const info = await extractPaperInfo(selectedFile);
      setFormField('title', info.title || form.title);
      setFormField('authors', info.authors || form.authors);
      setFormField('keywords', info.keywords || form.keywords);
      setFormField('abstract', info.abstract || form.abstract);
      setFormField('tldr', info.tldr || form.tldr);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '提取失败';
      setApiError(msg);
    } finally {
      setIsExtracting(false);
      setLoadingFields((prev) => ({ ...prev, title: false, authors: false, keywords: false, abstract: false, tldr: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);
    try {
      if (demoReady && applyDemoRound1Reviews()) {
        const subNum = String(Math.floor(10000 + Math.random() * 90000));
        setSubmissionNumber(subNum);
        goToStep(4);
        return;
      }
      const result = await submitPaper({ title: form.title, authors: form.authors, keywords: form.keywords, abstract: form.abstract, tldr: form.tldr, pdfFile: selectedFile });
      setRound1Reviewers(result.reviewers);
      if (result.paperTitle && result.paperTitle !== form.title) setFormField('title', result.paperTitle);
      const subNum = String(Math.floor(10000 + Math.random() * 90000));
      setSubmissionNumber(subNum);
      goToStep(4);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '提交失败';
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const aiButton = (field: AIField, showGuide = false) => (
    <span className="relative inline-flex">
      <button type="button" onClick={() => handleAIAssist(field)} disabled={(!demoReady && !selectedFile) || isExtracting || loadingFields[field]} title={!demoReady && !selectedFile ? '请先上传论文 PDF' : undefined} className="flex items-center gap-1.5 rounded-md border-2 border-[#800000] bg-[#fff5f5] px-3 py-1.5 text-sm font-bold text-[#800000] transition-colors hover:bg-[#ffe6e6] disabled:opacity-60">
        {isExtracting || loadingFields[field] ? <><Loader2 className="size-4 animate-spin" />{t.generating}</> : <><Sparkles className="size-4" />AI Assist</>}
      </button>
      {showGuide && <GuideBubble text="点击 AI 辅助填写试试吧 👈" position="right" />}
    </span>
  );

  const fieldHeader = (label: string, required: boolean, field: AIField) => (
    <div className="mb-1 flex items-center gap-2">
      <label className="text-sm font-bold text-[#800000]">{label}{required && <span className="text-[#800000]">*</span>}</label>
      {aiButton(field, field === 'title')}
    </div>
  );

  return (
    <>
      {isSubmitting && <LoadingOverlay text={t.submitting} fullscreen />}
      <div className="mx-auto max-w-4xl px-4 py-6">
        <button type="button" onClick={() => goToStep(2)} className="mb-4 flex items-center gap-1 text-sm text-[#336699] hover:underline"><ArrowLeft className="size-4" />{t.goBackHome}</button>
        <div className="mb-4 flex items-center gap-3 rounded-t-md bg-[#2c5f7a] px-3 py-2 text-white">
          <span className="rounded bg-[#1a4055] px-2 py-0.5 text-xs font-bold">Add:</span>
          <span className="text-sm font-medium">CVPR 2026 Conference Submission</span>
        </div>
        <div className="mb-6 -mt-4 border border-[#ccc] bg-[#ebe5d5] px-3 py-1 text-xs text-[#666]">Submission start: Nov 1, 2025, 12:00 AM. Deadline: Nov 15, 2025, 11:59 PM Pacific Time</div>
        {showTopTip && (
          <div className="relative mb-5 flex items-start gap-3 rounded-xl border-2 border-[#f59e0b] bg-gradient-to-br from-[#fff7ed] via-[#fef3c7] to-[#fde68a] px-5 py-4 pr-12 text-base font-extrabold leading-relaxed text-[#7c2d12] shadow-[0_10px_28px_rgba(245,158,11,0.45)] ring-4 ring-[#fbbf24]/35 sm:text-lg">
            <Lightbulb className="mt-0.5 size-7 shrink-0 text-[#d97706]" />
            <span>
              {t.pdfTip}
              {demoReady ? (
                <span className="mt-1 block font-bold text-[#9a3412]">↓ 点击下方「选择 PDF」即可载入 Demo 论文</span>
              ) : (
                <span className="mt-1 block font-bold text-[#9a3412]">↓ 请向下翻到页面下方的 PDF 上传处</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setShowTopTip(false)}
              className="absolute right-3 top-3 rounded-md p-1 text-[#9a3412] transition-colors hover:bg-[#f59e0b]/20"
              aria-label="关闭提示"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        {apiError && <div className="mb-4 flex items-start gap-2 rounded border border-[#e0b4b4] bg-[#fdecec] px-3 py-2 text-xs text-[#8b0000]"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span><strong>提交失败：</strong> {apiError}</span></div>}
        <form onSubmit={handleSubmit} className="space-y-0 text-[#333]">
          <p className="mb-4 text-xs text-[#800000]">* denotes a required field</p>
          <div className="mb-4">{fieldHeader(t.title, true, 'title')}<p className="mb-1 text-xs text-[#666]">Title of paper. Add TeX formulas using the following formats: $in-line formula$ or $$Block Formula$$.</p><input type="text" value={form.title} onChange={(e) => setFormField('title', e.target.value)} className="w-full rounded-sm border-2 border-[#2c5f7a] bg-[#fffbf0] px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#2c5f7a]" /></div>
          <div className="mb-4">{fieldHeader(t.authors, true, 'authors')}<p className="mb-1 text-xs text-[#666]">Search author profile by name or profile ID. All authors must have an OpenReview profile prior to submitting a paper.</p><div className="flex gap-2"><input type="text" value={form.authors} onChange={(e) => setFormField('authors', e.target.value)} placeholder="search profiles by name or OpenReview profile ID" className="flex-1 rounded-sm border-2 border-[#2c5f7a] bg-[#fffbf0] px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#2c5f7a]" /><button type="button" className="rounded-sm bg-[#7a9aa8] px-4 py-1 text-sm font-medium text-white hover:bg-[#5f8494]">Search</button></div></div>
          <div className="mb-4"><label className="mb-1 block text-sm font-bold text-[#800000]">{t.track}<span className="text-[#800000]">*</span></label><p className="mb-1 text-xs text-[#666]">Please select the single most appropriate track for this submission.</p><select className="w-full rounded-sm border-2 border-[#2c5f7a] bg-[#fffbf0] px-2 py-1 text-sm focus:outline-none"><option>Select Track</option><option>Main Conference</option><option>Workshop</option><option>Tutorial</option></select></div>
          <div className="mb-4"><label className="mb-1 block text-sm font-bold text-[#800000]">{t.submissionFormat}<span className="text-[#800000]">*</span></label><p className="mb-1 text-xs text-[#666]">Select the submission format that matches your chosen track.</p><select className="w-full rounded-sm border-2 border-[#2c5f7a] bg-[#fffbf0] px-2 py-1 text-sm focus:outline-none"><option>Select Submission Format</option><option>Main Conference Paper (8 content pages + references)</option><option>Short Paper (4 content pages + references)</option></select></div>
          <div className="mb-4">{fieldHeader(t.keywords, true, 'keywords')}<p className="mb-1 text-xs text-[#666]">Comma separated list of keywords.</p><input type="text" value={form.keywords} onChange={(e) => setFormField('keywords', e.target.value)} className="w-full rounded-sm border-2 border-[#2c5f7a] bg-[#fffbf0] px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#2c5f7a]" /></div>
          <div className="mb-4">{fieldHeader(t.tldr, false, 'tldr')}<p className="mb-1 text-xs text-[#666]">"Too Long; Didn't Read": a short sentence describing your paper</p><input type="text" value={form.tldr} onChange={(e) => setFormField('tldr', e.target.value)} className="w-full rounded-sm border-2 border-[#2c5f7a] bg-[#fffbf0] px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#2c5f7a]" /></div>
          <div className="mb-4">{fieldHeader(t.abstract, true, 'abstract')}<p className="mb-1 text-xs text-[#666]">Abstract of paper. Add TeX formulas using the following formats: $in-line formula$ or $$Block Formula$$.</p><div className="rounded-sm border-2 border-[#2c5f7a] bg-[#fffbf0]"><div className="flex gap-1 border-b border-[#2c5f7a] bg-[#f5f0e0] px-2 pt-1"><button type="button" onClick={() => setAbstractTab('write')} className={`rounded-t px-3 py-1 text-sm ${abstractTab === 'write' ? 'bg-[#fffbf0] font-medium text-[#333]' : 'text-[#666] hover:text-[#333]'}`}>{t.write}</button><button type="button" onClick={() => setAbstractTab('preview')} className={`rounded-t px-3 py-1 text-sm ${abstractTab === 'preview' ? 'bg-[#fffbf0] font-medium text-[#333]' : 'text-[#666] hover:text-[#333]'}`}>{t.preview}</button></div>{abstractTab === 'write' ? <textarea value={form.abstract} onChange={(e) => setFormField('abstract', e.target.value)} rows={8} className="w-full resize-y bg-transparent p-2 text-sm focus:outline-none" /> : <div className="min-h-[160px] p-3 text-sm leading-relaxed text-[#333] whitespace-pre-wrap">{form.abstract || <span className="italic text-[#999]">No content to preview.</span>}</div>}</div></div>
          <p className="mb-4 text-xs text-[#666]"><span className="font-mono text-[#888]">M</span> TeX is supported</p>
          <div className="mb-4"><label className="mb-1 block text-sm font-bold text-[#800000]">PDF<span className="text-[#800000]">*</span></label><p className="mb-1 text-xs text-[#666]">Upload a PDF file that ends with .pdf. The paper must comply with the page limit selected above.</p><div className="mb-3 flex items-start gap-3 rounded-xl border-2 border-[#f59e0b] bg-gradient-to-br from-[#fff7ed] via-[#fef3c7] to-[#fde68a] px-4 py-3 text-base font-bold text-[#7c2d12] shadow-[0_8px_20px_rgba(245,158,11,0.28)]"><Lightbulb className="mt-0.5 size-6 shrink-0 text-[#d97706]" /><span>{t.pdfTip}</span></div><button type="button" onClick={handleChoosePdf} disabled={pdfBusy} className="flex items-center gap-2 rounded-sm bg-[#2c5f7a] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1a4055] disabled:opacity-60"><FileUp className="size-4" />{pdfBusy ? '正在载入 Demo PDF…' : demoReady ? '选择 PDF（Demo）' : t.choosePdf}</button><input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setSelectedFile(file); }} />{selectedFile && <p className="mt-2 text-xs text-[#555]">已选择: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>}</div>
          <div className="mb-4"><label className="mb-1 block text-sm font-bold text-[#800000]">{t.emailSharing}<span className="text-[#800000]">*</span></label><p className="mb-2 text-xs text-[#666]">Please confirm you are aware that all author emails will be shared with Program Chairs.</p><label className="flex items-center gap-2 text-sm text-[#333]"><input type="radio" name="emailSharing" className="size-4" />We authorize the sharing of all author emails with Program Chairs.</label></div>
          <div className="mb-4"><label className="mb-1 block text-sm font-bold text-[#800000]">{t.dataRelease}<span className="text-[#800000]">*</span></label><p className="mb-2 text-xs text-[#666]">Please confirm you are aware that accepted submissions, along with their author names, will be released to the public after the conference is over.</p><label className="flex items-center gap-2 text-sm text-[#333]"><input type="radio" name="dataRelease" className="size-4" />We authorize the release of our submission and author names to the public in the event of acceptance.</label></div>
          <div className="mb-4"><label className="mb-1 block text-sm font-bold text-[#800000]">{t.license}<span className="text-[#800000]">*</span></label><select disabled className="w-full max-w-md cursor-not-allowed rounded-sm border-2 border-[#2c5f7a] bg-[#f5f0e0] px-2 py-1 text-sm text-[#333] focus:outline-none"><option>CC BY 4.0</option></select><p className="mt-1 text-xs text-[#888]">知识共享协议，允许他人在署名前提下自由分享和修改，学术投稿默认选择此项即可</p></div>
          <div className="mb-4"><label className="mb-1 block text-sm font-bold text-[#800000]">{t.readers}<span className="text-[#800000]">*</span></label><div className="flex flex-wrap gap-1.5"><span className="rounded bg-[#d8d4c8] px-2 py-0.5 text-xs text-[#333]">CVPR 2026 Conference</span><span className="rounded bg-[#d8d4c8] px-2 py-0.5 text-xs text-[#333]">username</span></div></div>
          <div className="mb-6"><label className="mb-1 block text-sm font-bold text-[#800000]">{t.signatures}<span className="text-[#800000]">*</span></label><select className="w-full max-w-md rounded-sm border-2 border-[#2c5f7a] bg-[#fffbf0] px-2 py-1 text-sm focus:outline-none"><option>Select Signature...</option><option>username</option></select></div>
          <div className="flex items-center gap-2"><button type="submit" disabled={isSubmitting} className="rounded-sm border-2 border-[#000] bg-[#2c5f7a] px-4 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1a4055] disabled:opacity-60">{t.submit}</button><button type="button" onClick={() => goToStep(2)} className="rounded-sm border-2 border-[#000] bg-[#f5f0e0] px-4 py-1.5 text-sm font-medium text-[#333] shadow-sm hover:bg-[#ebe5d5]">{t.cancel}</button></div>
        </form>
      </div>
    </>
  );
}
