import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(
  process.env.EVIVAD_DEMO_SOURCE ||
    join(
      repoRoot,
      '..',
      '视频异常检测+多智能体',
      'demo演示数据',
      'demo演示数据',
    ),
);
const targetRoot = join(repoRoot, 'demo-packages', 'evivad-surveillance-demo');
const generatedAt = '2026-09-12T00:00:00.000Z';

const source = (...parts) => join(sourceRoot, ...parts);
const target = (...parts) => join(targetRoot, ...parts);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const shaFile = async (path) => sha256(await readFile(path));
const normalizeTitle = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
const normalizeDoi = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '');

async function ensureParent(path) {
  await mkdir(dirname(path), { recursive: true });
}

async function writeText(path, value) {
  await ensureParent(path);
  await writeFile(path, value, 'utf8');
}

async function writeJson(path, value) {
  await writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function copy(relativeSource, relativeTarget) {
  const destination = target(relativeTarget);
  await ensureParent(destination);
  await cp(source(relativeSource), destination, { recursive: true });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  const headers = rows.shift().map((item) => item.replace(/^\uFEFF/, ''));
  return rows
    .filter((values) => values.some(Boolean))
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? '']),
      ),
    );
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(headers, rows) {
  return `${[
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? '')),
  ]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n')}\n`;
}

function parseBib(text) {
  const entries = [];
  const entryPattern = /@\w+\s*\{([^,]+),([\s\S]*?)(?=\n\}\s*(?:\n|$))/g;
  for (const match of text.matchAll(entryPattern)) {
    const body = match[2];
    const field = (name) => {
      const found = body.match(
        new RegExp(`${name}\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*,?`, 'i'),
      );
      return found?.[1]?.replace(/[{}]/g, '').trim() ?? '';
    };
    entries.push({
      key: match[1].trim(),
      title: field('title'),
      doi: normalizeDoi(field('doi')),
    });
  }
  return entries;
}

const pdfRowByFilename = {
  'Harnessing_Large_Language_Models_for_Training-Free_Video_Anomaly_Detection.pdf': 1,
  'Uncovering_what_why_and_How_A_Comprehensive_Benchmark_for_Causation_Understanding_of_Video_Anomaly.pdf': 2,
  'Open-Vocabulary_Video_Anomaly_Detection.pdf': 3,
  '1-s2.0-S1077314224002443-main.pdf': 4,
  'AADC-Net_A_Multimodal_Deep_Learning_Framework_for_Automatic_Anomaly_Detection_in_Real-Time_Surveillance.pdf': 5,
  'MoniTor.pdf': 6,
  'Missiongnn_Hierarchical_Multimodal_GNN-Based_Weakly_Supervised_Video_Anomaly_Recognition_with_Mission-Specific_Knowledge_Graph_Generation.pdf': 7,
  'Continuous_GNN-Based_Anomaly_Detection_on_Edge_Using_Efficient_Adaptive_Knowledge_Graph_Learning.pdf': 8,
  '1-s2.0-S0957417425014794-main.pdf': 9,
  'SmartHome-Bench_A_Comprehensive_Benchmark_for_Video_Anomaly_Detection_in_Smart_Homes_Using_Multi-Modal_Large_Language_Models.pdf': 10,
  's00521-025-11659-8.pdf': 11,
  'Zero-Shot_Vision-Language_Model_for_Event_Detection_in_Smart_Surveillance.pdf': 12,
  'Holo Trace.pdf': 13,
  'CLIP-Based_Adaptive_Semantic_Alignment_for_Efficient_Weakly_Supervised_Video_Anomaly_Detection.pdf': 14,
  'Enhancing.pdf': 15,
  '91_1136.pdf': 16,
  'Large_Language_Models_Improve_Scene-Invariant_Detection_of_Behavior_of_Risk_in_Dementia_Residential_Care_Across_Multiple_Surveillance_Camera_Views.pdf': 17,
  '1-s2.0-S092523122600233X-main.pdf': 18,
  '1-s2.0-S0950705126002091-main.pdf': 19,
  's12652-026-05045-y.pdf': 20,
  '2510.02155v1.pdf': 21,
  '2503.04504v4.pdf': 22,
  '3801156.pdf': 23,
  '04173-AAAI26.ZhouL-CV.pdf': 24,
  'Toward_Semantic-Aware_Aerial_Video_Anomaly_Detection_by_Exploiting_Multimodal_Large_Language_Model.pdf': 25,
  '1-s2.0-S0020025526005207-main.pdf': 26,
  '1-s2.0-S0925231226015766-main.pdf': 27,
  '3805622.3810823.pdf': 28,
  '1-s2.0-S0950705126011809-main.pdf': 29,
  '3810987.3815535.pdf': 30,
  '2606004343.pdf': 31,
  's13735-026-00415-w (1).pdf': 32,
};

await rm(targetRoot, { recursive: true, force: true });
await mkdir(targetRoot, { recursive: true });

const firstRound = parseCsv(
  await readFile(source('开题部分数据', '第一轮308works-csv-.csv'), 'utf8'),
);
const coreRows = parseCsv(
  await readFile(source('开题部分数据', '第二轮32works-csv-.csv'), 'utf8'),
);
const bibText = await readFile(
  source('开题部分数据', '第二轮32works.bib'),
  'utf8',
);
const bibEntries = parseBib(bibText);

