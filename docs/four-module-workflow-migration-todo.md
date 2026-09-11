# 四模块统一 Workflow 迁移 TODO

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

### TODO-A3：订阅 Codex 生命周期和 turn 事件

任务：

- 复用现有 WebSocket、approval、user-input、interrupt 与 app-server 生命周期机制，不新增第二套事件通道。
- 只按持久化的 threadId + turnId 更新对应 run，防止并发串线。
- turn completed 后进入 validating，并调用 TODO-A1 finalize。
- turn failed/cancelled 时记录结构化错误；app-server 不可用时标记 unavailable，但允许恢复后继续读取 thread。
- approval/user-input 等待状态必须可在刷新后恢复。

完成判定：并发两个项目、同项目两个模块、重启 app-server、取消与审批竞态测试通过。

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

## 4. Phase B：统一前端基础设施

### TODO-B1：生成 Workflow API Client

任务：

- 从更新后的 OpenAPI 重新生成 `web/src/generated/api/**`。
- 复用 `web/src/api-client.ts` 的 `BASE_PATH`、Bearer token、401 和 snackbar 处理。
- 建立薄的 research query/mutation hooks，但不得建立第二套 fetch wrapper。
- projectId 放入统一页面上下文或路由；刷新时从服务端重新获取。

完成判定：`rg` 不再发现研究模块自行拼接 host/base URL。

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

| 阶段           | 状态   | 完成 SHA | 验证结果 |
| -------------- | ------ | -------- | -------- |
| A 后端闭环     | 未开始 | -        | -        |
| B 前端基础设施 | 未开始 | -        | -        |
| C1 开题迁移    | 未开始 | -        | -        |
| C2 实验迁移    | 未开始 | -        | -        |
| C3 写作实现    | 未开始 | -        | -        |
| C4 投稿迁移    | 未开始 | -        | -        |
| D 旧架构清理   | 未开始 | -        | -        |
| E 端到端验收   | 未开始 | -        | -        |

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
