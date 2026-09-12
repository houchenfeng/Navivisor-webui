import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Check, ChevronLeft, ChevronRight, Code2, Download, ExternalLink, FileText, FlaskConical, Loader2, Play, RotateCcw, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadWorkspaceDemoButton } from '@/components/research-workflow/load-workspace-demo-button';
import { ExperimentPrimerDialog } from '@/components/research-experiment/experiment-primer-dialog';
import { ArtifactPreviewDialog } from '@/components/research-workflow/artifact-preview-dialog';
import { researchWorkflowClient, type SshExperimentJob } from '@/components/research-workflow/research-workflow-client';
import type { ResearchArtifact } from '@/components/research-workflow/research-workflow-types';
import { cn } from '@/lib/utils';
import { type ExperimentStep, useExperimentStore } from '@/stores/experiment-store';
import { useResearchProjectStore } from '@/stores/research-project-store';
import {
  DEMO_ABLATION_HEADERS,
  DEMO_ABLATION_ROWS,
  DEMO_ARCHITECTURE_MARKDOWN,
  DEMO_COMPARISON_HEADERS,
  DEMO_COMPARISON_ROWS,
  DEMO_PLAN_MARKDOWN,
  DEMO_RESULTS_MARKDOWN,
} from '@/components/research-experiment/demo-artifacts';
import { TerminalWorkspace } from '@/components/terminal/terminal-workspace';
import {
  type ExperimentHydration,
  useExperimentWorkspaceHydration,
} from '@/components/research-experiment/use-experiment-workspace-hydration';

const ExperimentHydrationContext = createContext<ExperimentHydration | null>(null);

function useHydration(): ExperimentHydration {
  return (
    useContext(ExperimentHydrationContext) ?? {
      source: 'offline-fallback',
      loading: false,
      planMarkdown: DEMO_PLAN_MARKDOWN,
      planHeadline: '',
      shortestPath: '',
      protocolNote: '',
      datasetNote: '',
      resultsMarkdown: DEMO_RESULTS_MARKDOWN,
      architectureMarkdown: DEMO_ARCHITECTURE_MARKDOWN,
      configJson: null,
      comparisonHeaders: [...DEMO_COMPARISON_HEADERS],
      comparisonRows: DEMO_COMPARISON_ROWS.map((row) => [...row]),
      ablationHeaders: [...DEMO_ABLATION_HEADERS],
      ablationRows: DEMO_ABLATION_ROWS.map((row) => [...row]),
      comparisonFigureUrl: null,
      architectureFigureUrl: null,
      ideas: [],
      comparisonMethods: [],
      error: null,
    }
  );
}

const steps: Array<{ id: ExperimentStep; label: string }> = [
  { id: 'intake', label: '课题与文献' }, { id: 'plan', label: '方案确认' },
  { id: 'mode', label: '模式选择' }, { id: 'simulate', label: '实验配置' },
  { id: 'run', label: '实验执行' }, { id: 'results', label: '成果交付' },
];

const stepPath = (step: ExperimentStep) => `/research/experiment/${step}` as const;

function RealBadge() {
  return <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800">真实运行</Badge>;
}

const DEMO_TRAIN_STEPS = [80, 160, 240, 320, 400, 480, 560, 640, 720, 800] as const;
const DEMO_TRAIN_EPOCHS = 20;

function demoPad(value: number, width: number) {
  return String(value).padStart(width, '0');
}

function demoFixed(value: number, digits: number) {
  return value.toFixed(digits);
}

function buildDemoRealRunLines() {
  const lines = [
    '[agent] 正在读取实验方案与运行配置…',
    '[agent] 已解析方法：EviVAD / DAA + EAD + DAG',
    '[agent] 正在检查数据集索引、标注文件与输出目录…',
    '[data] train clips=1,610  validation clips=145  workers=8',
    '[model] backbone=ViT-B/16  adapter_rank=4  precision=fp16',
    '[optim] AdamW  lora_lr=1e-4  score_head_lr=5e-4  wd=1e-2  epochs=20  steps/epoch=800',
  ];
  for (let epoch = 1; epoch <= DEMO_TRAIN_EPOCHS; epoch += 1) {
    const progress = (epoch - 1) / (DEMO_TRAIN_EPOCHS - 1);
    const warmup = Math.min(1, epoch / 3);
    const cosine = 0.5 * (1 + Math.cos(Math.PI * progress));
    const lr = 1e-5 + (1e-4 - 1e-5) * warmup * cosine;
    for (const step of DEMO_TRAIN_STEPS) {
      const inner = step / 800;
      const loss = 1.32 - 0.78 * progress - 0.11 * inner + 0.018 * Math.sin(epoch * 1.7 + step / 90);
      const lossScore = loss * 0.66;
      const lossEvidence = loss * 0.23;
      const line =
        `[train] epoch ${demoPad(epoch, 2)}/20  step ${demoPad(step, 4)}/0800  ` +
        `loss=${demoFixed(Math.max(0.41, loss), 4)}  ` +
        `loss_score=${demoFixed(Math.max(0.26, lossScore), 4)}  ` +
        `loss_evidence=${demoFixed(Math.max(0.09, lossEvidence), 4)}  ` +
        (step === 800
          ? `grad_norm=${demoFixed(1.42 - 0.62 * progress, 2)}`
          : `lr=${lr.toExponential(2)}`);
      lines.push(line);
    }
    const auc = 0.768 + 0.051 * progress;
    const ap = 0.682 + 0.058 * progress;
    const ear = 0.415 + 0.248 * progress;
    const hr = 0.264 - 0.152 * progress;
    lines.push(
      `[eval ] epoch ${demoPad(epoch, 2)}/20  val_auc=${demoFixed(auc, 4)}  val_ap=${demoFixed(ap, 4)}  ` +
        `ear=${demoFixed(ear, 4)}  hr=${demoFixed(Math.max(0.09, hr), 4)}  latency=${143 + (epoch % 4)}ms`,
    );
    if (epoch === 1) lines.push('[agent] 验证指标正常，继续执行 DAA 适配阶段。');
    if (epoch === 4) lines.push('[agent] 正在执行证据锚定解码检查：schema 通过，时间区间引用可解析。');
    if (epoch === 8) lines.push('[agent] 退化感知门控测试已排队：low-light / rain-fog / compression / camera-shake。');
    if (epoch === 12) {
      lines.push('[gpu  ] device=0  memory=9.4/24.0GB  utilization=93%  throughput=26.8 clips/s');
    }
    if (epoch === 16) lines.push('[agent] 跨域外测已排队：XD-Violence / UBnormal / MSAD（零微调）。');
  }
  lines.push('[ckpt] 已写出 last.ckpt 与 best_auc.ckpt');
  lines.push('[agent] 训练过程展示持续运行；启动 SSH 后，此区域将切换为服务器实际输出。');
  return lines;
}

