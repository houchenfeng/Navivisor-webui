import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = 'demo-packages/camera-vad-scene-memory';

async function write(rel, content) {
  const abs = join(root, rel);
  await mkdir(dirname(abs), { recursive: true });
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  await writeFile(abs, buf);
  return createHash('sha256').update(buf).digest('hex');
}

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const pdf = Buffer.from(
  '%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<< /Root 1 0 R >>\n%%EOF\nPLACEHOLDER SYNTHETIC DEMO PDF\n',
  'utf8',
);

const files = {};

files['project.json'] = await write(
  'project.json',
  JSON.stringify(
    {
      schemaVersion: 2,
      projectId: 'b845db02-b48e-40eb-8bf1-978e2546ee4e',
      title: '场景记忆与大模型按需复核的视频异常检测',
      description:
        '面向固定摄像头，使用轻量筛查、场景记忆和视觉语言大模型复核异常片段。',
      language: 'zh-CN',
      directories: {
        topic: 'topic',
        experiment: 'experiment',
        writing: 'writing',
        submission: 'submission',
      },
      demo: { id: 'camera-vad-scene-memory', version: '1.0.0', simulated: true },
      createdAt: '2026-09-11T12:00:00Z',
    },
    null,
    2,
  ),
);

files['README.md'] = await write(
  'README.md',
  '# CameraVAD-SceneMemory Demo\n\nSYNTHETIC teaching package. Not real benchmark evidence.\n',
);

files['topic/intake.json'] = await write(
  'topic/intake.json',
  JSON.stringify(
    {
      researchDirection: '视频异常检测',
      researchGoal:
        '结合视觉语言大模型，对固定摄像头视频低成本定位并解释异常',
      scenarios: ['校园走廊', '停车场', '楼宇入口'],
      constraints: {
        excludeDomains: ['生物医学'],
        fromYear: 2022,
        targetPaperCount: { min: 200, preferred: 300, max: 800 },
      },
      coreLiteratureWindow: { from: '2023-09-11', to: '2026-09-11' },
      resources: {
        gpuBudget: '单卡原型',
        latencyGoalMs: 100,
        vlmBudget: '只复核候选片段',
      },
    },
    null,
    2,
  ),
);

files['topic/search-strategy.json'] = await write(
  'topic/search-strategy.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      simulated: true,
      draftScopusQuery:
        'TITLE-ABS-KEY(("video anomaly detection" OR "video abnormality detection") AND ("large language model" OR "vision language model" OR "LLM" OR "VLM") AND ("surveillance" OR "camera" OR "CCTV")) AND NOT TITLE("medical" OR "biomedical") AND PUBYEAR > 2021',
      openAlexAdapterNote:
        'Scopus TITLE-ABS-KEY must be converted by adapter; do not send verbatim to OpenAlex.',
      providers: ['openalex', 'demo'],
    },
    null,
    2,
  ),
);

files['topic/search-iterations.jsonl'] = await write(
  'topic/search-iterations.jsonl',
  [
    {
      iterationId: 'it-1',
      queryVersion: 1,
      provider: 'demo',
      retrievedCount: 62,
      deduplicatedCount: 58,
      sampleSize: 20,
      relevantInSample: 17,
      estimatedPrecision: 0.85,
      changeReason: 'too_narrow',
      executedAt: '2026-09-11T12:05:00Z',
      simulated: true,
    },
    {
      iterationId: 'it-2',
      queryVersion: 2,
      provider: 'demo',
      retrievedCount: 412,
      deduplicatedCount: 300,
      sampleSize: 50,
      relevantInSample: 41,
      estimatedPrecision: 0.82,
      changeReason: 'expanded_synonyms',
      executedAt: '2026-09-11T12:10:00Z',
      simulated: true,
    },
  ]
    .map((row) => JSON.stringify(row))
    .join('\n') + '\n',
);

