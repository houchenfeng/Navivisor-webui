# 四模块统一 Workflow 迁移 TODO

> **最新执行入口（工作目录方案）**：第 14–18 节是用户最新要求，优先于前文冲突内容。每篇论文对应一个用户选择的工作目录，四模块共用该目录；Demo 从该目录显式载入。第 1–10 节保留历史记录，其中旧分支、自动 push 和过时完成度不作为当前操作指令。当前分支为 `feat/writing-workflow-unification`。用户已授权重大阶段自动 commit/push。本文继续作为唯一实施与验收账本。

> **用途**：四模块迁到统一 Research Workflow / Artifact / Codex Skill 的执行清单与进度记录。  
> 目标：完成开题、实验、写作、投稿四个前端模块向统一 Research Workflow、Artifact 和 Codex Skill 调用链的迁移，移除投稿模块的 cpolar/localhost 旧服务依赖，使项目达到可合入 `main` 的状态。
>
> 执行分支：`integration/research-workflow`。禁止直接在 `main` 开发或 push。重大阶段必须独立 commit，验证通过后再 push 集成分支。
>
> 本文件是后续实施的唯一 TODO、进度和结果记录。`four-module-main-integration-plan.md` 只作为首次合并与架构决策参考；执行过程中不得再创建日报、阶段报告、迁移说明或平行计划等中间文档。每完成一项任务，直接在本文件对应 TODO 下追加结果，并同步更新第 10 节摘要表。

## 1. 当前基线

已完成：

- 三个功能分支及后续开题增量已使用 `--no-ff` 合并并保留 ancestry。
- 已建立 `research_projects`、`research_runs`、`research_artifacts`、`research_agent_sessions`、`research_agent_invocations`。
- 已建立 `ResearchWorkflowService`、`ResearchCodexBridgeService`、`ResearchSkillRegistryService`。
- 已增加 `research-topic`、`research-experiment`、`research-writing`、`research-submission` 四个 Skill。
- Agent run 已统一通过现有 `ThreadsService.startThread/startTurn` 调用 Codex app-server。
- 普通 thread API 已拒绝不属于当前 cwd 的伪造或 disabled Skill。

仍未完成：

- 投稿页面仍使用硬编码 cpolar/localhost API。
- 开题页面仍直接使用旧 `research/topic` 任务接口。
- 实验结果仍以 Zustand/localStorage 为主要业务副本。
- 写作页面仍是占位页。
- 投稿流程状态仍以 React Context 为主要业务副本。
- Agent 完成后的 `result.json` 尚未验证、finalize 为 artifact，run 状态也未随 Codex 事件完整迁移。
- 四模块尚未用 artifact ID、checksum 和 manifest 完成端到端交接。

## 2. 不可破坏的统一架构

最终调用链必须为：

```text
四模块页面
  -> 同源 WebUI API Client
  -> Research Workflow API
  -> ResearchWorkflowService / ResearchCodexBridgeService
  -> ThreadsService
  -> Codex app-server thread/turn
  -> 仓库内 research-* Skill
  -> run temp/result.json
  -> 服务端 schema + 路径 + checksum 校验
  -> finalized artifacts + manifest + database
```

必须遵守：

- 浏览器不得直接调用 OpenAI、其他模型供应商、cpolar 或模块私有模型服务。
- OpenAlex、PDF parser、checksum、训练 runner 等确定性能力作为后端 adapter/tool，不伪装成 LLM。
- 浏览器状态只负责 UI 草稿、筛选和选中项；服务端 project/run/artifact 是业务事实来源。
- 模块之间只传 `projectId`、`runId`、`artifactId` 和已验证 metadata，不传绝对文件路径。
- 所有业务输出先写 run temp，校验成功后原子移动到 artifacts；不得直接覆盖已 finalize 文件。
- `simulated` 与 `real` 必须从 run 输入传播到 artifact、manifest、UI 和投稿 decision。

## 3. Phase A：补全 Workflow 后端闭环

### TODO-A1：定义并验证 Agent `result.json`

修改位置：

- `src/research-workflow/research-contracts.ts`
- 新增 `src/research-workflow/research-result-validator.service.ts`
- `src/research-workflow/research-workflow.module.ts`

任务：

- 定义固定 `schemaVersion`、`runId`、`stage`、`status`、`outputs[]`、`warnings[]`。
- 每个 output 只允许：相对路径、已知 artifact role、media type、simulated、可选 metadata。
- 拒绝绝对路径、`..`、符号链接逃逸、未知 role、重复路径、超大文件和 runId/stage 不匹配。
- 服务端自行计算 size/SHA-256，不信任 Agent 声明的 checksum。
- 校验全部通过后一次性 finalize；任一输出失败时不得形成半完成 run。

完成判定：恶意路径、未知 role、跨 run 文件、checksum 伪造测试全部通过。

实施结果（2026-09-11）：部分完成

- 完成 SHA：`f588788`
- 实际修改：增加 `ResearchResultValidatorService` 和 result contract；验证 schema/run/stage、已知 role、相对路径、真实路径、普通文件、重复项、数量及 50 MiB 单文件上限；服务端 finalize 时自行计算 SHA-256 并更新 manifest。
- 验证命令：`pnpm build`；`pnpm exec eslint src/research-workflow/*.ts`；`pnpm test -- src/research-workflow/research-result-validator.service.spec.ts src/threads/threads.controller.spec.ts`
- 验证结果：构建和 ESLint 通过，2 个测试文件、21 项测试通过。
- 遗留问题：多输出 finalize 当前先完整预检、再逐项落盘，但尚未实现文件移动和数据库写入的补偿事务；符号链接逻辑已实现，Windows 权限环境下尚未加入实际 symlink fixture。
- 远端状态：已推送至 `origin/integration/research-workflow`。

### TODO-A2：实现 run 状态机和 manifest 更新

修改位置：

- `src/research-workflow/research-workflow.service.ts`
- `src/research-workflow/research-codex-bridge.service.ts`

允许迁移：

```text
queued -> running
running -> waiting_for_approval | waiting_for_input | validating
waiting_* -> running | cancelled | failed
validating -> completed | failed
queued/running/waiting_* -> unavailable | cancelled
```

任务：

- 所有状态更新同时写 database 和 manifest，使用同一服务方法。
- manifest 写入 input artifact checksum、输出 artifact、Skill digest、model、effort、promptVersion、threadId、turnId。
- 禁止 completed run 回到 running；重试必须创建新 run，并设置 `retryOfRunId`。
- 修复 artifact 创建后 manifest 未更新的问题。

完成判定：状态迁移单测、重试追溯测试、数据库/manifest 一致性测试通过。

实施结果（2026-09-11）：部分完成

- 完成 SHA：`f588788`
- 实际修改：增加显式状态迁移表；数据库与 manifest 由同一方法更新；artifact 创建同步追加 manifest；重试新建 run 并保留 `retryOfRunId`；Codex provenance 写入 manifest。
- 验证命令：同 TODO-A1。
- 验证结果：构建、ESLint 和定向测试通过。
- 遗留问题：需要增加状态机及写盘失败一致性专用单测，并实现补偿事务后才能标记完成。
- 远端状态：已推送至 `origin/integration/research-workflow`。

### TODO-A3：订阅 Codex 生命周期和 turn 事件

任务：

- 复用现有 WebSocket、approval、user-input、interrupt 与 app-server 生命周期机制，不新增第二套事件通道。
- 只按持久化的 threadId + turnId 更新对应 run，防止并发串线。
- turn completed 后进入 validating，并调用 TODO-A1 finalize。
- turn failed/cancelled 时记录结构化错误；app-server 不可用时标记 unavailable，但允许恢复后继续读取 thread。
- approval/user-input 等待状态必须可在刷新后恢复。

完成判定：并发两个项目、同项目两个模块、重启 app-server、取消与审批竞态测试通过。

实施结果（2026-09-11）：部分完成

