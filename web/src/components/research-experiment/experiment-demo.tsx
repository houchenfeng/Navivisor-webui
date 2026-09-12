import { useEffect, useState, createContext, useContext } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Code2, Database, Download, ExternalLink, FileText, FlaskConical, Loader2, Play, RotateCcw, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadWorkspaceDemoButton } from '@/components/research-workflow/load-workspace-demo-button';
import { CurrentPaperCard } from '@/components/research-workflow/current-paper-card';
import { ArtifactPreviewDialog } from '@/components/research-workflow/artifact-preview-dialog';
import { researchWorkflowClient, type SshExperimentJob } from '@/components/research-workflow/research-workflow-client';
import type { ResearchArtifact } from '@/components/research-workflow/research-workflow-types';
import { cn } from '@/lib/utils';
import { type ExperimentStep, useExperimentStore } from '@/stores/experiment-store';
import { useResearchProjectStore } from '@/stores/research-project-store';
import {
  DEMO_ABLATION_ROWS,
  DEMO_ARCHITECTURE_MARKDOWN,
  DEMO_COMPARISON_HEADERS,
  DEMO_COMPARISON_ROWS,
  DEMO_RESULTS_MARKDOWN,
} from '@/components/research-experiment/demo-artifacts';
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
      planMarkdown: '',
      resultsMarkdown: DEMO_RESULTS_MARKDOWN,
      architectureMarkdown: DEMO_ARCHITECTURE_MARKDOWN,
      configJson: null,
      comparisonHeaders: [...DEMO_COMPARISON_HEADERS],
      comparisonRows: DEMO_COMPARISON_ROWS.map((row) => [...row]),
      ablationHeaders: ['DLA', 'BED', 'CMP', 'mIoU ↑', 'Dice ↑', 'Boundary-F1 ↑', '延迟 ms'],
      ablationRows: DEMO_ABLATION_ROWS.map((row) => [...row]),
      comparisonFigureUrl: null,
      architectureFigureUrl: null,
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

function SimulatedBadge() {
  return <Badge className="border-amber-300 bg-amber-100 text-amber-800">模拟</Badge>;
}

