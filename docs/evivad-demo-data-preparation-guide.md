# EviVAD Demo 数据整理与导入指南

更新：2026-09-12。

本文说明如何把“视频异常检测 × 大模型 / 多智能体”的现有演示素材整理成 Navivisor 可注册、可导入、可追踪的四模块项目。通用字段规范和逐文件示例见 [Demo 数据格式文档](./demo-data-format.md)；可直接对照的完整包位于 [`demo-packages/camera-vad-scene-memory/`](../demo-packages/camera-vad-scene-memory/)。

## 1. 当前素材盘点

本次检查的原始素材目录为：

```text
C:\Users\hcf\Desktop\files\navi-agent\视频异常检测+多智能体\demo演示数据\demo演示数据
```

这个绝对路径只用于本机整理，**不得写入 `project.json`、manifest、Markdown 正文或 artifact 元数据**。整理后的清单路径必须全部相对项目根目录。

当前共有 80 个文件：34 个 PDF、6 个 PNG、18 个 TeX、13 个 Markdown、2 个 CSV、2 个 JSON、2 个 BibTeX，以及 CVPR 模板和 ZIP。抽查结果如下：

- 开题：两轮文献表（308 条和 32 条）、32 篇 PDF、BibTeX、检索式、领域概览和三个课题。
- 实验：完整方案、算法架构、模拟结果、流程框架图和对比图。
- 写作：中英文 PDF、完整双语 CVPR LaTeX 工程、4 张论文图片和 BibTeX。
- 投稿：中英文三位审稿人 JSON/Markdown 及 Rebuttal。
- 所有现有 PDF、PNG、ZIP 的文件签名均有效；这只证明容器格式有效，不等于内容或科学结论已经核验。
- 实验文档明确说明指标为模拟值，因此整个 Demo 必须保持 `simulated: true`，不得标记成真实训练结果。

当前素材不能原样导入，主要缺少：

1. 项目身份文件 `project.json`；
2. 导入清单 `demo/demo-manifest.json`；
3. 开题阶段的结构化 intake、候选题、确认课题、筛选记录和 PDF 索引；
4. 实验阶段的 config、dataset manifest、innovations 和指标 CSV；
5. 写作阶段的统一 metadata、outline、source manifest 和标准入口；
6. 投稿阶段的 venue、checklist、submission package、response map 和 decision。

## 2. 最终目录

不要直接修改原始素材。复制到一个新的、独立的论文工作目录，例如：

```text
EviVAD-demo/
  project.json
  README.md
  demo/
    demo-manifest.json
  topic/
    intake.json
    search-strategy.json
    search-iterations.jsonl
    candidate-papers.csv
    screening.csv
    landscape.md
    candidate-topics.json
    candidate-topics.md
    confirmed-topic.json
    core-references.csv
    references.bib
    paper-manifest.json
    literature-handoff.md
    papers/
      ...32 PDFs
  experiment/
    plan.md
    config.json
    dataset-manifest.json
    innovations.json
    algorithm-details.md
    results.md
    code/
      README.md
    metrics/
      main.csv
      ablation.csv
      robustness.csv
      seeds.csv
    figures/
      architecture.png
      comparison.png
      curves.png
      teaser.png
      generation.json
  writing/
    outline.md
    paper-metadata.json
    source-manifest.json
    references.bib
    sections/
      abstract.md
      introduction.md
      related.md
      method.md
      experiments.md
      conclusion.md
    figures/
      architecture.png
      comparison.png
      curves.png
      teaser.png
    source/
      cvpr-paper/
        cvpr.sty
        ieeenat_fullname.bst
        main.bib
        en/...
        cn/...
    paper.pdf
    paper-zh.pdf
    latex-source.zip
  submission/
    venue.json
    checklist.json
    submission-package.zip
    reviews.json
    reviews.md
    reviews-zh.json
    reviews-zh.md
    rebuttal.md
    rebuttal-zh.md
    response-map.json
    decision.json
```