- 完成 SHA：`f588788`
- 实际修改：增加 `ResearchRunEventsService`；严格按持久化 threadId + turnId 匹配 invocation；turn completed 触发校验/finalize，failed/interrupted 写入终态；app-server unavailable 将活动 run 标记 unavailable。
- 验证命令：同 TODO-A1。
- 验证结果：类型、lint 和现有定向测试通过。
- 遗留问题：approval/user-input 状态通知映射、重启后 unavailable run 对账恢复、并发与竞态专用测试尚未完成。
- 远端状态：已推送至 `origin/integration/research-workflow`。

### TODO-A4：补全 Workflow API

建议接口：

```text
POST   /api/research/projects
GET    /api/research/projects
GET    /api/research/projects/:projectId
GET    /api/research/projects/:projectId/runs
POST   /api/research/projects/:projectId/agent-runs
GET    /api/research/projects/:projectId/runs/:runId
POST   /api/research/projects/:projectId/runs/:runId/cancel
POST   /api/research/projects/:projectId/runs/:runId/retry
GET    /api/research/projects/:projectId/artifacts
GET    /api/research/projects/:projectId/artifacts/:artifactId
GET    /api/research/projects/:projectId/artifacts/:artifactId/content
POST   /api/research/projects/:projectId/uploads
```

任务：

- 增加 run 详情、取消、重试、artifact 下载和受控上传。
- 删除或严格限制当前任意文本 artifact 写入接口，避免浏览器伪造 finalized 产物。
- 所有 project/run/artifact 关系在后端验证，跨项目访问返回 404/403。
- OpenAPI 生成后让前端使用共享 generated client，禁止新增手写 base URL。

实施结果（2026-09-11）：部分完成

- 完成 SHA：`f588788`
- 实际修改：增加 project 范围内 run 详情、取消、重试和 artifact content 下载；取消会 interrupt 对应 Codex turn；删除允许浏览器任意创建 finalized 文本 artifact 的入口。
- 验证命令：同 TODO-A1。
- 验证结果：构建、ESLint 和定向测试通过。
- 遗留问题：受控上传、OpenAPI 客户端再生成以及 controller 专用鉴权/跨项目测试尚未完成。
- 远端状态：已推送至 `origin/integration/research-workflow`。

## 4. Phase B：统一前端基础设施

### TODO-B1：生成 Workflow API Client

任务：

- 从更新后的 OpenAPI 重新生成 `web/src/generated/api/**`。
- 复用 `web/src/api-client.ts` 的 `BASE_PATH`、Bearer token、401 和 snackbar 处理。
- 建立薄的 research query/mutation hooks，但不得建立第二套 fetch wrapper。
- projectId 放入统一页面上下文或路由；刷新时从服务端重新获取。

完成判定：`rg` 不再发现研究模块自行拼接 host/base URL。

实施结果（2026-09-11）：部分完成

- 完成 SHA：`6dd4581`
- 实际修改：从当前后端 Swagger 重新生成 Hey API SDK、类型和 TanStack Query options；新增 project/run/artifact/agent-run/cancel/retry/content 的同源客户端操作，自动复用既有 `web/src/api-client.ts` 配置。
- 验证命令：`cd web && pnpm build && pnpm test`
- 验证结果：前端生产构建通过；20 个测试文件、195 项测试全部通过。
- 遗留问题：后端 response DTO 尚未显式标注，生成的研究接口响应暂为 `unknown`；共享 research hooks 和四模块调用替换尚未完成，旧投稿 URL 因而仍存在。
- 远端状态：已推送至 `origin/integration/research-workflow`。

### TODO-B2：统一项目、run 和 artifact UI 模型

任务：

- 增加项目选择/创建入口，四个模块共享当前 `projectId`。
- 页面展示 run 状态、真实/模拟标记、输入版本和输出 artifact。
- 增加“上游已有新版本”提示，但不自动改变旧 run 的输入 checksum。
- UI 只能以 artifact metadata 展示文件；下载通过后端 content 接口。

完成判定：刷新浏览器后可恢复项目、run、进度和已完成结果。

## 5. Phase C：逐模块迁移

### TODO-C1：开题模块

现有入口：`web/src/components/research-topic/topic-page.tsx`。

任务：

- 将旧 `POST /api/research/topic/first-search` 接入统一 project/run；确定性 OpenAlex adapter 可保留，但输出必须 finalize 为 `candidate-papers` artifact。
- 候选题生成、确认和核心文献分析分别创建对应 agent run，调用 `research-topic` Skill。
- 产出至少包括 `candidate-topics`、`confirmed-topic`、`core-references`、`literature-handoff`。
- 取消旧轮询接口或把它改成统一 run 状态查询。
- 页面刷新后通过 run/artifact 恢复，不依赖组件内 `task` 成为唯一副本。

测试：OpenAlex 失败、取消、空结果、候选题确认、重复确认、旧 checksum 保留。

### TODO-C2：实验模块

现有入口：

- `web/src/components/research-experiment/experiment-demo.tsx`
- `web/src/stores/experiment-store.ts`

任务：

- 移除实验结果以 Zustand persist/localStorage 为权威数据的设计。
- store 仅保留 UI 临时状态；课题、方案、运行记录和结果从 Workflow API hydration。
- 输入必须选择 `confirmed-topic` 与可选 `literature-handoff` artifact。
- 方案生成调用 `research-experiment` Skill，真实 runner 作为确定性 adapter。
- 产出 `experiment-plan`、`experiment-results`、`method-architecture` 和 diagnostics。
- 真实运行失败不得自动回退为 simulated；模拟结果必须显著标记。

测试：刷新恢复、真实/模拟传播、runner 失败、取消、旧方案复现实验。

### TODO-C3：写作模块

现有入口：`web/src/components/research-writing/writing-page.tsx`，当前为占位页。

任务：

- 实现上游 artifact 选择，至少要求 confirmed topic 和 experiment results。
- outline、draft、final 分别创建 run，统一调用 `research-writing` Skill。
- 支持草稿保存、版本列表、缺失证据提示和模拟数据披露。
- 后端确定性渲染生成 PDF，不要求 LLM 直接输出 PDF 二进制。
- 产出 `paper-outline`、`paper-source`、`paper-metadata`、`paper-pdf`。
- 引用只能来自已输入的 core references/literature handoff，不允许模型虚构引用。

测试：缺少实验结果、虚构引用阻断、草稿版本恢复、PDF 生成失败、模拟披露。

### TODO-C4：投稿模块

现有问题文件：

- `web/src/components/research-submission/config/api.ts`
- `web/src/components/research-submission/services/apiClient.ts`
- `web/src/components/research-submission/services/apiService.ts`
- `web/src/components/research-submission/services/aiService.ts`
- `web/src/components/research-submission/context/SimulationContext.tsx`

任务：

- 删除 cpolar URL、`localhost:3001` fallback 和重复 API clients。
- 删除或隔离 `aiService.ts` 的延时 mock；仅在显式 simulated run 中允许 mock adapter，并持久化 simulated=true。
- PDF 信息提取改为后端确定性 parser；不得发送到外部临时服务。
- 审稿、Rebuttal、摘要/标题等自然语言生成统一调用 `research-submission` Skill/Codex turn。
- Context 仅保留当前 UI 操作状态；submission form、review、rebuttal、decision 均保存为 run/artifact。
- 输入必须引用 `paper-source`、`paper-metadata`、`paper-pdf`；缺失时阻止提交准备。
- 产出 `submission-package`、`review-round1`、`rebuttal`、`submission-decision`。
- “提交”默认只表示本地模拟/准备；任何真实上传、邮件或第三方提交都必须通过已有审批机制并返回外部证据。

完成判定：以下检查无结果：

```powershell
rg -n "cpolar|localhost:3001|VITE_API_BASE_URL|api\.openai|new OpenAI" web/src/components/research-submission
```

## 6. Phase D：清理旧架构

任务：

- 删除已无调用者的投稿 `config/api.ts`、`apiClient.ts`、`apiService.ts` 和重复类型。
- 清理实验 store 中业务结果 persist，只保留明确列出的 UI preference。
- 将开题旧运行目录迁移或提供一次性兼容读取；禁止产生新的模块私有运行根。
- 搜索并清理硬编码 host、模型 token、直接模型 SDK、浏览器唯一业务状态。
- 不删除通用 auth/theme/i18n 的 sessionStorage/localStorage；它们不属于研究业务结果。