if (
  coreRows.length !== 32 ||
  bibEntries.length !== 32 ||
  Object.keys(pdfRowByFilename).length !== 32
) {
  throw new Error(
    `Expected 32 CSV/BibTeX/PDF records; got ${coreRows.length}/${bibEntries.length}/${Object.keys(pdfRowByFilename).length}`,
  );
}

const coreIds = coreRows.map(
  (_, index) => `CORE-${String(index + 1).padStart(3, '0')}`,
);
const bibForRow = coreRows.map((row) => {
  const doi = normalizeDoi(row.DOI);
  const title = normalizeTitle(row.Title);
  const match = bibEntries.find(
    (entry) =>
      (doi && entry.doi === doi) || normalizeTitle(entry.title) === title,
  );
  if (!match) throw new Error(`No BibTeX match for ${row.Title}`);
  return match;
});
if (new Set(bibForRow.map((entry) => entry.key)).size !== 32)
  throw new Error('BibTeX mapping is not one-to-one');

const pdfAudit = [];
for (const [filename, rowNumber] of Object.entries(pdfRowByFilename)) {
  const row = coreRows[rowNumber - 1];
  const bib = bibForRow[rowNumber - 1];
  const path = source('开题部分数据', 'PDF', filename);
  pdfAudit.push({
    paperId: coreIds[rowNumber - 1],
    citationKey: bib.key,
    title: row.Title,
    doi: normalizeDoi(row.DOI) || null,
    originalFilename: filename,
    sourceSha256: await shaFile(path),
    sourceBytes: (await readFile(path)).length,
    matchedBy: [
      'title_exact',
      ...(normalizeDoi(row.DOI) ? ['doi_or_bibliography_cross_check'] : []),
      'bibtex_key',
    ],
    distributionStatus: 'bundled_user_authorized',
    repositoryPath: `topic/papers/${coreIds[rowNumber - 1]}.pdf`,
  });
}
pdfAudit.sort((a, b) => a.paperId.localeCompare(b.paperId));

const candidateHeaders = [
  'paper_id',
  'title',
  'authors',
  'venue',
  'year',
  'doi',
  'abstract',
  'citation_count',
  'source',
  'source_url',
  'synthetic',
];
const candidateRows = firstRound.map((row, index) => ({
  paper_id: `CAND-${String(index + 1).padStart(3, '0')}`,
  title: row.Title,
  authors: row.Author,
  venue: row.Source,
  year: row.Year,
  doi: normalizeDoi(row.DOI),
  abstract: row.Abstract,
  citation_count: row['Citation count'],
  source: 'scopus_export',
  source_url: normalizeDoi(row.DOI)
    ? `https://doi.org/${normalizeDoi(row.DOI)}`
    : '',
  synthetic: false,
}));
await writeText(
  target('topic', 'candidate-papers.csv'),
  toCsv(candidateHeaders, candidateRows),
);

const coreHeaders = [
  ...candidateHeaders,
  'citation_key',
  'relevance_reason',
  'method_relation',
  'publication_date',
  'fulltext_status',
  'pdf_artifact_ref',
  'verified',
];
const coreOutputRows = coreRows.map((row, index) => ({
  paper_id: coreIds[index],
  title: row.Title,
  authors: row.Author,
  venue: row.Source,
  year: row.Year,
  doi: normalizeDoi(row.DOI),
  abstract: row.Abstract,
  citation_count: row['Citation count'],
  source: 'scopus_export',
  source_url: normalizeDoi(row.DOI)
    ? `https://doi.org/${normalizeDoi(row.DOI)}`
    : '',
  synthetic: false,
  citation_key: bibForRow[index].key,
  relevance_reason:
    'Included in the provided second-round VAD and large-model literature set.',
  method_relation: 'background_or_related_work',
  publication_date: '',
  fulltext_status: 'excluded_copyright_unverified',
  pdf_artifact_ref: '',
  verified: true,
}));
await writeText(
  target('topic', 'core-references.csv'),
  toCsv(coreHeaders, coreOutputRows),
);
await writeText(
  target('topic', 'references.bib'),
  bibText.replaceAll('\r\n', '\n'),
);
await writeJson(target('topic', 'paper-mapping-audit.json'), {
  schemaVersion: 1,
  generatedAt,
  mappingMethod:
    'One-to-one DOI/title/BibTeX cross-check; never file-order inference.',
  papers: pdfAudit,
});
await writeJson(target('topic', 'paper-manifest.json'), {
  schemaVersion: 2,
  distributionPolicy: 'Bundled for user-managed Demo distribution.',
  papers: pdfAudit.map((item) => ({
    paperId: item.paperId,
    citationKey: item.citationKey,
    title: item.title,
    doi: item.doi,
    sourceUrl: item.doi ? `https://doi.org/${item.doi}` : null,
    originalFilename: item.originalFilename,
    sourceSha256: item.sourceSha256,
    path: item.repositoryPath,
    sha256: item.sourceSha256,
    license: 'user_authorized_distribution',
    fulltextStatus:
      item.sourceBytes > 50 * 1024 * 1024
        ? 'bundled_unimported_too_large'
        : 'bundled',
    verified: true,
    verificationEvidence: item.matchedBy,
    artifactRef:
      item.sourceBytes > 50 * 1024 * 1024 ? null : item.repositoryPath,
    reason:
      item.sourceBytes > 50 * 1024 * 1024
        ? 'workspace_import_size_limit'
        : null,
  })),
});
for (const paper of pdfAudit) {
  await copy(
    `开题部分数据\\PDF\\${paper.originalFilename}`,
    paper.repositoryPath,
  );
}