function RealBadge() {
  return <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800">真实运行</Badge>;
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
        <div className="rounded-xl bg-muted/50 p-3 text-center"><strong>{state.paperCount}</strong><small className="ml-2 text-muted-foreground">篇论文；PDF 可用性以 CSV 的 pdf_path 和工作目录 manifest 为准</small></div>
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={state.loadDemo}><Database data-icon="inline-start" />离线回退：SAM Demo</Button>
            <Button disabled={!canContinue} onClick={() => go('plan')}>生成实验方案<ChevronRight data-icon="inline-end" /></Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlanPage({ go }: { go: (step: ExperimentStep) => void }) {
  const state = useExperimentStore();
  const hydration = useHydration();
  const [selectedIdea, setSelectedIdea] = useState<(typeof state.ideas)[number] | null>(null);
  return <div className="flex flex-col gap-5">
    <section className="rounded-2xl bg-white/90 p-6">
      <h2 className="text-xl font-semibold text-[#10204A]">实验方案确认</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {hydration.source === 'workspace' && hydration.planMarkdown
          ? '已从工作目录 experiment-plan 载入方案摘要；下方 Idea 卡仍可对照离线结构。'
          : '任务：道路裂缝二分类语义分割 · Baseline：冻结 SAM ViT-B + 轻量 Mask Decoder · 对比：U-Net、DeepLabV3+'}
      </p>
      {hydration.planMarkdown ? (
        <pre className="mt-4 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-4 text-sm leading-6">{hydration.planMarkdown}</pre>
      ) : null}
      {hydration.configJson ? (
        <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-dashed border-[#c9dbf8] bg-white p-3 text-xs text-muted-foreground">{hydration.configJson}</pre>
      ) : null}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl bg-blue-50 p-4 text-sm"><strong>最短验证路径：</strong>先复现冻结 SAM Baseline，再分别验证“领域适配、边界监督、多尺度提示”三个单变量改动；只有单项通过 Go 标准后才做组合实验。</div>
        <div className="rounded-xl border border-blue-200 bg-white p-4 text-sm"><strong>统一数据与评测协议：</strong>Crack500 固定划分 250/50/200，DeepCrack 537 张只作零微调外部测试；统一 1024×1024 输入、三随机种子、mIoU/Dice/Boundary-F1/Recall 和同一推理计时协议。</div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{state.ideas.map((idea) => <button type="button" key={idea.id} onClick={() => setSelectedIdea(idea)} className="rounded-xl border bg-white p-4 text-left transition hover:border-[#1F4DCB] hover:shadow-md"><div className="flex items-center justify-between"><Badge variant="secondary">{idea.layer}</Badge><span className="text-sm font-semibold text-[#16A36A]">预计 {idea.gain}</span></div><h3 className="mt-3 font-semibold">{idea.id} · {idea.name}</h3><p className="mt-1 text-sm text-muted-foreground">{idea.summary}</p><div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm"><strong>具体修改：</strong>{idea.modification}</div><span className="mt-3 flex items-center gap-1 text-xs font-medium text-[#1F4DCB]">查看完整实验方案<ExternalLink className="size-3" /></span></button>)}</div>
    </section>
    <div className="flex justify-end"><Button onClick={() => { state.setFields({ planConfirmed: true }); go('mode'); }}><Check data-icon="inline-start" />确认方案</Button></div>
    <Dialog open={Boolean(selectedIdea)} onOpenChange={(open) => { if (!open) setSelectedIdea(null); }}><DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">{selectedIdea ? <><DialogHeader><DialogTitle className="pr-8 text-xl">{selectedIdea.id} · {selectedIdea.name}</DialogTitle><DialogDescription>{selectedIdea.summary}</DialogDescription></DialogHeader><div className="flex flex-col gap-5"><section><h3 className="font-semibold text-[#1F4DCB]">0. 统一数据集与协议</h3><p className="mt-2 text-sm">Crack500（250/50/200）为主数据集，DeepCrack（537 张）为外部测试；输入、增强、轮数、种子和评测代码严格固定，禁止针对测试集调参。</p></section><section><h3 className="font-semibold text-[#1F4DCB]">1. 步骤定位</h3><p className="mt-2">{selectedIdea.stepLocation}</p><p className="mt-2 text-sm text-muted-foreground"><strong>原始假设：</strong>{selectedIdea.hypothesis}</p></section><section><h3 className="font-semibold text-[#1F4DCB]">2. 优化目标</h3><p className="mt-2">{selectedIdea.optimizationGoal}</p></section><section><h3 className="font-semibold text-[#1F4DCB]">3. 主方案 · MVE 核心路径</h3><ol className="mt-2 flex list-decimal flex-col gap-2 pl-5">{selectedIdea.mainPlan.map((item) => <li key={item}>{item}</li>)}</ol></section><section><h3 className="font-semibold text-[#1F4DCB]">4. 备选战略与权衡</h3><div className="mt-2 grid gap-3">{selectedIdea.alternatives.map((alternative) => <div key={alternative.name} className="rounded-xl border p-3"><h4 className="font-medium">{alternative.name}</h4><p className="mt-1 text-sm">{alternative.approach}</p><p className="mt-2 text-sm text-[#16A36A]"><strong>优点：</strong>{alternative.pros}</p><p className="mt-1 text-sm text-[#DC3C4A]"><strong>缺点：</strong>{alternative.cons}</p></div>)}</div></section><section><h3 className="font-semibold text-[#1F4DCB]">5. 战略选择建议</h3><p className="mt-2">{selectedIdea.recommendation}</p></section><section><h3 className="font-semibold text-[#1F4DCB]">6. 对资源清单的影响</h3><ul className="mt-2 list-disc pl-5">{selectedIdea.resources.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3 className="font-semibold text-[#1F4DCB]">7. 验证与检查点（Go / No-Go）</h3><ul className="mt-2 flex list-disc flex-col gap-2 pl-5">{selectedIdea.goNoGo.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="rounded-xl bg-amber-50 p-4"><h3 className="font-semibold">知识库引用与核实要求</h3><ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-sm">{selectedIdea.references.map((item) => <li key={item}>{item}</li>)}</ul></section></div></> : null}</DialogContent></Dialog>
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
          <h3 className="mt-4 text-lg font-semibold">模拟实验结果</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            基于论文锚点、领域合理区间和模型推断生成保守模拟数据。
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
            可先填写本机/SSH 与算力配置；真实训练执行链路尚未接入，当前不会真正跑实验。
          </p>
        </button>
      </div>
      <label className="mt-6 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={state.disclaimerAccepted}
          onChange={(e) => state.setFields({ disclaimerAccepted: e.target.checked })}
        />
        <span>
          {selected === 'simulated'
            ? '我理解模拟结果仅用于 Demo 和方案比较，不能作为真实论文证据。'
            : '我理解当前仅保存真实运行目标，不会执行命令或占用 GPU；后续接入 runner 后仍需核对路径、权限与数据许可。'}
        </span>
      </label>
      <div className="mt-6 flex justify-end">
        <Button disabled={!state.disclaimerAccepted} onClick={() => go('simulate')}>
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
        <SimulatedBadge />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">当前为模拟实验：沿用随机种子与重复次数等 Demo 参数。</p>
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
      <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-[#10204A]">
        模拟依据：论文公开报告值作为锚点；缺失值使用领域合理区间；组合收益由保守模型推断。
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={() => go('run')}>
          <Play data-icon="inline-start" />
          开始模拟
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
    Boolean(runtime.codeDir.trim() && runtime.dataDir.trim() && runtime.resultsDir.trim() && runtime.documentDir?.trim() && runtime.condaEnv?.trim() && state.experimentDocument.trim()) &&
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
        <h3 className="font-semibold text-[#10204A]">实验文档</h3>
        <Textarea className="mt-4 min-h-48" value={state.experimentDocument} onChange={(e) => state.setFields({ experimentDocument: e.target.value })} />
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
        SSH runner 会自动选择首个低占用 GPU；没有空闲 GPU 时回退 CPU。合成输入产生的结果会保留 simulated 标记。
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
  const projectId = useResearchProjectStore((s) => s.project?.projectId);
  const isReal = state.runMode === 'real';
  const [progress, setProgress] = useState(state.completed ? 100 : 0);
  const [sshJob, setSshJob] = useState<SshExperimentJob | null>(null);
  const [sshError, setSshError] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<ResearchArtifact | null>(null);
  const setFields = state.setFields;
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
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <section className="rounded-2xl bg-white/90 p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">真实运行 · 配置已确认</h2>
            <RealBadge />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            SSH runner 将上传实验文档与确定性验证程序，选择空闲 GPU（否则 CPU），执行后复制结果并登记为可预览版本。
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
          <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm">
            {sshError ?? sshJob?.message ?? '尚未启动。远端计算是真实执行；内置验证数据是明确标注的合成小样本。'}
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
            <h2 className="text-xl font-semibold">模拟执行</h2>
            <SimulatedBadge />
          </div>
          <strong>{progress}%</strong>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
          <div className="h-full bg-[#1F4DCB] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          正在播放预生成模拟结果，不代表模型训练或 GPU 运行。
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {state.ideas.map((idea, index) => {
          const visible = progress >= (index + 1) * 16;
          return (
            <article key={idea.id} className="rounded-xl bg-white/90 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{idea.name}</h3>
                {visible ? (
                  <Badge variant={idea.status === '成功' ? 'default' : 'secondary'}>
                    {idea.status} · 模拟
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
                  模拟评分 {idea.score} · 预计变化 {idea.gain}
                  {idea.status !== '成功' ? ' · 收益不稳定或计算成本过高' : ''}
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
  const boxes = [['输入\n1024²', 8, '#e0f2fe'], ['SAM ViT-B\n冻结', 102, '#dbeafe'], ['DLA\nQ/V LoRA', 196, '#bfdbfe'], ['BED\n边界解码', 290, '#93c5fd'], ['CMP\n提示细化', 384, '#1F4DCB']];
  return <figure className="rounded-2xl bg-white/90 p-5"><div className="flex items-center justify-between"><div><figcaption className="font-semibold">算法架构 · CrackSAM-MVE</figcaption><p className="mt-1 text-xs text-muted-foreground">数据流、模块边界及张量规格见完整架构文档</p></div><SimulatedBadge /></div><svg viewBox="0 0 480 145" className="mt-4 w-full" role="img" aria-label="CrackSAM-MVE 算法架构图">{boxes.map(([label, x, fill], index) => <g key={label}>{index > 0 ? <path d={`M${Number(x)-17} 65h15`} stroke="#1F4DCB" strokeWidth="2" markerEnd="url(#arrow)" /> : null}<rect x={Number(x)} y="35" width="78" height="62" rx="10" fill={String(fill)} stroke="#1F4DCB"/><text x={Number(x)+39} y="59" textAnchor="middle" fontSize="10" fill={index === 4 ? 'white' : '#10204A'}>{String(label).split('\n').map((line, i) => <tspan key={line} x={Number(x)+39} dy={i ? 15 : 0}>{line}</tspan>)}</text></g>)}<defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#1F4DCB"/></marker></defs><text x="240" y="125" textAnchor="middle" fontSize="10" fill="#64748b">RGB → [B,256,64,64] → coarse mask → top-3 prompts → refined mask</text></svg></figure>;
}

function QualitativeFigure() {
  const panels = [
    { name: '输入图像', bg: '#9ca3af', lines: ['M8 75 C40 48 78 82 112 24', 'M55 110 C68 88 90 82 112 70'] },
    { name: 'Ground Truth', bg: '#111827', lines: ['M8 75 C40 48 78 82 112 24', 'M55 110 C68 88 90 82 112 70'] },
    { name: 'U-Net', bg: '#111827', lines: ['M8 76 C40 51 68 81 82 60', 'M61 108 C72 91 86 84 101 76'] },
    { name: 'SAM Baseline', bg: '#111827', lines: ['M8 75 C30 58 45 55 57 61', 'M70 72 C86 73 98 49 112 24'] },
    { name: 'CrackSAM-MVE', bg: '#111827', lines: ['M8 75 C40 48 78 82 112 24', 'M55 110 C68 88 90 82 112 70'] },
  ];
  return <figure className="rounded-2xl bg-white/90 p-5"><div className="flex items-center justify-between"><div><figcaption className="font-semibold">定性效果图 · 与对比算法同图对照</figcaption><p className="mt-1 text-xs text-muted-foreground">白色为预测裂缝；完整方法恢复断点和细分支（合成示意）</p></div><SimulatedBadge /></div><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">{panels.map((panel, index) => <div key={panel.name}><svg viewBox="0 0 120 120" className="w-full rounded-lg" role="img" aria-label={`${panel.name} 效果示意`}><rect width="120" height="120" fill={panel.bg}/>{panel.lines.map((line) => <path key={line} d={line} fill="none" stroke={index === 0 ? '#374151' : index === 4 ? '#67e8f9' : 'white'} strokeWidth={index === 2 ? 6 : 3} strokeLinecap="round"/>) }{index === 0 ? <><path d="M0 22H120M0 98H120" stroke="#d1d5db" strokeWidth="3"/><circle cx="32" cy="32" r="9" fill="#6b7280"/></> : null}</svg><p className="mt-1 text-center text-xs font-medium">{panel.name}</p></div>)}</div></figure>;
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
    <section className="rounded-2xl bg-white/90 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-semibold text-[#10204A]">{isUnexecutedRealRun ? '成果模板（未执行）' : '成果交付'}</h2><p className="mt-1 text-sm text-muted-foreground">{isUnexecutedRealRun ? '真实 runner 尚未接入；以下仅展示交付结构和 Demo 数据，不能视为真实运行结果。' : fromWorkspace ? '已优先展示工作目录 experiment-results / 指标表 / 图（缺项仍回退离线 Demo）。' : '论文级结构：算法、协议、主实验、消融、资源和定性效果（离线 Demo 回退）'}</p></div>{isUnexecutedRealRun ? <Badge className="border-slate-300 bg-slate-100 text-slate-700">未执行</Badge> : <SimulatedBadge />}</div><div className="mt-5 grid gap-3 lg:grid-cols-3">{winners.map((idea, index) => <article key={idea.id} className="rounded-xl border-l-4 border-[#1F4DCB] bg-blue-50 p-4"><span className="text-xs text-muted-foreground">创新点 {index + 1}</span><h3 className="mt-1 font-semibold">{idea.name}</h3><p className="mt-2 text-sm">{idea.hypothesis}</p><p className="mt-3 text-sm font-semibold text-[#16A36A]">模拟贡献 {idea.gain}</p></article>)}</div></section>
    <section className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border-2 border-[#1F4DCB] bg-white p-5"><Code2 className="text-[#1F4DCB]"/><h3 className="mt-3 text-lg font-semibold">算法完整详细架构</h3><p className="mt-2 text-sm text-muted-foreground">含数学定义、张量尺寸、DLA/BED/CMP 全模块、损失函数、训练推理逻辑、工程目录、伪代码与失败处理。</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => setDocument('architecture')}><ExternalLink data-icon="inline-start"/>打开架构 Markdown</Button><Button variant="outline" onClick={() => downloadMarkdown(architectureDocument, '算法架构.md')}><Download data-icon="inline-start"/>下载</Button></div></article><article className="rounded-2xl border bg-white p-5"><FileText className="text-[#1F4DCB]"/><h3 className="mt-3 text-lg font-semibold">完整实验结果文件</h3><p className="mt-2 text-sm text-muted-foreground">含数据划分、三个随机种子、超参数、GPU/CPU 环境、主实验、跨数据集、消融、敏感性和效率分析。</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => setDocument('results')}><ExternalLink data-icon="inline-start"/>打开结果 Markdown</Button><Button variant="outline" onClick={() => downloadMarkdown(resultsDocument, '实验结果.md')}><Download data-icon="inline-start"/>下载</Button></div></article></section>
    {hydration.architectureFigureUrl ? (
      <figure className="rounded-2xl bg-white/90 p-5">
        <figcaption className="font-semibold">架构图（workspace paper-figure）</figcaption>
        <img src={hydration.architectureFigureUrl} alt="architecture figure" className="mt-3 max-h-80 w-full object-contain" />
      </figure>
    ) : (
      <ArchitectureFigure />
    )}
    <section className="rounded-2xl bg-white/90 p-5"><h3 className="font-semibold">统一实验设置与计算资源</h3><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">{[['数据集','Crack500 250/50/200；DeepCrack 537 外测'],['训练','50 epoch · batch 2×累积4 · seeds 42/3407/2026'],['优化','AdamW · LoRA 1e-4 · Decoder 5e-4 · WD 1e-2'],['环境','RTX 4090 24GB · i9-13900K · RAM 64GB · PyTorch 2.2']].map(([label,value]) => <div key={label} className="rounded-xl bg-muted/60 p-3"><strong>{label}</strong><p className="mt-1 text-muted-foreground">{value}</p></div>)}</div></section>
    <section className="overflow-x-auto rounded-2xl bg-white/90 p-5"><h3 className="font-semibold">主实验结果</h3><p className="mt-1 text-xs text-muted-foreground">{fromWorkspace ? '优先来自工作目录 metrics/main.csv（若已登记为 artifact）' : 'mean±std，3 seeds；↑ 越高越好，延迟越低越好'}</p><table className="mt-3 w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left">{comparisonHeaders.map((head) => <th key={head} className="p-2">{head}</th>)}</tr></thead><tbody>{comparisonRows.map((row, rowIndex) => <tr key={`${row[0]}-${rowIndex}`} className="border-b last:border-0">{row.map((cell,index) => <td key={`${rowIndex}-${index}`} className={cn('p-2', index === 0 && 'whitespace-nowrap')}>{cell}</td>)}</tr>)}</tbody></table></section>
    <section className="overflow-x-auto rounded-2xl bg-white/90 p-5"><h3 className="font-semibold">模块消融实验</h3><p className="mt-1 text-xs text-muted-foreground">{fromWorkspace ? '优先来自工作目录 metrics/ablation.csv（若已登记为 artifact）' : 'DLA：低秩领域适配；BED：边界增强解码；CMP：粗到细多尺度提示'}</p><table className="mt-3 w-full min-w-[680px] text-sm"><thead><tr className="border-b">{ablationHeaders.map((head) => <th key={head} className="p-2">{head}</th>)}</tr></thead><tbody>{ablationRows.map((row,index) => <tr key={index} className="border-b text-center last:border-0">{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} className={cn('p-2', index === ablationRows.length - 1 && 'font-semibold text-[#1F4DCB]')}>{cell}</td>)}</tr>)}</tbody></table></section>
    {hydration.comparisonFigureUrl ? (
      <figure className="rounded-2xl bg-white/90 p-5">
        <figcaption className="font-semibold">对比图（workspace paper-figure）</figcaption>
        <img src={hydration.comparisonFigureUrl} alt="comparison figure" className="mt-3 max-h-80 w-full object-contain" />
      </figure>
    ) : (
      <QualitativeFigure />
    )}
    <div className="rounded-xl bg-amber-50 p-4 text-sm"><AlertTriangle className="mr-2 inline size-4 text-amber-700"/>{fromWorkspace ? '工作目录产物可能仍为 simulated / placeholder；请核对后再写入论文。' : '以上数据与效果图均为明确标注的 Demo 模拟结果；工程规格可实施，但尚未真实训练，不能作为投稿证据。'}</div>
    <div className="flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={() => go('simulate')}><RotateCcw data-icon="inline-start"/>重新配置</Button><Button onClick={() => downloadMarkdown(resultsDocument, '实验结果_完整交付.md')}><Download data-icon="inline-start"/>下载完整结果</Button></div>
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
  const canAdvance =
    activeStep === 'intake'
      ? Boolean(experiment.projectName.trim() && experiment.researchTopic.trim() && experiment.paperCount > 0)
      : activeStep === 'plan'
        ? experiment.planConfirmed
        : activeStep === 'mode'
          ? experiment.disclaimerAccepted
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
      <main className="navivisor-module scrollbar-hide min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 text-[#10204A] sm:p-6">
        <div className="mx-auto max-w-7xl">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">实验智能体</h1>
              <p className="text-sm text-[#10204A]/70">
                {hydration.source === 'workspace'
                  ? '已绑定当前工作目录产物（Demo 载入后自动刷新）'
                  : '从核心文献到可复现方案；无工作目录时使用离线回退'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CurrentPaperCard defaultOpen={false} className="w-full max-w-sm" />
              <LoadWorkspaceDemoButton compact />
              <Badge className="bg-[#1F4DCB] text-white">
                {experiment.runMode === 'real'
                  ? '真实目标配置 · runner 未接入'
                  : hydration.source === 'workspace'
                    ? 'Workspace · 模拟产物'
                    : 'Demo · 离线模拟'}
              </Badge>
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
            ) : null}
          </footer>
        </div>
      </main>
    </ExperimentHydrationContext.Provider>
  );
}
