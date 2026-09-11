# CameraVAD Demo 文件格式与实际示例

更新：2026-09-11。对应仓库基线 `a612f9f` 的 `demo-packages/camera-vad-scene-memory/`。
本文是数据参考，不是执行计划；剩余实现与验收只维护在 [工作目录 TODO](./four-module-workflow-migration-todo.md)。

## 1. 如何阅读与使用

此包演示“固定摄像头视频异常检测 + 场景记忆 + 视觉语言大模型按需复核”。文献记录和实验指标是合成教学数据；两张图及论文 PDF 仍是占位，完整论文与模拟代码尚待补齐。下面代码块取自实际文件，不是已完成能力的声明。

使用时将包复制到独立论文目录，在首页填写该服务端绝对路径并注册，点击“从工作目录载入 Demo”。不要直接在仓库模板目录进行日常研究；注册/导入会写 project 元数据和 .navivisor。当前四模块的业务数据恢复仍待完成，按钮成功不保证各页面已展示该项目内容。

## 2. 通用格式和文件关系

- 文本统一 UTF-8。JSON 为对象/数组，JSONL 每行一个对象；CSV 使用固定表头并正确引用含逗号/换行的值。
- 项目以 projectId 标识，运行以 runId 标识，每个固化文件以 artifactId 和 SHA-256 标识。包内先用稳定 file key 表示依赖，导入后映射为 artifact IDs。
- paths 相对论文根目录；不要保存开发者绝对路径。文件重命名/修改后同时更新清单路径、依赖和真实字节 SHA-256。
- schemaVersion 是格式版本，demo version 是内容版本，二者不能混用。本文描述当前 v2 manifest；TODO 建议的 v3 尚未实现。
- synthetic 表示文献等数据为合成；simulated 表示研究过程/结果是模拟；placeholder 表示文件还不是可用成果。这三个字段含义不同。
- PNG/PDF/ZIP 要验证真实格式与可读性；哈希只能证明字节匹配，不能证明内容完整或科学结论真实。
- JSON/CSV 为结构化事实源时，Markdown、论文正文和图表应从相同版本派生，避免各自复制后漂移。

目录：
```text
project.json
demo/demo-manifest.json
topic/        研究输入、检索记录、选题、文献及 PDF 清单
experiment/   方案、算法、配置、模拟代码、指标、图与生成来源
writing/      提纲、章节、TeX、BibTeX、模板、图、PDF与来源
submission/   投稿要求、检查、压缩包、审稿、回复和决定
.navivisor/   导入后生成的运行记录、快照、索引与项目对话
```

目标依赖：
intake → first-search → candidates → confirmation → core-literature → experiment-plan → experiment-run → writing → submission。
写作还应直接引用核心文献、算法、指标和图；现有 manifest 的输入不够完整，不能只根据此链图假定已贯通。

## 3. 导入清单读法

当前 manifest 声明 14 个节点、28 个文件；目录实际有 49 个文件（含说明与占位媒体）。文件不在清单中，当前 importer 就不会将它作为该 Demo 的 stage 产物登记。

| 字段 | 类型 | 含义 |
|---|---|---|
| schemaVersion | number | 当前为 2 |
| demoId / version | string | 示例身份与内容版本 |
| simulated | boolean | 当前为 true |
| nodes[].key / stage | string | 节点身份与服务端阶段枚举 |
| nodes[].inputs | string[] | 上游 files[].key，不是节点 key |
| files[].key / path | string | 包内文件身份与相对路径 |
| files[].role / mediaType | string | 业务角色与媒体类型，需匹配服务端契约 |
| files[].sha256 | string | 64 位十六进制的实际文件哈希 |
| files[].placeholder | boolean? | 当前占位标记；导入器隔离尚需完善 |
| missing | string[] | 当前缺失清单，包含路径和说明文本 |

实际第一个节点：
```json
{
  "schemaVersion": 2,
  "demoId": "camera-vad-scene-memory",
  "version": "1.0.0",
  "simulated": true,
  "nodes": [
    {
      "key": "intake",
      "stage": "topic.intake",
      "files": [
        {
          "key": "intake-json",
          "path": "topic/intake.json",
          "role": "project-intake",
          "mediaType": "application/json",
          "sha256": "fcf0cbbde01b62467cee32f7b4eda534bd5f2375b2811005a51639a4eadd6371"
        }
      ],
      "inputs": []
    }
  ],
  "missing": [
    "topic/papers/DEMO-001.pdf",
    "topic/papers/DEMO-002.pdf",
    "topic/papers/DEMO-003.pdf",
    "writing/template/cvpr.sty",
    "GPT-generated comparison.png (current file is placeholder)",
    "GPT-generated architecture.png (current file is placeholder)",
    "Compiled paper.pdf from LaTeX (current file is placeholder)"
  ]
}
```

以上只截取 intake 节点；完整清单见 [demo-manifest.json](../demo-packages/camera-vad-scene-memory/demo/demo-manifest.json)，不能用这个截取例子覆盖它。

