import { useEffect, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Database, Download, FlaskConical, Loader2, Play, RotateCcw, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { type ExperimentStep, useExperimentStore } from '@/stores/experiment-store';

const steps: Array<{ id: ExperimentStep; label: string }> = [
  { id: 'intake', label: '课题与文献' }, { id: 'plan', label: '方案确认' },
  { id: 'mode', label: '模式选择' }, { id: 'simulate', label: '模拟配置' },
  { id: 'run', label: '实验执行' }, { id: 'results', label: '成果交付' },
];

const stepPath = (step: ExperimentStep) => `/research/experiment/${step}` as const;

function SimulatedBadge() {
  return <Badge className="border-amber-300 bg-amber-100 text-amber-800">模拟</Badge>;
}

function IntakePage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore();
  const [csvName, setCsvName] = useState('');
  const [error, setError] = useState('');
  const readCsv = async (file: File) => {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    const required = ['paper_id', 'title', 'abstract', 'pdf_path'];
    const missing = required.filter((key) => !rows.length || !(key in rows[0]));
    if (missing.length) { setError(`缺少必填列：${missing.join('、')}`); return; }
    const ids = rows.map((row) => String(row.paper_id));
    if (new Set(ids).size !== ids.length) { setError('paper_id 必须唯一'); return; }
    setError(''); setCsvName(file.name); state.setFields({ paperCount: rows.length });
  };
  const canContinue = state.projectName.trim() && state.researchTopic.trim() && state.paperCount > 0;
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#10204A]">课题与文献</h2>
        <p className="mt-1 text-sm text-muted-foreground">填写研究信息，并上传包含核心论文摘要和 PDF 路径的 CSV。</p>
        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">项目名称<Input value={state.projectName} onChange={(e) => state.setFields({ projectName: e.target.value })} placeholder="例如：可信多智能体视觉协同" /></label>
          <label className="flex flex-col gap-2 text-sm font-medium">研究题目<Textarea value={state.researchTopic} onChange={(e) => state.setFields({ researchTopic: e.target.value })} placeholder="输入计算机视觉研究题目" /></label>
          <label className="flex flex-col gap-2 text-sm font-medium">研究目标<Textarea value={state.researchGoal} onChange={(e) => state.setFields({ researchGoal: e.target.value })} placeholder="想解决的关键问题（可选）" /></label>
        </div>
      </section>
      <section className="flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
        <h3 className="font-semibold text-[#10204A]">核心文献 CSV</h3>
        <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#1F4DCB]/30 bg-[#1F4DCB]/5 text-center">
          <Upload className="size-8 text-[#1F4DCB]" /><span className="font-medium">点击选择 CSV 文件</span><span className="text-xs text-muted-foreground">必填：paper_id、title、abstract、pdf_path</span>
          <input type="file" accept=".csv" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void readCsv(file); }} />
        </label>
        {csvName ? <p className="text-sm text-[#16A36A]"><Check className="mr-1 inline size-4" />{csvName} · {state.paperCount} 篇论文</p> : null}
        {error ? <p className="text-sm text-[#DC3C4A]">{error}</p> : null}
        <div className="grid grid-cols-3 gap-2 text-center"><div><strong>{state.paperCount}</strong><small className="block text-muted-foreground">论文总数</small></div><div><strong>{Math.max(0, state.paperCount - 3)}</strong><small className="block text-muted-foreground">PDF 可用</small></div><div><strong>{Math.min(3, state.paperCount)}</strong><small className="block text-muted-foreground">仅摘要</small></div></div>
        <div className="mt-auto flex justify-between"><Button variant="outline" onClick={state.loadDemo}><Database data-icon="inline-start" />Demo 数据</Button><Button disabled={!canContinue} onClick={() => go('plan')}>生成实验方案<ChevronRight data-icon="inline-end" /></Button></div>
      </section>
    </div>
  );
}