files['topic/candidate-papers.csv'] = await write(
  'topic/candidate-papers.csv',
  [
    'paper_id,title,authors,venue,year,doi,abstract,citation_count,source,source_url,synthetic',
    'DEMO-001,Fast Screening for Camera Anomaly Clips,Demo Author A,Demo Venue,2025,,Lightweight scoring selects suspicious camera clips.,0,demo,,true',
    'DEMO-002,Memory Retrieval for Scene Understanding,Demo Author B,Demo Venue,2024,,Normal scene memories support retrieval and comparison.,0,demo,,true',
    'DEMO-003,Language Guided Verification of Video Events,Demo Author C,Demo Venue,2026,,A vision language model explains uncertain event clips.,0,demo,,true',
    '',
  ].join('\n'),
);

files['topic/screening.csv'] = await write(
  'topic/screening.csv',
  [
    'paper_id,decision,relevance_score,reason,evidence,reviewer,synthetic',
    'DEMO-001,include,0.91,Matches lightweight screening baseline,abstract,demo-screener,true',
    'DEMO-002,include,0.88,Supports scene memory retrieval,abstract,demo-screener,true',
    'DEMO-003,include,0.90,Supports VLM verification path,abstract,demo-screener,true',
    '',
  ].join('\n'),
);

files['topic/landscape.md'] = await write(
  'topic/landscape.md',
  `# Landscape (SYNTHETIC DEMO)

Denominator note: counts below are simulated for teaching and are not a full 300-paper audit.

## Themes
- Evergreen: lightweight scoring (DEMO-001)
- Emerging: scene memory retrieval (DEMO-002)
- Emerging: language-guided verification (DEMO-003)

## Opportunities
1. Lightweight detection + on-demand VLM
2. Scene memory + cross-scene transfer
3. Evidence retrieval + trustworthy explanation
4. Active querying + cost control
5. Long-term drift + multi-camera
`,
);

files['topic/candidate-topics.json'] = await write(
  'topic/candidate-topics.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      simulated: true,
      candidates: [
        {
          id: 'cand-innovative',
          profile: 'innovative',
          title: '事件图谱记忆与多角色复核的跨摄像头异常检测',
          question: '结构化长期记忆能否提升跨摄像头事件推理一致性？',
          methodSteps: ['事件建图', '检索', '多角色复核', '证据融合'],
          innovations: ['事件图谱', '多角色复核', '跨镜关联'],
          feasibility: 'medium-high',
          risks: ['图构建成本', '身份关联误差'],
          evidencePaperIds: ['DEMO-002', 'DEMO-003'],
          expectedOutputs: ['graph', 'reviews'],
        },
        {
          id: 'cand-feasible',
          profile: 'feasible',
          title: '轻量筛查与视觉语言大模型按需复核',
          question: '只复核不确定片段能否以较低成本提升检测效果？',
          methodSteps: ['轻量评分', '阈值触发', 'VLM复核', '分数融合'],
          innovations: ['不确定性触发', '按需复核'],
          feasibility: 'high',
          risks: ['阈值迁移', '时延'],
          evidencePaperIds: ['DEMO-001', 'DEMO-003'],
          expectedOutputs: ['metrics', 'cost'],
        },
        {
          id: 'cand-balanced',
          profile: 'balanced',
          title: '基于场景记忆与大模型复核的快慢双通路视频异常检测',
          question: '场景记忆能否在固定预算下改善疑难片段识别和解释？',
          methodSteps: ['筛查', '记忆检索', 'VLM按需复核', '校准融合'],
          innovations: [
            '不确定性触发',
            '场景正常记忆',
            '证据化复核与校准融合',
          ],
          feasibility: 'medium',
          risks: ['记忆污染', '场景漂移'],
          evidencePaperIds: ['DEMO-001', 'DEMO-002', 'DEMO-003'],
          expectedOutputs: ['metrics', 'explanations'],
        },
      ],
      alternates: [],
    },
    null,
    2,
  ),
);

files['topic/candidate-topics.md'] = await write(
  'topic/candidate-topics.md',
  '# Candidate topics (synthetic)\n\nSee candidate-topics.json. Demo selects balanced.\n',
);