| 节点 | stage | 输入文件 key | 输出文件 key |
|---|---|---|---|
| intake | topic.intake | 无 | intake-json |
| first-search | topic.first-search | intake-json | search-strategy, search-iterations, papers-csv, screening-csv |
| candidates | topic.candidates | papers-csv, screening-csv | landscape, candidate-topics |
| confirmation | topic.confirmation | candidate-topics | confirmed-topic |
| core-literature | topic.core-literature | confirmed-topic | core-references, literature-bib, paper-manifest, literature-handoff |
| experiment-plan | experiment.plan | confirmed-topic, literature-handoff | experiment-plan, experiment-config, dataset-manifest |
| experiment-run | experiment.run | experiment-plan, experiment-config | results-md, algorithm-details, comparison-png, architecture-png |
| writing-outline | writing.outline | confirmed-topic, results-md | outline |
| writing-draft | writing.draft | outline | paper-tex, paper-metadata |
| writing-final | writing.final | paper-tex | paper-pdf |
| submission-prepare | submission.prepare | paper-pdf | venue, package |
| review-round1 | submission.review.round1 | package | reviews |
| rebuttal | submission.rebuttal | reviews | rebuttal-md |
| decision | submission.decision | rebuttal-md | decision |

## 4. 逐文件说明与当前示例

以下路径均相对 Demo 根目录。“未纳入清单”不一定是错误：包 README 是说明；但需被下游消费的指标、正文、引用、证据文件必须补入。

### experiment/algorithm-details.md

方法细节，应与 config 和 code 一致。应写输入输出、快慢路径、检索、复核和融合；当前为概要。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/algorithm-details.md) · 152 字节 · 清单内：`experiment.run` / `method-architecture`。

```markdown
# Algorithm details (SYNTHETIC)

sample_clip -> fast_score(s,u) -> should_review(u) -> retrieve_memory -> verify_with_vlm -> calibrate -> output_event.
```

### experiment/code/pipeline.py

模拟代码入口。当前函数返回固定 score=0，只是 stub；不能称为已实现检测、训练或完整模拟流程。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/code/pipeline.py) · 149 字节 · 未纳入导入清单。

```python
"""SYNTHETIC DEMO pseudocode — implementationStatus=pseudocode"""

def run_pipeline(video, cfg, memory):
    return {"score": 0.0, "path": "fast"}
```

### experiment/config.json

运行参数。mode=simulated；clipFrames/sampleFps 为片段参数；seeds 支持重复模拟；trigger 为触发阈值；memory 为检索参数；fusion 权重；selectedInnovations 关联创新 ID。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/config.json) · 474 字节 · 清单内：`experiment.plan` / `experiment-config`。

```json
{
  "schemaVersion": 1,
  "mode": "simulated",
  "datasetId": "camera-demo",
  "clipFrames": 16,
  "sampleFps": 4,
  "seeds": [
    11,
    23,
    47
  ],
  "trigger": {
    "scoreThreshold": 0.65,
    "uncertaintyThreshold": 0.2
  },
  "memory": {
    "topK": 5,
    "maxEntries": 10000,
    "excludeTestLabels": true
  },
  "fusion": {
    "fastWeight": 0.4,
    "memoryWeight": 0.2,
    "vlmWeight": 0.4
  },
  "selectedInnovations": [
    "I1",
    "I2",
    "I3"
  ]
}
```

### experiment/dataset-manifest.json

数据依赖声明。primary 描述示例数据，externalCandidates 描述未提供的外部数据集。当前 primary.bundled=true 只是文件声明，本目录未发现视频文件，不能据此宣称已附带视频。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/dataset-manifest.json) · 576 字节 · 清单内：`experiment.plan` / `dataset-manifest`。

```json
{
  "schemaVersion": 1,
  "simulated": true,
  "primary": {
    "id": "camera-demo",
    "type": "synthetic",
    "bundled": true,
    "note": "Teaching clips only"
  },
  "externalCandidates": [
    {
      "id": "UCF-Crime",
      "bundled": false,
      "status": "not_verified"
    },
    {
      "id": "XD-Violence",
      "bundled": false,
      "status": "not_verified"
    },
    {
      "id": "ShanghaiTech",
      "bundled": false,
      "status": "not_verified"
    },
    {
      "id": "UBnormal",
      "bundled": false,
      "status": "not_verified"
    }
  ]
}
```

### experiment/figures/architecture.png

算法框架图，当前占位 PNG。最终显示摄像头→采样→快路径→触发→记忆→VLM→融合及 I1/I2/I3。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/figures/architecture.png) · 70 字节 · 清单内：`experiment.run` / `paper-figure` · placeholder=true。

二进制文件不以文本示例代替。请通过预览器检查；当前占位 PNG/PDF不能作为最终交付，ZIP 的成员内容也需独立验证。

### experiment/figures/comparison.png

效果比较图，当前占位 PNG。最终应通过 GPT 生图产出可读模拟示意，并核对主表数值；不能当真实监控证据。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/figures/comparison.png) · 70 字节 · 清单内：`experiment.run` / `paper-figure` · placeholder=true。

二进制文件不以文本示例代替。请通过预览器检查；当前占位 PNG/PDF不能作为最终交付，ZIP 的成员内容也需独立验证。

### experiment/figures/generation.json

图片生成来源。prompt/tool/model/generatedAt/inputArtifactRefs/outputSha256/verification/status。当前 tool/status 为 placeholder，无实际 GPT 生成证据。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/figures/generation.json) · 931 字节 · 未纳入导入清单。