`.navivisor/` 不需要手工创建；成功注册和导入后由系统生成。

## 3. 原文件到目标文件的映射

### 3.1 开题

| 原文件 | 目标文件 | 处理方式 |
|---|---|---|
| `开题部分数据/输入：项目名称与目标.md` | `topic/intake.json` | 把研究方向、目标、场景、约束、预期输出转成 JSON；保留原 Markdown 可作为 diagnostics，但不能代替 intake JSON。 |
| `视频异常检测与大模型文献检索式.md` | `topic/search-strategy.json` | 拆出第一轮/第二轮 query、年份、类型、排除词、数据源和生成时间。当前文字同时提到 OpenAlex 与 Scopus 导出，必须在 JSON 中如实区分实际来源。 |
| `第一轮308works-csv-.csv` | `topic/candidate-papers.csv` | 统一表头和作者分隔符，生成稳定 `paper_id`；标记 `source=scopus_export`，不要伪称 OpenAlex 实时检索。 |
| `第二轮32works-csv-.csv` | `topic/core-references.csv` | 扩充为核心文献表，增加 citation key、相关性、方法关系、全文状态、PDF 相对路径和 verified。 |
| 两轮 CSV 的执行信息 | `topic/search-iterations.jsonl` | 每行记录一轮检索：query、source、returned、deduplicated、筛选规则、时间和 simulated。 |
| 根据第一轮表产生的筛选结果 | `topic/screening.csv` | 至少包含 `paper_id,decision,relevance_score,reason,evidence,reviewer,synthetic`。没有逐篇筛选证据时不要编造分数，可将文件列为 missing。 |
| `三个课题.md` 的“领域概览” | `topic/landscape.md` | 单独提取；保留统计口径、来源限制和 Scopus 对顶会收录不足的声明。 |
| `三个课题.md` 的三个提案 | `topic/candidate-topics.md` + `.json` | Markdown 用于阅读，JSON 用稳定候选 ID 保存 title/question/method/innovation/feasibility/evidencePaperIds。 |
| EviVAD 最终论文主题 | `topic/confirmed-topic.json` | 明确选择 EviVAD 方案；保存 selectedCandidateId、选择原因、确认时间、方法步骤、创新点和 simulated。 |
| `第二轮32works.bib` | `topic/references.bib` | UTF-8 保存；逐条核对 citation key 与 `core-references.csv`。 |
| `开题部分数据/PDF/*.pdf` | `topic/papers/*.pdf` | 建议改为稳定文件名（如 DOI、OpenAlex/Scopus ID 或 `CORE-001.pdf`），并在 paper manifest 中保存原文件名。 |
| 32 篇 PDF 与核心文献表 | `topic/paper-manifest.json` | 每篇记录 paperId、citationKey、path、sha256、sourceUrl/DOI、fulltextStatus、verified；不能仅靠文件名猜对应关系。 |
| 课题、核心文献和限制摘要 | `topic/literature-handoff.md` | 供实验/写作消费，列出已确认课题、核心证据、相关方法、引用 key、PDF 状态和待核验问题。 |

推荐的 `candidate-papers.csv` 表头：

```csv
paper_id,title,authors,venue,year,doi,abstract,citation_count,source,source_url,synthetic
```

推荐的 `core-references.csv` 表头：

```csv
paper_id,title,authors,venue,year,doi,abstract,citation_count,source,source_url,synthetic,citation_key,relevance_reason,method_relation,publication_date,fulltext_status,pdf_artifact_ref,verified
```

### 3.2 实验