files['topic/confirmed-topic.json'] = await write(
  'topic/confirmed-topic.json',
  JSON.stringify(
    {
      selectedCandidateId: 'cand-balanced',
      title: '基于场景记忆与大模型复核的快慢双通路视频异常检测',
      question: '场景记忆能否在固定预算下改善疑难片段识别和解释？',
      methodSteps: [
        '筛查',
        '记忆检索',
        'VLM按需复核',
        '校准融合',
        '阈值验证',
        '失败分析',
      ],
      innovations: [
        '不确定性触发',
        '场景正常记忆',
        '证据化复核与校准融合',
      ],
      evidencePaperIds: ['DEMO-001', 'DEMO-002', 'DEMO-003'],
      selectionReason: 'Balances cost and explanation for teaching demo',
      confirmedAt: '2026-09-11T12:20:00Z',
      feasibilityLimits: 'Simulated only; no verified lift claimed',
      simulated: true,
    },
    null,
    2,
  ),
);

files['topic/core-references.csv'] = await write(
  'topic/core-references.csv',
  [
    'paper_id,title,authors,venue,year,doi,abstract,citation_count,source,source_url,synthetic,citation_key,relevance_reason,method_relation,publication_date,fulltext_status,pdf_artifact_ref,verified',
    'DEMO-001,Fast Screening for Camera Anomaly Clips,Demo Author A,Demo Venue,2025,,Lightweight scoring selects suspicious camera clips.,0,demo,,true,demo_fast_screening,baseline light scorer,baseline,2025-01-01,missing,,false',
    'DEMO-002,Memory Retrieval for Scene Understanding,Demo Author B,Demo Venue,2024,,Normal scene memories support retrieval and comparison.,0,demo,,true,demo_memory_retrieval,memory bank,memory,2024-06-01,missing,,false',
    'DEMO-003,Language Guided Verification of Video Events,Demo Author C,Demo Venue,2026,,A vision language model explains uncertain event clips.,0,demo,,true,demo_vlm_verify,VLM verification,vlm,2026-02-01,missing,,false',
    '',
  ].join('\n'),
);

const bib = `@misc{demo_fast_screening,
  title = {Fast Screening for Camera Anomaly Clips},
  author = {{Demo Author A}},
  year = {2025},
  note = {SYNTHETIC DEMO RECORD - NOT A REAL PUBLICATION}
}

@misc{demo_memory_retrieval,
  title = {Memory Retrieval for Scene Understanding},
  author = {{Demo Author B}},
  year = {2024},
  note = {SYNTHETIC DEMO RECORD - NOT A REAL PUBLICATION}
}

@misc{demo_vlm_verify,
  title = {Language Guided Verification of Video Events},
  author = {{Demo Author C}},
  year = {2026},
  note = {SYNTHETIC DEMO RECORD - NOT A REAL PUBLICATION}
}
`;
files['topic/references.bib'] = await write('topic/references.bib', bib);

files['topic/paper-manifest.json'] = await write(
  'topic/paper-manifest.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      papers: [
        {
          paperId: 'DEMO-001',
          citationKey: 'demo_fast_screening',
          sourceUrl: null,
          license: 'synthetic',
          downloadStatus: 'missing',
          reason: 'demo_pdf_not_provided',
          artifactRef: null,
        },
        {
          paperId: 'DEMO-002',
          citationKey: 'demo_memory_retrieval',
          sourceUrl: null,
          license: 'synthetic',
          downloadStatus: 'missing',
          reason: 'demo_pdf_not_provided',
          artifactRef: null,
        },
        {
          paperId: 'DEMO-003',
          citationKey: 'demo_vlm_verify',
          sourceUrl: null,
          license: 'synthetic',
          downloadStatus: 'missing',
          reason: 'demo_pdf_not_provided',
          artifactRef: null,
        },
      ],
    },
    null,
    2,
  ),
);

files['topic/literature-handoff.md'] = await write(
  'topic/literature-handoff.md',
  `# Literature handoff (SYNTHETIC)

Selected topic: balanced fast-slow VAD with scene memory and selective VLM.
Evidence IDs: DEMO-001, DEMO-002, DEMO-003.
Fulltext PDFs not provided — see paper-manifest.json.
`,
);

