# 写作模块、四模块数据链与 Codex 调用统一改造计划

更新日期：2026-09-11  
适用基线：`main`（四模块集成提交 `04ab936`）  
本文用途：后续 AI/开发者唯一执行清单。实施状态、测试证据、偏差和最终结果都回写本文，不创建额外中间计划或结果文档。

## 1. 目标与最终原则

本轮要把开题、实验、写作、投稿从四套页面/状态整合成一个研究项目中的连续工作流，重点完成写作模块改造。

最终必须满足：

1. 浏览器不直接调用任何 LLM、翻译、生图或审稿模型 API。
2. 不保留 Qwen、cpolar、硬编码 `localhost:3001` 或模块专属模型 SDK。
3. 所有文本类智能能力统一走现有 `main` 调用链：`ResearchWorkflowController -> ResearchCodexBridgeService -> ThreadsService.startTurn -> Codex thread + research skill`。
4. 四模块只通过同一 `projectId` 和不可变 `artifactId` 交接数据；禁止把 localStorage、页面状态、文件 URL 或自然语言复制粘贴当成真实上下游协议。
5. 每次智能操作都是一个 `run`；输入、输出、模型、skill、线程、重试来源、模拟标记和校验结果均可追踪。
6. 用户编辑不覆盖已完成 artifact。保存产生新版本，上一版本仍可恢复。
7. 生图优先通过 Codex 当前可用的 image generation 工具调用官方 `gpt-image-2`，输出图片也必须进入统一 artifact 管理。
8. 如果运行环境没有生图工具或模型权限，状态必须是 `unavailable`/`needs_credentials`，不得回退到旧接口、假图或 data URL 伪结果。

## 2. 已核实的当前架构

### 2.1 已有统一后端能力

当前 `main` 已有以下骨架：

- `src/research-workflow/research-contracts.ts`：四模块、12 个 stage、run 状态和 artifact role。
- `src/research-workflow/research-workflow.controller.ts`：project、run、artifact、agent-run、cancel、retry API。
- `src/research-workflow/research-codex-bridge.service.ts`：创建 run，复用“每 project/每 module 一个 Codex thread”，解析对应 research skill，再通过 `ThreadsService.startTurn` 发起任务。
- `src/research-workflow/research-run-events.service.ts`：监听 Codex turn 完成事件，并进入结果校验和 artifact 固化。
- `src/research-workflow/research-result-validator.service.ts`：只接受临时目录内的普通文件和匹配当前 run/stage 的 `result.json`，限制路径、数量和文件大小。
- `research-skills/research-{topic,experiment,writing,submission}/SKILL.md`：四模块 skill 已注册，并明确禁止直接调用外部模型 API。
- 数据库已有 `research_projects`、`research_runs`、`research_artifacts`、`research_agent_sessions` 和 `research_agent_invocations`。

这条链就是“现有 main 的调用方式”，后续模块不得绕开它。

### 2.2 当前仍未统一的部分

| 模块 | 当前状态 | 必须替换的真实来源 |
| --- | --- | --- |
| 开题 | 第一步仍走独立 `/api/research/topic/*` 任务接口，后两步未接入 | Research Workflow project/run/artifact |
| 实验 | `useExperimentStore` + Zustand persist，包含大量演示内容 | 上游 topic artifacts + experiment runs |
| 写作 | `WritingData` 整体存入 `writing-app:data:v1`；文本模型入口目前只会报“未接入” | topic/experiment artifacts + writing runs |
| 投稿 | 仍有 cpolar、`localhost:3001`、独立 submit/rebuttal/extract API | finalized writing artifacts + submission runs |

写作模块的旧入口包括：

- `lib/qwen.ts`：旧 Qwen 抽象，当前虽已阻断，但命名和调用方式仍应删除。
- `lib/translate.ts`：旧翻译 API 抽象，当前仅报错。
- `Step5Algorithm.tsx`：旧生图入口已阻断，但没有 Workflow 实现。
- `Step9Export.tsx`：浏览器内 ZIP 可保留为纯确定性导出；旧 PDF 编译入口已阻断，需迁移成 run。
- `lib/storage.ts`：把整篇论文当作一个 localStorage JSON，是跨设备、版本、来源追踪和模块交接的主要障碍。

## 3. 统一数据模型

### 3.1 唯一身份链

所有页面必须显式持有：

```text
projectId
  -> runId（一次不可变操作）
      -> inputArtifactIds[]（准确上游版本）
      -> artifactId[]（本次不可变输出）
      -> threadId + turnId + skillSha256 + model（审计信息）
```