function PlanPage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore();
  return <div className="flex flex-col gap-5"><section className="rounded-2xl bg-white/90 p-6"><h2 className="text-xl font-semibold text-[#10204A]">实验方案确认</h2><p className="mt-2 text-sm text-muted-foreground">任务：多智能体 3D 目标检测 · Baseline：V2X-ViT · 主指标：3D mAP</p><div className="mt-5 grid gap-3 lg:grid-cols-2">{state.ideas.map((idea) => <article key={idea.id} className="rounded-xl border bg-white p-4"><div className="flex items-center justify-between"><Badge variant="secondary">{idea.layer}</Badge><span className="text-sm font-semibold text-[#16A36A]">预计 {idea.gain}</span></div><h3 className="mt-3 font-semibold">{idea.id} · {idea.name}</h3><p className="mt-1 text-sm text-muted-foreground">{idea.hypothesis}</p><p className="mt-3 text-xs text-muted-foreground">Go：主指标稳定提升 ≥ 1.5%，额外计算成本 ≤ 15%</p></article>)}</div></section><div className="flex justify-end"><Button onClick={() => { state.setFields({ planConfirmed: true }); go('mode'); }}><Check data-icon="inline-start" />确认方案</Button></div></div>;
}

function ModePage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore();
  return <div className="mx-auto max-w-4xl"><h2 className="text-2xl font-semibold text-[#10204A]">选择运行模式</h2><div className="mt-6 grid gap-4 md:grid-cols-2"><button className="rounded-2xl border-2 border-[#1F4DCB] bg-white p-6 text-left shadow-sm"><FlaskConical className="size-8 text-[#1F4DCB]" /><h3 className="mt-4 text-lg font-semibold">模拟实验结果</h3><p className="mt-2 text-sm text-muted-foreground">基于论文锚点、领域合理区间和模型推断生成保守模拟数据。</p></button><button disabled className="rounded-2xl border bg-white/60 p-6 text-left opacity-60"><Play className="size-8" /><div className="mt-4 flex items-center gap-2"><h3 className="text-lg font-semibold">本地真实运行</h3><Badge variant="secondary">后续版本</Badge></div></button></div><label className="mt-6 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm"><input type="checkbox" className="mt-1" checked={state.disclaimerAccepted} onChange={(e) => state.setFields({ disclaimerAccepted: e.target.checked })} /><span>我理解模拟结果仅用于 Demo 和方案比较，不能作为真实论文证据。</span></label><div className="mt-6 flex justify-end"><Button disabled={!state.disclaimerAccepted} onClick={() => go('simulate')}>继续配置<ChevronRight data-icon="inline-end" /></Button></div></div>;
}

function ConfigPage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore();
  return <div className="mx-auto max-w-3xl rounded-2xl bg-white/90 p-6"><div className="flex items-center gap-3"><h2 className="text-xl font-semibold">模拟配置</h2><SimulatedBadge /></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm font-medium">随机种子<Input type="number" value={state.seed} onChange={(e) => state.setFields({ seed: Number(e.target.value) })} /></label><label className="flex flex-col gap-2 text-sm font-medium">重复次数<Input type="number" min={1} max={10} value={state.repeatCount} onChange={(e) => state.setFields({ repeatCount: Number(e.target.value) })} /></label><label className="flex flex-col gap-2 text-sm font-medium">提升幅度<Input value="Baseline -2% ～ +8%" disabled /></label><label className="flex flex-col gap-2 text-sm font-medium">失败方案<Input value="允许 1–2 个 Idea 失败" disabled /></label></div><div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-[#10204A]">模拟依据：论文公开报告值作为锚点；缺失值使用领域合理区间；组合收益由保守模型推断。</div><div className="mt-6 flex justify-end"><Button onClick={() => go('run')}><Play data-icon="inline-start" />开始模拟</Button></div></div>;
}