files['topic/papers/README.md'] = await write(
  'topic/papers/README.md',
  'PDF fulltexts intentionally missing for demo. See paper-manifest.json.\n',
);

files['experiment/plan.md'] = await write(
  'experiment/plan.md',
  `# Experiment plan (SYNTHETIC DEMO)

## Summary
Teach fast-slow VAD with scene memory and selective VLM review.

## Hypotheses
H1: Uncertainty-triggered VLM improves F1 vs lightweight-only under fixed budget.
H2: Scene memory further reduces VLM calls without harming simulated AUROC.

## Disclosure
All metrics are simulated teaching numbers, not real benchmark claims.
`,
);

files['experiment/innovations.json'] = await write(
  'experiment/innovations.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      simulated: true,
      items: [
        {
          id: 'I1',
          title: '不确定性触发',
          selected: true,
          hypothesis: 'Only review uncertain clips',
          implementation: 'threshold on s and u',
          baseline: 'always/never VLM',
          ablation: 'trigger on/off',
          cost: 'low',
          acceptanceCriteria: 'call rate < 20%',
        },
        {
          id: 'I2',
          title: '场景正常记忆',
          selected: true,
          hypothesis: 'Normal memory helps hard clips',
          implementation: 'top-k retrieval',
          baseline: 'no memory',
          ablation: 'memory on/off',
          cost: 'medium',
          acceptanceCriteria: 'no test leakage',
        },
        {
          id: 'I3',
          title: '证据化 VLM 复核',
          selected: true,
          hypothesis: 'Explanations improve trust',
          implementation: 'VLM JSON evidence',
          baseline: 'score-only',
          ablation: 'VLM on/off',
          cost: 'high',
          acceptanceCriteria: 'structured outputs',
        },
        {
          id: 'I4',
          title: '融合分数校准',
          selected: false,
        },
        { id: 'I5', title: '记忆污染过滤', selected: false },
        { id: 'I6', title: '时间一致性约束', selected: false },
        { id: 'I7', title: '跨场景适配', selected: false },
      ],
    },
    null,
    2,
  ),
);

files['experiment/config.json'] = await write(
  'experiment/config.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      mode: 'simulated',
      datasetId: 'camera-demo',
      clipFrames: 16,
      sampleFps: 4,
      seeds: [11, 23, 47],
      trigger: { scoreThreshold: 0.65, uncertaintyThreshold: 0.2 },
      memory: { topK: 5, maxEntries: 10000, excludeTestLabels: true },
      fusion: { fastWeight: 0.4, memoryWeight: 0.2, vlmWeight: 0.4 },
      selectedInnovations: ['I1', 'I2', 'I3'],
    },
    null,
    2,
  ),
);

files['experiment/dataset-manifest.json'] = await write(
  'experiment/dataset-manifest.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      simulated: true,
      primary: {
        id: 'camera-demo',
        type: 'synthetic',
        bundled: true,
        note: 'Teaching clips only',
      },
      externalCandidates: [
        { id: 'UCF-Crime', bundled: false, status: 'not_verified' },
        { id: 'XD-Violence', bundled: false, status: 'not_verified' },
        { id: 'ShanghaiTech', bundled: false, status: 'not_verified' },
        { id: 'UBnormal', bundled: false, status: 'not_verified' },
      ],
    },
    null,
    2,
  ),
);

files['experiment/algorithm-details.md'] = await write(
  'experiment/algorithm-details.md',
  `# Algorithm details (SYNTHETIC)

sample_clip -> fast_score(s,u) -> should_review(u) -> retrieve_memory -> verify_with_vlm -> calibrate -> output_event.
`,
);

files['experiment/code/pipeline.py'] = await write(
  'experiment/code/pipeline.py',
  '"""SYNTHETIC DEMO pseudocode — implementationStatus=pseudocode"""\n\ndef run_pipeline(video, cfg, memory):\n    return {"score": 0.0, "path": "fast"}\n',
);