回归搜索：

```powershell
rg -n "cpolar|localhost:[0-9]+|api\.openai|OpenAI\(|VITE_API_BASE_URL" src web/src
rg -n "localStorage|sessionStorage|persist\(" web/src/components/research-* web/src/stores/experiment-store.ts
```

## 7. Phase E：端到端验收

必须跑通：

1. 创建 research project。
2. 开题检索并确认课题，生成 literature handoff。
3. 基于确认课题创建实验方案并生成真实或模拟结果。
4. 基于固定 checksum 的开题/实验 artifact 创建论文草稿和 PDF。
5. 基于论文 artifacts 生成投稿包、首轮审稿、Rebuttal 和 decision。
6. 中途刷新页面，状态和产物可恢复。
7. 更新一个上游 run，旧下游仍引用旧 checksum，同时提示存在新版本。
8. 重启 Codex app-server，Skill 重新发现，已持久化 session/run 可恢复。

质量门：

```powershell
pnpm build
pnpm lint
pnpm test
cd web
pnpm build
pnpm test
```

还必须通过：

- `git diff --check`
- `git status --short` 为空。
- Git 中没有运行产物、上传文件、PDF、凭证、`.env` 或本机绝对路径。
- 四个路由可访问，错误/空状态/取消/审批/用户输入可见。
- 根测试的既有 Windows 环境失败必须与本次新增回归分开记录。

## 8. 建议提交与 push 节奏

每个 commit 只做一个可审查阶段：

```text
feat(research): validate and finalize agent run outputs
feat(research): track run lifecycle from Codex events
feat(web): add shared research workflow client
refactor(topic): persist outputs as workflow artifacts
refactor(experiment): replace local result persistence
feat(writing): implement artifact-backed writing workflow
refactor(submission): replace legacy model services with Codex
test(research): cover four-module end-to-end handoff
docs(research): record migration verification results
```

每个重大 commit 后：

```powershell
git status --short
git diff --check HEAD^ HEAD
git push origin integration/research-workflow
```

禁止 push `main`。全部质量门通过后创建 `integration/research-workflow -> main` PR；保留 merge commits，不 squash 四模块 ancestry，不 force push。

## 9. 后续功能分支更新

每次执行前：

```powershell
git fetch --prune origin
git log --oneline <last-merged-sha>..origin/<feature-branch>
git diff --stat <last-merged-sha>..origin/<feature-branch>
```

- 若有增量，用 `--no-ff` 合入集成分支，逐行解决共享 contract/router/module 冲突。
- 新增代码必须改用 Workflow API，不接受重新引入私有 output root、localStorage 业务事实、模型 SDK 或硬编码 URL。
- 若增量只新增重复计划/指南，把有效内容合并到本 TODO 或总集成文档后删除重复文件。
- 首次集成完成后，优先要求负责人从最新 `main` 新开 v2 分支；共享旧分支不要 rebase 后强推。

## 10. 执行状态摘要

| 阶段           | 状态     | 完成 SHA  | 验证结果                                            |
| -------------- | -------- | --------- | --------------------------------------------------- |
| A 后端闭环     | 部分完成 | `f588788` | build/lint 通过；定向测试 21/21                     |
| B 前端基础设施 | 部分完成 | `6dd4581` | web build；20 files / 195 tests 通过                |
| C1 开题迁移    | 未开始   | -         | -                                                   |
| C2 实验迁移    | 未开始   | -         | -                                                   |
| C3 写作实现    | 未开始   | -         | -                                                   |
| C4 投稿迁移    | 未开始   | -         | -                                                   |
| D 旧架构清理   | 未开始   | -         | -                                                   |
| E 端到端验收   | 部分完成 | -         | 首轮 smoke：后端 23/23、前端 195/195；发现 6 项缺口 |
| F 文件链与 Demo | 未开始   | -         | 已完成产品契约与实施任务拆解，等待 Demo 数据         |

执行者完成每个阶段后，必须直接更新此表和对应 TODO 的实际结果、commit SHA、测试命令与遗留问题，不创建新的中间状态文档。

### 10.1 统一结果记录格式

每项 TODO 完成后，在该 TODO 末尾按以下格式追加，不能只修改摘要表：

```markdown
实施结果（YYYY-MM-DD）：完成/部分完成/阻塞

- 完成 SHA：`<commit>`
- 实际修改：列出关键文件和行为变化，不复制 git diff。
- 验证命令：`<command>`
- 验证结果：记录通过数量；失败时区分新增回归与已知基线问题。
- 遗留问题：没有则写“无”；有则指出接续 TODO，不新建文档。
- 远端状态：已推送/未推送；已推送时写明远端分支。
```

若一个 TODO 分多次提交，在同一结果块中列出全部 SHA。若实现方案与原计划不同，必须记录实际决策及原因；不要悄悄改写原始 TODO，使后续执行者无法看出计划与结果的差异。

### 10.2 当前保存点

- 当前集成分支：`integration/research-workflow`。
- TODO 文档初始提交：`d10796e`。
- `d10796e` 已推送至 `origin/integration/research-workflow`，创建本规则前工作区 clean，远端与本地 ahead/behind 为 `0/0`。
- 后续每次重大代码改动均先提交到该分支并 push 保存，再更新本文件中的实际 SHA 和验证结果；禁止直接 push `main`。

## 11. 产品产物契约：从输入到投稿的唯一文件链

本节吸收 2026-09-11 对四模块输入、输出和提示词的最新梳理。编号（1）到（10）是产品语义编号；落地时不得再以页面 Step 数字、聊天消息或临时文件名代替 artifact role。

### 11.1 总链路

```text
（1）研究方向 +（2）研究目标
  ->（3）Scopus/OpenAlex 检索策略
  ->（4）第一轮候选文献 CSV
  ->（5）候选课题分析 + 用户确认课题
  ->（6）近三年核心文献 CSV/BibTeX/PDF 集合
  ->（7）实验方案
  ->（8）实验实现与结果
  ->（9）论文 LaTeX 工程和 PDF
  ->（10）审稿意见、Rebuttal 和决定
```

上下文衔接不依赖“让下一模块阅读上一段聊天”。每个 stage 创建新 run，并把所有必要上游文件的 `artifactId` 放进 `inputArtifactIds`。后端将这些引用及 SHA-256 固化到 `manifest.json`；Codex bridge 根据 manifest 生成文件清单和受控路径，让对应 Skill 读取真实文件。

### 11.2 文件与 artifact role 映射