```json
{
  "comparison": {
    "prompt": "CameraVAD teaching Demo comparison figure; SIMULATED DEMO title; use main.csv values only.",
    "tool": "placeholder",
    "model": null,
    "generatedAt": "2026-09-11T12:30:00Z",
    "inputArtifactRefs": [
      "experiment/metrics/main.csv"
    ],
    "outputSha256": "c414cd0e204de974f73753c7e28d7638e7b3691bb8b1a2bab6b25bb7fed7ce77",
    "verification": "placeholder_png_not_gpt_generated",
    "status": "placeholder"
  },
  "architecture": {
    "prompt": "Framework: camera->sample->fast score->uncertainty->memory->VLM->fusion; mark I1/I2/I3.",
    "tool": "placeholder",
    "model": null,
    "generatedAt": "2026-09-11T12:31:00Z",
    "inputArtifactRefs": [
      "experiment/algorithm-details.md"
    ],
    "outputSha256": "c414cd0e204de974f73753c7e28d7638e7b3691bb8b1a2bab6b25bb7fed7ce77",
    "verification": "placeholder_png_not_gpt_generated",
    "status": "placeholder"
  }
}
```

### experiment/innovations.json

七项创新列表。selected 表示选入方案；hypothesis/implementation/baseline/ablation/cost/acceptanceCriteria 定义可验证设计。当前 I4–I7 字段未补齐。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/innovations.json) · 1411 字节 · 未纳入导入清单。

```json
{
  "schemaVersion": 1,
  "simulated": true,
  "items": [
    {
      "id": "I1",
      "title": "不确定性触发",
      "selected": true,
      "hypothesis": "Only review uncertain clips",
      "implementation": "threshold on s and u",
      "baseline": "always/never VLM",
      "ablation": "trigger on/off",
      "cost": "low",
      "acceptanceCriteria": "call rate < 20%"
    },
    {
      "id": "I2",
      "title": "场景正常记忆",
      "selected": true,
      "hypothesis": "Normal memory helps hard clips",
      "implementation": "top-k retrieval",
      "baseline": "no memory",
      "ablation": "memory on/off",
      "cost": "medium",
      "acceptanceCriteria": "no test leakage"
    },
    {
      "id": "I3",
      "title": "证据化 VLM 复核",
      "selected": true,
      "hypothesis": "Explanations improve trust",
      "implementation": "VLM JSON evidence",
      "baseline": "score-only",
      "ablation": "VLM on/off",
      "cost": "high",
      "acceptanceCriteria": "structured outputs"
    },
    {
      "id": "I4",
      "title": "融合分数校准",
      "selected": false
    },
    {
      "id": "I5",
      "title": "记忆污染过滤",
      "selected": false
    },
    {
      "id": "I6",
      "title": "时间一致性约束",
      "selected": false
    },
    {
      "id": "I7",
      "title": "跨场景适配",
      "selected": false
    }
  ]
}
```

### experiment/metrics/ablation.csv

消融表。I1/I2/I3 布尔值描述模块组合；指标与主表保持一致，不能把递增配置直接解释为独立因果贡献。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/metrics/ablation.csv) · 245 字节 · 未纳入导入清单。

```csv
variant,I1,I2,I3,auroc_percent,ap_percent,mean_latency_ms,simulated
baseline,false,false,false,81.2,57.8,18,true
trigger,true,false,false,84.8,62.5,137,true
trigger-memory,true,true,false,85.6,64.3,103,true
full,true,true,true,87.1,67.2,99,true
```

### experiment/metrics/main.csv

主比较表。dataset/method 是关联键，*_percent 单位为百分数，mean_latency_ms 为毫秒，simulated 为真。每行代表方法的一组汇总指标。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/metrics/main.csv) · 302 字节 · 未纳入导入清单。

```csv
dataset,method,auroc_percent,ap_percent,f1_percent,vlm_call_percent,mean_latency_ms,simulated
camera-demo,Lightweight,81.2,57.8,61.4,0,18,true
camera-demo,VLM-all,85.9,64.1,66.2,100,680,true
camera-demo,FastSlow-I1,84.8,62.5,65.1,18,137,true
camera-demo,MemoryFastSlow-I1I2I3,87.1,67.2,68.0,12,99,true
```

### experiment/metrics/seeds.csv

逐 seed 的模拟指标，用于核算均值与标准差。仅覆盖表中实际列出的方法；未有种子数据的方法不报告虚构误差范围。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/metrics/seeds.csv) · 237 字节 · 未纳入导入清单。

```csv
dataset,method,seed,auroc_percent,ap_percent,f1_percent,simulated
camera-demo,MemoryFastSlow-I1I2I3,11,86.8,66.9,67.7,true
camera-demo,MemoryFastSlow-I1I2I3,23,87.1,67.2,68.0,true
camera-demo,MemoryFastSlow-I1I2I3,47,87.4,67.5,68.3,true
```

### experiment/plan.md

实验方案的人类可读入口。应覆盖概要、baseline、数据划分、公式、创新、操作步骤、预算和预期；当前仅摘要与两条假设，尚不完整。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/plan.md) · 370 字节 · 清单内：`experiment.plan` / `experiment-plan`。