files['experiment/metrics/main.csv'] = await write(
  'experiment/metrics/main.csv',
  [
    'dataset,method,auroc_percent,ap_percent,f1_percent,vlm_call_percent,mean_latency_ms,simulated',
    'camera-demo,Lightweight,81.2,57.8,61.4,0,18,true',
    'camera-demo,VLM-all,85.9,64.1,66.2,100,680,true',
    'camera-demo,FastSlow-I1,84.8,62.5,65.1,18,137,true',
    'camera-demo,MemoryFastSlow-I1I2I3,87.1,67.2,68.0,12,99,true',
    '',
  ].join('\n'),
);

files['experiment/metrics/ablation.csv'] = await write(
  'experiment/metrics/ablation.csv',
  [
    'variant,I1,I2,I3,auroc_percent,ap_percent,mean_latency_ms,simulated',
    'baseline,false,false,false,81.2,57.8,18,true',
    'trigger,true,false,false,84.8,62.5,137,true',
    'trigger-memory,true,true,false,85.6,64.3,103,true',
    'full,true,true,true,87.1,67.2,99,true',
    '',
  ].join('\n'),
);

files['experiment/metrics/seeds.csv'] = await write(
  'experiment/metrics/seeds.csv',
  [
    'dataset,method,seed,auroc_percent,ap_percent,f1_percent,simulated',
    'camera-demo,MemoryFastSlow-I1I2I3,11,86.8,66.9,67.7,true',
    'camera-demo,MemoryFastSlow-I1I2I3,23,87.1,67.2,68.0,true',
    'camera-demo,MemoryFastSlow-I1I2I3,47,87.4,67.5,68.3,true',
    '',
  ].join('\n'),
);

files['experiment/results.md'] = await write(
  'experiment/results.md',
  `# Results (SIMULATED DEMO)

Relative to Lightweight, simulated AUROC +5.9pp; VLM call rate 12% vs 100% for VLM-all.
Not a public benchmark claim.
`,
);

files['experiment/figures/comparison.png'] = await write(
  'experiment/figures/comparison.png',
  png,
);
files['experiment/figures/architecture.png'] = await write(
  'experiment/figures/architecture.png',
  png,
);
files['experiment/figures/generation.json'] = await write(
  'experiment/figures/generation.json',
  JSON.stringify(
    {
      comparison: {
        prompt:
          'CameraVAD teaching Demo comparison figure; SIMULATED DEMO title; use main.csv values only.',
        tool: 'placeholder',
        model: null,
        generatedAt: '2026-09-11T12:30:00Z',
        inputArtifactRefs: ['experiment/metrics/main.csv'],
        outputSha256: files['experiment/figures/comparison.png'],
        verification: 'placeholder_png_not_gpt_generated',
        status: 'placeholder',
      },
      architecture: {
        prompt:
          'Framework: camera->sample->fast score->uncertainty->memory->VLM->fusion; mark I1/I2/I3.',
        tool: 'placeholder',
        model: null,
        generatedAt: '2026-09-11T12:31:00Z',
        inputArtifactRefs: ['experiment/algorithm-details.md'],
        outputSha256: files['experiment/figures/architecture.png'],
        verification: 'placeholder_png_not_gpt_generated',
        status: 'placeholder',
      },
    },
    null,
    2,
  ),
);