function RunPage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore(); const [progress, setProgress] = useState(state.completed ? 100 : 0);
  useEffect(() => { if (progress >= 100) return; const timer = window.setInterval(() => setProgress((v) => Math.min(100, v + 10)), 280); return () => window.clearInterval(timer); }, [progress]);
  useEffect(() => { if (progress === 100) state.setFields({ completed: true }); }, [progress]);
  return <div className="flex flex-col gap-5"><div className="rounded-2xl bg-white/90 p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><h2 className="text-xl font-semibold">模拟执行</h2><SimulatedBadge /></div><strong>{progress}%</strong></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full bg-[#1F4DCB] transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-sm text-muted-foreground">正在播放预生成模拟结果，不代表模型训练或 GPU 运行。</p></div><div className="grid gap-3 lg:grid-cols-2">{state.ideas.map((idea, index) => { const visible = progress >= (index + 1) * 16; return <article key={idea.id} className="rounded-xl bg-white/90 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">{idea.name}</h3>{visible ? <Badge variant={idea.status === '成功' ? 'default' : 'secondary'}>{idea.status} · 模拟</Badge> : <Badge variant="outline"><Loader2 className="animate-spin" />等待</Badge>}</div>{visible ? <p className="mt-2 text-sm text-muted-foreground">模拟评分 {idea.score} · 预计变化 {idea.gain}{idea.status !== '成功' ? ' · 收益不稳定或计算成本过高' : ''}</p> : null}</article>; })}</div>{progress === 100 ? <div className="flex justify-end"><Button onClick={() => go('results')}>查看成果<ChevronRight data-icon="inline-end" /></Button></div> : null}</div>;
}

function MiniCharts() {
  return <div className="grid gap-4 lg:grid-cols-3">{['方法流程图', '模拟效果对比', '模拟训练曲线'].map((title, index) => <figure key={title} className="rounded-xl border bg-white p-4"><div className="flex items-center justify-between"><figcaption className="font-medium">{title}</figcaption><SimulatedBadge /></div><svg viewBox="0 0 300 130" className="mt-3 w-full" aria-label={title}>{index === 0 ? <><rect x="10" y="45" width="65" height="38" rx="8" fill="#dbeafe"/><rect x="115" y="25" width="70" height="38" rx="8" fill="#93c5fd"/><rect x="225" y="45" width="65" height="38" rx="8" fill="#1F4DCB"/><path d="M75 64H115M185 44L225 64" stroke="#1F4DCB" strokeWidth="3"/></> : index === 1 ? [65,92,116].map((h,i)=><rect key={h} x={45+i*75} y={125-h} width="38" height={h} rx="5" fill={i===2?'#1F4DCB':'#93c5fd'}/>) : <><path d="M10 110 C70 85 100 95 145 55 S235 40 290 18" fill="none" stroke="#1F4DCB" strokeWidth="4"/><path d="M10 118 C80 108 130 90 190 82 S250 65 290 60" fill="none" stroke="#94a3b8" strokeWidth="3"/></>}</svg></figure>)}</div>;
}