`projectId` 建议放在路由查询参数或路径中，例如 `/research/paper?projectId=...`。localStorage 最多缓存“最近打开的 projectId”和未提交表单草稿，不得缓存业务真相或 artifact 内容。

### 3.2 四模块标准输入输出

| 阶段 | 必需输入 role | 主要输出 role | 下游消费者 |
| --- | --- | --- | --- |
| `topic.first-search` | 用户上传/输入形成的 intake artifact | `candidate-papers` | topic 后续 |
| `topic.core-literature` | `candidate-papers` | `candidate-topics`, `core-references` | topic confirmation |
| `topic.confirmation` | `candidate-topics`, `core-references` | `confirmed-topic`, `literature-handoff` | experiment、writing |
| `experiment.plan` | `confirmed-topic`, `literature-handoff`, `core-references` | `experiment-plan` | experiment run |
| `experiment.run` | `experiment-plan` 和真实数据/配置 artifacts | `experiment-results`, `method-architecture` | writing |
| `writing.outline` | `confirmed-topic`, `core-references`, `literature-handoff`, `experiment-results` | `paper-outline` | writing draft |
| `writing.draft` | 上述 artifacts + 指定 `paper-outline` | `paper-source`, `paper-metadata` | writing final |
| `writing.final` | 指定版本的 `paper-source`, `paper-metadata`, figures | 新 `paper-source`, `paper-metadata`, `paper-pdf` | submission |
| `submission.prepare` | final `paper-source`, `paper-metadata`, `paper-pdf` | `submission-package` | review/真实适配器 |
| review/rebuttal/decision | 上一投稿 artifact | `review-round1`, `rebuttal`, `submission-decision` | 后续阶段 |

禁止“自动取最新”而不展示版本。UI 可以推荐同 project 下最新且 completed 的 artifact，但创建 run 时必须提交用户实际选择的 artifact IDs。

### 3.3 需要扩展的 artifact roles

在 `RESEARCH_ARTIFACT_ROLES` 中增加：

- `project-intake`：用户输入、上传材料和初始约束的规范化 JSON。
- `dataset-manifest`：实验数据集路径、哈希、划分和许可信息。
- `experiment-config`：可复现实验配置。
- `paper-figure`：PNG/WebP/SVG 等论文图片；metadata 保存 figure key、caption、prompt、生成方式和来源 artifact IDs。
- `paper-translation`：可选双语版本；不得把译文覆盖源文。
- `venue-requirements`：投稿规则快照，避免规则变化后无法复现。

不要为每一章节增加 role。章节版本统一放在 `paper-source` artifact 内的结构化文件中，避免 role 膨胀。

### 3.4 写作 source bundle 建议格式

`paper-source` 使用自包含 ZIP 或目录清单，至少包括：

```text
paper.json                 # schemaVersion、章节、citation keys、figure refs
main.tex 或 manuscript.md  # 可渲染源文件
references.bib             # 稳定 citation keys
figures/                   # 只引用本 run 声明的图片
source-manifest.json       # 每个文件 sha256、来源 artifactId、生成/人工编辑标记
```

`paper.json` 中每个章节至少记录 `sectionId`、`content`、`language`、`groundingArtifactIds`、`editedBy` 和 `updatedAt`。实验数字和引用必须关联提供证据的 artifact IDs。

## 4. 统一智能调用设计

### 4.1 前端统一客户端

新建 `web/src/components/research-workflow/`，集中提供：

- `research-workflow-client.ts`：只封装生成的 `researchWorkflow*` SDK。
- `research-workflow-types.ts`：把当前 OpenAPI 中的 `unknown` 收紧为 Project/Run/Artifact DTO。
- `use-research-project.ts`：解析/选择 `projectId`。
- `use-research-run.ts`：启动、轮询/订阅、取消、重试、错误与等待状态。
- `artifact-picker.tsx`：按 role、stage、simulated、createdAt 展示和选择准确版本。

四模块不再各自写 `fetch`。认证、BASE_PATH、错误格式和取消逻辑由生成 SDK/共享客户端统一处理。

### 4.2 写作动作到 stage 的映射