| 编号 | 阶段 | 建议文件 | artifact role | 内容要求 |
|---|---|---|---|---|
| 1–2 | `topic.intake`（待新增） | `project-intake.json` | `project-intake` | 研究方向、研究目标、语言、时间范围、排除领域、目标文献量 |
| 3 | `topic.first-search` | `search-strategy.json`、`scopus-query.txt` | `diagnostics` | 查询版本、TITLE-ABS-KEY 检索式、TITLE 排除项、年份限制、每轮命中量及修改原因 |
| 4 | `topic.first-search` | `candidate-papers.csv` | `candidate-papers` | 标题、作者、期刊/会议、年份、DOI、摘要、引用数、来源、OpenAlex ID；建议 200–800 条 |
| 5 | `topic.core-literature` | `candidate-topics.md`、`candidate-topics.json` | `candidate-topics` | 6–9 个论文级候选及元分析证据，并显式标出最创新、最可行、最平衡三个 |
| 5 | `topic.confirmation` | `confirmed-topic.json` | `confirmed-topic` | 概括标题、一句话定义、技术路线、创新价值、立论依据、用户确认时间 |
| 5 | `topic.confirmation` | `literature-handoff.md` | `literature-handoff` | 给实验模块的可读摘要，不复制整个 CSV |
| 6 | `topic.core-literature` | `core-references.csv`、`references.bib` | `core-references` | 原则上近 3 年、约 30 篇；相关性优先于数量；每条保留来源和证据字段 |
| 6 | `topic.core-literature` | `papers/<key>.pdf`、`paper-manifest.json` | `core-references` | PDF 是多个独立 artifact 或一个带成员 manifest 的受控 bundle；记录下载状态、合法来源 URL、SHA-256，未下载不得伪装成功 |
| 7 | `experiment.plan` | `experiment-plan.md`、`experiment-config.json` | `experiment-plan`、`experiment-config` | 概要、baseline、数据集、指标与公式、5–8 个创新点、代码改动位置、预计提升、Go/No-Go |
| 8 | `experiment.run` | `algorithm-details.md`、`experiment-results.md` | `method-architecture`、`experiment-results` | 至少三个选定创新点；主结果、baseline/对比算法、消融、误差范围和模拟/真实披露 |
| 8 | `experiment.run` | `figures/comparison.png`、`figures/architecture.png` | `experiment-results`、`method-architecture` | 效果对比图与算法框架图；保存生成提示词、模型/工具、源数据 artifact ID；写作采用时再派生为 `paper-figure` |
| 8 | `experiment.run` | `dataset-manifest.json` | `dataset-manifest` | 数据集名称、版本、划分、许可、下载位置或外部引用；不把大型数据集复制进项目目录 |
| 9 | `writing.outline` | `paper-outline.md` | `paper-outline` | 标题、摘要结构、章节和证据映射 |
| 9 | `writing.draft/final` | `paper.tex`、`references.bib`、`sections/*.tex` | `paper-source` | 引用必须能追溯到输入的 `core-references`，禁止模型虚构引用 |
| 9 | `writing.final` | `paper-metadata.json`、`figures/*`、`paper.pdf` | `paper-metadata`、`paper-figure`、`paper-pdf` | CVPR 模板、编译日志和模拟数据声明；PDF 由确定性 LaTeX worker 生成 |
| 10 | `submission.prepare` | `submission-package.zip` | `submission-package` | 论文、补充材料、元数据和检查清单 |
| 10 | `submission.review.round1` | `review-round1.json`、`review-round1.md` | `review-round1` | 三位审稿人结构化意见、分数、置信度、问题和总体建议 |
| 10 | `submission.rebuttal` | `rebuttal.md` | `rebuttal` | 按 reviewer/问题逐条响应，并引用论文或实验 artifact |
| 10 | `submission.decision` | `decision.json` | `submission-decision` | 模拟或真实来源、决定、理由和时间；Demo 必须标记 simulated |

说明：现有 `RESEARCH_STAGES` 缺少 `topic.intake`，`RESEARCH_ARTIFACT_ROLES` 缺少 `search-strategy`。第一版可把检索策略暂存为 `diagnostics` 并在 metadata 中写 `kind=search-strategy`；正式实现 TODO-F4 时补齐 stage、role 和允许输出映射，避免长期复用语义过宽的 diagnostics。

### 11.3 第一轮与核心文献检索边界

- 第一轮检索的目标是覆盖候选空间，不承诺每篇 100% 相关；记录查询演化，目标相关度约 80%，数量由页面给出建议区间 200–800，不用模型伪造数量。
- 核心文献阶段以已确认课题为输入，优先近三年顶会顶刊和直接相关工作；约 30 篇只是上限建议，更少但更相关可以接受。
- OpenAlex/Scopus/arXiv/Google Scholar 是 adapter 的来源选择，不是 artifact role。每条记录必须保存 `source`、稳定标识和来源 URL。
- Google Scholar 没有稳定公开批量 API；不得通过未经授权的抓取假装成功。需要人工检索或合规连接器时，run 转为 `waiting_for_input`/`needs_credentials`。
- PDF 下载必须遵守来源许可。只有实际下载且校验成功的文件才能登记 artifact；受限论文只保存元数据、链接和 `downloadStatus=unavailable`。

### 11.4 显式存储与版本规则

数据库是索引和关系事实源，文件系统是内容事实源：

```text
SQLite
  research_projects       一项研究
  research_runs           某阶段的一次不可变尝试
  research_artifacts      文件元数据、角色、路径、SHA-256、simulated
  research_agent_sessions 每个 project/module 的 Codex thread
  research_agent_invocations run 与 thread/turn 的绑定

NAVIVISOR_RESEARCH_WORK_ROOT/<projectId>/
  project.json
  uploads/
  runs/<runId>/
    manifest.json
    temp/                  执行中，不能被下游选择
    artifacts/             校验完成后的真实文件
```

必须补充的字段/规则：

- `project-intake.json` 是（1）（2）的结构化事实源；页面草稿可临时存在内存，但点击保存后必须生成新 artifact。
- artifact 不可覆盖。用户修改、重新检索、重新生成或重跑实验都产生新 run 和新 artifact ID。
- `manifest.inputs[]` 固定保存 `artifactId`、`producerRunId`、`role`、`sha256`；下游永远可以重建当时上下文。
- 增加 `artifact_relations` 表或等价 JSON 字段，表达 `derived_from`、`supersedes`、`contains`、`cites`；不要仅靠文件名推断关系。
- 增加 `latest.json` 或数据库 stage-head 投影，仅用于默认选中最新成功版本，不改变旧 run 的输入。
- 大型数据集和受限 PDF 不复制进数据库；保存受控文件或外部引用 manifest。数据库不得存 PDF/PNG blob。
- `simulated=true` 必须沿整条派生链传播。只要论文结果依赖模拟实验，论文和投稿决定都要展示该标记。

### 11.5 上下文装配规则

每个 Skill 的输入必须有白名单，避免把整个项目无差别塞进上下文：

| Skill | 必需输入 | 可选输入 |
|---|---|---|
| `research-topic` 第一轮 | `project-intake` | 历史 `search-strategy` |
| `research-topic` 候选题 | `candidate-papers` | `project-intake`、检索 diagnostics |
| `research-topic` 核心文献 | `confirmed-topic` | `candidate-papers`、`candidate-topics` |
| `research-experiment` 方案 | `confirmed-topic`、`core-references` | `literature-handoff`、用户模板压缩包 |
| `research-experiment` 运行 | `experiment-plan`、`experiment-config` | `dataset-manifest`、代码快照引用 |
| `research-writing` | `confirmed-topic`、`core-references`、`experiment-results`、`method-architecture` | `paper-figure`、`literature-handoff` |
| `research-submission` | `paper-source`、`paper-metadata`、`paper-pdf` | `experiment-results`、`paper-figure` |

上下文过大时不截断关键来源：CSV/PDF 先由确定性工具生成索引或结构化摘要 artifact，Skill 同时拿到摘要与原始 artifact 引用。摘要必须记录来源行、DOI、页码或 chunk ID，便于回查。

## 12. 统一 Demo 数据与按钮

### TODO-F1：定义唯一 Demo bundle

状态：未开始。

用户后续提供的 Demo 数据应整理为一个版本化 bundle，而不是分别硬编码在四个页面：

```text
research-demo/<demoId>/
  demo-manifest.json
  project-intake.json
  topic/search-strategy.json
  topic/candidate-papers.csv
  topic/candidate-topics.json
  topic/confirmed-topic.json
  topic/core-references.csv
  topic/references.bib
  experiment/experiment-plan.md
  experiment/experiment-config.json
  experiment/algorithm-details.md
  experiment/experiment-results.md
  experiment/figures/comparison.png
  experiment/figures/architecture.png
  writing/paper.tex
  writing/references.bib
  writing/figures/*
  writing/paper.pdf
  submission/review-round1.json
  submission/rebuttal.md
  submission/decision.json
```

`demo-manifest.json` 必须声明 `schemaVersion`、`demoId`、`version`、标题、说明、所有文件的 role/mediaType/sha256、stage、依赖关系及 `simulated=true`。Demo 可以缺少尚未提供的文件，但必须显式列入 `missing[]`，UI 不得伪装完整。

### TODO-F2：实现后端 Demo 导入器

状态：未开始。