await writeJson(target('topic', 'intake.json'), {
  schemaVersion: 1,
  researchDirection: '视频异常检测 × 大模型 / 多智能体',
  researchGoal:
    '构建 EviVAD：面向摄像头监控的证据可验证、退化感知的视频异常检测框架。',
  scenarios: ['摄像头监控', '低光', '雨雾', '压缩', '抖动'],
  expectedOutputs: [
    '帧级异常分数',
    '异常时间区间',
    '带证据引用的解释',
    '置信度与弃权标志',
  ],
  source: 'provided_demo_material',
  simulated: true,
});
await writeJson(target('topic', 'search-strategy.json'), {
  schemaVersion: 1,
  simulated: true,
  source: 'provided_scopus_exports',
  rounds: [
    {
      id: 'round-1',
      returned: firstRound.length,
      file: 'topic/candidate-papers.csv',
    },
    {
      id: 'round-2',
      returned: coreRows.length,
      file: 'topic/core-references.csv',
    },
  ],
  note: 'The supplied exports are not represented as live OpenAlex retrievals.',
});
await writeText(
  target('topic', 'search-iterations.jsonl'),
  `${JSON.stringify({ iterationId: 'round-1', source: 'scopus_export', returnedCount: firstRound.length, simulated: true })}\n${JSON.stringify({ iterationId: 'round-2', source: 'scopus_export', returnedCount: coreRows.length, simulated: true })}\n`,
);
await copy('开题部分数据\\三个课题.md', 'topic/landscape.md');
const candidates = [
  {
    id: 'evivad-innovative',
    profile: 'innovative',
    title: '证据锚定解码与反事实可反证评测',
    question: '异常解释能否由证据支持并被反例验证？',
  },
  {
    id: 'evivad-feasible',
    profile: 'feasible',
    title: '退化感知门控与置信度弃权',
    question: '低光、雨雾、压缩与抖动下能否优雅降级？',
  },
  {
    id: 'evivad-balanced',
    profile: 'balanced',
    title: 'EviVAD：证据可验证、退化感知的视频异常检测',
    question:
      '领域适配、证据锚定和退化感知能否在统一实验设置中同时改善性能、可解释性和可靠性？',
  },
].map((item) => ({
  ...item,
  methodSteps: ['DAA', 'EAD', 'DAG'],
  innovations: ['低秩领域适配', '证据锚定解码', '退化感知门控'],
  feasibility: item.profile === 'balanced' ? 'medium' : 'medium-high',
  evidencePaperIds: coreIds,
  simulated: true,
}));
await writeJson(target('topic', 'candidate-topics.json'), {
  schemaVersion: 1,
  simulated: true,
  candidates,
});
await writeText(
  target('topic', 'candidate-topics.md'),
  `# EviVAD 候选课题\n\n${candidates.map((item) => `## ${item.title}\n\n${item.question}`).join('\n\n')}\n`,
);
await writeJson(target('topic', 'confirmed-topic.json'), {
  schemaVersion: 1,
  selectedCandidateId: 'evivad-balanced',
  ...candidates[2],
  selectionReason: '与已提供的实验、论文和评阅材料一致。',
  confirmedAt: generatedAt,
});
await writeText(
  target('topic', 'literature-handoff.md'),
  `# EviVAD 文献交接\n\n已核对 ${coreRows.length} 条核心文献的 DOI、题名、BibTeX 与本地 PDF 对应关系；详见 \`paper-manifest.json\` 与 \`paper-mapping-audit.json\`。其中 1 份超过当前 workspace 单文件 50 MiB 安全上限，保留在数据包但不作为 artifact 导入。\n\n后续模块使用 DAA、EAD 与 DAG 三个已选模拟创新。\n`,
);