function ResultsPage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore(); const winners = state.ideas.filter((idea) => idea.status === '成功').slice(0, 3);
  const report = `# 模拟实验成果报告\n\n> ⚠️ 全部数值均为模拟结果，未进行真实模型训练，不可作为论文证据。\n\n## 研究题目\n${state.researchTopic}\n\n## 三个最佳创新点\n${winners.map((idea, i) => `${i + 1}. ${idea.name}：${idea.hypothesis}（模拟 ${idea.gain}）`).join('\n')}\n\n## 可复现性说明\n- 当前模式：模拟\n- 是否生成可运行代码：否\n`;
  const download = () => { const url = URL.createObjectURL(new Blob([report], { type: 'text/markdown' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'final_experiment_report_simulated.md'; anchor.click(); URL.revokeObjectURL(url); };
  return <div className="flex flex-col gap-5"><section className="rounded-2xl bg-white/90 p-6"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-semibold text-[#10204A]">成果交付</h2><p className="mt-1 text-sm text-muted-foreground">已筛选 3 个最佳创新点</p></div><SimulatedBadge /></div><div className="mt-5 grid gap-3 lg:grid-cols-3">{winners.map((idea, index) => <article key={idea.id} className="rounded-xl border-l-4 border-[#1F4DCB] bg-blue-50 p-4"><span className="text-xs text-muted-foreground">创新点 {index + 1}</span><h3 className="mt-1 font-semibold">{idea.name}</h3><p className="mt-2 text-sm">{idea.hypothesis}</p><p className="mt-3 text-sm font-semibold text-[#16A36A]">模拟贡献 {idea.gain}</p></article>)}</div></section><MiniCharts /><section className="grid gap-4 lg:grid-cols-2">{['模拟 SOTA 对比表', '模拟消融实验表'].map((title) => <div key={title} className="overflow-hidden rounded-xl bg-white/90 p-4"><h3 className="font-semibold">{title}</h3><table className="mt-3 w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">方法</th><th>模拟 mAP</th><th>FPS</th></tr></thead><tbody><tr><td className="py-2">Baseline</td><td>61.2±0.4</td><td>28</td></tr><tr><td className="py-2 font-medium">完整方法（模拟）</td><td className="font-semibold text-[#1F4DCB]">68.7±0.3</td><td>24</td></tr></tbody></table></div>)}</section><div className="rounded-xl bg-amber-50 p-4 text-sm"><AlertTriangle className="mr-2 inline size-4 text-amber-700" />当前为模拟模式，未执行模型训练，因此不生成或承诺可运行代码。</div><div className="flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={() => go('simulate')}><RotateCcw data-icon="inline-start" />重新模拟</Button><Button onClick={download}><Download data-icon="inline-start" />下载 Markdown</Button></div></div>;
}

export function ExperimentDemo() {
  const pathname = useRouterState({ select: (s) => s.location.pathname }); const navigate = useNavigate();
  const activeStep = (pathname.split('/').at(-1) || 'intake') as ExperimentStep;
  const index = Math.max(0, steps.findIndex((step) => step.id === activeStep));
  const go = (step: ExperimentStep) => void navigate({ to: stepPath(step) });
  const pages = { intake: <IntakePage go={go}/>, plan: <PlanPage go={go}/>, mode: <ModePage go={go}/>, simulate: <ConfigPage go={go}/>, run: <RunPage go={go}/>, results: <ResultsPage go={go}/> };
  return <main className="min-h-0 flex-1 overflow-auto bg-[#A6C7FF] p-4 text-[#10204A] sm:p-6"><div className="mx-auto max-w-7xl"><header className="mb-4 flex items-center justify-between"><div><h1 className="text-2xl font-semibold">实验智能体</h1><p className="text-sm text-[#10204A]/70">从核心文献到可复现方案，一站式模拟实验规划</p></div><Badge className="bg-[#1F4DCB] text-white">Demo · 离线模拟</Badge></header><nav className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-white/70 p-3 lg:grid-cols-6">{steps.map((step, i) => <button key={step.id} onClick={() => i <= index || (i === index + 1) ? go(step.id) : undefined} className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm', i === index ? 'bg-[#1F4DCB] text-white' : i < index ? 'bg-white text-[#1F4DCB]' : 'text-[#10204A]/55')}><span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs">{i < index ? <Check className="size-3"/> : i + 1}</span>{step.label}</button>)}</nav>{pages[activeStep] ?? pages.intake}<footer className="mt-5 flex justify-between">{index > 0 ? <Button variant="outline" onClick={() => go(steps[index - 1].id)}><ChevronLeft data-icon="inline-start" />上一步</Button> : <span/>}{index < steps.length - 1 ? <Button variant="ghost" onClick={() => go(steps[index + 1].id)}>下一步<ChevronRight data-icon="inline-end" /></Button> : null}</footer></div></main>;
}