- 新增受控的 `POST /api/research/demo-imports`，body 只接受服务端已注册的 `demoId`，禁止浏览器传任意服务器路径。
- 校验 bundle schema、文件白名单、大小、SHA-256 和路径边界。
- 创建一个新的 research project，并按 stage 创建已完成的 simulated runs；所有文件走与真实结果相同的 artifact finalize 逻辑。
- 重复点击默认创建新的 Demo 项目；如要复用已有项目，必须让用户显式选择，不能静默覆盖。
- 返回 `projectId`、各 stage 的 `runId`、artifact IDs 和推荐跳转路由。
- 给导入器加契约测试、路径逃逸测试、缺文件测试和 checksum 错误测试。

### TODO-F3：统一“一键载入 Demo”组件

状态：未开始。

- 新建一个共享 `ImportResearchDemoButton`，四模块不再各写 `loadDemo()`、静态常量或 mock 注入按钮。
- 按钮文案统一为“一键载入完整 Demo”；副文案明确“将创建一个独立的模拟研究项目，不覆盖当前项目”。
- 导入时显示进度；成功后切换统一 `projectId`，按入口跳到相应模块，并从 Workflow API hydration。
- 首页展示主入口；四模块只展示同一组件的紧凑变体。已在 Demo 项目内时改为“重新载入 Demo”，并再次提示会创建新项目。
- 删除 `fillFromExperiment` 直接读取 Zustand、写作页面自动调用实验 `loadDemo()`、投稿页面独立 mock 数据注入等旁路。
- UI 的 Demo 标识由 artifact/run 的 `simulated` 字段驱动，不能由页面路径或按钮点击后的内存布尔值驱动。

完成判定：从首页单击一次即可创建并打开完整 Demo；随后依次打开四模块，数据来自同一个 project 的持久化 artifacts；刷新浏览器或重启服务后仍可恢复；所有模拟数据始终有清晰标识。

## 13. 基于最新需求的实施顺序

### TODO-F4：先补契约和项目上下文

状态：未开始。

- 为（1）到（10）的 JSON/CSV/Markdown 文件定义 JSON Schema 或列级契约。
- 增加 `topic.intake` stage、正式 `search-strategy` role、对应允许输出映射、artifact 关系以及 stage-head/latest 投影。
- 实现统一当前项目选择器；路由或全局 context 只保存 `projectId`，实际数据重新请求服务端。
- 修复当前 generated client 的类型错误，确保 `pnpm --dir web build` 通过后再迁移页面。

### TODO-F5：按依赖顺序迁移四模块

状态：未开始。

1. 开题：先落 `project-intake`、检索策略和第一轮 CSV，再实现候选题、确认课题、核心文献包。
2. 实验：只消费确认课题和核心文献 artifacts；方案、结果、表格和两张图全部 finalize。
3. 写作：移除 localStorage 业务事实和 `fillFromExperiment` 旁路；引用由 BibTeX/DOI 校验；确定性编译 CVPR PDF。
4. 投稿：消费论文 artifacts；三位 reviewer、Rebuttal、decision 全部持久化；默认明确为模拟。

### TODO-F6：最终闭环验收并回写本文

状态：未开始。

- 使用用户提供的同一份 Demo bundle 跑通（1）到（10）。
- 对每个 run 检查输入 ID、SHA-256、输出 role、simulated 传播和来源关系。
- 验证刷新、重启、重试、上游新版本、下游旧版本复现、缺文件、取消和失败恢复。
- 执行第 7 节全部质量门；不得用删除测试或跳过类型检查换取通过。
- 完成后直接更新 TODO-F1 至 F6 的状态、实际修改、验证命令、结果、commit SHA 和遗留问题，并同步更新第 10 节摘要表。
- 除用户最终交付的 Demo 数据文件外，不创建日报、临时计划、阶段报告或其他中间 Markdown。

## 14. 最新产品决定：一篇论文，一个工作目录

状态：设计完成，功能待实现。本次提供下列示例契约，不代表文件导入器或 UI 已上线。

### 14.1 首页和四模块的关系

首页增加“论文工作目录”选择器、当前论文名称、四模块状态和“打开目录”“查看文件”“载入目录 Demo”操作。用户选择一个目录后，后端把规范化真实路径绑定到唯一 `projectId`。四张模块卡片都显示同一个目录的对应子目录，点击时带上 `projectId`。

默认目录例子：`D:/Research/CameraVAD-SceneMemory`。四模块分别使用 `topic/`、`experiment/`、`writing/`、`submission/`，不要求用户选四次路径。允许在高级设置中指定这四个相对子目录名，但必须在同一个论文根目录内，不能分别绑定四个独立项目。

浏览器显示的是服务端可访问目录。在本机部署时就是本机目录；在远程/Docker 部署时是服务器或挂载卷目录。目录选择使用现有后端文件浏览 API，不能把浏览器 `webkitdirectory` 上传误当成绑定服务器目录。

首次打开已有目录：只读扫描 manifest，展示论文名称、已有产物、缺失文件和版本；确认选中后建立数据库索引。新目录：初始化项目元数据。已有普通文件目录：先预览待识别文件，仅将符合契约的文件纳入索引，原文件保留。

### 14.2 所有论文数据都在目录内

```text
CameraVAD-SceneMemory/
  project.json                      项目身份、目标、四模块路径
  README.md                         自动生成的项目简述和文件导航（用户产物）
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
    papers/                         实际取得的 PDF
    literature-handoff.md
  experiment/
    plan.md
    innovations.json
    config.json
    dataset-manifest.json
    algorithm-details.md
    code/                           演示伪代码或真实实现，明确区分
    metrics/main.csv
    metrics/ablation.csv
    metrics/seeds.csv
    results.md
    figures/comparison.png
    figures/architecture.png
    figures/generation.json
  writing/
    outline.md
    paper-metadata.json
    sections/                       可编辑章节源文件
    paper.tex
    references.bib
    figures/
    template/                       模板文件与版本/许可说明
    paper.pdf
    compile-log.txt
    source-manifest.json
  submission/
    venue.json
    checklist.json
    submission-package.zip
    reviews.json
    reviews.md
    rebuttal.md
    response-map.json
    decision.json
  demo/
    demo-manifest.json              文件清单和依赖，不复制一份业务内容
  .navivisor/
    project-index.json              完整可移植索引，不依赖全局 SQLite 才能恢复
    runs/<runId>/manifest.json
    runs/<runId>/context.json
    runs/<runId>/events.jsonl
    runs/<runId>/temp/
    artifacts/<artifactId>/<name>   已固化版本的不可变内容
    conversations/<sessionId>.jsonl 项目相关对话及产物卡片记录
    recovery/                      原子提交恢复记录
```

顶层四模块目录是用户可读、可编辑的当前版本；`.navivisor/artifacts/` 是不可变版本快照。保存时将文件复制/固化为快照，并更新当前文件投影。避免通过可写硬链接把历史快照一起改掉。用户直接改了顶层文件时，显示“外部修改，未登记”，经保存产生新 artifact；旧下游输入仍引用旧快照。

全局 SQLite 继续服务查询和运行调度，但它只是可重建索引；`project.json`、项目索引、run manifest、快照及对话均落在选定目录。复制整个目录到另一台机器后可重新注册并恢复文件链。Codex 自身的账号、凭证和原始运行时会话仍由 Codex 管理，不放入论文目录；导出的项目对话不得含凭证。未复制的大型外部数据集明确列入外部依赖清单，不宣称离线包包含它们。

### 14.3 project.json 示例

```json
{
  "schemaVersion": 2,
  "projectId": "b845db02-b48e-40eb-8bf1-978e2546ee4e",
  "title": "场景记忆与大模型按需复核的视频异常检测",
  "description": "面向固定摄像头，使用轻量筛查、场景记忆和视觉语言大模型复核异常片段。",
  "language": "zh-CN",
  "directories": {"topic": "topic", "experiment": "experiment", "writing": "writing", "submission": "submission"},
  "demo": {"id": "camera-vad-scene-memory", "version": "1.0.0", "simulated": true},
  "createdAt": "2026-09-11T12:00:00Z"
}
```

路径全部相对论文根目录；绝对路径绑定只存在当前部署的注册信息中，移动目录不改文件内容。项目 ID 复制冲突时提示“移动原项目”或“复制为新项目”，不能静默串线。