| UI 动作 | stage | skill 指令重点 | 输出 |
| --- | --- | --- | --- |
| 生成大纲 | `writing.outline` | 只根据选定课题、文献、实验结果形成章节和 evidence map | `paper-outline` |
| 生成标题/摘要 | `writing.draft` | 更新 source bundle 中对应章节，不虚构实验结论 | `paper-source`, `paper-metadata` |
| 生成/改写章节 | `writing.draft` | 指定 sectionId、当前 source artifact、修改要求 | 新 `paper-source` |
| 翻译章节/全文 | `writing.draft` | 保持引用、公式和 figure refs；译文单独输出 | `paper-translation` |
| 生成论文图 | `writing.draft` | 使用已有 method/experiment artifacts 形成图 prompt 并调用生图工具 | `paper-figure` + 更新后的 `paper-source` |
| 最终检查和渲染 | `writing.final` | 引用完整性、模拟标记、LaTeX 编译和缺失证据检查 | final source/metadata/PDF |

删除 `generateWithQwen` 这个供应商命名。组件只调用语义方法，例如 `startWritingRun({ action: 'draft-section', ... })`；后端仍只接受 stage、inputArtifactIds 和 instructions。

### 4.3 model 选择规则

- 默认不从写作页面传 `model`，让 `ThreadsService.startTurn` 使用当前 Codex/main 配置的有效模型。
- 如果以后允许用户选择，只能读取现有 models API 的可用模型，并把选择写入 `research_agent_invocations`；不得硬编码供应商模型。
- `effort` 作为高级选项，默认继承当前设置。
- prompt 中不得放 API key、绝对用户路径或完整二进制数据；使用 artifact ID 和受控项目目录。

## 5. `gpt-image-2` 生图方案

### 5.1 名称与能力边界

官方名称是 `gpt-image-2`，不是 `codeximage2`。OpenAI 官方文档说明它支持图片生成与编辑，并支持 Responses、Images generations 和 Images edits 等端点。Responses API 可把 `image_generation` 作为多步会话工具使用。

参考：