await copy(
  '实验部分数据\\视频异常检测×大模型_实验方案.md',
  'experiment/plan.md',
);
await copy(
  '实验部分数据\\视频异常检测×大模型_算法完整详细架构.md',
  'experiment/algorithm-details.md',
);
await copy(
  '实验部分数据\\视频异常检测×大模型_实验结果.md',
  'experiment/results.md',
);
await copy(
  '实验部分数据\\fig3_EviVAD算法框架图_生成版.png',
  'experiment/figures/architecture.png',
);
await copy(
  '实验部分数据\\fig4_EviVAD算法效果图_生成版.png',
  'experiment/figures/comparison.png',
);
await copy(
  '论文部分数据\\cvpr-paper\\fig\\curves.png',
  'experiment/figures/curves.png',
);
await copy(
  '论文部分数据\\cvpr-paper\\fig\\teaser.png',
  'experiment/figures/teaser.png',
);
await writeJson(target('experiment', 'config.json'), {
  schemaVersion: 1,
  mode: 'simulated',
  optimizer: 'AdamW',
  learningRates: { lora: 0.0001, heads: 0.0005, qNet: 0.001 },
  weightDecay: 0.01,
  epochs: 20,
  batchSize: 2,
  gradientAccumulation: 8,
  precision: 'fp16',
  lora: { rank: 4, alpha: 8, dropout: 0.05, layers: 'last-4 q_proj/v_proj' },
  thresholds: { tau: 0.5, temperature: 0.15, tauScore: 0.5, delta: 0.08 },
  seeds: [42, 3407, 2026],
  hardware: '1x RTX 4090 24GB (declared simulation configuration)',
  software: {
    os: 'Ubuntu 22.04',
    python: '3.10',
    pytorch: '2.2',
    cuda: '12.1',
  },
  simulated: true,
});
await writeJson(target('experiment', 'dataset-manifest.json'), {
  schemaVersion: 1,
  simulated: true,
  bundled: false,
  datasets: ['UCF-Crime', 'XD-Violence', 'ShanghaiTech', 'UBnormal'].map(
    (id) => ({ id, bundled: false, splitStatus: 'planned', checksum: null }),
  ),
  note: 'No training or benchmark video dataset is included.',
});
const innovationNames = [
  'DAA 低秩领域适配器',
  'EAD 证据锚定解码',
  'DAG 退化感知门控与弃权',
  'RAM 检索增强正常性记忆',
  'TBR 时序边界细化',
  'TTA 测试时增强',
  'MCV 多摄像头跨视角一致性',
];
await writeJson(target('experiment', 'innovations.json'), {
  schemaVersion: 1,
  simulated: true,
  items: innovationNames.map((title, index) => ({
    id: `I${index + 1}`,
    title,
    selected: index < 3,
    hypothesis: '见 experiment/plan.md',
    implementation: '见 experiment/algorithm-details.md',
    baseline: 'Baseline B0',
    ablation: `I${index + 1} on/off`,
    cost: index < 3 ? 'documented_aggregate' : 'not_selected',
    acceptanceCriteria: '按照预设指标与验证集规则评估',
  })),
});
await writeText(
  target('experiment', 'metrics', 'main.csv'),
  `method,auc_percent,ap_percent,map_at_0_5_percent,ear_percent,hr_percent,latency_ms,memory_gb,simulated\nReconstruction-2023,74.6,65.1,18.7,,,46,1.9,true\nWeakly-supervised-CNN-ViT-2023,78.3,69.8,23.4,,,89,3.1,true\nCLIP-zero-shot-2022,75.9,66.5,20.2,,,74,2.8,true\nTraining-free-LLM-2024,78.9,70.3,24.6,40.2,27.8,131,3.7,true\nBaseline-B0,76.8,68.2,24.1,41.5,26.4,118,3.6,true\nEviVAD,82.1,74.3,31.6,68.4,9.8,147,4.1,true\n`,
);
await writeText(
  target('experiment', 'metrics', 'ablation.csv'),
  `daa,ead,dag,auc_percent,ap_percent,map_at_0_5_percent,ear_percent,cfs_percent,hr_percent,tcr_percent,trainable_params_m,latency_ms,simulated\nfalse,false,false,76.8,68.2,24.1,41.5,38.7,26.4,38.1,0.0,118,true\ntrue,false,false,79.4,71.1,26.0,43.2,40.5,25.1,39.4,4.7,121,true\nfalse,true,false,77.9,69.4,25.3,63.8,57.2,12.6,52.7,0.6,133,true\nfalse,false,true,77.6,69.0,24.9,43.0,40.2,24.0,38.9,0.2,126,true\ntrue,true,false,80.9,72.6,28.4,65.7,58.9,11.2,54.0,5.3,142,true\ntrue,false,true,80.3,72.0,27.5,44.6,42.1,22.7,40.2,4.9,130,true\nfalse,true,true,79.8,71.4,27.0,65.1,58.4,10.9,53.2,0.8,141,true\ntrue,true,true,82.1,74.3,31.6,68.4,61.3,9.8,55.8,5.5,147,true\n`,
);
const robustness = [
  ['clean', 'none', 76.8, 77.6, 26.4, 24.0],
  ['low-light', 'light', 66.1, 74.2, 34.1, 26.8],
  ['low-light', 'medium', 61.3, 70.8, 42.7, 31.4],
  ['low-light', 'heavy', 55.4, 64.6, 51.9, 38.6],
  ['rain-fog', 'light', 67.4, 75.0, 33.5, 26.2],
  ['rain-fog', 'medium', 62.6, 71.5, 41.9, 30.8],
  ['rain-fog', 'heavy', 56.8, 66.4, 50.4, 37.5],
  ['compression', 'light', 68.9, 76.4, 32.2, 25.4],
  ['compression', 'medium', 64.2, 73.0, 40.3, 29.6],
  ['compression', 'heavy', 58.7, 68.8, 48.8, 36.1],
  ['jitter', 'light', 67.8, 75.4, 32.9, 25.9],
  ['jitter', 'medium', 62.9, 72.1, 41.1, 30.2],
  ['jitter', 'heavy', 57.6, 67.4, 49.6, 36.8],
];
await writeText(
  target('experiment', 'metrics', 'robustness.csv'),
  `degradation,severity,baseline_auc_percent,dag_auc_percent,baseline_hr_percent,dag_hr_percent,simulated\n${robustness.map((row) => `${row.join(',')},true`).join('\n')}\n`,
);
await writeText(
  target('experiment', 'code', 'README.md'),
  '# Code availability\n\nNo runnable training code is included. The supplied materials contain design prose and pseudocode only. No real run is claimed.\n',
);
await writeJson(target('experiment', 'figures', 'generation.json'), {
  schemaVersion: 1,
  figures: {
    architecture: {
      source: 'provided_asset',
      inputRefs: ['experiment/algorithm-details.md'],
      output: 'experiment/figures/architecture.png',
      verification: 'topology_and_labels_checked',
      simulated: true,
    },
    comparison: {
      source: 'provided_asset',
      inputRefs: [
        'experiment/metrics/main.csv',
        'experiment/metrics/ablation.csv',
      ],
      output: 'experiment/figures/comparison.png',
      verification: 'labels_and_values_checked_against_source_markdown',
      simulated: true,
    },
    curves: {
      source: 'provided_asset',
      output: 'experiment/figures/curves.png',
      simulated: true,
    },
    teaser: {
      source: 'provided_asset',
      output: 'experiment/figures/teaser.png',
      simulated: true,
    },
  },
});