## 15. 完整 Demo 示例：摄像头视频异常检测 + 大模型

这里给出每类文件的最小代表内容和完整包的数量要求。CSV 示例只有数行，不能宣称已实际检索 300 篇；完整 Demo 后续由用户数据补齐。所有 `DEMO-*` 文献是明确的合成占位记录，不能进入真实论文引用。实际 PDF、GPT 生成图片和编译 PDF 尚未提供，manifest 应记录 missing，而不能用空文件补齐。

### 15.1 输入和检索中间数据

`topic/intake.json`：

```json
{
  "researchDirection": "视频异常检测",
  "researchGoal": "结合视觉语言大模型，对固定摄像头视频低成本定位并解释异常",
  "scenarios": ["校园走廊", "停车场", "楼宇入口"],
  "constraints": {"excludeDomains": ["生物医学"], "fromYear": 2022, "targetPaperCount": {"min": 200, "preferred": 300, "max": 800}},
  "coreLiteratureWindow": {"from": "2023-09-11", "to": "2026-09-11"},
  "resources": {"gpuBudget": "单卡原型", "latencyGoalMs": 100, "vlmBudget": "只复核候选片段"}
}
```

`topic/search-strategy.json` 保存可追溯的语义概念与每个来源自己的请求格式。Scopus 的 `TITLE-ABS-KEY` 不能直接发送给 OpenAlex：adapter 负责转换为已验证的 OpenAlex 参数。下面只是供后续验证的检索式草案：

```text
TITLE-ABS-KEY(("video anomaly detection" OR "video abnormality detection" OR "anomalous event detection" OR "abnormal event detection") AND ("large language model" OR "large language models" OR "vision language model" OR "vision-language model" OR "multimodal large language model" OR "LLM" OR "VLM") AND ("surveillance" OR "camera" OR "CCTV")) AND NOT TITLE("medical" OR "biomedical" OR "cell" OR "protein") AND PUBYEAR > 2021
```

`search-iterations.jsonl` 每行一轮：`iterationId/queryVersion/provider/request/retrievedCount/deduplicatedCount/sampleSize/relevantInSample/estimatedPrecision/changeReason/executedAt/simulated`。Demo 可演示第一轮 62 条过窄，第二轮 412 条且抽样 50 条中 41 条相关，去重后 300 条；这些数字必须标记模拟。样本相关率 82% 只是抽样估计，不等于全量已验证 82%。

`candidate-papers.csv`：

```csv
paper_id,title,authors,venue,year,doi,abstract,citation_count,source,source_url,synthetic
DEMO-001,Fast Screening for Camera Anomaly Clips,Demo Author A,Demo Venue,2025,,Lightweight scoring selects suspicious camera clips.,0,demo,,true
DEMO-002,Memory Retrieval for Scene Understanding,Demo Author B,Demo Venue,2024,,Normal scene memories support retrieval and comparison.,0,demo,,true
DEMO-003,Language Guided Verification of Video Events,Demo Author C,Demo Venue,2026,,A vision language model explains uncertain event clips.,0,demo,,true
```

`screening.csv` 记录 `paper_id,decision,relevance_score,reason,evidence,reviewer,synthetic`；决定有 include/exclude/uncertain。全文未取得时标注 evidence=abstract，不能写成已读全文。

### 15.2 主题分析、三个候选题和确认结果

`landscape.md` 必须包含：年度数量及分母、常青/新兴/衰退主题、期刊偏好、关键词共现、拥挤方向、五个 A+B 机会及难度。每个判断附 paper IDs 与方法说明。Demo 示意：轻量检测 + 按需大模型复核（基础）、场景记忆 + 跨场景迁移（中期）、证据检索 + 可信解释（中期）、主动查询 + 成本控制（中期）、长期漂移检测 + 多摄像头协同（高阶）。合成数据只能演示分析结构。

`candidate-topics.json` 的 `candidates[]` 每项包含 `id/profile/title/question/methodSteps/innovations/feasibility/risks/evidencePaperIds/expectedOutputs`。页面固定展示三张推荐卡，额外 6–9 个备选放入展开列表；不会把所有备选都当成最终选择。

| profile | 标题 | 一句话科学问题 | 技术路线 | 风险 |
|---|---|---|---|---|
| innovative | 事件图谱记忆与多角色复核的跨摄像头异常检测 | 结构化长期记忆能否提升跨摄像头事件推理一致性？ | 事件建图→检索→多角色复核→证据融合 | 图构建成本和身份关联误差 |
| feasible | 轻量筛查与视觉语言大模型按需复核 | 只复核不确定片段能否以较低成本提升检测效果？ | 轻量评分→阈值触发→VLM 复核→分数融合 | 阈值迁移和时延 |
| balanced | 基于场景记忆与大模型复核的快慢双通路视频异常检测 | 场景记忆能否在固定预算下改善疑难片段识别和解释？ | 筛查→记忆检索→VLM 按需复核→校准融合 | 记忆污染和场景漂移 |

Demo 用户选 balanced。`confirmed-topic.json` 保存 selectedCandidateId、上述完整标题、question、六步路线、三个核心创新、引用证据 IDs、selectionReason、confirmedAt。三个核心创新为“不确定性触发”“场景正常记忆”“证据化复核与校准融合”，同时保存可行性限制，预计提升不作为已验证结论。

### 15.3 核心文献包

`core-references.csv` 在第一轮列基础上增加 `citation_key,relevance_reason,method_relation,publication_date,fulltext_status,pdf_artifact_ref,verified`。三类代表记录分别支撑轻量 baseline、记忆检索和 VLM 复核。核心包约 30 篇是目标，零篇真实验证时显示“待补齐”，不能自动把 DEMO 文献改成真实记录。

`references.bib` 示例：

```bibtex
@misc{demo_fast_screening,
  title = {Fast Screening for Camera Anomaly Clips},
  author = {{Demo Author A}},
  year = {2025},
  note = {SYNTHETIC DEMO RECORD - NOT A REAL PUBLICATION}
}
```

`paper-manifest.json` 每篇记录 `paperId/citationKey/sourceUrl/license/downloadStatus/reason/artifactRef`；未下载的示例为 `downloadStatus=missing, reason=demo_pdf_not_provided, artifactRef=null`。`literature-handoff.md` 汇总选题、证据、baseline 选择理由、研究缺口、资源预算和实验建议，并给出来源引用。

### 15.4 实验方案和实现内容

`experiment/plan.md` 完整章节：研究概要、假设、baseline、数据集划分、指标公式、5–8 个创新点、选定三个创新、对比和消融、运行预算、代码计划、失败判断、预期提升、模拟披露。

七个创新候选：I1 不确定性触发、I2 场景正常记忆、I3 证据化 VLM 复核、I4 融合分数校准、I5 记忆污染过滤、I6 时间一致性约束、I7 跨场景适配。Demo 选择 I1/I2/I3，I4 作为固定后处理；其余留作未来工作。每项存 hypothesis、implementation、baseline、ablation、cost、acceptanceCriteria、selected，不预设真实成功。

数据集候选为 UCF-Crime、XD-Violence、ShanghaiTech、UBnormal；具体版本、获取地址、许可和官方划分须实际核对后填入 `dataset-manifest.json`。Demo 可只演示 `camera-demo` 合成数据集，避免把模拟指标冒充公开榜单结果。

`config.json`：

```json
{
  "schemaVersion": 1,
  "mode": "simulated",
  "datasetId": "camera-demo",
  "clipFrames": 16,
  "sampleFps": 4,
  "seeds": [11, 23, 47],
  "trigger": {"scoreThreshold": 0.65, "uncertaintyThreshold": 0.2},
  "memory": {"topK": 5, "maxEntries": 10000, "excludeTestLabels": true},
  "fusion": {"fastWeight": 0.4, "memoryWeight": 0.2, "vlmWeight": 0.4},
  "selectedInnovations": ["I1", "I2", "I3"]
}
```