| 原文件 | 目标文件 | 处理方式 |
|---|---|---|
| `视频异常检测×大模型_实验方案.md` | `experiment/plan.md` | 整理为结构化、可读的实验方案。 |
| 同一方案中的固定参数表 | `experiment/config.json` | 结构化保存 optimizer、learning rate、loss weights、epoch、batch、LoRA、阈值、seeds、hardware、software 和 `mode: simulated`。 |
| 方案中的数据集段落 | `experiment/dataset-manifest.json` | UCF-Crime 等未随包提供的数据集必须 `bundled:false`；记录 split/protocol/checksum 状态，不能把计划使用写成已经具备。 |
| 方案中的 7 个候选创新 | `experiment/innovations.json` | 每项保存 id、title、hypothesis、implementation、baseline、ablation、cost、acceptanceCriteria、selected；DAA/EAD/DAG 为 selected。 |
| `视频异常检测×大模型_算法完整详细架构.md` | `experiment/algorithm-details.md` | 原样复制，核对 DAA/EAD/DAG 命名与论文图和正文一致。 |
| `视频异常检测×大模型_模拟实验结果.md` | `experiment/results.md` | 原样复制，继续在标题和结论处注明模拟结果。 |
| 结果第 4 节主实验表 | `experiment/metrics/main.csv` | 一行一个方法；把 `ms`、`GB` 等单位移到列名，不写在数值单元格。 |
| 结果第 5 节消融表 | `experiment/metrics/ablation.csv` | DAA/EAD/DAG 使用 boolean；全部指标拆成数值列。 |
| 结果第 5.1 节退化表 | `experiment/metrics/robustness.csv` | 每种 degradation × severity 单独一行，不把轻/中/重三个值塞入同一个单元格。 |
| Seeds 42/3407/2026 | `experiment/metrics/seeds.csv` | 只有具备逐 seed 数值时才填写；目前文档只有汇总 `均值 ± 方差` 时应列为 missing，不能反推伪造。 |
| `fig1_算法流程框架图.png` | `experiment/figures/architecture.png` | 复制并核对图中文字、拓扑与 algorithm-details。 |
| `fig2_算法对比效果图.png` | `experiment/figures/comparison.png` | 复制并核对数值与 main/ablation CSV。 |
| `cvpr-paper/fig/curves.png`、`teaser.png` | `experiment/figures/` | 可作为额外 paper-figure；在 manifest 中逐一登记。 |

当前没有真实代码目录。`experiment/code/README.md` 应写明“未附代码，仅有方案伪代码/LaTeX 描述”；除非提供可运行程序，否则不要创建假的 `pipeline.py`，也不要将实验 run 标记为 real。

`generation.json` 用于记录图片来源。若图片是人工制作或已有素材，应写实际来源，不得冒充 Codex/ImageGen 生成：

```json
{
  "architecture": {
    "source": "provided_demo_asset",
    "inputRefs": ["experiment/algorithm-details.md"],
    "output": "experiment/figures/architecture.png",
    "verification": "topology_and_labels_checked",
    "simulated": true
  }
}
```

### 3.3 写作

英文版作为 CVPR 主版本，中文版作为翻译/演示版本：

| 原文件 | 目标文件 |
|---|---|
| `论文_英文版.pdf` | `writing/paper.pdf` |
| `论文_中文版.pdf` | `writing/paper-zh.pdf` |
| `LaTeX论文工程_中英双版本.zip` | `writing/latex-source.zip` |
| `cvpr-paper/` | `writing/source/cvpr-paper/` |
| `cvpr-paper/main.bib` | `writing/references.bib` |
| `cvpr-paper/fig/*` | `writing/figures/*` |
| `cvpr-paper/en/sec/*.tex` | 转换/摘录为 `writing/sections/*.md`，同时保留原 TeX |
| `cvpr-paper/en/main.tex` | manifest 中登记为英文 `paper-source` |
| `cvpr-paper/cn/main.tex` | manifest 中登记为中文 `paper-translation` |

需补建：

- `outline.md`：从英文各章节标题生成论文提纲。
- `paper-metadata.json`：title、abstract、language、template、figures、simulated、sourceVersion。
- `source-manifest.json`：列出每个章节、图片、BibTeX 的来源路径和 SHA-256，明确实验数据来自哪些 metrics 文件。