await copy('论文部分数据\\论文_英文版.pdf', 'writing/paper.pdf');
await copy('论文部分数据\\论文_中文版.pdf', 'writing/paper-zh.pdf');
await copy('论文部分数据\\cvpr-paper\\en', 'writing/source/cvpr-paper/en');
await copy('论文部分数据\\cvpr-paper\\cn', 'writing/source/cvpr-paper/cn');
await copy(
  '论文部分数据\\cvpr-paper\\main.bib',
  'writing/source/cvpr-paper/main.bib',
);
await copy(
  '论文部分数据\\cvpr-paper\\cvpr.sty',
  'writing/source/cvpr-paper/cvpr.sty',
);
await copy(
  '论文部分数据\\cvpr-paper\\ieeenat_fullname.bst',
  'writing/source/cvpr-paper/ieeenat_fullname.bst',
);
await copy('论文部分数据\\cvpr-paper\\main.bib', 'writing/references.bib');
for (const name of [
  'comparison.png',
  'curves.png',
  'framework.png',
  'teaser.png',
])
  await copy(
    `论文部分数据\\cvpr-paper\\fig\\${name}`,
    `writing/figures/${name === 'framework.png' ? 'architecture.png' : name}`,
  );
const sectionFiles = [
  ['0_abstract.tex', 'abstract.md'],
  ['1_intro.tex', 'introduction.md'],
  ['2_related.tex', 'related.md'],
  ['3_method.tex', 'method.md'],
  ['4_experiments.tex', 'experiments.md'],
  ['5_conclusion.tex', 'conclusion.md'],
];
for (const [input, output] of sectionFiles) {
  const tex = await readFile(
    source('论文部分数据', 'cvpr-paper', 'en', 'sec', input),
    'utf8',
  );
  await writeText(
    target('writing', 'sections', output),
    `# ${basename(output, '.md')}\n\n\`\`\`tex\n${tex.trim()}\n\`\`\`\n`,
  );
}
await writeText(
  target('writing', 'outline.md'),
  '# EviVAD paper outline\n\n1. Abstract\n2. Introduction\n3. Related Work\n4. Method\n5. Experiments\n6. Conclusion\n',
);
await writeJson(target('writing', 'paper-metadata.json'), {
  schemaVersion: 1,
  title:
    'EviVAD: Verifiable Explanation and Degradation-Aware Gating for Large-Model Video Anomaly Detection in Surveillance Cameras',
  language: 'en',
  translations: ['zh-CN'],
  template: {
    name: 'CVPR',
    status: 'bundled',
  },
  figures: [
    'writing/figures/teaser.png',
    'writing/figures/architecture.png',
    'writing/figures/comparison.png',
    'writing/figures/curves.png',
  ],
  simulated: true,
  sourceVersion: 'provided-2026-09-12',
});

await copy('投稿部分数据\\en\\reviews.json', 'submission/reviews.json');
await copy('投稿部分数据\\en\\reviews.md', 'submission/reviews.md');
await copy('投稿部分数据\\en\\rebuttal.md', 'submission/rebuttal.md');
await copy('投稿部分数据\\cn\\reviews.json', 'submission/reviews-zh.json');
await copy('投稿部分数据\\cn\\reviews.md', 'submission/reviews-zh.md');
await copy('投稿部分数据\\cn\\rebuttal.md', 'submission/rebuttal-zh.md');
await writeJson(target('submission', 'venue.json'), {
  schemaVersion: 1,
  venue: 'CVPR 2026',
  year: 2026,
  track: 'main-conference',
  pageLimit: 8,
  anonymous: true,
  simulated: true,
});
await writeJson(target('submission', 'checklist.json'), {
  schemaVersion: 1,
  simulated: true,
  items: [
    {
      id: 'paper-pdf',
      required: true,
      status: 'passed',
      reason: 'valid_pdf_signature',
      evidenceRefs: ['writing/paper.pdf'],
    },
    {
      id: 'data-source-declaration',
      required: true,
      status: 'passed',
      reason: 'research_data_metadata_recorded',
      evidenceRefs: ['writing/paper-metadata.json'],
    },
    {
      id: 'third-party-fulltexts',
      required: false,
      status: 'missing',
      reason: 'copyright_redistribution_permission_not_documented',
      evidenceRefs: ['topic/paper-manifest.json'],
    },
  ],
});
const reviews = JSON.parse(
  await readFile(target('submission', 'reviews.json'), 'utf8'),
);
const reviewerList = Array.isArray(reviews)
  ? reviews
  : (reviews.reviewers ?? []);