```markdown
# Experiment plan (SYNTHETIC DEMO)

## Summary
Teach fast-slow VAD with scene memory and selective VLM review.

## Hypotheses
H1: Uncertainty-triggered VLM improves F1 vs lightweight-only under fixed budget.
H2: Scene memory further reduces VLM calls without harming simulated AUROC.

## Disclosure
All metrics are simulated teaching numbers, not real benchmark claims.
```

### experiment/results.md

实验结果正文，从 metrics 表生成比较及讨论；当前只有简短结论，尚无完整表格/失败案例。

[打开实际文件](../demo-packages/camera-vad-scene-memory/experiment/results.md) · 146 字节 · 清单内：`experiment.run` / `experiment-results`。

```markdown
# Results (SIMULATED DEMO)

Relative to Lightweight, simulated AUROC +5.9pp; VLM call rate 12% vs 100% for VLM-all.
Not a public benchmark claim.
```

### project.json

项目身份和四模块路径。schemaVersion=2；projectId 为 UUID；title/description 是页面摘要；directories 为项目根内相对目录；demo 描述示例身份与版本。创建独立副本应重分配项目身份。

[打开实际文件](../demo-packages/camera-vad-scene-memory/project.json) · 571 字节 · 未纳入导入清单。

```json
{
  "schemaVersion": 2,
  "projectId": "b845db02-b48e-40eb-8bf1-978e2546ee4e",
  "title": "场景记忆与大模型按需复核的视频异常检测",
  "description": "面向固定摄像头，使用轻量筛查、场景记忆和视觉语言大模型复核异常片段。",
  "language": "zh-CN",
  "directories": {
    "topic": "topic",
    "experiment": "experiment",
    "writing": "writing",
    "submission": "submission"
  },
  "demo": {
    "id": "camera-vad-scene-memory",
    "version": "1.0.0",
    "simulated": true
  },
  "createdAt": "2026-09-11T12:00:00Z"
}
```

### README.md

Demo 包级介绍，非业务数据。SYNTHETIC 声明必须保留。

[打开实际文件](../demo-packages/camera-vad-scene-memory/README.md) · 87 字节 · 未纳入导入清单。

```markdown
# CameraVAD-SceneMemory Demo

SYNTHETIC teaching package. Not real benchmark evidence.
```

### submission/checklist.json

投稿检查清单。当前 items 为字符串，待升级成含 required/status/reason/evidenceRefs 的逐项结果。

[打开实际文件](../demo-packages/camera-vad-scene-memory/submission/checklist.json) · 106 字节 · 未纳入导入清单。

```json
{
  "anonymous": true,
  "pageLimit": 8,
  "simulated": true,
  "items": [
    "pdf",
    "rebuttal"
  ]
}
```

### submission/decision.json

模拟最终决定和理由；不表示真实录用。

[打开实际文件](../demo-packages/camera-vad-scene-memory/submission/decision.json) · 118 字节 · 清单内：`submission.decision` / `submission-decision`。

```json
{
  "simulated": true,
  "decision": "revision_required",
  "reasons": [
    "需要真实测量与完整消融"
  ]
}
```

### submission/rebuttal.md

作者逐条回复，按 R1-Q1 等稳定问题 ID 组织；未执行补实验只能写计划。

[打开实际文件](../demo-packages/camera-vad-scene-memory/submission/rebuttal.md) · 352 字节 · 清单内：`submission.rebuttal` / `rebuttal`。

```markdown
# Rebuttal (simulated)

R1-Q1: 感谢建议。当前结果为教学模拟，我们将按固定验证集阈值网格补充实测成本曲线。
R2-Q1: 记忆仅从训练正常片段建立；将在数据 manifest 中保存划分哈希和构建日志。
R3-Q1: 增加跨场景测试与记忆更新策略比较；当前不声称已验证漂移鲁棒性。
```

### submission/response-map.json

问题到回复章节和证据的关系。当前 evidenceArtifactIds 为空、status=planned；不能称为已提供证据。

[打开实际文件](../demo-packages/camera-vad-scene-memory/submission/response-map.json) · 353 字节 · 未纳入导入清单。

```json
{
  "R1-Q1": {
    "responseSection": "rebuttal.md#R1-Q1",
    "evidenceArtifactIds": [],
    "status": "planned"
  },
  "R2-Q1": {
    "responseSection": "rebuttal.md#R2-Q1",
    "evidenceArtifactIds": [],
    "status": "planned"
  },
  "R3-Q1": {
    "responseSection": "rebuttal.md#R3-Q1",
    "evidenceArtifactIds": [],
    "status": "planned"
  }
}
```

### submission/reviews.json

三位审稿人的结构化意见。reviewer id、score、confidence、summary、strengths、weaknesses、questions；问题 id 用于 Rebuttal 对应。

[打开实际文件](../demo-packages/camera-vad-scene-memory/submission/reviews.json) · 1255 字节 · 清单内：`submission.review.round1` / `review-round1`。