const DEMO_REAL_RUN_LINES = buildDemoRealRunLines();

function DemoRealRunTerminal() {
  const [lineCount, setLineCount] = useState(1);
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const timer = window.setInterval(
      () => setLineCount((value) => (value >= DEMO_REAL_RUN_LINES.length ? 1 : value + 1)),
      420,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const output = outputRef.current;
    if (output) output.scrollTop = output.scrollHeight;
  }, [lineCount]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#07101f] text-[#d9e7ff]" aria-label="真实运行训练过程终端">
      <div className="flex shrink-0 items-center justify-between border-b border-[#24344f] bg-[#0d192b] px-3 py-2 font-mono text-xs text-[#9eb8df]">
        <span>真实运行 · 训练过程</span>
        <span className="text-emerald-400">● RUNNING</span>
      </div>
      <pre ref={outputRef} className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-5">
        {DEMO_REAL_RUN_LINES.slice(0, lineCount).join('\n')}
        <span className="animate-pulse text-emerald-300">▌</span>
      </pre>
    </div>
  );
}

function IntakePage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore();
  const [error, setError] = useState('');
  const csvName = state.csvFileName;
  const readCsv = async (file: File) => {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    const required = ['paper_id', 'title', 'abstract', 'pdf_path'];
    const missing = required.filter((key) => !rows.length || !(key in rows[0]));
    if (missing.length) { setError(`缺少必填列：${missing.join('、')}`); return; }
    const ids = rows.map((row) => String(row.paper_id));
    if (new Set(ids).size !== ids.length) { setError('paper_id 必须唯一'); return; }
    const pdfAvailableCount = rows.filter((row) => String(row.pdf_path ?? row.pdf_artifact_ref ?? '').trim()).length;
    setError('');
    state.setFields({ paperCount: rows.length, csvFileName: file.name, pdfAvailableCount });
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
          {csvName ? (
            <>
              <Check className="size-8 text-[#16A36A]" />
              <span className="font-medium text-[#16A36A]">{csvName}</span>
              <span className="text-xs text-muted-foreground">
                已选择 · {state.paperCount} 篇论文 · 点击可更换
              </span>
            </>
          ) : (
            <>
              <Upload className="size-8 text-[#1F4DCB]" />
              <span className="font-medium">点击选择 CSV 文件</span>
              <span className="text-xs text-muted-foreground">必填：paper_id、title、abstract、pdf_path</span>
            </>
          )}
          <input type="file" accept=".csv" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void readCsv(file); }} />
        </label>
        {error ? <p className="text-sm text-[#DC3C4A]">{error}</p> : null}
        <div className="rounded-xl bg-muted/50 p-3 text-center text-sm">
          <strong>{state.paperCount}</strong>
          <span className="ml-1 text-muted-foreground">篇文献，</span>
          <strong>{state.pdfAvailableCount}</strong>
          <span className="ml-1 text-muted-foreground">份 PDF 可用</span>
        </div>
        <div className="mt-auto flex justify-end">
          <Button disabled={!canContinue} onClick={() => go('plan')}>生成实验方案<ChevronRight data-icon="inline-end" /></Button>
        </div>
      </section>
    </div>
  );
}

function LinkedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="break-all text-[#1F4DCB] underline"
          >
            {part}
          </a>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