- [GPT-Image-2 模型文档](https://developers.openai.com/api/docs/models/gpt-image-2)
- [OpenAI 图片生成指南](https://developers.openai.com/api/docs/guides/image-generation)

### 5.2 本项目推荐接法

不能在 `Step5Algorithm.tsx` 中直接 `fetch api.openai.com`。推荐流程：

```text
“生成框架图”
 -> POST /api/research/projects/:projectId/agent-runs
 -> stage=writing.draft
 -> ResearchCodexBridgeService.start
 -> research-writing skill
 -> Codex 受控 image generation tool（目标 gpt-image-2）
 -> 图片写入 run temp/figures/*.png
 -> result.json 声明 role=paper-figure
 -> validator + createArtifact
 -> 前端通过 artifact content API 显示
```

先增加一次服务端能力探测，确认当前 Codex app-server/账户是否向 research thread 暴露 image generation 工具以及是否允许指定 `gpt-image-2`。探测结果写入 run provenance，例如 `imageTool`, `imageModel`, `toolCallId`；不要只信前端配置。

如果当前 app-server 不支持：

1. 返回 `unavailable` 或 `needs_credentials`，UI 显示真实原因。
2. 暂时保留“上传图片 artifact”作为确定性替代路径。
3. 不得新增浏览器直连 API、旧 localhost 服务或静默换成其他模型。
4. 只有用户另行批准“服务端 OpenAI API 适配器”后，才考虑在后端实现 Responses API；即使实现，也必须挂在 Workflow/run/artifact/审计链下，密钥只在服务端。

### 5.3 图片 artifact metadata

每张 `paper-figure` 必须保存：

- `figureKey`、caption、用途（framework/illustration/ablation 等）。
- 目标模型 `gpt-image-2` 和实际返回模型/版本（如果可得）。
- prompt 版本和 prompt sha256；敏感 prompt 可只保存在受控 manifest。
- 输入 artifact IDs、参考图 artifact IDs。
- size、quality、output format、透明背景设置。
- Codex threadId、turnId、tool call ID。
- `generated`/`uploaded`/`edited` 来源和 simulated 标记。

论文源文件只能用 `artifactId`/figure key 引用图片，不能把 base64 data URL 长期放进 `WritingData`。

## 6. 分步实施任务

状态使用：`未开始`、`进行中`、`已完成`、`阻塞`。每完成一步，必须在本节和第 8 节同步回写提交、测试与偏差。

### W0：建立基线与禁止项扫描

状态：未开始

修改：

1. 记录当前 `main` SHA、数据库迁移版本和生成 API 版本。
2. 建立扫描命令，覆盖 `cpolar`、`localhost:3001`、`generateWithQwen`、模型供应商 SDK、业务 localStorage。
3. 给扫描增加 CI 测试或 lint 脚本；允许列表只包含测试 fixture/迁移说明，不包含生产代码。

验收：生产前后端不再包含旧模型地址和供应商专属调用。

### W1：扩展统一契约和数据库

状态：进行中

修改文件：

- `src/research-workflow/research-contracts.ts`
- `src/database/schema.ts`
- 新 Drizzle migration 和 snapshot
- `src/research-workflow/research-result-validator.service.ts`

任务：

1. 增加第 3.3 节 roles。
2. 为 artifact 增加可选 `metadataJson`，或建立 `research_artifact_metadata` 表；不得把重要 lineage 只存在 manifest 文件。
3. 增加 stage -> 允许输入 role/必需输出 role 矩阵，并在 `createRun` 和 finalize 时校验。
4. 校验所有输入来自同一个 project，禁止 completed 之前的输出作为下游输入。
5. 明确 retry 创建新 run、新 artifacts，不覆盖旧 run。

测试：合法链、错 project、错 role、缺必需输入、模拟/真实污染、重复版本和非法 metadata。

### W2：补齐上传与人工编辑 artifact API

状态：未开始

原因：当前 artifact 主要由 agent finalize 产生，写作还需要用户上传材料和保存人工编辑版本。

任务：

1. 增加受认证的 project artifact upload API，文件先进入隔离 temp，再校验大小、MIME、文件名和 project 边界。
2. 增加“保存人工编辑版本”API：后端创建 deterministic run 或专门的 audited revision，产出新 `paper-source`，不能直接调用内部 `createArtifact` 绕过 run。
3. 上传 PDF/BibTeX/CSV/图片时生成 sha256、来源、original filename 和 uploader provenance。
4. 增加 artifact content 的 inline/download 策略，避免前端自行拼文件路径。

验收：用户上传和手工保存也具备 run/artifact lineage。

### W3：建立共享前端 Workflow 层

状态：进行中

任务：

1. 实现第 4.1 节共享目录。
2. 修复 OpenAPI DTO 目前为 `unknown` 的问题并重新生成客户端。
3. project selector 成为四模块公共入口；所有模块路由携带同一 projectId。
4. 统一 run 状态组件：queued/running/waiting_for_approval/waiting_for_input/validating/completed/failed/cancelled/unavailable/needs_credentials。
5. 优先使用现有 Codex 事件/socket 更新；轮询只作为可靠回退，并具有超时和取消。

验收：四模块不再各自实现认证 fetch、轮询和错误映射。

### W4：先统一开题和实验的上游输出

状态：未开始

任务：

1. 把开题独立 task 快照转换为统一 topic runs/artifacts，补齐 confirmation。
2. 实验 Intake 只能选择同 project 的 confirmed-topic/literature artifacts。
3. 删除 `navivisor-experiment-mvp` 的业务持久化；Demo 只能通过显式“创建模拟 run”导入，并保持 `simulated=true`。
4. 实验结果必须输出结构化指标、原始日志引用、配置、方法架构和 writing handoff。

验收：写作页面无需用户再次填写 topic、实验结果或 BibTeX。

### W5：重构写作状态和页面输入

状态：未开始

任务：

1. 删除 `lib/storage.ts` 作为业务存储；保留的 UI 草稿缓存必须按 `projectId + baseArtifactId` 隔离，并明确“未保存”。
2. 用 `WritingWorkspaceState` 替代单体 `WritingData`：只保存选中的 artifact IDs、当前 source 版本、未提交编辑 patch 和 UI step。
3. Step1 改为 artifact picker：选择 confirmed topic、core references、experiment results 和 method architecture。
4. 从 artifact content 解析出页面 view model；解析失败时阻止继续并显示具体 artifact。
5. 每次保存产生新 paper-source artifact；提供版本历史、diff、恢复和“基于旧版本另存”能力。

验收：刷新、换浏览器或进入投稿时都能从服务端恢复同一论文版本。

### W6：统一所有写作文本智能动作

状态：未开始

任务：

1. 删除 `lib/qwen.ts` 和 `lib/translate.ts`。
2. 标题摘要、章节、实验解释、讨论、翻译全部改成 agent-run。
3. 修改指令必须带 action、sectionId、base source artifact ID 和 grounding artifact IDs。
4. `research-writing/SKILL.md` 补充 source bundle schema、evidence map、翻译、章节更新和缺失证据规则。
5. AI 输出先成为候选新 artifact；用户确认后才把它设为当前版本。
6. 并发运行时锁定 base version；完成时若当前版本已变化，提示 merge/diff，禁止覆盖。

验收：代码扫描无 Qwen/旧翻译接口；每个 AI 按钮都能看到 run、输入版本、结果版本和错误。

### W7：接入 `gpt-image-2` 论文生图

状态：进行中

任务：

1. 先写 capability probe 集成测试，验证 research thread 是否能使用 image generation tool。
2. 在 writing skill 中增加 `generate-figure` 动作规范；要求图片落盘和 result.json 声明。
3. `Step5Algorithm` 不再 fetch；启动 writing.draft run，并显示工具不可用/需要凭证/生成中/校验中状态。
4. validator 接受 `paper-figure` 的 PNG/WebP/SVG 白名单，校验 magic bytes、像素上限、大小和 metadata。
5. 生成后先预览；用户确认才创建引用它的新 paper-source 版本。
6. 支持上传图片 artifact 作为无模型回退；上传不得伪装成生成图片。

首个试验用例：基于一个明确标为 simulated 的 method-architecture artifact，生成 1536×1024、PNG、medium quality 的简洁学术流程图；检查文字可读性、方向、无虚构指标、artifact lineage 和费用/usage 记录。若 `gpt-image-2` 对文本排版不稳定，应让模型生成无长文本底图，再由确定性 SVG/HTML 渲染叠加标签。

验收：前端和普通业务后端无 OpenAI key；图片可追踪到 run/tool/model/input artifacts；无权限时诚实失败。

### W8：统一 PDF 编译和导出

状态：未开始

任务：

1. 浏览器 ZIP 仅作为对已固化 source artifact 的确定性下载，不读取未受控 data URL。
2. PDF 编译作为 `writing.final` run 中的确定性工具步骤；记录编译器、模板版本、日志和输入 sha256。
3. 编译失败生成 diagnostics，不创建假的 paper-pdf。
4. final run 检查引用、图片、作者、模拟声明和实验依据。

验收：`paper-pdf` 与 source/metadata/figures 是同一次 final run 的一致快照。

### W9：迁移投稿模块

状态：未开始

任务：

1. 删除投稿的 `apiClient.ts`、`apiService.ts`、cpolar config 和旧 AI service。
2. 投稿首页选择 final writing artifacts，自动填充 metadata 并锁定来源版本。
3. review、rebuttal、decision 分别使用 submission skill 和对应 stages。
4. “真实提交”与“模拟审稿”严格分离；真实上传必须走确定性 venue adapter 和现有审批路径。
5. 没有 PDF、作者决策或 disclosure 时提供明确阻断信息。

验收：投稿不再调用模型供应商或旧远端；每项结果都有 artifact 和 simulated 标记。

### W10：端到端迁移、测试和清理

状态：未开始

任务：

1. 为旧 localStorage 提供一次性“导入为未验证草稿”按钮，不自动迁移；导入后写入 audited artifact，再删除旧键。
2. 覆盖 `topic -> experiment -> writing -> submission` 完整 E2E。
3. 覆盖刷新恢复、版本冲突、重试、取消、等待审批/输入、app-server unavailable、缺 credentials、模拟传播、非法文件和跨 project 攻击。
4. 覆盖桌面和 390×844，修复投稿横向溢出。
5. 运行根/前端 build、test、lint、`git diff --check` 和旧接口扫描。

验收：四模块只消费统一 artifacts；所有智能能力只由现有 Codex/main 链发起。

## 7. 提交与合并顺序

建议每个阶段独立提交并在重大变动后 push：

```text
feat(research): enforce stage artifact contracts
feat(research): ingest uploads and edited artifact versions
feat(web): add shared research workflow client
refactor(topic): publish unified handoff artifacts
refactor(experiment): consume and publish workflow artifacts
refactor(writing): replace local storage with artifact versions
refactor(writing): route all model work through Codex runs
feat(writing): generate paper figures through gpt-image-2 tool
feat(writing): finalize source and pdf artifacts
refactor(submission): remove legacy model services
test(research): cover four-module artifact handoff
```

每次功能分支更新：

1. fetch 原分支，不直接合到 main。
2. 从最新 main 创建临时 integration 分支。
3. 合并该模块分支并解决与共享 Workflow 层的冲突。
4. 搜索旧调用/localStorage，运行模块测试和四模块 E2E。
5. 把新增字段映射为现有 artifact contract；禁止新增旁路 API。
6. 更新本文第 8 节，再 push integration 分支。
7. 由 integration -> main 的 PR 合入；不 force push，不丢弃模块 ancestry。

## 8. 实施结果（持续回写）

### 8.1 当前审计结果

状态：已完成（仅完成设计审计，尚未实施 W0-W10）

- 已确认现有 main 的统一模型入口是 ResearchCodexBridge + Codex thread + research skill，不是浏览器模型 API。
- 已确认写作旧模型、翻译、生图、编译调用目前被阻断，但 UI 和 localStorage 架构仍未迁移。
- 已确认开题仍有独立任务接口，实验仍使用 Zustand persist，投稿仍包含 cpolar/localhost 旧服务。
- 已确认现有 artifact/run/session/invocation 骨架可以作为四模块统一基础，但缺少上传/人工版本、stage-role 矩阵、图片 role 和完善的前端共享客户端。
- 已依据 OpenAI 官方文档把用户所说的 `codeximage2` 校正为 `gpt-image-2`，并确定“先探测 Codex 生图工具、不可用则诚实失败”的方案。
- 已在 `RESEARCH_ARTIFACT_ROLES` 增加 `paper-figure`、`paper-translation`、`project-intake`、`dataset-manifest`、`experiment-config` 和 `venue-requirements`；数据库 metadata 和 stage-role 强校验尚未完成，因此 W1 仍为进行中。
- 已按 skill-creator 规范扩展 `research-writing` skill：文本、翻译只使用当前 Codex turn；论文生图使用当前 Codex 账户提供的 image generation 能力，优先请求 `gpt-image-2`，结果必须落盘并声明为 `paper-figure`。无工具/权限时必须失败，不允许 HTTP/API key/假图回退。
- 当前只完成了生图 skill 合同，后台 research thread 的能力探测、前端 agent-run 按钮和 artifact 图片校验仍未完成，因此 W7 仍为进行中。
- 当前 Codex 账户的内置 `image_gen` 能力探测已成功，不需要 `OPENAI_API_KEY`。探测生成了 `docs/assets/writing-workflow-imagegen-capability-probe.png`（970080 bytes），指定的五个英文标签均正确，未包含指标、引用或额外科研结论。内置工具本次未返回底层模型名称，因此只能记录“账户内置 image_gen 成功”，不能声称实际模型就是 `gpt-image-2`。
- 上述成功证明当前交互式 Codex 账户可生图，但不等于 `ResearchCodexBridgeService` 创建的后台 app-server thread 已继承同一工具。W7 下一步仍是从该后台 thread 发起同样的最小 run，并验证图片能落入 run temp、通过 validator、固化为 `paper-figure`。
- skill-creator 的 `quick_validate.py` 因宿主 Python 缺少 PyYAML 未执行；未向项目添加无关 Python 依赖。`research-writing` frontmatter、目录名和正文已人工检查，Research Workflow 定向测试 4/4 通过，根后端构建通过。
- W1 第二批已完成：新增 stage -> 允许输出 role 矩阵；validator 会拒绝当前 stage 不允许的 artifact role；artifact metadata 已写入数据库 `metadata_json`、manifest 和 API 返回；新增 Drizzle migration `0011_vengeful_clea.sql`。定向测试增加到 5/5 通过，后端构建通过。必需输入 role 矩阵仍待补齐，所以 W1 保持进行中。
- W3 已建立首个共享前端层：`research-workflow-types.ts` 定义 Project/Run/Artifact DTO，`research-workflow-client.ts` 集中封装生成 SDK 的 project、run、artifact、agent-run 和 cancel 调用。前端生产构建通过。project hook、artifact picker、事件订阅和四模块替换尚未完成，所以 W3 保持进行中。

### 8.2 后续结果记录模板

每完成一个任务就在此追加，不另建结果文件：

```text
任务：Wn
状态：已完成 / 阻塞
提交：<sha>
修改：<关键文件和行为>
迁移：<旧数据/旧 API 如何处理>
测试：<命令、通过数、失败数和失败原因>
偏差：<与本文方案不同之处及理由>
下一步：<唯一明确后续任务>
```

### 8.3 当前总体结论

现在不应再给写作页面接一个新的独立 LLM 或生图 HTTP 接口。正确方向是先补齐统一 artifact 契约和共享 Workflow 客户端，再依次迁移上游开题/实验、写作、投稿。`gpt-image-2` 只能作为 Codex 受控工具能力参与 writing run，生成结果必须落为 `paper-figure` artifact。W0-W3 完成前，不开始 W7 的生产接入。