```json
{
  "schemaVersion": 1,
  "simulated": true,
  "scale": {
    "min": 1,
    "max": 10
  },
  "reviewers": [
    {
      "id": "R1",
      "score": 6,
      "confidence": 3,
      "summary": "预算控制思路清晰",
      "strengths": [
        "快慢路径可解释"
      ],
      "weaknesses": [
        "缺少真实测量"
      ],
      "questions": [
        {
          "id": "R1-Q1",
          "text": "请提供不同触发阈值的成本曲线"
        }
      ]
    },
    {
      "id": "R2",
      "score": 5,
      "confidence": 4,
      "summary": "需证明场景记忆的作用",
      "strengths": [
        "模块容易拆分"
      ],
      "weaknesses": [
        "消融组合不足"
      ],
      "questions": [
        {
          "id": "R2-Q1",
          "text": "如何避免测试集信息进入记忆库？"
        }
      ]
    },
    {
      "id": "R3",
      "score": 6,
      "confidence": 3,
      "summary": "适合形成原型",
      "strengths": [
        "输出解释具有应用价值"
      ],
      "weaknesses": [
        "跨场景验证不足"
      ],
      "questions": [
        {
          "id": "R3-Q1",
          "text": "长期光照变化是否造成记忆漂移？"
        }
      ]
    }
  ]
}
```

### submission/reviews.md

reviews.json 的可读展示版本，内容必须同步。

[打开实际文件](../demo-packages/camera-vad-scene-memory/submission/reviews.md) · 39 字节 · 未纳入导入清单。

```markdown
# Reviews (simulated)
See reviews.json
```

### submission/submission-package.zip

投稿压缩包。文件存在不代表含有效论文；最终从已校验源码/PDF/元数据重新打包，并检查成员与哈希。

[打开实际文件](../demo-packages/camera-vad-scene-memory/submission/submission-package.zip) · 22 字节 · 清单内：`submission.prepare` / `submission-package`。

二进制文件不以文本示例代替。请通过预览器检查；当前占位 PNG/PDF不能作为最终交付，ZIP 的成员内容也需独立验证。

### submission/venue.json

目标场合元数据，当前为 Demo Workshop；不能解释为真实会议配置或真实提交。

[打开实际文件](../demo-packages/camera-vad-scene-memory/submission/venue.json) · 67 字节 · 清单内：`submission.prepare` / `venue-requirements`。

```json
{
  "venue": "Demo Workshop",
  "year": 2026,
  "simulated": true
}
```

### topic/candidate-papers.csv

第一轮文献表。一行一篇，paper_id 为关联键；doi/source_url 可空；citation_count 是引用计数，synthetic 表示虚构样例。当前 DEMO 文献不得作为真实引用。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/candidate-papers.csv) · 540 字节 · 清单内：`topic.first-search` / `candidate-papers`。

```csv
paper_id,title,authors,venue,year,doi,abstract,citation_count,source,source_url,synthetic
DEMO-001,Fast Screening for Camera Anomaly Clips,Demo Author A,Demo Venue,2025,,Lightweight scoring selects suspicious camera clips.,0,demo,,true
DEMO-002,Memory Retrieval for Scene Understanding,Demo Author B,Demo Venue,2024,,Normal scene memories support retrieval and comparison.,0,demo,,true
DEMO-003,Language Guided Verification of Video Events,Demo Author C,Demo Venue,2026,,A vision language model explains uncertain event clips.,0,demo,,true
```

### topic/candidate-topics.json

三类推荐题的结构化数据。id 为课题键；profile 为 innovative/feasible/balanced；其余字段描述问题、路线、创新、可行性、风险、证据和交付。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/candidate-topics.json) · 2295 字节 · 清单内：`topic.candidates` / `candidate-topics`。

```json
{
  "schemaVersion": 1,
  "simulated": true,
  "candidates": [
    {
      "id": "cand-innovative",
      "profile": "innovative",
      "title": "事件图谱记忆与多角色复核的跨摄像头异常检测",
      "question": "结构化长期记忆能否提升跨摄像头事件推理一致性？",
      "methodSteps": [
        "事件建图",
        "检索",
        "多角色复核",
        "证据融合"
      ],
      "innovations": [
        "事件图谱",
        "多角色复核",
        "跨镜关联"
      ],
      "feasibility": "medium-high",
      "risks": [
        "图构建成本",
        "身份关联误差"
      ],
      "evidencePaperIds": [
        "DEMO-002",
        "DEMO-003"
      ],
      "expectedOutputs": [
        "graph",
        "reviews"
      ]
    },
    {
      "id": "cand-feasible",
      "profile": "feasible",
      "title": "轻量筛查与视觉语言大模型按需复核",
      "question": "只复核不确定片段能否以较低成本提升检测效果？",
      "methodSteps": [
        "轻量评分",
        "阈值触发",
        "VLM复核",
        "分数融合"
      ],
      "innovations": [
        "不确定性触发",
        "按需复核"
      ],
      "feasibility": "high",
      "risks": [
        "阈值迁移",
        "时延"
      ],
      "evidencePaperIds": [
        "DEMO-001",
        "DEMO-003"
      ],
      "expectedOutputs": [
        "metrics",
        "cost"
      ]
    },
    {
      "id": "cand-balanced",
      "profile": "balanced",
      "title": "基于场景记忆与大模型复核的快慢双通路视频异常检测",
      "question": "场景记忆能否在固定预算下改善疑难片段识别和解释？",
      "methodSteps": [
        "筛查",
        "记忆检索",
        "VLM按需复核",
        "校准融合"
      ],
      "innovations": [
        "不确定性触发",
        "场景正常记忆",
        "证据化复核与校准融合"
      ],
      "feasibility": "medium",
      "risks": [
        "记忆污染",
        "场景漂移"
      ],
      "evidencePaperIds": [
        "DEMO-001",
        "DEMO-002",
        "DEMO-003"
      ],
      "expectedOutputs": [
        "metrics",
        "explanations"
      ]
    }
  ],
  "alternates": []
}
```