files['writing/outline.md'] = await write(
  'writing/outline.md',
  '# Outline\n\nAbstract, Intro, Related Work, Method, Experiments, Conclusion.\n',
);
files['writing/paper-metadata.json'] = await write(
  'writing/paper-metadata.json',
  JSON.stringify(
    {
      title:
        'Scene-Memory Guided Fast–Slow Video Anomaly Detection with Selective Vision–Language Verification',
      abstract:
        '我们研究固定摄像头异常检测的推理成本问题，提出轻量筛查、场景记忆和按需视觉语言复核流程。本文教学示例使用合成数据说明方法与评估过程，不报告真实模型性能。',
      template: {
        name: 'cvpr',
        version: 'unbundled',
        engine: 'pdflatex',
        status: 'missing_template',
      },
      simulated: true,
    },
    null,
    2,
  ),
);
files['writing/sections/abstract.md'] = await write(
  'writing/sections/abstract.md',
  '教学摘要：合成数据演示快慢双通路与场景记忆。不报告真实性能。\n',
);
files['writing/paper.tex'] = await write(
  'writing/paper.tex',
  '% SYNTHETIC DEMO\n\\documentclass{article}\n\\begin{document}\nScene-Memory Guided Fast--Slow VAD\n\\end{document}\n',
);
files['writing/references.bib'] = await write('writing/references.bib', bib);
files['writing/figures/comparison.png'] = await write(
  'writing/figures/comparison.png',
  png,
);
files['writing/figures/architecture.png'] = await write(
  'writing/figures/architecture.png',
  png,
);
files['writing/template/README.md'] = await write(
  'writing/template/README.md',
  'CVPR template not bundled.\n',
);
files['writing/paper.pdf'] = await write('writing/paper.pdf', pdf);
files['writing/compile-log.txt'] = await write(
  'writing/compile-log.txt',
  'PLACEHOLDER: PDF not compiled from LaTeX; placeholder PDF only.\n',
);
files['writing/source-manifest.json'] = await write(
  'writing/source-manifest.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      sections: {
        abstract: {
          inputs: ['topic/intake.json', 'topic/confirmed-topic.json'],
        },
        related: { inputs: ['topic/core-references.csv'] },
        method: {
          inputs: [
            'experiment/algorithm-details.md',
            'experiment/config.json',
          ],
        },
        experiments: {
          inputs: ['experiment/metrics/main.csv', 'experiment/results.md'],
        },
      },
    },
    null,
    2,
  ),
);

files['submission/venue.json'] = await write(
  'submission/venue.json',
  JSON.stringify({ venue: 'Demo Workshop', year: 2026, simulated: true }, null, 2),
);
files['submission/checklist.json'] = await write(
  'submission/checklist.json',
  JSON.stringify(
    {
      anonymous: true,
      pageLimit: 8,
      simulated: true,
      items: ['pdf', 'rebuttal'],
    },
    null,
    2,
  ),
);
files['submission/submission-package.zip'] = await write(
  'submission/submission-package.zip',
  Buffer.from([0x50, 0x4b, 0x05, 0x06, ...Array(18).fill(0)]),
);
files['submission/reviews.json'] = await write(
  'submission/reviews.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      simulated: true,
      scale: { min: 1, max: 10 },
      reviewers: [
        {
          id: 'R1',
          score: 6,
          confidence: 3,
          summary: '预算控制思路清晰',
          strengths: ['快慢路径可解释'],
          weaknesses: ['缺少真实测量'],
          questions: [
            {
              id: 'R1-Q1',
              text: '请提供不同触发阈值的成本曲线',
            },
          ],
        },
        {
          id: 'R2',
          score: 5,
          confidence: 4,
          summary: '需证明场景记忆的作用',
          strengths: ['模块容易拆分'],
          weaknesses: ['消融组合不足'],
          questions: [
            {
              id: 'R2-Q1',
              text: '如何避免测试集信息进入记忆库？',
            },
          ],
        },
        {
          id: 'R3',
          score: 6,
          confidence: 3,
          summary: '适合形成原型',
          strengths: ['输出解释具有应用价值'],
          weaknesses: ['跨场景验证不足'],
          questions: [
            {
              id: 'R3-Q1',
              text: '长期光照变化是否造成记忆漂移？',
            },
          ],
        },
      ],
    },
    null,
    2,
  ),
);
files['submission/reviews.md'] = await write(
  'submission/reviews.md',
  '# Reviews (simulated)\nSee reviews.json\n',
);
files['submission/rebuttal.md'] = await write(
  'submission/rebuttal.md',
  `# Rebuttal (simulated)

R1-Q1: 感谢建议。当前结果为教学模拟，我们将按固定验证集阈值网格补充实测成本曲线。
R2-Q1: 记忆仅从训练正常片段建立；将在数据 manifest 中保存划分哈希和构建日志。
R3-Q1: 增加跨场景测试与记忆更新策略比较；当前不声称已验证漂移鲁棒性。
`,
);
files['submission/response-map.json'] = await write(
  'submission/response-map.json',
  JSON.stringify(
    {
      'R1-Q1': {
        responseSection: 'rebuttal.md#R1-Q1',
        evidenceArtifactIds: [],
        status: 'planned',
      },
      'R2-Q1': {
        responseSection: 'rebuttal.md#R2-Q1',
        evidenceArtifactIds: [],
        status: 'planned',
      },
      'R3-Q1': {
        responseSection: 'rebuttal.md#R3-Q1',
        evidenceArtifactIds: [],
        status: 'planned',
      },
    },
    null,
    2,
  ),
);
files['submission/decision.json'] = await write(
  'submission/decision.json',
  JSON.stringify(
    {
      simulated: true,
      decision: 'revision_required',
      reasons: ['需要真实测量与完整消融'],
    },
    null,
    2,
  ),
);