PDF 虽然真实可打开，但论文中的实验指标仍是模拟值，因此 PDF artifact 仍须 `simulated:true`。

### 3.4 投稿

英文投稿材料作为主 artifact，中文材料作为翻译：

| 原文件 | 目标文件 |
|---|---|
| `投稿部分数据/en/reviews.json` | `submission/reviews.json` |
| `投稿部分数据/en/reviews.md` | `submission/reviews.md` |
| `投稿部分数据/en/rebuttal.md` | `submission/rebuttal.md` |
| `投稿部分数据/cn/reviews.json` | `submission/reviews-zh.json` |
| `投稿部分数据/cn/reviews.md` | `submission/reviews-zh.md` |
| `投稿部分数据/cn/rebuttal.md` | `submission/rebuttal-zh.md` |

还要补建：

- `venue.json`：建议 `venue: CVPR 2026`、year、track、pageLimit、anonymous、simulated，并注明这不是实际投稿。
- `checklist.json`：逐项记录 PDF 可读、匿名性、页数、BibTeX、图片、模拟声明、状态、原因和 evidenceRefs。
- `submission-package.zip`：包含英文主 PDF、必要源文件和 manifest；不要直接把“中英 LaTeX 工程 ZIP”改名冒充投稿包。
- `response-map.json`：为每个 reviewer question/weakness 分配稳定 ID，关联 rebuttal 小节与证据文件；没有新实验支撑的回复标为 planned。
- `decision.json`：当前没有真实录用决定。建议 `decision: simulated_accept` 或 `revision_required`，并明确 `simulated:true`、依据和生成时间。

现有 reviews JSON 使用 snake_case（如 `rating_label`、`ethical_concerns`），而当前前端远程适配器部分字段使用 camelCase。导入时可保留原 JSON 作为 artifact，但若要直接恢复投稿页面，应额外生成一份符合页面契约的规范化 JSON，不能静默丢字段。

## 4. `project.json`

先生成新的 UUID，不要复用仓库示例的 projectId：

```powershell
[guid]::NewGuid().ToString()
```

模板：

```json
{
  "schemaVersion": 2,
  "projectId": "替换为新 UUID",
  "title": "EviVAD：证据可验证、退化感知的视频异常检测",
  "description": "面向摄像头监控，以 DAA、EAD、DAG 实现领域适配、证据锚定解释和退化感知门控。",
  "language": "zh-CN",
  "directories": {
    "topic": "topic",
    "experiment": "experiment",
    "writing": "writing",
    "submission": "submission"
  },
  "demo": {
    "id": "evivad-surveillance-demo",
    "version": "1.0.0",
    "simulated": true
  },
  "createdAt": "使用 ISO 8601 时间"
}
```

## 5. `demo/demo-manifest.json`

使用 `schemaVersion: 3`。节点顺序可乱，但依赖必须无环；`inputs` 引用的是上游 **file key**，不是 node key。每个 file 必须有唯一 key、相对 path、合法 role、mediaType、真实 SHA-256 和 `required`。

完整节点建议沿用：

```text
topic.intake
→ topic.first-search
→ topic.candidates
→ topic.confirmation
→ topic.core-literature
→ experiment.plan
→ experiment.run
→ writing.outline
→ writing.draft
→ writing.final
→ submission.prepare
→ submission.review.round1
→ submission.rebuttal
→ submission.decision
```

最小片段：

```json
{
  "schemaVersion": 3,
  "demoId": "evivad-surveillance-demo",
  "version": "1.0.0",
  "simulated": true,
  "nodes": [
    {
      "key": "intake",
      "stage": "topic.intake",
      "inputs": [],
      "files": [
        {
          "key": "intake-json",
          "path": "topic/intake.json",
          "role": "project-intake",
          "mediaType": "application/json",
          "required": true,
          "sha256": "替换为文件真实 SHA-256"
        }
      ]
    },
    {
      "key": "first-search",
      "stage": "topic.first-search",
      "inputs": ["intake-json"],
      "files": []
    }
  ],
  "missing": []
}
```