### topic/candidate-topics.md

候选题可读摘要，应由 candidate-topics.json 派生并保持一致。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/candidate-topics.md) · 82 字节 · 未纳入导入清单。

```markdown
# Candidate topics (synthetic)

See candidate-topics.json. Demo selects balanced.
```

### topic/confirmed-topic.json

用户最终选题与理由。selectedCandidateId 引用候选题；标题、科学问题、路线与创新成为后续实验/写作输入。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/confirmed-topic.json) · 751 字节 · 清单内：`topic.confirmation` / `confirmed-topic`。

```json
{
  "selectedCandidateId": "cand-balanced",
  "title": "基于场景记忆与大模型复核的快慢双通路视频异常检测",
  "question": "场景记忆能否在固定预算下改善疑难片段识别和解释？",
  "methodSteps": [
    "筛查",
    "记忆检索",
    "VLM按需复核",
    "校准融合",
    "阈值验证",
    "失败分析"
  ],
  "innovations": [
    "不确定性触发",
    "场景正常记忆",
    "证据化复核与校准融合"
  ],
  "evidencePaperIds": [
    "DEMO-001",
    "DEMO-002",
    "DEMO-003"
  ],
  "selectionReason": "Balances cost and explanation for teaching demo",
  "confirmedAt": "2026-09-11T12:20:00Z",
  "feasibilityLimits": "Simulated only; no verified lift claimed",
  "simulated": true
}
```

### topic/core-references.csv

核心文献表。继承候选列，增加 citation_key、相关性说明、方法关联、发表日期、全文状态、PDF 引用、verified。verified=false 与 synthetic=true 不能当核实文献。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/core-references.csv) · 852 字节 · 清单内：`topic.core-literature` / `core-references`。

```csv
paper_id,title,authors,venue,year,doi,abstract,citation_count,source,source_url,synthetic,citation_key,relevance_reason,method_relation,publication_date,fulltext_status,pdf_artifact_ref,verified
DEMO-001,Fast Screening for Camera Anomaly Clips,Demo Author A,Demo Venue,2025,,Lightweight scoring selects suspicious camera clips.,0,demo,,true,demo_fast_screening,baseline light scorer,baseline,2025-01-01,missing,,false
DEMO-002,Memory Retrieval for Scene Understanding,Demo Author B,Demo Venue,2024,,Normal scene memories support retrieval and comparison.,0,demo,,true,demo_memory_retrieval,memory bank,memory,2024-06-01,missing,,false
DEMO-003,Language Guided Verification of Video Events,Demo Author C,Demo Venue,2026,,A vision language model explains uncertain event clips.,0,demo,,true,demo_vlm_verify,VLM verification,vlm,2026-02-01,missing,,false
```

### topic/intake.json

用户研究输入。researchDirection/Goal 为领域与目标；scenarios 为场景；constraints 为检索约束；时间窗口是此 Demo 的固定日期；resources 表达预算。当前文件没有 schemaVersion，后续补契约时需兼容。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/intake.json) · 624 字节 · 清单内：`topic.intake` / `project-intake`。

```json
{
  "researchDirection": "视频异常检测",
  "researchGoal": "结合视觉语言大模型，对固定摄像头视频低成本定位并解释异常",
  "scenarios": [
    "校园走廊",
    "停车场",
    "楼宇入口"
  ],
  "constraints": {
    "excludeDomains": [
      "生物医学"
    ],
    "fromYear": 2022,
    "targetPaperCount": {
      "min": 200,
      "preferred": 300,
      "max": 800
    }
  },
  "coreLiteratureWindow": {
    "from": "2023-09-11",
    "to": "2026-09-11"
  },
  "resources": {
    "gpuBudget": "单卡原型",
    "latencyGoalMs": 100,
    "vlmBudget": "只复核候选片段"
  }
}
```

### topic/landscape.md

主题演化和机会分析的可读报告，应引用筛选后的 paper_id。当前内容较简略，正式版本需给分母、时间与证据。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/landscape.md) · 491 字节 · 清单内：`topic.candidates` / `topic-landscape`。

```markdown
# Landscape (SYNTHETIC DEMO)

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
```

### topic/literature-handoff.md

实验交接摘要：主题、证据、baseline、创新候选及预算。应保留核心文献引用。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/literature-handoff.md) · 210 字节 · 清单内：`topic.core-literature` / `literature-handoff`。

```markdown
# Literature handoff (SYNTHETIC)

Selected topic: balanced fast-slow VAD with scene memory and selective VLM.
Evidence IDs: DEMO-001, DEMO-002, DEMO-003.
Fulltext PDFs not provided — see paper-manifest.json.
```

### topic/paper-manifest.json