function PlanPage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore();
  const hydration = useHydration();
  const [selectedIdea, setSelectedIdea] = useState<(typeof state.ideas)[number] | null>(null);
  const fromWorkspace = hydration.source === 'workspace';
  const rawBaseline = (
    hydration.planHeadline ||
    '基线 B0（免训练）：OpenAI CLIP，视觉编码器 ViT-B/16（输入 224×224），文本编码器 CLIP Transformer；视觉/文本塔全部冻结。\n打分流程：帧级图像嵌入与固定英文异常/正常提示做余弦相似度，再经一维时间平滑得到帧级分数。'
  )
    .replace(/^完整方法[^\n]*\n?/, '')
    .replace(/\n主要指标：[\s\S]*$/, '')
    .trim();
  const scoringMarker = '打分流程：';
  const scoringIndex = rawBaseline.indexOf(scoringMarker);
  const baselineBody = (scoringIndex >= 0 ? rawBaseline.slice(0, scoringIndex) : rawBaseline)
    .replace(/^基线\s*/, '')
    .trim();
  const scoringBody = scoringIndex >= 0 ? rawBaseline.slice(scoringIndex + scoringMarker.length).trim() : '';
  const datasetNote =
    hydration.datasetNote ||
    (fromWorkspace
      ? '主数据集为 UCF-Crime：官方划分 1610 个训练视频 / 290 个测试视频，带帧级异常标注，覆盖打架、抢劫、爆炸等 13 类犯罪监控场景。训练只使用训练集更新 DAA 与打分头，主结果在测试集报告。\n跨域验证使用 XD-Violence（多类暴力/异常）、UBnormal（合成异常，检验对非真实数据的迁移）和 MSAD（多场景多类别），三者均为零微调外测。\n退化验证在测试集上注入低光/低对比、雨雾、视频压缩、相机抖动与遮挡，4 类 × 3 强度共 12 种配置。输入为每片段 32 帧、8 fps，帧 resize 至 224×224；解释类指标在测试集抽样的 800 个片段上评测。'
      : '');
  const comparisonMethods = hydration.comparisonMethods.length
    ? hydration.comparisonMethods
    : [
        '深度自编码器重建式监控视频异常检测（2023），卷积自编码器骨干',
        '弱监督片段级卷积–Transformer 检测（Sensors, 2023），I3D / ViT 片段特征',
        'CLIP-TSA：OpenAI CLIP ViT-B/16 视觉特征 + 时间自注意力（Joo 等, ICIP 2023）',
        'LAVAD：BLIP 类图像描述模型 + 大语言模型时序打分（Zanella 等, CVPR 2024）',
        'VadCLIP：CLIP ViT-B/16 视觉语言弱监督视频异常检测（Wu 等, AAAI 2024）',
        'Open-Vocabulary Video Anomaly Detection（Wu 等, CVPR 2024）',
        'RAG4VAD：检索增强生成的免训练可解释检测（Sun 等, 2026）',
      ];
  const protocolNote = fromWorkspace
    ? hydration.protocolNote ||
      '公开犯罪监控数据为主评测，跨域集合作补充；统一片段长度、随机种子与检测、解释、退化可靠性指标。'
    : '公开裂缝数据集固定划分为主，外部测试集只作零微调评估；统一输入尺寸、随机种子和同一推理计时协议。';
  const dialogProtocol = fromWorkspace
    ? protocolNote
    : '公开裂缝数据集固定划分为主，外部测试集只作零微调评估；输入、增强、轮数、种子和评测代码严格固定，禁止针对测试集调参。';
  return <div className="flex flex-col gap-5">
    <section className="rounded-2xl bg-white/90 p-6">
      <h2 className="text-xl font-semibold text-[#10204A]">实验方案确认</h2>
      <p className="mt-2 text-sm text-muted-foreground">核对基线、对比算法与各创新点后，再确认方案。</p>
      <div className="mt-4 grid gap-3">
        <div className="rounded-xl bg-blue-50 p-4 text-sm leading-6">
          <strong>基线算法</strong>
          <p className="mt-2 leading-6">
            <strong>基线 Baseline：</strong>
            {baselineBody}
          </p>
          {scoringBody ? (
            <p className="mt-3 leading-6">
              <strong>打分流程：</strong>
              {scoringBody}
            </p>
          ) : null}
          <p className="mt-3 leading-6">
            <strong>主要指标：</strong>
            AUC（Area Under the ROC Curve，ROC 曲线下面积）以帧为样本、异常分数为判据，表示随机抽取一正一负帧时正样本分数更高的概率，衡量检测精度，越高越好。
            EAR（Evidence Attribution Recall，证据归因召回）定义为预测证据集合与人工标注的最小充分证据集的交集占比，衡量解释是否对准了真正支撑异常判定的时空片段，越高越好。
          </p>
          {datasetNote ? (
            <p className="mt-3 whitespace-pre-wrap leading-6">
              <strong>数据集：</strong>
              {datasetNote}
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-blue-200 bg-white p-4 text-sm leading-6">
          <strong>对比算法</strong>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {comparisonMethods.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{state.ideas.map((idea) => <button type="button" key={idea.id} onClick={() => setSelectedIdea(idea)} className="rounded-xl border bg-white p-4 text-left transition hover:border-[#1F4DCB] hover:shadow-md"><div className="flex items-center justify-between"><Badge variant="secondary">{idea.layer}</Badge><span className="text-sm font-semibold text-[#16A36A]">预计 {idea.gain}</span></div><h3 className="mt-3 font-semibold">{idea.id} · {idea.name}</h3><p className="mt-1 text-sm text-muted-foreground">{idea.summary}</p><div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm"><strong>具体修改：</strong>{idea.modification}</div><span className="mt-3 flex items-center gap-1 text-xs font-medium text-[#1F4DCB]">查看完整实验方案<ExternalLink className="size-3" /></span></button>)}</div>
    </section>
    <div className="flex justify-end"><Button onClick={() => { state.setFields({ planConfirmed: true }); go('mode'); }}><Check data-icon="inline-start" />确认方案</Button></div>
    <Dialog open={Boolean(selectedIdea)} onOpenChange={(open) => { if (!open) setSelectedIdea(null); }}><DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">{selectedIdea ? <><DialogHeader><DialogTitle className="pr-8 text-xl">{selectedIdea.id} · {selectedIdea.name}</DialogTitle><DialogDescription>{selectedIdea.summary}</DialogDescription></DialogHeader><div className="flex flex-col gap-5"><section><h3 className="font-semibold text-[#1F4DCB]">0. 统一数据集与协议</h3><p className="mt-2 text-sm">{dialogProtocol}</p></section><section><h3 className="font-semibold text-[#1F4DCB]">1. 步骤定位</h3><p className="mt-2">{selectedIdea.stepLocation}</p><p className="mt-2 text-sm text-muted-foreground"><strong>原始假设：</strong>{selectedIdea.hypothesis}</p></section><section><h3 className="font-semibold text-[#1F4DCB]">2. 优化目标</h3><p className="mt-2">{selectedIdea.optimizationGoal}</p></section><section><h3 className="font-semibold text-[#1F4DCB]">3. 主方案</h3><ol className="mt-2 flex list-decimal flex-col gap-2 pl-5">{selectedIdea.mainPlan.map((item) => <li key={item}>{item}</li>)}</ol></section><section><h3 className="font-semibold text-[#1F4DCB]">4. 备选战略与权衡</h3><div className="mt-2 grid gap-3">{selectedIdea.alternatives.map((alternative) => <div key={alternative.name} className="rounded-xl border p-3"><h4 className="font-medium">{alternative.name}</h4><p className="mt-1 text-sm">{alternative.approach}</p><p className="mt-2 text-sm text-[#16A36A]"><strong>优点：</strong>{alternative.pros}</p><p className="mt-1 text-sm text-[#DC3C4A]"><strong>缺点：</strong>{alternative.cons}</p></div>)}</div></section><section><h3 className="font-semibold text-[#1F4DCB]">5. 战略选择建议</h3><p className="mt-2">{selectedIdea.recommendation}</p></section><section><h3 className="font-semibold text-[#1F4DCB]">6. 对资源清单的影响</h3><ul className="mt-2 list-disc pl-5">{selectedIdea.resources.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3 className="font-semibold text-[#1F4DCB]">7. 验证与检查点（Go / No-Go）</h3><ul className="mt-2 flex list-disc flex-col gap-2 pl-5">{selectedIdea.goNoGo.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="rounded-xl bg-amber-50 p-4"><h3 className="font-semibold">知识库引用与核实要求</h3><ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-sm">{selectedIdea.references.map((item) => <li key={item}><LinkedText text={item} /></li>)}</ul></section></div></> : null}</DialogContent></Dialog>
  </div>;
}

function ModePage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore();
  const selected = state.runMode;
  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="text-2xl font-semibold text-[#10204A]">选择运行模式</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => state.setFields({ runMode: 'simulated' })}
          className={cn(
            'rounded-2xl border-2 bg-white p-6 text-left shadow-sm transition',
            selected === 'simulated' ? 'border-[#1F4DCB]' : 'border-transparent hover:border-[#1F4DCB]/40',
          )}
        >
          <FlaskConical className="size-8 text-[#1F4DCB]" />
          <h3 className="mt-4 text-lg font-semibold">模拟运行</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            按已确认方案整理实验结果。
          </p>
        </button>
        <button
          type="button"
          onClick={() => state.setFields({ runMode: 'real' })}
          className={cn(
            'rounded-2xl border-2 bg-white p-6 text-left shadow-sm transition',
            selected === 'real' ? 'border-[#1F4DCB]' : 'border-transparent hover:border-[#1F4DCB]/40',
          )}
        >
          <Play className="size-8 text-[#1F4DCB]" />
          <h3 className="mt-4 text-lg font-semibold">真实运行</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            填写本机或 SSH 算力配置；SSH 模式会上传运行脚本，并在实验终端同步展示命令与反馈。
          </p>
        </button>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={() => go('simulate')}>
          继续配置
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function ConfigPage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore();
  if (state.runMode === 'real') {
    return <RealRuntimeConfigPage go={go} />;
  }
  return (
    <div className="mx-auto max-w-3xl rounded-2xl bg-white/90 p-6">
      <div className="flex items-center gap-3">
      <h2 className="text-xl font-semibold">实验配置</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">沿用随机种子与重复次数等实验参数。</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium">
          随机种子
          <Input type="number" value={state.seed} onChange={(e) => state.setFields({ seed: Number(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          重复次数
          <Input
            type="number"
            min={1}
            max={10}
            value={state.repeatCount}
            onChange={(e) => state.setFields({ repeatCount: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          提升幅度
          <Input value="Baseline -2% ～ +8%" disabled />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          失败方案
          <Input value="允许 1–2 个 Idea 失败" disabled />
        </label>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={() => go('run')}>
          <Play data-icon="inline-start" />
          开始实验
        </Button>
      </div>
    </div>
  );
}

function RealRuntimeConfigPage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore();
  const rootPath = useResearchProjectStore((s) => s.project?.rootPath ?? '');
  const runtime = state.realRuntime;
  const setFields = state.setFields;
  const patch = (fields: Partial<typeof runtime>) =>
    setFields({ realRuntime: { ...runtime, ...fields } });

  useEffect(() => {
    if (!rootPath) return;
    const root = rootPath.replace(/[\\/]+$/, '');
    const next: Partial<typeof runtime> = {};
    if (runtime.codeDir === './experiment/code') next.codeDir = `${root}/experiment/code`;
    if (runtime.dataDir === './experiment/datasets') next.dataDir = `${root}/experiment/datasets`;
    if (runtime.resultsDir === './experiment/results') next.resultsDir = `${root}/experiment/results`;
    if (Object.keys(next).length) {
      setFields({ realRuntime: { ...runtime, ...next } });
    }
  }, [rootPath, runtime, setFields]);

  const canContinue =
    Boolean(runtime.codeDir.trim() && runtime.dataDir.trim() && runtime.resultsDir.trim() && runtime.documentDir?.trim() && runtime.condaEnv?.trim()) &&
    runtime.target === 'ssh' &&
    Boolean(runtime.sshHost.trim() && runtime.sshUser.trim() && runtime.sshPort.trim() && state.sshPassword);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <section className="rounded-2xl bg-white/90 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">实验配置</h2>
          <RealBadge />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          选择 SSH 远端并确认算力与工作目录。密码仅用于本次连接，不写入浏览器持久化状态或论文目录。
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            disabled
            className={cn(
              'rounded-xl border-2 p-4 text-left',
              runtime.target === 'local' ? 'border-[#1F4DCB] bg-blue-50/60' : 'border-[#e4eefc]',
            )}
          >
            <h3 className="font-semibold">本地运行</h3>
            <p className="mt-1 text-sm text-muted-foreground">本机执行适配器尚未开放；本次使用 SSH runner。</p>
          </button>
          <button
            type="button"
            onClick={() => patch({ target: 'ssh', sshHost: runtime.sshHost || '10.61.48.10', sshUser: runtime.sshUser || 'hcf', codeDir: '/home/hcf/test-code', dataDir: '/home/hcf/nas_hcf_data/test-data/data', resultsDir: '/home/hcf/nas_hcf_data/test-data/results', documentDir: '/home/hcf/nas_hcf_data/test-data/documents', condaEnv: 'yolo26' })}
            className={cn(
              'rounded-xl border-2 p-4 text-left',
              runtime.target === 'ssh' ? 'border-[#1F4DCB] bg-blue-50/60' : 'border-[#e4eefc]',
            )}
          >
            <h3 className="font-semibold">链接 SSH 服务器</h3>
            <p className="mt-1 text-sm text-muted-foreground">填写主机、端口与用户，在远端执行实验。</p>
          </button>
        </div>

        {runtime.target === 'ssh' ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
              SSH 主机
              <Input
                value={runtime.sshHost}
                onChange={(e) => patch({ sshHost: e.target.value })}
                placeholder="例如 gpu.lab.example.edu"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              端口
              <Input value={runtime.sshPort} onChange={(e) => patch({ sshPort: e.target.value })} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-3">
              用户名
              <Input
                value={runtime.sshUser}
                onChange={(e) => patch({ sshUser: e.target.value })}
                placeholder="例如 researcher"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-3">
              密码（仅本次会话）
              <Input type="password" autoComplete="new-password" value={state.sshPassword} onChange={(e) => state.setFields({ sshPassword: e.target.value })} />
            </label>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-white/90 p-6">
        <h3 className="font-semibold text-[#10204A]">服务器配置</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium">
            CPU 核数
            <Input value={runtime.cpuCores} onChange={(e) => patch({ cpuCores: e.target.value })} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            GPU 数量
            <Input value={runtime.gpuCount} onChange={(e) => patch({ gpuCount: e.target.value })} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            GPU 型号
            <Input value={runtime.gpuModel} onChange={(e) => patch({ gpuModel: e.target.value })} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            内存 (GB)
            <Input value={runtime.memoryGb} onChange={(e) => patch({ memoryGb: e.target.value })} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            硬盘 (GB)
            <Input value={runtime.diskGb} onChange={(e) => patch({ diskGb: e.target.value })} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            使用的 GPU 编号
            <Input
              value={runtime.selectedGpus}
              onChange={(e) => patch({ selectedGpus: e.target.value })}
              placeholder="例如 0 或 0,1"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            文档目录
            <Input value={runtime.documentDir ?? ''} onChange={(e) => patch({ documentDir: e.target.value })} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Conda 环境
            <Input value={runtime.condaEnv ?? ''} onChange={(e) => patch({ condaEnv: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl bg-white/90 p-6">
        <h3 className="font-semibold text-[#10204A]">工作目录</h3>
        <div className="mt-4 grid gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            代码目录
            <Input
              value={runtime.codeDir}
              onChange={(e) => patch({ codeDir: e.target.value })}
              placeholder="代码所在文件夹"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            数据集目录
            <Input
              value={runtime.dataDir}
              onChange={(e) => patch({ dataDir: e.target.value })}
              placeholder="数据集存放文件夹"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            结果目录
            <Input
              value={runtime.resultsDir}
              onChange={(e) => patch({ resultsDir: e.target.value })}
              placeholder="日志、指标与产物输出文件夹"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl bg-white/90 p-6">
        <h3 className="font-semibold text-[#10204A]">可选 API</h3>
        <p className="mt-1 text-sm text-muted-foreground">不需要可留空；密钥不会写入论文目录。</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            API Endpoint
            <Input
              value={runtime.apiEndpoint}
              onChange={(e) => patch({ apiEndpoint: e.target.value })}
              placeholder="例如实验平台或数据服务地址"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            API Key 备注（勿填真实密钥）
            <Input
              value={runtime.apiKeyHint}
              onChange={(e) => patch({ apiKeyHint: e.target.value })}
              placeholder="例如：使用本机环境变量中的服务凭证"
            />
          </label>
        </div>
      </section>

      <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
        SSH runner 会自动选择首个低占用 GPU；没有空闲 GPU 时回退 CPU。
      </div>

      <div className="flex justify-end">
        <Button disabled={!canContinue} onClick={() => go('run')}>
          <Play data-icon="inline-start" />
          确认配置并进入执行
        </Button>
      </div>
    </div>
  );
}

function RunPage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore();
  const hydration = useHydration();
  const projectId = useResearchProjectStore((s) => s.project?.projectId);
  const rootPath = useResearchProjectStore((s) => s.project?.rootPath ?? '');
  const demoLoaded = useResearchProjectStore((s) => s.project?.demoComplete != null);
  const isReal = state.runMode === 'real';
  const [progress, setProgress] = useState(state.completed ? 100 : 0);
  const [sshJob, setSshJob] = useState<SshExperimentJob | null>(null);
  const [sshError, setSshError] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<ResearchArtifact | null>(null);
  const setFields = state.setFields;
  const ideas = hydration.ideas.length > 0 ? hydration.ideas : state.ideas;
  useEffect(() => {
    if (isReal) return;
    if (progress >= 100) return;
    const timer = window.setInterval(() => setProgress((v) => Math.min(100, v + 10)), 280);
    return () => window.clearInterval(timer);
  }, [progress, isReal]);
  useEffect(() => {
    if (!isReal && progress === 100) setFields({ completed: true });
  }, [progress, isReal, setFields]);
  useEffect(() => {
    if (!sshJob || ['completed', 'failed'].includes(sshJob.status)) return;
    const timer = window.setInterval(() => {
      void researchWorkflowClient.getSshExperiment(sshJob.jobId).then((job) => {
        setSshJob(job);
        if (job.status === 'completed') setFields({ completed: true, sshPassword: '' });
        if (job.status === 'failed') setFields({ sshPassword: '' });
      }).catch((error) => setSshError(error instanceof Error ? error.message : String(error)));
    }, 2000);
    return () => window.clearInterval(timer);
  }, [sshJob, setFields]);

  if (isReal) {
    const runtime = state.realRuntime;
    const terminalContext = 'global';
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <section className="rounded-2xl bg-white/90 p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">真实运行 · 配置已确认</h2>
            <RealBadge />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            下方终端可查看 SSH 会话与命令输出；启动后任务状态会同步到本页。
          </p>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-muted/60 p-3">
              <dt className="font-semibold">目标</dt>
              <dd className="mt-1 text-muted-foreground">
                {runtime.target === 'local'
                  ? '本地运行'
                  : `SSH ${runtime.sshUser}@${runtime.sshHost}:${runtime.sshPort}`}
              </dd>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <dt className="font-semibold">算力</dt>
              <dd className="mt-1 text-muted-foreground">
                CPU {runtime.cpuCores} · GPU {runtime.gpuCount}×{runtime.gpuModel} · 选用 {runtime.selectedGpus}
              </dd>
            </div>
            <div className="rounded-xl bg-muted/60 p-3 sm:col-span-2">
              <dt className="font-semibold">目录</dt>
              <dd className="mt-1 space-y-1 text-muted-foreground">
                <p>代码：{runtime.codeDir}</p>
                <p>数据：{runtime.dataDir}</p>
                <p>结果：{runtime.resultsDir}</p>
                <p>文档：{runtime.documentDir}</p>
              </dd>
            </div>
          </dl>
          {sshError ? (
            <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{sshError}</div>
          ) : sshJob ? (
            <p className="mt-4 text-sm text-muted-foreground">{sshJob.message}</p>
          ) : null}
          <div className="mt-5 h-[420px] overflow-hidden rounded-xl border border-[#d8e5f6]">
            {sshJob ? (
              <div className="flex h-full min-h-0 flex-col bg-[#07101f] text-[#d9e7ff]" aria-label="SSH 运行终端">
                <div className="shrink-0 border-b border-[#24344f] bg-[#0d192b] px-3 py-2 font-mono text-xs text-[#9eb8df]">
                  SSH · {runtime.sshUser}@{runtime.sshHost}:{runtime.sshPort} · {sshJob.status}
                </div>
                <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-5">
                  {(sshJob.transcript ?? []).join('\n\n') || '等待 SSH 输出…'}
                </pre>
              </div>
            ) : demoLoaded ? (
              <DemoRealRunTerminal key={projectId ?? 'demo'} />
            ) : (
              <TerminalWorkspace contextKey={terminalContext} cwd={rootPath || undefined} />
            )}
          </div>
          {sshJob?.artifacts?.length ? <div className="mt-4 space-y-2">{sshJob.artifacts.map((artifact) => <button type="button" className="block text-sm text-blue-700 underline" key={artifact.artifactId} onClick={() => setSelectedArtifact(artifact)}>{artifact.name}（打开）</button>)}</div> : null}
          <div className="mt-6 flex justify-end gap-3">
            <Button
              disabled={!projectId || !state.sshPassword || Boolean(sshJob && !['completed', 'failed'].includes(sshJob.status)) || runtime.target !== 'ssh'}
              onClick={() => { if (!projectId) return; setSshError(null); void researchWorkflowClient.startSshExperiment({projectId,host:runtime.sshHost,port:Number(runtime.sshPort),username:runtime.sshUser,password:state.sshPassword,codeDir:runtime.codeDir,dataDir:runtime.dataDir,resultsDir:runtime.resultsDir,documentDir:runtime.documentDir,condaEnv:runtime.condaEnv,experimentDocument:state.experimentDocument}).then(setSshJob).catch((error) => setSshError(error instanceof Error ? error.message : String(error))); }}
            >
              {sshJob?.status === 'failed' ? '失败重试' : '启动真实运行'}
              <Play data-icon="inline-start" />
            </Button>
            <Button variant="outline" disabled={sshJob?.status !== 'completed'} onClick={() => go('results')}>
              查看成果
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </section>
        {selectedArtifact && projectId ? <ArtifactPreviewDialog projectId={projectId} artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-white/90 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">实验执行</h2>
          </div>
          <strong>{progress}%</strong>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
          <div className="h-full bg-[#1F4DCB] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          正在载入实验方案与指标变化。
        </p>
      </div>
      {hydration.planMarkdown ? (
        <section className="rounded-2xl bg-white/90 p-6">
          <h3 className="font-semibold text-[#10204A]">Demo 实验方案</h3>
          <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-4 text-sm leading-6">{hydration.planMarkdown}</pre>
        </section>
      ) : null}
      <section className="overflow-x-auto rounded-2xl bg-white/90 p-5">
        <h3 className="font-semibold">主实验指标变化</h3>
        <table className="mt-3 w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b text-left">
              {hydration.comparisonHeaders.map((head) => <th key={head} className="p-2">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {hydration.comparisonRows.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`} className="border-b last:border-0">
                {row.map((cell, index) => (
                  <td key={`${rowIndex}-${index}`} className={cn('p-2', index === 0 && 'whitespace-nowrap')}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="grid gap-3 lg:grid-cols-2">
        {ideas.map((idea, index) => {
          const visible = progress >= (index + 1) * 12;
          return (
            <article key={idea.id} className="rounded-xl bg-white/90 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{idea.name}</h3>
                {visible ? (
                  <Badge variant={idea.status === '成功' ? 'default' : 'secondary'}>
                    {idea.status}
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <Loader2 className="animate-spin" />
                    等待
                  </Badge>
                )}
              </div>
              {visible ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {idea.summary}
                  <span className="mt-1 block font-semibold text-[#16A36A]">预计变化 {idea.gain}</span>
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
      {progress === 100 ? (
        <div className="flex justify-end">
          <Button onClick={() => go('results')}>
            查看成果
            <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function downloadMarkdown(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

function ArchitectureFigure() {
  const boxes = [['采样\n32帧', 8, '#e0f2fe'], ['冻结 VLM', 102, '#dbeafe'], ['DAA\nLoRA', 196, '#bfdbfe'], ['EAD\n证据', 290, '#93c5fd'], ['DAG\n门控', 384, '#1F4DCB']];
  return <figure className="rounded-2xl bg-white/90 p-5"><div className="flex items-center justify-between"><div><figcaption className="font-semibold">算法架构 · EviVAD</figcaption><p className="mt-1 text-xs text-muted-foreground">采样 → 冻结视觉塔 → DAA / EAD / DAG</p></div></div><svg viewBox="0 0 480 145" className="mt-4 w-full" role="img" aria-label="EviVAD 算法架构图">{boxes.map(([label, x, fill], index) => <g key={label}>{index > 0 ? <path d={`M${Number(x)-17} 65h15`} stroke="#1F4DCB" strokeWidth="2" markerEnd="url(#arrow)" /> : null}<rect x={Number(x)} y="35" width="78" height="62" rx="10" fill={String(fill)} stroke="#1F4DCB"/><text x={Number(x)+39} y="59" textAnchor="middle" fontSize="10" fill={index === 4 ? 'white' : '#10204A'}>{String(label).split('\n').map((line, i) => <tspan key={line} x={Number(x)+39} dy={i ? 15 : 0}>{line}</tspan>)}</text></g>)}<defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#1F4DCB"/></marker></defs><text x="240" y="125" textAnchor="middle" fontSize="10" fill="#64748b">clip → frozen VLM → DAA → EAD → DAG → (score, interval, evidence)</text></svg></figure>;
}

function QualitativeFigure() {
  const panels = [
    { name: '输入片段', bg: '#9ca3af', lines: ['M8 75 C40 48 78 82 112 24', 'M55 110 C68 88 90 82 112 70'] },
    { name: 'Ground Truth', bg: '#111827', lines: ['M8 75 C40 48 78 82 112 24', 'M55 110 C68 88 90 82 112 70'] },
    { name: 'Training-free-LLM', bg: '#111827', lines: ['M8 76 C40 51 68 81 82 60', 'M61 108 C72 91 86 84 101 76'] },
    { name: 'Baseline B0', bg: '#111827', lines: ['M8 75 C30 58 45 55 57 61', 'M70 72 C86 73 98 49 112 24'] },
    { name: 'EviVAD', bg: '#111827', lines: ['M8 75 C40 48 78 82 112 24', 'M55 110 C68 88 90 82 112 70'] },
  ];
  return <figure className="rounded-2xl bg-white/90 p-5"><div className="flex items-center justify-between"><div><figcaption className="font-semibold">定性效果图 · 与对比方法同图对照</figcaption><p className="mt-1 text-xs text-muted-foreground">异常区间与证据引用对照</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">{panels.map((panel, index) => <div key={panel.name}><svg viewBox="0 0 120 120" className="w-full rounded-lg" role="img" aria-label={`${panel.name} 效果示意`}><rect width="120" height="120" fill={panel.bg}/>{panel.lines.map((line) => <path key={line} d={line} fill="none" stroke={index === 0 ? '#374151' : index === 4 ? '#67e8f9' : 'white'} strokeWidth={index === 2 ? 6 : 3} strokeLinecap="round"/>) }{index === 0 ? <><path d="M0 22H120M0 98H120" stroke="#d1d5db" strokeWidth="3"/><circle cx="32" cy="32" r="9" fill="#6b7280"/></> : null}</svg><p className="mt-1 text-center text-xs font-medium">{panel.name}</p></div>)}</div></figure>;
}

function ResultsPage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore();
  const isUnexecutedRealRun = state.runMode === 'real' && !state.completed;
  const hydration = useHydration();
  const winners = state.ideas.filter((idea) => idea.status === '成功').slice(0, 3);
  const [document, setDocument] = useState<'architecture' | 'results' | null>(null);
  const architectureDocument = hydration.architectureMarkdown;
  const resultsDocument = hydration.resultsMarkdown;
  const comparisonRows = hydration.comparisonRows;
  const ablationRows = hydration.ablationRows;
  const comparisonHeaders = hydration.comparisonHeaders;
  const ablationHeaders = hydration.ablationHeaders;
  const activeDocument = document === 'architecture' ? architectureDocument : resultsDocument;
  const fromWorkspace = hydration.source === 'workspace';
  return <div className="flex flex-col gap-5">
    <section className="rounded-2xl bg-white/90 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-semibold text-[#10204A]">{isUnexecutedRealRun ? '成果模板' : '成果交付'}</h2><p className="mt-1 text-sm text-muted-foreground">{isUnexecutedRealRun ? '正在整理交付结构与实验结果。' : fromWorkspace ? '已优先展示工作目录 experiment-results / 指标表 / 图。' : '算法、协议、主实验、消融、资源和效果图。'}</p></div></div><div className="mt-5 grid gap-3 lg:grid-cols-3">{winners.map((idea, index) => <article key={idea.id} className="rounded-xl border-l-4 border-[#1F4DCB] bg-blue-50 p-4"><span className="text-xs text-muted-foreground">创新点 {index + 1}</span><h3 className="mt-1 font-semibold">{idea.name}</h3><p className="mt-2 text-sm">{idea.hypothesis}</p><p className="mt-3 text-sm font-semibold text-[#16A36A]">贡献 {idea.gain}</p></article>)}</div></section>
    <section className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border-2 border-[#1F4DCB] bg-white p-5"><Code2 className="text-[#1F4DCB]"/><h3 className="mt-3 text-lg font-semibold">算法完整详细架构</h3><p className="mt-2 text-sm text-muted-foreground">含数学定义、张量尺寸、DAA / EAD / DAG、损失函数、训练推理逻辑与失败处理。</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => setDocument('architecture')}><ExternalLink data-icon="inline-start"/>打开架构 Markdown</Button><Button variant="outline" onClick={() => downloadMarkdown(architectureDocument, '算法架构.md')}><Download data-icon="inline-start"/>下载</Button></div></article><article className="rounded-2xl border bg-white p-5"><FileText className="text-[#1F4DCB]"/><h3 className="mt-3 text-lg font-semibold">完整实验结果文件</h3><p className="mt-2 text-sm text-muted-foreground">含数据划分、三个随机种子、超参数、GPU/CPU 环境、主实验、跨数据集、消融、敏感性和效率分析。</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => setDocument('results')}><ExternalLink data-icon="inline-start"/>打开结果 Markdown</Button><Button variant="outline" onClick={() => downloadMarkdown(resultsDocument, '实验结果.md')}><Download data-icon="inline-start"/>下载</Button></div></article></section>
    {hydration.architectureFigureUrl ? (
      <figure className="rounded-2xl bg-white/90 p-5">
        <figcaption className="font-semibold">架构图</figcaption>
        <img src={hydration.architectureFigureUrl} alt="architecture figure" className="mt-3 max-h-80 w-full object-contain" />
      </figure>
    ) : (
      <ArchitectureFigure />
    )}
    <section className="rounded-2xl bg-white/90 p-5"><h3 className="font-semibold">统一实验设置与计算资源</h3><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">{[['数据集','UCF-Crime 主评测；XD-Violence / UBnormal / MSAD 跨域'],['训练','20 epoch · 32帧/8fps · seeds 42/3407/2026'],['优化','AdamW · LoRA 1e-4 · 打分头 5e-4 · WD 1e-2'],['环境','RTX 4090 24GB · i9-13900K · RAM 64GB · PyTorch 2.2']].map(([label,value]) => <div key={label} className="rounded-xl bg-muted/60 p-3"><strong>{label}</strong><p className="mt-1 text-muted-foreground">{value}</p></div>)}</div></section>
    <section className="overflow-x-auto rounded-2xl bg-white/90 p-5"><h3 className="font-semibold">主实验结果</h3><p className="mt-1 text-xs text-muted-foreground">{fromWorkspace ? '优先来自工作目录 metrics/main.csv（若已登记为 artifact）' : 'mean±std，3 seeds；↑ 越高越好，延迟越低越好'}</p><table className="mt-3 w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left">{comparisonHeaders.map((head) => <th key={head} className="p-2">{head}</th>)}</tr></thead><tbody>{comparisonRows.map((row, rowIndex) => <tr key={`${row[0]}-${rowIndex}`} className="border-b last:border-0">{row.map((cell,index) => <td key={`${rowIndex}-${index}`} className={cn('p-2', index === 0 && 'whitespace-nowrap')}>{cell}</td>)}</tr>)}</tbody></table></section>
    <section className="overflow-x-auto rounded-2xl bg-white/90 p-5"><h3 className="font-semibold">模块消融实验</h3><p className="mt-1 text-xs text-muted-foreground">{fromWorkspace ? '优先来自工作目录 metrics/ablation.csv' : 'DAA：低秩领域适配；EAD：证据锚定解码；DAG：退化感知门控'}</p><table className="mt-3 w-full min-w-[680px] text-sm"><thead><tr className="border-b">{ablationHeaders.map((head) => <th key={head} className="p-2">{head}</th>)}</tr></thead><tbody>{ablationRows.map((row,index) => <tr key={index} className="border-b text-center last:border-0">{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} className={cn('p-2', index === ablationRows.length - 1 && 'font-semibold text-[#1F4DCB]')}>{cell}</td>)}</tr>)}</tbody></table></section>
    {hydration.comparisonFigureUrl ? (
      <figure className="rounded-2xl bg-white/90 p-5">
        <figcaption className="font-semibold">对比图</figcaption>
        <img src={hydration.comparisonFigureUrl} alt="comparison figure" className="mt-3 max-h-80 w-full object-contain" />
      </figure>
    ) : (
      <QualitativeFigure />
    )}
    <div className="flex flex-wrap justify-between gap-3">
      <Button variant="outline" onClick={() => go('simulate')}>
        <RotateCcw data-icon="inline-start" />
        重新配置
      </Button>
      <Button onClick={() => downloadMarkdown(resultsDocument, '实验结果_完整交付.md')}>
        <Download data-icon="inline-start" />
        下载完整结果
      </Button>
    </div>
    <Dialog open={document !== null} onOpenChange={(open) => { if (!open) setDocument(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>{document === 'architecture' ? '算法完整详细架构.md' : '实验结果报告.md'}</DialogTitle><DialogDescription>论文级 Demo 交付文件，可浏览或下载保存。</DialogDescription></DialogHeader><pre className="whitespace-pre-wrap rounded-xl bg-muted p-5 font-sans text-sm leading-7">{activeDocument}</pre></DialogContent></Dialog>
  </div>;
}

export function ExperimentDemo() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const hydration = useExperimentWorkspaceHydration();
  const experiment = useExperimentStore();
  const activeStep = (pathname.split('/').at(-1) || 'intake') as ExperimentStep;
  const index = Math.max(0, steps.findIndex((step) => step.id === activeStep));
  const go = (step: ExperimentStep) => void navigate({ to: stepPath(step) });
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const reset = () => {
      mainRef.current?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
    };
    reset();
    const frame = window.requestAnimationFrame(reset);
    return () => window.cancelAnimationFrame(frame);
  }, [activeStep]);
  const canAdvance =
    activeStep === 'intake'
      ? Boolean(experiment.projectName.trim() && experiment.researchTopic.trim() && experiment.paperCount > 0)
      : activeStep === 'plan'
        ? experiment.planConfirmed
        : activeStep === 'mode'
          ? true
          : activeStep === 'simulate'
            ? experiment.runMode === 'simulated' || Boolean(experiment.realRuntime.codeDir.trim() && experiment.realRuntime.dataDir.trim() && experiment.realRuntime.resultsDir.trim() && (experiment.realRuntime.target === 'local' || (experiment.realRuntime.sshHost.trim() && experiment.realRuntime.sshUser.trim() && experiment.realRuntime.sshPort.trim())))
            : activeStep === 'run'
              ? experiment.runMode === 'real' || experiment.completed
              : false;
  const pages = {
    intake: <IntakePage go={go} />,
    plan: <PlanPage go={go} />,
    mode: <ModePage go={go} />,
    simulate: <ConfigPage go={go} />,
    run: <RunPage go={go} />,
    results: <ResultsPage go={go} />,
  };
  return (
    <ExperimentHydrationContext.Provider value={hydration}>
      <main ref={mainRef} className="navivisor-module scrollbar-hide min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 text-[#10204A] [overflow-anchor:none] sm:p-6">
        <div className="mx-auto max-w-7xl">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">实验智能体</h1>
              <p className="text-sm text-[#10204A]/70">
                从核心文献到可复现方案再到完整自主运行实验
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LoadWorkspaceDemoButton compact />
              <ExperimentPrimerDialog />
              {experiment.runMode === 'real' ? (
                <Badge className="bg-[#1F4DCB] text-white">真实目标配置 · SSH runner</Badge>
              ) : null}
            </div>
          </header>
          <nav className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-white/70 p-3 lg:grid-cols-6">
            {steps.map((step, i) => (
              <button
                key={step.id}
                disabled={i > index && (i !== index + 1 || !canAdvance)}
                onClick={() => (i <= index || (i === index + 1 && canAdvance) ? go(step.id) : undefined)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm',
                  i === index
                    ? 'bg-[#1F4DCB] text-white'
                    : i < index
                      ? 'bg-white text-[#1F4DCB]'
                      : 'text-[#10204A]/55',
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs">
                  {i < index ? <Check className="size-3" /> : i + 1}
                </span>
                {step.label}
              </button>
            ))}
          </nav>
          {pages[activeStep] ?? pages.intake}
          <footer className="mt-5 flex justify-between">
            {index > 0 ? (
              <Button variant="outline" onClick={() => go(steps[index - 1].id)}>
                <ChevronLeft data-icon="inline-start" />
                上一步
              </Button>
            ) : (
              <span />
            )}
            {index < steps.length - 1 ? (
              <Button variant="ghost" disabled={!canAdvance} onClick={() => go(steps[index + 1].id)}>
                下一步
                <ChevronRight data-icon="inline-end" />
              </Button>
            ) : (
              <Button onClick={() => void navigate({ to: '/research/paper' })}>
                进入写作模块
                <ChevronRight data-icon="inline-end" />
              </Button>
            )}
          </footer>
        </div>
      </main>
    </ExperimentHydrationContext.Provider>
  );
}