这个片段只能作为写法示例，不能直接用于最终导入。最终清单应根据本指南第 2 节的实际文件完整生成。合法 role 和 stage 以 `src/research-workflow/research-contracts.ts` 为准。

对暂时没有的文件，二选一：

1. 非关键文件：不放进 `files`，在 `missing` 中结构化声明；
2. 会阻断下游的关键输入：先补齐真实文件，再导入。

例如缺少逐 seed 指标：

```json
{
  "path": "experiment/metrics/seeds.csv",
  "reason": "file_missing",
  "requiredBy": ["experiment-run", "writing-draft"],
  "optional": true
}
```

## 6. SHA-256 与一致性检查

PowerShell 生成单个文件哈希：

```powershell
(Get-FileHash -Algorithm SHA256 -LiteralPath '.\topic\intake.json').Hash.ToLower()
```

批量查看：

```powershell
Get-ChildItem -Recurse -File |
  Where-Object { $_.FullName -notmatch '[\\/]\.navivisor[\\/]' } |
  ForEach-Object {
    [pscustomobject]@{
      Path = Resolve-Path -Relative $_.FullName
      Sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLower()
    }
  }
```

每次改动文件内容或重命名后，都要重新计算 hash 并更新 manifest。不要给目录、缺失文件或 ZIP 内部成员填写外层 ZIP 的 hash。

## 7. 推荐实施顺序

1. 复制原始目录到新的 `EviVAD-demo`，原始素材只读留档。
2. 建立第 2 节目录骨架，先移动/复制无需转换的 PDF、PNG、BibTeX、Markdown 和 LaTeX。
3. 生成 `project.json`。
4. 完成开题 JSON/CSV 转换；为 32 篇 PDF 建立可核对的 paper manifest。
5. 从实验 Markdown 表格抽取 main/ablation/robustness CSV；缺少逐 seed 原始值时如实标记 missing。
6. 整理英文主论文、中文翻译、图片、metadata 和 source manifest。
7. 规范化英文 review/rebuttal，补 venue/checklist/package/response-map/decision。
8. 计算所有登记文件的 SHA-256，最后生成 schema v3 demo manifest。
9. 用 JSON parser 检查所有 JSON，用 CSV 工具核对列数；打开全部 PDF/PNG，解压 ZIP 并检查成员。
10. 在 Navivisor 首页填写 **整理后项目根目录**，点击“注册目录”，再点击“载入Demo”。不要选择原始素材目录或仓库模板目录。

## 8. 导入验收

导入成功至少应满足：

- 首页显示正确的 EviVAD 标题、根目录和 `simulated` 状态。
- Demo 不报告 hash mismatch、unknown input、dependency cycle 或 invalid role。
- 开题页能识别 intake、候选题、确认课题、核心文献和 PDF 索引。
- 实验页能区分 Markdown 说明与结构化 metrics，所有模拟指标保持 simulated。
- 写作页能找到英文主稿、BibTeX、四张图、中英文 PDF 和源代码 ZIP。
- 投稿页能找到英文 reviews/rebuttal、投稿包与模拟决定；中文版本作为翻译保留。
- 任一文件被外部修改后，系统能通过 SHA-256 标记 `external_modified`，而不是静默继续使用旧结论。

## 9. 不能做的事

- 不把 `C:\Users\...` 等绝对路径写入项目数据。
- 不把 Scopus 导出记录标成 OpenAlex 实时检索结果。
- 不从汇总均值和标准差反推三个 seed 的假数据。
- 不把模拟指标、模拟审稿或模拟决定标记成 real。
- 不把现有双语 LaTeX ZIP 直接改名成 submission package。
- 不只复制文件而漏建 manifest；未在 manifest 登记的文件不会成为阶段 artifact。
- 不手工创建或复制其他项目的 `.navivisor/`。