每篇 PDF 获取情况。paperId/citationKey 关联文献，sourceUrl/license 表示来源，downloadStatus/reason 说明结果，artifactRef 仅指向实际登记文件。合成文献可改为 not_applicable，不能伪造来源。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/paper-manifest.json) · 769 字节 · 清单内：`topic.core-literature` / `paper-manifest`。

```json
{
  "schemaVersion": 1,
  "papers": [
    {
      "paperId": "DEMO-001",
      "citationKey": "demo_fast_screening",
      "sourceUrl": null,
      "license": "synthetic",
      "downloadStatus": "missing",
      "reason": "demo_pdf_not_provided",
      "artifactRef": null
    },
    {
      "paperId": "DEMO-002",
      "citationKey": "demo_memory_retrieval",
      "sourceUrl": null,
      "license": "synthetic",
      "downloadStatus": "missing",
      "reason": "demo_pdf_not_provided",
      "artifactRef": null
    },
    {
      "paperId": "DEMO-003",
      "citationKey": "demo_vlm_verify",
      "sourceUrl": null,
      "license": "synthetic",
      "downloadStatus": "missing",
      "reason": "demo_pdf_not_provided",
      "artifactRef": null
    }
  ]
}
```

### topic/papers/README.md

当前 PDF 缺失说明。目录尚不包含三篇实际论文 PDF。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/papers/README.md) · 71 字节 · 未纳入导入清单。

```markdown
PDF fulltexts intentionally missing for demo. See paper-manifest.json.
```

### topic/references.bib

BibTeX 文献库，条目键应与 core-references.csv 的 citation_key 一致，论文 cite 使用这些键。合成记录 note 明示并保留。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/references.bib) · 567 字节 · 清单内：`topic.core-literature` / `literature-bib`。

```bibtex
@misc{demo_fast_screening,
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
```

### topic/screening.csv

筛选记录。通过 paper_id 关联候选文献；decision/relevance_score/reason/evidence 说明保留或排除依据；摘要证据不表示读过全文。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/screening.csv) · 321 字节 · 清单内：`topic.first-search` / `screening-log`。

```csv
paper_id,decision,relevance_score,reason,evidence,reviewer,synthetic
DEMO-001,include,0.91,Matches lightweight screening baseline,abstract,demo-screener,true
DEMO-002,include,0.88,Supports scene memory retrieval,abstract,demo-screener,true
DEMO-003,include,0.90,Supports VLM verification path,abstract,demo-screener,true
```

### topic/search-iterations.jsonl

每行独立 JSON，记录查询版本、命中量、去重量、抽样数、相关样本数、估计相关率、修改原因与时间。当前两轮计数是模拟，不能等同于 candidate-papers.csv 的实际行数。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/search-iterations.jsonl) · 501 字节 · 清单内：`topic.first-search` / `search-iterations`。

```jsonl
{"iterationId":"it-1","queryVersion":1,"provider":"demo","retrievedCount":62,"deduplicatedCount":58,"sampleSize":20,"relevantInSample":17,"estimatedPrecision":0.85,"changeReason":"too_narrow","executedAt":"2026-09-11T12:05:00Z","simulated":true}
{"iterationId":"it-2","queryVersion":2,"provider":"demo","retrievedCount":412,"deduplicatedCount":300,"sampleSize":50,"relevantInSample":41,"estimatedPrecision":0.82,"changeReason":"expanded_synonyms","executedAt":"2026-09-11T12:10:00Z","simulated":true}
```

### topic/search-strategy.json

检索策略。draftScopusQuery 是待验证的 Scopus 草案，providers 是来源；openAlexAdapterNote 明确不能原样把 Scopus 语法发 OpenAlex。

[打开实际文件](../demo-packages/camera-vad-scene-memory/topic/search-strategy.json) · 507 字节 · 清单内：`topic.first-search` / `search-strategy`。

```json
{
  "schemaVersion": 1,
  "simulated": true,
  "draftScopusQuery": "TITLE-ABS-KEY((\"video anomaly detection\" OR \"video abnormality detection\") AND (\"large language model\" OR \"vision language model\" OR \"LLM\" OR \"VLM\") AND (\"surveillance\" OR \"camera\" OR \"CCTV\")) AND NOT TITLE(\"medical\" OR \"biomedical\") AND PUBYEAR > 2021",
  "openAlexAdapterNote": "Scopus TITLE-ABS-KEY must be converted by adapter; do not send verbatim to OpenAlex.",
  "providers": [
    "openalex",
    "demo"
  ]
}
```

### writing/compile-log.txt

编译记录，当前未证明成功完成真实 CVPR 编译。最终记录引擎、命令、版本、退出码及错误。

[打开实际文件](../demo-packages/camera-vad-scene-memory/writing/compile-log.txt) · 64 字节 · 未纳入导入清单。

```text
PLACEHOLDER: PDF not compiled from LaTeX; placeholder PDF only.
```

### writing/figures/architecture.png

实验框架图的写作副本，当前同样是占位。

[打开实际文件](../demo-packages/camera-vad-scene-memory/writing/figures/architecture.png) · 70 字节 · 未纳入导入清单。

二进制文件不以文本示例代替。请通过预览器检查；当前占位 PNG/PDF不能作为最终交付，ZIP 的成员内容也需独立验证。

### writing/figures/comparison.png

实验比较图的写作副本，当前同样是占位；应建立 derived_from 关系而非独立来源。