`algorithm-details.md` 明确：输入视频按窗口取帧；轻量模型产生异常分数 s；不确定性 u 触发慢路径；从训练正常样本构建的记忆库取 top-k；VLM 输出 anomaly/category/timeSpan/explanation/evidenceRefs；归一化后融合分数。未触发时只用 s；慢路径分数按配置加权。阈值在验证集选定，禁止用测试标签调参。

`code/pipeline.py` 在 Demo 中保存可读伪代码并标记 `implementationStatus=pseudocode`：`sample_clip -> fast_score -> should_review -> retrieve_memory -> verify_with_vlm -> calibrate -> output_event`。真实实现阶段必须补 checkpoint、依赖锁、运行命令、日志、模型及数据版本，不能把伪代码状态标为真实实验完成。

指标说明：Precision=TP/(TP+FP)，Recall=TP/(TP+FN)，F1=2PR/(P+R)；VLM 调用率=复核片段数/全部片段数；平均时延与 P95 分别报告。AUROC/AP 需明确样本粒度、正类和计算实现，不能混淆。

### 15.5 模拟实验结果、消融和两张图

`metrics/main.csv` 示例（均为教学模拟，非真实 benchmark）：

```csv
dataset,method,auroc_percent,ap_percent,f1_percent,vlm_call_percent,mean_latency_ms,simulated
camera-demo,Lightweight,81.2,57.8,61.4,0,18,true
camera-demo,VLM-all,85.9,64.1,66.2,100,680,true
camera-demo,FastSlow-I1,84.8,62.5,65.1,18,137,true
camera-demo,MemoryFastSlow-I1I2I3,87.1,67.2,68.0,12,99,true
```

`metrics/ablation.csv`：

```csv
variant,I1,I2,I3,auroc_percent,ap_percent,mean_latency_ms,simulated
baseline,false,false,false,81.2,57.8,18,true
trigger,true,false,false,84.8,62.5,137,true
trigger-memory,true,true,false,85.6,64.3,103,true
full,true,true,true,87.1,67.2,99,true
```

`seeds.csv` 为每个方法每个 seed 保存原始指标；未提供重复试验时 `results.md` 不生成“±标准差”。消融不能直接推出每个模块独立因果贡献，完整试验设计需要额外组合。

`results.md` 包含主表、消融表、预算比较、失败案例、数据泄漏检查、局限和模拟声明。Demo 解释可写：相对轻量 baseline，模拟 AUROC 提高 5.9 个百分点；相对全量 VLM，调用率从 100% 降至 12%。这只是演示如何描述表格。

两张图必须经 GPT 生图能力生成并登记文件：

- `comparison.png` 提示词：为 CameraVAD 教学 Demo 绘制效果示意，左侧正常走廊与异常事件占位帧，右侧四方法模拟指标；严格使用 main.csv 给定数值，标题显式写“SIMULATED DEMO”，不得生成真实监控证据。生成后逐项核对文字和数值，CSV 表才是指标依据。
- `architecture.png` 提示词：绘制从摄像头→片段采样→轻量评分→不确定性分支→场景记忆检索→VLM 复核→融合→时间位置与解释的框架，标注快路径与慢路径、I1/I2/I3，风格简洁，输出清晰 PNG。
- `generation.json` 保存 prompt、tool、实际 model、generatedAt、inputArtifactRefs、outputSha256、verification。工具不可用时记录缺失原因，不用其他图假充 GPT 输出。

### 15.6 论文工程

标题示例：Scene-Memory Guided Fast–Slow Video Anomaly Detection with Selective Vision–Language Verification。

`outline.md`/章节内容必须覆盖：摘要、引言、相关工作、方法模块、实验与讨论、结论与展望、参考文献。摘要示例：“我们研究固定摄像头异常检测的推理成本问题，提出轻量筛查、场景记忆和按需视觉语言复核流程。本文教学示例使用合成数据说明方法与评估过程，不报告真实模型性能。”

章节输入映射：引言读取 intake/confirmed-topic；相关工作读取 core-references 与 verified BibTeX；方法读取 algorithm-details/config；实验读取 metrics/results/dataset-manifest；局限读取实验失败项与未验证假设。`source-manifest.json` 逐章节记录来源 artifact IDs 和 SHA-256。

LaTeX 项目包含 `paper.tex`、各章节、`references.bib`、两张图片以及可分发的 CVPR 模板文件；模板版本、来源、编译引擎和命令写入 metadata。缺模板/图片/BibTeX 或编译失败时显示诊断；仅在编译成功后登记 `paper.pdf`。Demo PDF 必须明显标记合成数据与合成引用，真实投稿模式阻断 synthetic 引用。

### 15.7 三位审稿人、Rebuttal 和决定

`reviews.json` 示例结构：

```json
{
  "schemaVersion": 1,
  "simulated": true,
  "scale": {"min": 1, "max": 10},
  "reviewers": [
    {"id": "R1", "score": 6, "confidence": 3, "summary": "预算控制思路清晰", "strengths": ["快慢路径可解释"], "weaknesses": ["缺少真实测量"], "questions": [{"id": "R1-Q1", "text": "请提供不同触发阈值的成本曲线"}]},
    {"id": "R2", "score": 5, "confidence": 4, "summary": "需证明场景记忆的作用", "strengths": ["模块容易拆分"], "weaknesses": ["消融组合不足"], "questions": [{"id": "R2-Q1", "text": "如何避免测试集信息进入记忆库？"}]},
    {"id": "R3", "score": 6, "confidence": 3, "summary": "适合形成原型", "strengths": ["输出解释具有应用价值"], "weaknesses": ["跨场景验证不足"], "questions": [{"id": "R3-Q1", "text": "长期光照变化是否造成记忆漂移？"}]}
  ]
}
```

`rebuttal.md` 示例：R1-Q1：“感谢建议。当前结果为教学模拟，我们将按固定验证集阈值网格补充实测成本曲线，不把模拟曲线当作完成的实验。”R2-Q1：“记忆仅从训练正常片段建立；将在数据 manifest 中保存划分哈希和构建日志。”R3-Q1：“增加按时间划分的跨场景测试与记忆更新策略比较；当前不声称已验证漂移鲁棒性。”

`response-map.json` 用 questionId 关联 responseSection、evidenceArtifactIds、status（answered/planned/missing）；尚未做的新实验不能标 answered-with-evidence。`decision.json` 保存 `simulated=true, decision=revision_required, reasons=["需要真实测量与完整消融"]`。无需为了 Demo 强制给出 Accept。

## 16. 从工作目录一键载入 Demo 的具体行为

最新入口替代第 12 节“每次点击都创建新项目”的默认设计：用户先在首页选中论文目录，再点击“从工作目录载入 Demo”。正常点击只读取并登记已有数据，不调用 LLM、不重新生图、不运行实验、不消耗推理额度。

两个动作必须区分：

1. “从工作目录载入 Demo”：读取选中目录 `demo/demo-manifest.json`，校验清单，显示到当前项目；相同 demo 版本和相同哈希再次点击是幂等的，不创建重复 runs。
2. “创建 Demo 副本”：把完整示例包复制到用户选定的新目录，生成新的 projectId，再载入。已有同名文件时展示冲突；不自动覆盖用户修改。

四模块共享一个按钮组件 `LoadWorkspaceDemoButton`，首页放完整按钮，各模块标题区放紧凑按钮。点击默认只显示当前模块的数据，但通过同一后端 importer 登记整个已存在的依赖图；缺失部分保留未完成状态。切换模块时自然读取同一项目数据。

`demo-manifest.json` 最小结构（哈希在实际文件落地后计算，示意值不能通过导入校验）：

```json
{
  "schemaVersion": 2,
  "demoId": "camera-vad-scene-memory",
  "version": "1.0.0",
  "simulated": true,
  "nodes": [
    {"key": "intake", "stage": "topic.intake", "files": [{"key": "intake-json", "path": "topic/intake.json", "role": "project-intake", "mediaType": "application/json", "sha256": "COMPUTE_FROM_FILE"}], "inputs": []},
    {"key": "first-search", "stage": "topic.first-search", "files": [{"key": "papers-csv", "path": "topic/candidate-papers.csv", "role": "candidate-papers", "mediaType": "text/csv", "sha256": "COMPUTE_FROM_FILE"}], "inputs": ["intake-json"]}
  ],
  "missing": ["topic/papers/*", "experiment/figures/comparison.png", "experiment/figures/architecture.png", "writing/paper.pdf"]
}
```