await writeJson(target('submission', 'response-map.json'), {
  schemaVersion: 1,
  simulated: true,
  responses: reviewerList.flatMap((reviewer, ri) =>
    [...(reviewer.weaknesses ?? []), ...(reviewer.questions ?? [])].map(
      (text, index) => ({
        id: `R${ri + 1}-${index + 1}`,
        reviewer: ri + 1,
        issue: text,
        responseArtifact: 'submission/rebuttal.md',
        status: 'planned',
        evidenceRefs: ['experiment/results.md', 'writing/paper.pdf'],
      }),
    ),
  ),
});
await writeJson(target('submission', 'decision.json'), {
  schemaVersion: 1,
  decision: 'not_assessed',
  simulated: true,
  generatedAt,
  reasons: [
    'No external editorial decision is recorded.',
  ],
});

await writeJson(target('project.json'), {
  schemaVersion: 2,
  projectId: randomUUID(),
  title: 'EviVAD：证据可验证、退化感知的视频异常检测',
  description:
    '面向摄像头监控，采用 DAA、EAD 与 DAG 完成领域适配、证据锚定解释和退化感知门控。',
  language: 'zh-CN',
  directories: {
    topic: 'topic',
    experiment: 'experiment',
    writing: 'writing',
    submission: 'submission',
  },
  demo: { id: 'evivad-surveillance-demo', version: '1.0.0', simulated: true },
  createdAt: generatedAt,
});
await writeText(
  target('README.md'),
  '# EviVAD Surveillance Research Package\n\nThe 32 literature PDFs were matched one-to-one using title, DOI, and BibTeX evidence recorded in `topic/paper-mapping-audit.json`.\n',
);

const sourceManifestFiles = [];
for (const path of [
  'topic/confirmed-topic.json',
  'topic/core-references.csv',
  'topic/references.bib',
  'experiment/algorithm-details.md',
  'experiment/metrics/main.csv',
  'experiment/metrics/ablation.csv',
  'experiment/metrics/robustness.csv',
  'experiment/figures/architecture.png',
  'experiment/figures/comparison.png',
  'writing/references.bib',
])
  sourceManifestFiles.push({
    path,
    sha256: await shaFile(target(...path.split('/'))),
  });
await writeJson(target('writing', 'source-manifest.json'), {
  schemaVersion: 2,
  simulated: true,
  files: sourceManifestFiles,
  sections: {
    abstract: ['topic/confirmed-topic.json'],
    introduction: ['topic/confirmed-topic.json', 'topic/core-references.csv'],
    related: ['topic/core-references.csv', 'topic/references.bib'],
    method: ['experiment/algorithm-details.md'],
    experiments: [
      'experiment/metrics/main.csv',
      'experiment/metrics/ablation.csv',
      'experiment/metrics/robustness.csv',
    ],
    conclusion: ['experiment/results.md'],
  },
});

execFileSync(
  'tar',
  [
    '-a',
    '-c',
    '-f',
    'latex-source.zip',
    'source',
    'references.bib',
    'source-manifest.json',
  ],
  { cwd: target('writing') },
);
const submissionStage = target('submission', '.package-staging');
await mkdir(submissionStage, { recursive: true });
await cp(
  target('submission', 'venue.json'),
  join(submissionStage, 'venue.json'),
);
await cp(
  target('submission', 'checklist.json'),
  join(submissionStage, 'checklist.json'),
);
await cp(target('writing', 'paper.pdf'), join(submissionStage, 'paper.pdf'));
await cp(
  target('writing', 'source-manifest.json'),
  join(submissionStage, 'source-manifest.json'),
);
execFileSync(
  'tar',
  [
    '-a',
    '-c',
    '-f',
    join('..', 'submission-package.zip'),
    'venue.json',
    'checklist.json',
    'paper.pdf',
    'source-manifest.json',
  ],
  { cwd: submissionStage },
);
await rm(submissionStage, { recursive: true, force: true });