[打开实际文件](../demo-packages/camera-vad-scene-memory/writing/figures/comparison.png) · 70 字节 · 未纳入导入清单。

二进制文件不以文本示例代替。请通过预览器检查；当前占位 PNG/PDF不能作为最终交付，ZIP 的成员内容也需独立验证。

### writing/outline.md

论文提纲，章节映射开题与实验输入。

[打开实际文件](../demo-packages/camera-vad-scene-memory/writing/outline.md) · 75 字节 · 清单内：`writing.outline` / `paper-outline`。

```markdown
# Outline

Abstract, Intro, Related Work, Method, Experiments, Conclusion.
```

### writing/paper-metadata.json

论文标题、作者及模拟属性等元数据，供写作和投稿读取；具体字段以当前示例为准。

[打开实际文件](../demo-packages/camera-vad-scene-memory/writing/paper-metadata.json) · 513 字节 · 清单内：`writing.draft` / `paper-metadata`。

```json
{
  "title": "Scene-Memory Guided Fast–Slow Video Anomaly Detection with Selective Vision–Language Verification",
  "abstract": "我们研究固定摄像头异常检测的推理成本问题，提出轻量筛查、场景记忆和按需视觉语言复核流程。本文教学示例使用合成数据说明方法与评估过程，不报告真实模型性能。",
  "template": {
    "name": "cvpr",
    "version": "unbundled",
    "engine": "pdflatex",
    "status": "missing_template"
  },
  "simulated": true
}
```

### writing/paper.pdf

当前占位 PDF，不是从完整论文实际编译的最终文件；最终必须通过渲染检查。

[打开实际文件](../demo-packages/camera-vad-scene-memory/writing/paper.pdf) · 89 字节 · 清单内：`writing.final` / `paper-pdf` · placeholder=true。

二进制文件不以文本示例代替。请通过预览器检查；当前占位 PNG/PDF不能作为最终交付，ZIP 的成员内容也需独立验证。

### writing/paper.tex

LaTeX 主入口。当前 article 文档仅有标题，不是完整 CVPR 论文。

[打开实际文件](../demo-packages/camera-vad-scene-memory/writing/paper.tex) · 108 字节 · 清单内：`writing.draft` / `paper-source`。

```latex
% SYNTHETIC DEMO
\documentclass{article}
\begin{document}
Scene-Memory Guided Fast--Slow VAD
\end{document}
```

### writing/references.bib

论文使用的文献投影，应来源于 topic/references.bib 并固定输入版本。

[打开实际文件](../demo-packages/camera-vad-scene-memory/writing/references.bib) · 567 字节 · 未纳入导入清单。

```bibtex
@misc{demo_fast_screening,
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
```

### writing/sections/abstract.md

摘要编辑源。当前只提供摘要，其他完整章节仍待补。

[打开实际文件](../demo-packages/camera-vad-scene-memory/writing/sections/abstract.md) · 91 字节 · 未纳入导入清单。

```markdown
教学摘要：合成数据演示快慢双通路与场景记忆。不报告真实性能。
```

### writing/source-manifest.json

章节来源映射。当前 inputs 只写相对路径；完整格式需要逻辑 file key/hash，导入后解析到 artifact ID/hash。

[打开实际文件](../demo-packages/camera-vad-scene-memory/writing/source-manifest.json) · 497 字节 · 未纳入导入清单。

```json
{
  "schemaVersion": 1,
  "sections": {
    "abstract": {
      "inputs": [
        "topic/intake.json",
        "topic/confirmed-topic.json"
      ]
    },
    "related": {
      "inputs": [
        "topic/core-references.csv"
      ]
    },
    "method": {
      "inputs": [
        "experiment/algorithm-details.md",
        "experiment/config.json"
      ]
    },
    "experiments": {
      "inputs": [
        "experiment/metrics/main.csv",
        "experiment/results.md"
      ]
    }
  }
}
```

### writing/template/README.md

模板缺失说明。当前没有真实 CVPR 模板依赖。

[打开实际文件](../demo-packages/camera-vad-scene-memory/writing/template/README.md) · 27 字节 · 未纳入导入清单。

```markdown
CVPR template not bundled.
```

## 5. 编辑 Demo 时的核对清单

1. 项目路径与四模块目录匹配；复制项目处理 UUID 冲突。
2. 每份 JSON/CSV 可解析；候选课题 ID、paper_id、citation_key、创新 ID、question ID 引用存在。
3. 补完实验方案、算法、模拟程序、结果报告和论文章节。当前仅有文件骨架不算完整。
4. 将 metrics、innovations、code、generation、写作 BibTeX/章节/图/模板/日志/来源和投稿 checklist/reviews.md/response-map 纳入清单。
5. 从真实内容计算全部哈希；检查缺上游、重复 key、循环和乱序，不静默丢依赖。
6. 获取有效 GPT 图、真实编译 PDF和有效投稿包后才移除缺失标记；不得把 synthetic 文献误写为真实下载成功。
7. 测试独立目录导入、重复载入、四模块恢复、刷新和跨项目切换。当前 importer 的占位隔离、恢复和 hydration 缺口见 TODO。

本文示例与数据包修改后同步更新；字段升级需兼容读取旧包。执行进度不要记在本文，统一回写 TODO。