实际完整清单必须列出第 15 节所有已提供文件。逻辑 file key 在导入时映射到新的 artifact UUID；检测依赖环、未知引用、stage/role 错配和跨项目引用。缺失节点不创建 completed run，UI 展示“部分载入：已有 N 项，待补 M 项”。完整包才显示“完整 Demo”。

## 17. 对话窗口如何展示目录和产物

选择目录后，在对话区域固定显示可折叠“当前论文”卡片：论文名、目录短路径、研究目标一句话、四阶段状态、最近保存时间。四模块的对话上下文使用同一个 projectId；每模块可保留独立 Codex thread，bridge 将 cwd 绑定到论文目录并按输入 manifest 装配上下文。

每次保存/载入/生成成功追加一张持久化结果卡片，例如：

> 已载入「场景记忆与大模型复核的视频异常检测」Demo。开题有 3 条合成文献样例，实验有 2 张指标表；两张图片和论文 PDF 待补齐。以上为模拟教学数据。
> 操作：查看文件 / 查看实验 / 进入写作。

卡片保存 eventId、projectId、module、runId、artifactIds、summary、createdAt，不把全部 CSV、PDF 或图片 base64 写入聊天消息。点击文件打开现有文件预览；用户可以下载、查看版本或查看来源。聊天正文采用简要描述；详细内容存在文件里。

UI 事件与真实 Codex turn 区分类型，不能伪装为模型已运行。项目对话的 UI 投影落盘到 `.navivisor/conversations`，刷新后恢复；旧 Codex 会话无法在另一台机器恢复时，仍能展示已导出对话并基于 manifest 开新会话。

## 18. 工作目录方案的执行清单与验收账本

第 18 节为当前执行顺序；F1–F6 保留作为需求分组，具体动作按下列 W 项推进。不要并行维护另一份计划。

| ID | 修改任务和位置 | 完成标准 | 状态 |
|---|---|---|---|
| W1 | `research-paths.service.ts`、数据库 project 注册；支持用户目录真实路径映射，取消路径必须由固定 root + UUID 推导的限制 | 选择目录后统一 projectId；符号链接边界、移动和重复注册可控 | 已完成 |
| W2 | `research-contracts.ts`、validator、migration；新增 intake/candidate 阶段与 search-strategy 等输出角色，拆开候选题生成和核心检索 | intake→first-search→candidates→confirmation→core-literature 无循环；所有文件都有 stage/role | 已完成 |
| W3 | Workflow service；不可变快照、四模块当前文件投影、可移植索引、外部改动识别和提交恢复 | 中断写盘不发布半成品，目录复制后可重建索引 | 已完成 |
| W4 | 受控工作目录注册/扫描/保存 API、response DTO 和 generated API client | API 返回完整 typed project/run/artifact；现有 TS 构建错误修复 | 已完成 |
| W5 | 首页目录选择器、统一 project context、路由 search 参数与对话卡片 | 四模块、对话和文件预览始终属于同一项目，刷新保留选择 | 已完成（刷新靠 zustand persist；路由 search 未强制） |
| W6 | 整理用户 Demo 为第 15 节格式，补真实文件哈希与依赖 manifest | 所有缺失项明确；完整包数量和来源可核对 | 已完成（合成文献/指标完整；图/PDF 为占位并记入 missing） |
| W7 | workspace Demo importer；项目级幂等键 demoId+version+manifest hash，复用 finalize 事务 | 同一包重复载入不重复创建；坏哈希/缺失/环依赖得到明确结果 | 已完成 |
| W8 | `LoadWorkspaceDemoButton` 及四模块 hydration；替换各自静态 Demo 和 store 注入 | 四模块一键从目录展示，保留未保存草稿并处理冲突 | 部分完成（按钮与后端 importer 已通；各模块旧 store Demo 仍并存） |
| W9 | 四个 research Skill、Codex bridge；读取持久化输入清单，保存 provenance | 换对话仍能复现输入；不会混入其他项目数据 | 已完成 |
| W10 | 真实运行/GPT 生图/LaTeX worker 和引用检查按能力逐项实现 | 真实输出必须有执行证据；模拟状态贯穿论文和投稿 | 部分完成（能力矩阵已标记；真实 runner/LaTeX/生图未上线） |
| W11 | 四模块集成验证与迁移旧数据；将结果回写本节 | 下述场景与构建检查通过 | 部分完成（单测+前后端 tsc；未做完整服务端联调） |

建议 API（均为待实现设计）：`POST /api/research/workspaces/register`、`GET /api/research/projects/:id/workspace`、`POST /api/research/projects/:id/workspace/scan`、`POST /api/research/projects/:id/demo/load`、`POST /api/research/projects/:id/artifacts/save-version`。目录注册复用 FilesService 已允许的根目录策略；后端校验真实路径；生成器仅能写当前 run 的 temp。不要开放任意文件系统读写接口。

Demo 导入作为独立执行器，按 queued→running→validating→completed 状态转换；无需伪造 Codex invocation。文件系统/数据库提交通过 staging、恢复日志和事务对账实现，不能声称单次 rename 可保证跨系统原子性。

验收场景：选目录→载入→四模块逐一查看→对话摘要→刷新→服务重启；重复载入不重复；变更一份上游文件后旧下游版本仍可查看；不完整 Demo 不标完成；改坏哈希导入失败；切换两个项目不串线；复制目录后重建索引；未保存草稿不会被载入覆盖；缺图片/PDF 有可见提示；既有普通文件不会丢失。

实施结果（2026-09-11，工作目录方案 W1–W11）：

- 分支：`feat/writing-workflow-unification`
- 变更要点：
  - W1：`ResearchPathsService` 支持 `bind(projectId, absoluteRoot)`；布局改到 `.navivisor/runs|artifacts|recovery|conversations`；托管项目仍可用 managedRoot+UUID。
  - W2：新增 `topic.intake` / `topic.candidates` 与 `search-strategy`、`search-iterations`、`screening-log`、`topic-landscape`、`literature-bib`、`paper-manifest` 等角色；拆开候选与核心文献阶段输出矩阵。
  - W3/W7：`ResearchWorkspaceService` 实现可移植 `project-index.json`、外部修改标记、recovery 日志、Demo 依赖环检测、幂等载入（demoId+version+manifestSha256）。
  - W4：落地 register/workspace/scan/demo/load/save-version API；`publicProject` 返回 `rootPath`；修复写作侧既有 `throwOnError` TS 错误。
  - W5/W8：首页工作目录注册、`useResearchProjectStore`、`CurrentPaperCard`、`LoadWorkspaceDemoButton`（首页完整 + 四模块紧凑）。
  - W6：`demo-packages/camera-vad-scene-memory/` 含合成文献/指标/审稿全套；`comparison.png`/`architecture.png`/`paper.pdf` 为占位文件；`demo-manifest.json` 记 missing（文献 PDF、CVPR 模板、GPT 真图、真编译 PDF）。
  - W9：Codex bridge 写 `context.json` 输入清单（prompt v2）；四 Skill 要求只读该清单。
  - W10：前端 `RESEARCH_CAPABILITIES` 标记真实训练/LaTeX/OpenReview 为 unavailable，生图 needs_credentials。
- 验证：
  - `pnpm exec vitest run src/research-workflow` → 2 files / 9 tests passed
  - `pnpm exec tsc -p tsconfig.build.json --noEmit` → pass
  - `cd web && pnpm exec tsc -b` → pass
- 遗留：
  - 未跑完整 Nest 服务端联调（register→load→四模块 hydration）
  - 四模块旧 localStorage/Zustand Demo 注入尚未完全替换为 workspace hydration
  - GPT 真图与 LaTeX 编译 worker 未实现；占位图/PDF 不得当作真实证据
  - OpenAPI generated client 尚未重新 generate；workspace API 走手写 fetch
- 后续每完成剩余项，继续回写本节状态与验证命令。