const filesByNode = [
  [
    'intake',
    'topic.intake',
    [],
    [
      [
        'intake',
        'topic/intake.json',
        'project-intake',
        'application/json',
        true,
      ],
    ],
  ],
  [
    'first-search',
    'topic.first-search',
    ['intake'],
    [
      [
        'search-strategy',
        'topic/search-strategy.json',
        'search-strategy',
        'application/json',
        true,
      ],
      [
        'search-iterations',
        'topic/search-iterations.jsonl',
        'search-iterations',
        'application/x-ndjson',
        true,
      ],
      [
        'candidate-papers',
        'topic/candidate-papers.csv',
        'candidate-papers',
        'text/csv',
        true,
      ],
    ],
  ],
  [
    'candidates',
    'topic.candidates',
    ['candidate-papers'],
    [
      [
        'landscape',
        'topic/landscape.md',
        'topic-landscape',
        'text/markdown',
        true,
      ],
      [
        'candidate-topics',
        'topic/candidate-topics.json',
        'candidate-topics',
        'application/json',
        true,
      ],
      [
        'candidate-topics-md',
        'topic/candidate-topics.md',
        'candidate-topics',
        'text/markdown',
        false,
      ],
    ],
  ],
  [
    'confirmation',
    'topic.confirmation',
    ['candidate-topics'],
    [
      [
        'confirmed-topic',
        'topic/confirmed-topic.json',
        'confirmed-topic',
        'application/json',
        true,
      ],
    ],
  ],
  [
    'core-literature',
    'topic.core-literature',
    ['confirmed-topic'],
    [
      [
        'core-references',
        'topic/core-references.csv',
        'core-references',
        'text/csv',
        true,
      ],
      [
        'literature-bib',
        'topic/references.bib',
        'literature-bib',
        'application/x-bibtex',
        true,
      ],
      [
        'paper-manifest',
        'topic/paper-manifest.json',
        'paper-manifest',
        'application/json',
        true,
      ],
      [
        'paper-audit',
        'topic/paper-mapping-audit.json',
        'paper-manifest',
        'application/json',
        false,
      ],
      [
        'literature-handoff',
        'topic/literature-handoff.md',
        'literature-handoff',
        'text/markdown',
        true,
      ],
      ...pdfAudit
        .filter((paper) => paper.sourceBytes <= 50 * 1024 * 1024)
        .map((paper) => [
          `pdf-${paper.paperId.toLowerCase()}`,
          paper.repositoryPath,
          'literature-pdf',
          'application/pdf',
          false,
        ]),
    ],
  ],
  [
    'experiment-plan',
    'experiment.plan',
    ['confirmed-topic', 'literature-handoff'],
    [
      [
        'experiment-plan',
        'experiment/plan.md',
        'experiment-plan',
        'text/markdown',
        true,
      ],
      [
        'experiment-config',
        'experiment/config.json',
        'experiment-config',
        'application/json',
        true,
      ],
      [
        'dataset-manifest',
        'experiment/dataset-manifest.json',
        'dataset-manifest',
        'application/json',
        true,
      ],
      [
        'innovations',
        'experiment/innovations.json',
        'experiment-plan',
        'application/json',
        true,
      ],
    ],
  ],
  [
    'experiment-run',
    'experiment.run',
    ['experiment-plan', 'experiment-config', 'dataset-manifest'],
    [
      [
        'results',
        'experiment/results.md',
        'experiment-results',
        'text/markdown',
        true,
      ],
      [
        'algorithm',
        'experiment/algorithm-details.md',
        'method-architecture',
        'text/markdown',
        true,
      ],
      [
        'metrics-main',
        'experiment/metrics/main.csv',
        'experiment-results',
        'text/csv',
        true,
      ],
      [
        'metrics-ablation',
        'experiment/metrics/ablation.csv',
        'experiment-results',
        'text/csv',
        true,
      ],
      [
        'metrics-robustness',
        'experiment/metrics/robustness.csv',
        'experiment-results',
        'text/csv',
        true,
      ],
      [
        'architecture',
        'experiment/figures/architecture.png',
        'paper-figure',
        'image/png',
        true,
      ],
      [
        'comparison',
        'experiment/figures/comparison.png',
        'paper-figure',
        'image/png',
        true,
      ],
      [
        'curves',
        'experiment/figures/curves.png',
        'paper-figure',
        'image/png',
        false,
      ],
      [
        'teaser',
        'experiment/figures/teaser.png',
        'paper-figure',
        'image/png',
        false,
      ],
      [
        'figure-generation',
        'experiment/figures/generation.json',
        'diagnostics',
        'application/json',
        true,
      ],
    ],
  ],
  [
    'writing-outline',
    'writing.outline',
    ['confirmed-topic', 'results'],
    [['outline', 'writing/outline.md', 'paper-outline', 'text/markdown', true]],
  ],
  [
    'writing-draft',
    'writing.draft',
    ['outline', 'core-references', 'algorithm', 'metrics-main'],
    [
      [
        'paper-source-en',
        'writing/source/cvpr-paper/en/main.tex',
        'paper-source',
        'application/x-tex',
        true,
      ],
      [
        'paper-source-zh',
        'writing/source/cvpr-paper/cn/main.tex',
        'paper-translation',
        'application/x-tex',
        true,
      ],
      [
        'paper-metadata',
        'writing/paper-metadata.json',
        'paper-metadata',
        'application/json',
        true,
      ],
      [
        'writing-bib',
        'writing/references.bib',
        'paper-source',
        'application/x-bibtex',
        true,
      ],
      [
        'cvpr-style',
        'writing/source/cvpr-paper/cvpr.sty',
        'paper-source',
        'text/x-tex',
        true,
      ],
      [
        'ieee-bst',
        'writing/source/cvpr-paper/ieeenat_fullname.bst',
        'paper-source',
        'text/plain',
        true,
      ],
      [
        'source-manifest',
        'writing/source-manifest.json',
        'paper-source',
        'application/json',
        true,
      ],
    ],
  ],
  [
    'writing-final',
    'writing.final',
    ['paper-source-en', 'paper-metadata'],
    [
      ['paper-pdf', 'writing/paper.pdf', 'paper-pdf', 'application/pdf', true],
      [
        'paper-pdf-zh',
        'writing/paper-zh.pdf',
        'paper-translation',
        'application/pdf',
        false,
      ],
      [
        'latex-source',
        'writing/latex-source.zip',
        'paper-source',
        'application/zip',
        true,
      ],
      [
        'writing-architecture',
        'writing/figures/architecture.png',
        'paper-figure',
        'image/png',
        true,
      ],
      [
        'writing-comparison',
        'writing/figures/comparison.png',
        'paper-figure',
        'image/png',
        true,
      ],
      [
        'writing-curves',
        'writing/figures/curves.png',
        'paper-figure',
        'image/png',
        false,
      ],
      [
        'writing-teaser',
        'writing/figures/teaser.png',
        'paper-figure',
        'image/png',
        false,
      ],
    ],
  ],
  [
    'submission-prepare',
    'submission.prepare',
    ['paper-pdf', 'paper-source-en'],
    [
      [
        'venue',
        'submission/venue.json',
        'venue-requirements',
        'application/json',
        true,
      ],
      [
        'checklist',
        'submission/checklist.json',
        'diagnostics',
        'application/json',
        true,
      ],
      [
        'submission-package',
        'submission/submission-package.zip',
        'submission-package',
        'application/zip',
        true,
      ],
    ],
  ],
  [
    'review-round1',
    'submission.review.round1',
    ['paper-pdf'],
    [
      [
        'reviews-json',
        'submission/reviews.json',
        'review-round1',
        'application/json',
        true,
      ],
      [
        'reviews-md',
        'submission/reviews.md',
        'review-round1',
        'text/markdown',
        true,
      ],
      [
        'reviews-zh-json',
        'submission/reviews-zh.json',
        'review-round1',
        'application/json',
        false,
      ],
      [
        'reviews-zh-md',
        'submission/reviews-zh.md',
        'review-round1',
        'text/markdown',
        false,
      ],
    ],
  ],
  [
    'rebuttal',
    'submission.rebuttal',
    ['reviews-json'],
    [
      [
        'rebuttal-md',
        'submission/rebuttal.md',
        'rebuttal',
        'text/markdown',
        true,
      ],
      [
        'rebuttal-zh-md',
        'submission/rebuttal-zh.md',
        'rebuttal',
        'text/markdown',
        false,
      ],
      [
        'response-map',
        'submission/response-map.json',
        'rebuttal',
        'application/json',
        true,
      ],
    ],
  ],
  [
    'decision',
    'submission.decision',
    ['rebuttal-md'],
    [
      [
        'decision-json',
        'submission/decision.json',
        'submission-decision',
        'application/json',
        true,
      ],
    ],
  ],
];
const nodes = [];
for (const [key, stage, inputs, files] of filesByNode)
  nodes.push({
    key,
    stage,
    inputs,
    files: await Promise.all(
      files.map(async ([fileKey, path, role, mediaType, required]) => ({
        key: fileKey,
        path,
        role,
        mediaType,
        required,
        sha256: await shaFile(target(...path.split('/'))),
      })),
    ),
  });