const nodes = [
  {
    key: 'intake',
    stage: 'topic.intake',
    files: [
      {
        key: 'intake-json',
        path: 'topic/intake.json',
        role: 'project-intake',
        mediaType: 'application/json',
      },
    ],
    inputs: [],
  },
  {
    key: 'first-search',
    stage: 'topic.first-search',
    files: [
      {
        key: 'search-strategy',
        path: 'topic/search-strategy.json',
        role: 'search-strategy',
        mediaType: 'application/json',
      },
      {
        key: 'search-iterations',
        path: 'topic/search-iterations.jsonl',
        role: 'search-iterations',
        mediaType: 'application/x-ndjson',
      },
      {
        key: 'papers-csv',
        path: 'topic/candidate-papers.csv',
        role: 'candidate-papers',
        mediaType: 'text/csv',
      },
      {
        key: 'screening-csv',
        path: 'topic/screening.csv',
        role: 'screening-log',
        mediaType: 'text/csv',
      },
    ],
    inputs: ['intake-json'],
  },
  {
    key: 'candidates',
    stage: 'topic.candidates',
    files: [
      {
        key: 'landscape',
        path: 'topic/landscape.md',
        role: 'topic-landscape',
        mediaType: 'text/markdown',
      },
      {
        key: 'candidate-topics',
        path: 'topic/candidate-topics.json',
        role: 'candidate-topics',
        mediaType: 'application/json',
      },
    ],
    inputs: ['papers-csv', 'screening-csv'],
  },
  {
    key: 'confirmation',
    stage: 'topic.confirmation',
    files: [
      {
        key: 'confirmed-topic',
        path: 'topic/confirmed-topic.json',
        role: 'confirmed-topic',
        mediaType: 'application/json',
      },
    ],
    inputs: ['candidate-topics'],
  },
  {
    key: 'core-literature',
    stage: 'topic.core-literature',
    files: [
      {
        key: 'core-references',
        path: 'topic/core-references.csv',
        role: 'core-references',
        mediaType: 'text/csv',
      },
      {
        key: 'literature-bib',
        path: 'topic/references.bib',
        role: 'literature-bib',
        mediaType: 'application/x-bibtex',
      },
      {
        key: 'paper-manifest',
        path: 'topic/paper-manifest.json',
        role: 'paper-manifest',
        mediaType: 'application/json',
      },
      {
        key: 'literature-handoff',
        path: 'topic/literature-handoff.md',
        role: 'literature-handoff',
        mediaType: 'text/markdown',
      },
    ],
    inputs: ['confirmed-topic'],
  },
  {
    key: 'experiment-plan',
    stage: 'experiment.plan',
    files: [
      {
        key: 'experiment-plan',
        path: 'experiment/plan.md',
        role: 'experiment-plan',
        mediaType: 'text/markdown',
      },
      {
        key: 'experiment-config',
        path: 'experiment/config.json',
        role: 'experiment-config',
        mediaType: 'application/json',
      },
      {
        key: 'dataset-manifest',
        path: 'experiment/dataset-manifest.json',
        role: 'dataset-manifest',
        mediaType: 'application/json',
      },
    ],
    inputs: ['confirmed-topic', 'literature-handoff'],
  },
  {
    key: 'experiment-run',
    stage: 'experiment.run',
    files: [
      {
        key: 'results-md',
        path: 'experiment/results.md',
        role: 'experiment-results',
        mediaType: 'text/markdown',
      },
      {
        key: 'algorithm-details',
        path: 'experiment/algorithm-details.md',
        role: 'method-architecture',
        mediaType: 'text/markdown',
      },
      {
        key: 'comparison-png',
        path: 'experiment/figures/comparison.png',
        role: 'paper-figure',
        mediaType: 'image/png',
        placeholder: true,
      },
      {
        key: 'architecture-png',
        path: 'experiment/figures/architecture.png',
        role: 'paper-figure',
        mediaType: 'image/png',
        placeholder: true,
      },
    ],
    inputs: ['experiment-plan', 'experiment-config'],
  },
  {
    key: 'writing-outline',
    stage: 'writing.outline',
    files: [
      {
        key: 'outline',
        path: 'writing/outline.md',
        role: 'paper-outline',
        mediaType: 'text/markdown',
      },
    ],
    inputs: ['confirmed-topic', 'results-md'],
  },
  {
    key: 'writing-draft',
    stage: 'writing.draft',
    files: [
      {
        key: 'paper-tex',
        path: 'writing/paper.tex',
        role: 'paper-source',
        mediaType: 'application/x-tex',
      },
      {
        key: 'paper-metadata',
        path: 'writing/paper-metadata.json',
        role: 'paper-metadata',
        mediaType: 'application/json',
      },
    ],
    inputs: ['outline'],
  },
  {
    key: 'writing-final',
    stage: 'writing.final',
    files: [
      {
        key: 'paper-pdf',
        path: 'writing/paper.pdf',
        role: 'paper-pdf',
        mediaType: 'application/pdf',
        placeholder: true,
      },
    ],
    inputs: ['paper-tex'],
  },
  {
    key: 'submission-prepare',
    stage: 'submission.prepare',
    files: [
      {
        key: 'venue',
        path: 'submission/venue.json',
        role: 'venue-requirements',
        mediaType: 'application/json',
      },
      {
        key: 'package',
        path: 'submission/submission-package.zip',
        role: 'submission-package',
        mediaType: 'application/zip',
      },
    ],
    inputs: ['paper-pdf'],
  },
  {
    key: 'review-round1',
    stage: 'submission.review.round1',
    files: [
      {
        key: 'reviews',
        path: 'submission/reviews.json',
        role: 'review-round1',
        mediaType: 'application/json',
      },
    ],
    inputs: ['package'],
  },
  {
    key: 'rebuttal',
    stage: 'submission.rebuttal',
    files: [
      {
        key: 'rebuttal-md',
        path: 'submission/rebuttal.md',
        role: 'rebuttal',
        mediaType: 'text/markdown',
      },
    ],
    inputs: ['reviews'],
  },
  {
    key: 'decision',
    stage: 'submission.decision',
    files: [
      {
        key: 'decision',
        path: 'submission/decision.json',
        role: 'submission-decision',
        mediaType: 'application/json',
      },
    ],
    inputs: ['rebuttal-md'],
  },
];

for (const node of nodes) {
  for (const file of node.files) {
    file.sha256 = files[file.path];
    if (!file.sha256) throw new Error(`missing hash for ${file.path}`);
  }
}

const missing = [
  'topic/papers/DEMO-001.pdf',
  'topic/papers/DEMO-002.pdf',
  'topic/papers/DEMO-003.pdf',
  'writing/template/cvpr.sty',
  'GPT-generated comparison.png (current file is placeholder)',
  'GPT-generated architecture.png (current file is placeholder)',
  'Compiled paper.pdf from LaTeX (current file is placeholder)',
];

await write(
  'demo/demo-manifest.json',
  JSON.stringify(
    {
      schemaVersion: 2,
      demoId: 'camera-vad-scene-memory',
      version: '1.0.0',
      simulated: true,
      nodes,
      missing,
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify(
    {
      root,
      hashedFiles: Object.keys(files).length,
      missing: missing.length,
      sampleHash: files['topic/intake.json'],
    },
    null,
    2,
  ),
);