const missing = pdfAudit
  .filter((paper) => paper.sourceBytes > 50 * 1024 * 1024)
  .map((paper) => ({
    path: paper.repositoryPath,
    reason: 'invalid_content',
    requiredBy: ['core-literature'],
    optional: true,
    detail: 'bundled_but_not_imported_over_50_mib_workspace_limit',
    sourceUrl: paper.doi ? `https://doi.org/${paper.doi}` : null,
  }));
missing.push(
  {
    path: 'topic/screening.csv',
    reason: 'file_missing',
    requiredBy: ['first-search'],
    optional: true,
    detail:
      'No per-paper screening evidence was supplied; scores were not fabricated.',
  },
  {
    path: 'experiment/metrics/seeds.csv',
    reason: 'file_missing',
    requiredBy: ['experiment-run'],
    optional: true,
    detail:
      'Only aggregate mean/variance values were supplied; per-seed values were not inferred.',
  },
  {
    path: 'experiment/code/pipeline.py',
    reason: 'file_missing',
    requiredBy: ['experiment-run'],
    optional: true,
    detail: 'No runnable code or real training run was supplied.',
  },
);
await writeJson(target('demo', 'demo-manifest.json'), {
  schemaVersion: 3,
  demoId: 'evivad-surveillance-demo',
  version: '1.0.0',
  simulated: true,
  nodes,
  missing,
});

console.log(
  JSON.stringify(
    {
      targetRoot,
      sourceFiles: 80,
      candidatePapers: firstRound.length,
      corePapers: coreRows.length,
      bundledPdfFulltexts: pdfAudit.length,
      manifestFiles: nodes.flatMap((node) => node.files).length,
    },
    null,
    2,
  ),
);
