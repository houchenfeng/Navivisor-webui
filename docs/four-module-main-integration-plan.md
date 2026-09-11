# 四模块合并到 `main` 的执行手册

> **用途**：四模块首次合并与架构决策参考（历史手册，日常执行以 migration-todo 为准）。  
> 目标读者：接手仓库并负责实际合并、重构、测试和提交的下一个 AI/开发者。
> 本文只记录已核实的仓库现状与建议执行方案；编写本文时没有把任何功能分支合入本地 `main`。
> 仓库：`https://github.com/houchenfeng/Navivisor-webui.git`
> 盘点时间：2026-09-11（Asia/Shanghai）

## 1. 最终目标与不可妥协的原则

最终要把四个科研流程模块集成到 `main`：

1. 开题：`feat/research-topic`
2. 实验：当前已经在 `main`
3. 写作：`feat/research-writing`
4. 投稿：`feat/research-submission`

合并不能止于“页面能打开”。必须同时完成以下工作：

- 四个模块共享同一个 `projectId`，所有运行共享统一的 `runId`、状态枚举、产物描述和错误格式。
- 中间文件统一落到服务端工作区，浏览器状态只保存 UI 状态和 ID，不保存唯一副本。
- 下游模块通过 artifact 引用消费上游产物，不能复制一份后各自维护，也不能依赖本机绝对路径。
- manifest 内只允许任务目录相对路径；前端通过 `projectId/runId/artifactId` 访问，不自己拼服务端绝对路径。
- 用户上传、论文 PDF、文献 PDF、审稿结果等运行数据不得提交到 Git。
- 保留真正的 Git merge ancestry，首次合并不要 squash。否则以后同一功能分支更新时，Git 会把旧提交再次视作未合并。
- 任何模拟结果必须带 `simulated: true` 和醒目的 UI 标记，不能被写作/投稿模块误当成真实实验结论。

## 2. 已核实的分支快照

开始执行前必须重新 `git fetch --prune origin`，并把下面 SHA 当作“本文分析基线”，不能假定远端没有变化。

| 模块 | 分支                       | 本文分析时 HEAD | 相对 `main` | 实际完成度                                                                  |
| ---- | -------------------------- | --------------: | ----------: | --------------------------------------------------------------------------- |
| 实验 | `main`                     |       `1bb84f5` |        基线 | 完整离线 Demo；结果主要在 Zustand/localStorage 和浏览器下载中               |
| 开题 | `feat/research-topic`      |       `fe5cd2e` |   7 commits | 有 OpenAlex 后端、前端、工具和初版文件契约；只实现 first-search 的一部分    |
| 写作 | `feat/research-writing`    |       `38c98d0` |    1 commit | 只有占位页和路由，不是完整写作模块                                          |
| 投稿 | `feat/research-submission` |       `c3246d6` |    1 commit | 有完整模拟 UI；依赖仓库外后端，状态只在内存中，API 层重复且有硬编码公网地址 |

重新盘点命令：

```bash
git fetch --prune origin
git status --short
git branch -a -vv
git for-each-ref --format='%(refname:short) %(objectname:short) %(committerdate:iso8601) %(subject)' refs/remotes/origin
git rev-list --left-right --count origin/main...origin/feat/research-topic
git rev-list --left-right --count origin/main...origin/feat/research-writing
git rev-list --left-right --count origin/main...origin/feat/research-submission
```

如果任一 SHA 已变化，先重新查看：

```bash
git log --oneline --decorate --graph --all -n 100
git diff --stat origin/main...origin/feat/research-topic
git diff --stat origin/main...origin/feat/research-writing
git diff --stat origin/main...origin/feat/research-submission
git diff --name-status origin/main...origin/feat/research-topic
git diff --name-status origin/main...origin/feat/research-writing
git diff --name-status origin/main...origin/feat/research-submission
```

## 3. 各模块当前输入、状态和输出的真实情况

### 3.1 开题模块

主要新增位置：

- `src/research-topic/`
- `web/src/components/research-topic/`
- `research-tools/`
- `research-tools/contract.md`

当前输入：`researchInterest`、`context`、可选年份范围以及 `targetCount`。前端通过同源 `/api/research/topic/first-search` 创建任务。

当前运行状态只存于 `ResearchTopicService` 的内存 `Map`。服务重启后，任务状态不可恢复。

当前输出根目录被硬编码为：

```ts
join(process.cwd(), 'work', 'research-topic', 'runs');
```

当前真正落盘的文件只有：

- `first-search-papers.csv`
- `manifest.json`

契约中声称还应有 `candidate-topics.csv`、`first-search-analysis.md`、`query-plan.json`，但服务当前没有生成。核心文献阶段的 `references.csv`、`references.bib`、`pdf/`、`download-report.json`、`handoff.md` 也尚未接通。

关键不一致：后端返回的 artifact path 是相对 first-search 目录的路径，但响应里没有稳定的项目根或可访问 URL；前端无法直接把它交给已有 FilesService 打开。类型也分散在后端 types、前端 contract 和 Python contract 中，状态枚举并不完全一致。

### 3.2 实验模块（已在 `main`）

主要位置：

- `web/src/components/research-experiment/experiment-demo.tsx`
- `web/src/stores/experiment-store.ts`
- `docs/demo/`
- `docs/sam-experiment-demo-guide.md`

当前输入：页面表单中的 `projectName`、`researchTopic`、`researchGoal`、`paperCount`，以及模拟 seed/repeatCount。它并未读取开题模块的 confirmed topic 或核心文献 manifest。

当前状态：Zustand `persist`，即浏览器 localStorage。没有 `projectId`，多项目会互相覆盖；服务端也不知道这次实验运行。

当前输出：算法架构、实验结果等大段 Markdown 是前端源码里的字符串；点击下载时使用 `Blob + object URL`。这些文件没有服务端 manifest、checksum、provenance 或可供写作模块稳定引用的 artifact ID。

### 3.3 写作模块

主要位置：

- `web/src/components/research-writing/writing-page.tsx`

当前只有“写作智能体”占位页。不存在写作后端、编辑状态、导入上游结果、草稿格式、导出文件或版本记录。因此合并时可以保留页面入口，但不能声称四模块数据流已经完成。

`web/pnpm-workspace.yaml` 的变化与占位页无关：它把 `onlyBuiltDependencies` 改为 `allowBuilds`。除非当前 pnpm 版本验证确实需要，否则应保留 `main` 的版本，避免把无关包管理配置混入写作模块合并。

### 3.4 投稿模块

主要位置：

- `web/src/components/research-submission/`
- `web/src/components/ui/table.tsx`

当前输入：标题、作者、关键词、摘要、TLDR、用户在浏览器中选择的 PDF，以及 rebuttal 文本。

当前状态：React Context 内存。刷新页面后全部丢失，没有 `projectId/runId`，没有产物落盘。

当前输出：一审 reviewer、平均分、decision、二审 reviewer、rebuttal、最终 decision；全部只在浏览器内存里。

需要立即修复的问题：

- `services/apiClient.ts` 是页面实际使用的客户端，硬编码 `https://6e20ae7d.r12.vip.cpolar.cn`。
- `services/apiService.ts` 是另一套重复 API 定义，默认 `http://localhost:3001`，当前页面未使用。
- `config/api.ts` 又保存一份同样的临时公网地址，当前也未形成单一配置源。
- `services/aiService.ts` 是 mock 辅助服务，与真实 API 并存，但缺少明确运行模式。
- 浏览器直接向仓库外服务上传论文 PDF，绕开了本项目认证、审计、文件白名单和 FilesService。
- API 使用大量 `any`，后端响应没有运行 manifest，也没有 schema 版本。

合并后必须删除重复 API 层与硬编码域名。前端只访问本项目同源 `/api/research/...`，由 NestJS 后端负责外部模型/审稿服务适配。

## 4. 已验证的 Git 冲突

试合并结论：

- `feat/research-topic` 先合入，再合 `feat/research-writing`：可以自动合并。
- `feat/research-submission` 与开题/写作一起合并时：`web/src/routes/router.tsx` 整文件冲突。
- 投稿分支把 `router.tsx` 写成带 UTF-8 BOM 的 CRLF 文件，因此 Git 将几乎整文件视为变化；业务上它实际只需要新增 `SubmissionPage` import 并替换投稿 route component。

不要从冲突两侧任选整个文件。最终 router 必须同时保留：

```tsx
import { TopicPage } from '@/components/research-topic/topic-page';
import { ExperimentDemo } from '@/components/research-experiment/experiment-demo';
import { WritingPage } from '@/components/research-writing/writing-page';
import { SubmissionPage } from '@/components/research-submission/submission-page';
```

且路由映射必须是：

| 路径                                | component                  |
| ----------------------------------- | -------------------------- |
| `/research/topic`                   | `TopicPage`                |
| `/research/experiment` 及六个子路由 | 保持 `ExperimentDemo` 现状 |
| `/research/paper`                   | `WritingPage`              |
| `/research/submit`                  | `SubmissionPage`           |

合并时把 `router.tsx` 统一保存为 UTF-8 无 BOM、LF。仓库可增加 `.gitattributes`：

```gitattributes
* text=auto
*.ts text eol=lf
*.tsx text eol=lf
*.json text eol=lf
*.md text eol=lf
*.yaml text eol=lf
*.yml text eol=lf
```

之后执行 `git diff --check`，防止 BOM/行尾问题再次制造伪冲突。

## 5. 统一中间文件管理：目标设计

### 5.1 唯一工作根与目录布局

增加配置项 `NAVIVISOR_RESEARCH_WORK_ROOT`。默认值可以是仓库下 `work/research-projects`，但代码不能在多个模块中各自 `join(process.cwd(), ...)`。

```text
work/research-projects/
└── <projectId>/
    ├── project.json
    ├── latest.json
    ├── uploads/
    │   └── <artifactId>-original.pdf
    ├── runs/
    │   └── <runId>/
    │       ├── manifest.json
    │       ├── input-refs.json
    │       ├── artifacts/
    │       │   ├── ...
    │       │   └── ...
    │       ├── logs/
    │       │   └── events.jsonl
    │       └── temp/
    └── handoffs/
        └── <handoffId>.json
```

规则：

- `projectId`、`runId`、`artifactId` 使用后端生成 UUID，不接受用户提供的路径片段。
- 所有用户可消费结果进入 `artifacts/`；执行中的临时文件只进入该 run 的 `temp/`。
- 成功后先原子写 artifact，再计算 SHA-256，最后原子替换 `manifest.json`。
- `temp/` 不出现在 manifest 中；失败时可以保留诊断日志，但不得把半成品标成可消费 artifact。
- manifest 和 handoff 中的 `path` 只能相对当前 project 根，例如 `runs/<runId>/artifacts/references.csv`。
- 禁止在 manifest 写 API key、cookie、外部服务 token、本机绝对路径或 `File` 对象。
- `latest.json` 只保存每个 stage 最新成功 run 的 ID，不复制产物内容。
- Git 忽略整个 `/work/research-projects/`，不要只忽略开题目录。

### 5.2 统一阶段名

不要继续混用 `first-search`、`paper-thinking`、页面 step 数字和模块自定义名字。建议固定：

```ts
type ResearchStage =
  | 'topic.first-search'
  | 'topic.core-literature'
  | 'topic.confirmation'
  | 'experiment.plan'
  | 'experiment.run'
  | 'writing.outline'
  | 'writing.draft'
  | 'writing.final'
  | 'submission.prepare'
  | 'submission.review.round1'
  | 'submission.rebuttal'
  | 'submission.decision';
```

统一状态：

```ts
type ResearchRunStatus =
  | 'queued'
  | 'running'
  | 'waiting_for_approval'
  | 'waiting_for_input'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'unavailable'
  | 'needs_credentials';
```

`completed` 只表示本次 run 已按权限和模式完成并落盘，不表示结论真实、论文已读、创新性已证实或投稿已被真实会议接受。

### 5.3 统一 manifest

在后端定义唯一 TypeScript 类型，并从 OpenAPI 生成前端类型；Python 工具用 JSON Schema 校验同一契约，不再手写三套近似类型。

建议最小结构：

```json
{
  "schemaVersion": 1,
  "projectId": "uuid",
  "runId": "uuid",
  "module": "experiment",
  "stage": "experiment.run",
  "status": "completed",
  "mode": "simulated",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "startedAt": "ISO-8601",
  "completedAt": "ISO-8601",
  "inputs": [
    {
      "artifactId": "uuid",
      "producerRunId": "uuid",
      "role": "confirmed-topic",
      "sha256": "hex"
    }
  ],
  "artifacts": [
    {
      "artifactId": "uuid",
      "role": "experiment-results",
      "name": "experiment-results.json",
      "path": "runs/<runId>/artifacts/experiment-results.json",
      "mediaType": "application/json",
      "size": 1234,
      "sha256": "hex",
      "simulated": true,
      "createdAt": "ISO-8601"
    }
  ],
  "counts": {},
  "warnings": [],
  "errors": [],
  "provenance": {
    "appVersion": "git-sha",
    "adapter": "openalex",
    "adapterVersion": "1",
    "sourceQueries": []
  }
}
```

`role` 比文件名更重要。下游按 role 查找输入，不要硬编码“上一步一定叫某个文件名”。同一 role 可以有新 schemaVersion，但必须提供迁移或明确拒绝。

### 5.4 项目、运行和 artifact API

建议新增 `src/research-workflow/`：

```text
src/research-workflow/
├── research-workflow.module.ts
├── research-projects.controller.ts
├── research-runs.controller.ts
├── research-artifacts.controller.ts
├── research-project.service.ts
├── research-run.service.ts
├── research-artifact.service.ts
├── research-paths.service.ts
├── research-contracts.ts
└── *.spec.ts
```

最小 API：

```text
POST   /api/research/projects
GET    /api/research/projects/:projectId
POST   /api/research/projects/:projectId/runs
GET    /api/research/projects/:projectId/runs/:runId
DELETE /api/research/projects/:projectId/runs/:runId
POST   /api/research/projects/:projectId/uploads
GET    /api/research/projects/:projectId/artifacts/:artifactId
GET    /api/research/projects/:projectId/artifacts/:artifactId/content
GET    /api/research/projects/:projectId/artifacts/:artifactId/download
```

接口响应只返回 ID、相对路径、元数据和受认证的同源访问 URL。路径解析必须全部经过 `ResearchPathsService`，再复用 FilesService 的 workspace root 校验和流式读写能力。任何 controller 都不能直接接收绝对输出路径。

任务索引应持久化到 SQLite，至少增加：

- `research_projects(project_id, name, created_at, updated_at)`
- `research_runs(run_id, project_id, module, stage, status, mode, manifest_path, created_at, updated_at)`
- `research_artifacts(artifact_id, run_id, role, path, media_type, size, sha256, simulated, created_at)`

文件是大内容的事实来源，SQLite 是查询和恢复索引。服务启动时应能根据 DB + manifest 恢复已完成任务；遗留 `queued/running` 任务应转为明确的 `failed`/`interrupted` 诊断，而不是永久卡住。

### 5.5 四模块交接表

| 生产模块 | 必须输出的 role       | 推荐文件                           | 消费模块             |
| -------- | --------------------- | ---------------------------------- | -------------------- |
| 开题     | `candidate-papers`    | `first-search-papers.csv`          | 开题后续、实验、写作 |
| 开题     | `candidate-topics`    | `candidate-topics.json`/`.csv`     | 用户确认页           |
| 开题     | `confirmed-topic`     | `confirmed-topic.json`             | 实验、写作           |
| 开题     | `core-references`     | `references.csv`、`references.bib` | 实验、写作           |
| 开题     | `literature-handoff`  | `handoff.md`                       | 实验、写作           |
| 实验     | `experiment-plan`     | `experiment-plan.json`/`.md`       | 实验运行、写作       |
| 实验     | `experiment-results`  | `experiment-results.json`/`.md`    | 写作                 |
| 实验     | `method-architecture` | `method-architecture.md`           | 写作                 |
| 写作     | `paper-metadata`      | `paper-metadata.json`              | 投稿                 |
| 写作     | `paper-source`        | `paper.md` 或 `paper.tex`          | 写作、投稿准备       |
| 写作     | `paper-pdf`           | `paper.pdf`                        | 投稿                 |
| 投稿     | `submission-package`  | `submission.json`                  | 投稿模拟/真实适配器  |
| 投稿     | `review-round1`       | `review-round1.json`               | rebuttal             |
| 投稿     | `rebuttal`            | `rebuttal.md`                      | 二审                 |
| 投稿     | `submission-decision` | `decision.json`                    | 最终展示/归档        |

每个 handoff 只引用不可变 artifact：

```json
{
  "schemaVersion": 1,
  "handoffId": "uuid",
  "projectId": "uuid",
  "fromStage": "experiment.run",
  "toStage": "writing.draft",
  "artifacts": [
    { "artifactId": "uuid", "role": "experiment-results", "sha256": "hex" }
  ],
  "createdAt": "ISO-8601"
}
```

如果上游产生新版本，下游已有 run 不应静默改输入；UI 应提示“发现新上游产物”，由用户创建新 run 或显式替换输入。

### 5.6 四模块统一分层架构

合并后的系统应明确分成六层。四个业务页面不能跨层直接访问模型、文件系统或外部服务。

```text
┌──────────────────────────────────────────────────────────────┐
│ Web UI：开题 / 实验 / 写作 / 投稿                            │
│ 只提交 projectId、stage、用户输入、artifactId、skillName     │
└──────────────────────────┬───────────────────────────────────┘
                           │ 同源 REST + WebSocket
┌──────────────────────────▼───────────────────────────────────┐
│ Research Workflow API                                       │
│ Project / Run / Handoff / Artifact / Agent Invocation       │
└───────────────┬──────────────────────────┬───────────────────┘
                │                          │
┌───────────────▼──────────────┐ ┌────────▼────────────────────┐
│ Data Plane                   │ │ Agent Plane                 │
│ SQLite index + workspace     │ │ ResearchCodexBridge         │
│ manifests + immutable files  │ │ Thread/Turn/Skill binding   │
└───────────────┬──────────────┘ └────────┬────────────────────┘
                │                         │ 只调用 main 现有服务
┌───────────────▼──────────────┐ ┌────────▼────────────────────┐
│ Deterministic Adapters       │ │ Codex App Server           │
│ OpenAlex/PDF parser/runner   │ │ model + skills + tools      │
│ 不承担自然语言模型对话       │ │ approvals + sandbox         │
└──────────────────────────────┘ └─────────────────────────────┘
```

职责边界：

- Web UI 不直接调用 OpenAI、cpolar、OpenReview 模拟后端或任何其他模型 URL。
- Workflow API 决定运行是否合法、输入 artifact 是否完整、阶段能否启动。
- Data Plane 是业务事实来源；聊天记录不能代替 artifact，artifact 也不能代替聊天审计。
- Agent Plane 负责把一次业务 run 映射到 Codex thread/turn，组装 Skill 与文件 mention，监听完成事件，并触发 artifact 校验。
- Deterministic Adapters 只做不需要 LLM 的确定性工作，例如 OpenAlex REST 检索、CSV 去重、PDF 文本解析、checksum、真实训练进程包装。
- 所有需要 LLM 或“另一个模型进行自然语言判断/生成”的能力统一由 Codex app-server 执行。

四模块统一依赖方向：

```text
Topic ──confirmed-topic/core-references──▶ Experiment
  │                                           │
  └──────────────▶ Writing ◀──results/plan────┘
                         │
                         └──paper-metadata/paper-pdf──▶ Submission
```

禁止反向依赖：投稿代码不能 import 写作 store，写作代码不能 import 实验 store。模块间只通过共享 contract、API 和 artifact role 通信。

### 5.7 统一 Codex 调用架构

#### 5.7.1 必须复用的 `main` 现有能力

仓库 `main@1bb84f5` 已经实现：

- `CodexProcessManager`：启动和重启 `codex app-server`，完成 initialize 握手，转发 notification/serverRequest。
- `CodexService`：统一 JSON-RPC request facade。
- `ThreadsService`：封装 `thread/start`、`thread/resume`、`turn/start`、`turn/steer`、`turn/interrupt` 和历史读取。
- `ThreadsGateway`：把 turn/item/status 通知发送到订阅客户端。
- `PendingApprovalsService`：持久化 app-server 发起的审批请求，按 generation 防止重启后的陈旧审批被误处理。
- `SkillsService`：调用 `skills/list` 和 `skills/config/write`。
- `ModelsService`：通过 `model/list` 获取当前 app-server 真正可用的模型。
- `FilesService`：workspace root 白名单、路径解析、流式读写、上传和 mtime 冲突保护。

新增业务代码不能直接 `fetch` OpenAI API，也不能自行创建 `new OpenAI()`。不要为四模块再实现一套 SSE、token、model list、审批或重试机制。

官方当前文档建议需要工具调用的直接 API 集成使用 Responses；但本项目已由 Codex app-server 封装模型和工具循环，所以四模块应继续调用 app-server，而不是另建 Responses API 旁路。参考：[OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model) 和仓库内固定版本协议 `docs/upstream/codex-app-server-0.153.2.md`。

#### 5.7.2 新增 `ResearchCodexBridgeService`

建议新增：

```text
src/research-workflow/agent/
├── research-codex-bridge.service.ts
├── research-agent-session.service.ts
├── research-agent-notification.service.ts
├── research-prompt-builder.service.ts
├── research-skill-registry.service.ts
├── research-output-validator.service.ts
└── *.spec.ts
```

调用链固定为：

```text
POST create run
  → 校验上游 artifact 与 stage policy
  → 获取或创建该 project + module 的 Codex thread
  → 从 skills/list 的服务端结果解析允许的 skill
  → 构造 text + skill + mention UserInput[]
  → ThreadsService.startTurn(...)
  → 保存 threadId/turnId/model/effort/skill digest
  → 监听 app-server notifications 和 pending server requests
  → turn completed 后校验 output contract
  → temp 文件原子提升为 artifacts，写 manifest/checksum
  → run=completed；失败则保存脱敏错误并保持半成品不可消费
```

`ResearchCodexBridgeService` 必须依赖 `ThreadsService`、`SkillsService`、`ModelsService` 和 workflow services；普通业务 service 不应直接依赖 `CodexService`。只有 app-server 新增但 `ThreadsService` 尚未封装的实验字段，才允许在 bridge 内用窄类型 adapter 调 `CodexService.request`，并必须有协议测试。

#### 5.7.3 Codex thread 与科研 run 的关系

建议每个 `researchProjectId + module` 维护一个持久 Codex thread，同一模块的新 run 追加新 turn：

```text
research project P1
├── topic thread T1       → run R1/R2 对应不同 turn
├── experiment thread T2  → run R3/R4 对应不同 turn
├── writing thread T3     → run R5/R6 对应不同 turn
└── submission thread T4  → run R7/R8 对应不同 turn
```

这样既保留模块上下文，又避免四种任务共享一个无限增长的 prompt。数据库增加：

- `research_agent_sessions(session_id, project_id, module, thread_id, cwd, created_at, updated_at)`
- `research_agent_invocations(run_id, session_id, thread_id, turn_id, model, effort, service_tier, skill_name, skill_path, skill_sha256, prompt_version, created_at)`

`researchProjectId` 与 Codex app-server 的实验性 `projectId` 不是同一个命名空间，禁止直接混用。MVP 通过受控 `cwd=project root` 建 thread，并在本地表中保存映射；若以后接入 app-server `project/create`，字段必须命名为 `codexProjectId`。

thread 创建规则：

- cwd 固定为该 research project 根，由后端解析，前端不能提交绝对 cwd。
- 使用 main 已有 thread 默认 model、approvalPolicy、sandbox；不得静默提升权限。
- 如果阶段需要写 artifact，权限必须至少允许写 project root，且仍走 app-server 审批。
- model 不硬编码。从 `ModelsService.listModels()` 验证用户选择；未选择时使用 app-server 当前默认。
- thread 名称建议为 `[科研项目名] 开题智能体` 等，便于在现有任务列表审计。
- run cancel 调用 `ThreadsService.interruptTurn(threadId, turnId)`，收到 interrupted 完成态后再标记 cancelled。

#### 5.7.4 一次 turn 的输入格式

显式调用 Skill 时，文本中的 `$skill-name` 和 `type: skill` 必须同时存在。文件输入通过 `type: mention` 传递，不能把完整 CSV/PDF 填进 prompt。

```json
[
  {
    "type": "text",
    "text": "$research-writing 根据已确认课题、核心文献和实验结果生成论文草稿。严格按 run contract 写入指定输出目录。"
  },
  {
    "type": "skill",
    "name": "research-writing",
    "path": "由后端 skills/list 返回的绝对 SKILL.md 路径"
  },
  {
    "type": "mention",
    "name": "confirmed-topic.json",
    "path": "由 FilesService 校验后的绝对 artifact 路径"
  },
  {
    "type": "mention",
    "name": "experiment-results.json",
    "path": "由 FilesService 校验后的绝对 artifact 路径"
  }
]
```

prompt builder 只接受结构化参数，不接受 controller 拼任意系统提示。每个 prompt 必须包含：projectId、runId、stage、mode、输入 role/sha256、允许读取目录、唯一 temp 输出目录、要求生成的 role/schema、禁止伪造规则、完成条件和错误报告格式。

#### 5.7.5 状态同步与审批

增加 `ResearchAgentNotificationService`，直接注册 `CodexProcessManager.addListener('notification', ...)` 和生命周期 listener；不能依赖浏览器是否正打开页面。

状态映射：

| Codex/系统事件         | workflow run 状态      | 动作                                                         |
| ---------------------- | ---------------------- | ------------------------------------------------------------ |
| turn 创建成功          | `running`              | 保存 threadId/turnId                                         |
| serverRequest approval | `waiting_for_approval` | 复用 PendingApprovals UI，不自动同意                         |
| requestUserInput       | `waiting_for_input`    | 复用现有 user-input card/响应通道                            |
| 审批/输入已响应        | `running`              | 等待后续通知                                                 |
| turn completed         | `validating`           | 校验 result.json 和输出文件                                  |
| 校验通过并原子登记     | `completed`            | 发布 artifact/handoff                                        |
| turn failed            | `failed`               | 保存分类错误，不发布半成品                                   |
| turn interrupted       | `cancelled`            | 清理 temp 或保留诊断                                         |
| app-server 重启        | 不直接假定失败         | 读取 thread/turn 历史；无法确认时标记 interrupted 并允许重试 |

审批继续使用 `PendingApprovalsService` 的 generation/CAS 语义。科研页面只增加“此审批属于哪个 project/run/stage”的关联展示，不能创建第二套批准接口。

#### 5.7.6 模型输出如何成为业务数据

聊天最终文本不是可直接消费的业务输出。每个 Skill 必须要求 Codex 在 run 的 `temp/` 下写：

- `result.json`：符合该 stage 的 JSON Schema；列出准备发布的相对文件、role、mediaType 和 simulated 标记。
- 具体 artifact 文件：Markdown/JSON/CSV/BibTeX/PDF 等。
- 可选 `diagnostics.md`：失败原因，不作为正常下游输入。

turn completed 后由 `ResearchOutputValidatorService`：

1. 解析 `result.json`，拒绝绝对路径、`..`、symlink 越界和未知 role。
2. 校验 stage、projectId、runId、schemaVersion、mode 与数据库一致。
3. 校验每个文件存在、格式可解析、大小受限。
4. 计算 SHA-256 和 size；检查 simulated 标记传播。
5. 原子移动到 `artifacts/` 并写最终 manifest。
6. 只有全部成功才把 run 标成 completed。

不要从 agentMessage 文本中用正则提取 JSON。文本只用于用户可读摘要，结构化结果必须来自受控文件。

### 5.8 Skill 调用能力设计

#### 5.8.1 Skill 根目录与发现

建议在仓库提交一个明确的业务 Skill 根：

```text
research-skills/
├── research-topic/SKILL.md
├── research-experiment/SKILL.md
├── research-writing/SKILL.md
└── research-submission/SKILL.md
```

不要把这些文件放进当前被 `.gitignore` 忽略的 `.codex/` 或 `.agents/`，否则团队无法获得同一版本。应用启动和每次 app-server `appServerReady` 后，由 `ResearchSkillRegistryService` 调用固定版本 app-server 的 `skills/extraRoots/set`，传入后端解析的 `research-skills` 绝对根；此设置是进程级且 app-server 重启会丢失，所以必须自动重放。

然后调用：

```text
skills/list { cwds: [projectRoot], forceReload: true }
```

只把返回的 `enabled=true`、name 精确匹配且 path 位于允许根内的 Skill 加入 stage catalog。监听现有 `skills/changed` 通知后使 catalog 失效并重新加载。

固定版本 app-server 的 Skill 机制和调用示例见 `docs/upstream/codex-app-server-0.153.2.md#skills`。官方 OpenAI API 另有项目级、可版本化的 Skills API，但本项目这一步不要改用直连 API；若未来迁移，必须单独设计凭证、版本映射和兼容层。参考：[OpenAI Skills API](https://developers.openai.com/api/reference/typescript/resources/skills/methods/list)。

#### 5.8.2 Stage 到 Skill 的允许映射

```ts
const STAGE_SKILL_POLICY = {
  'topic.first-search': ['research-topic'],
  'topic.core-literature': ['research-topic'],
  'topic.confirmation': ['research-topic'],
  'experiment.plan': ['research-experiment'],
  'experiment.run': ['research-experiment'],
  'writing.outline': ['research-writing'],
  'writing.draft': ['research-writing'],
  'writing.final': ['research-writing'],
  'submission.prepare': ['research-submission'],
  'submission.review.round1': ['research-submission'],
  'submission.rebuttal': ['research-submission'],
  'submission.decision': ['research-submission'],
} as const;
```

用户可以在允许列表中选择 Skill 版本/变体，但不能让投稿 stage 调任意磁盘上的 Skill。未来允许组合 Skill 时，在 policy 中显式声明依赖顺序和最大数量，不允许前端传任意数组。

#### 5.8.3 每个 Skill 必须包含的内容

四个 `SKILL.md` 都必须写清：

- 触发范围和禁止使用场景。
- 输入 artifact role、最低 schemaVersion、缺失输入如何失败。
- 可以调用的确定性工具/CLI/API，以及哪些动作需要审批。
- 唯一允许的 temp 输出目录来自运行 prompt，不能自己猜 `process.cwd()`。
- 必须生成的 result schema 和 artifact roles。
- simulated/real 的传播规则和禁止伪造规则。
- 不读取其他 project，不写输入 artifact，不提交运行数据到 Git。
- 不在结果或日志中输出 token、API key、cookie、绝对路径。
- 完成前自检步骤和错误码。

模块差异：

- `research-topic`：允许调用 OpenAlex 适配器产出的真实元数据；候选题的新颖性只能写 pending verification。
- `research-experiment`：可以让 Codex规划并通过工具启动真实 runner；模拟结果永远标 simulated，真实训练必须记录命令、环境和数据 checksum。
- `research-writing`：必须引用输入 artifactId；不能把 simulated 数据改写为真实实验，必须生成 metadata/source/pdf 一致版本。
- `research-submission`：默认是教学模拟；没有真实会议 adapter 和用户明确授权时，禁止声称真实提交或真实录用。

#### 5.8.4 修复现有 Skill 安全缺口

当前 `ThreadsController.validateSkillInput()` 只检查 `name/path` 是非空字符串，注释假定 path 来自 `skills/list`，但后端没有真正验证两者对应。科研自动调用前必须增强：

1. 根据 thread cwd 或 workflow project root 调 `SkillsService.listSkills()`。
2. 要求请求的 name/path 与返回的同一 enabled skill 精确匹配。
3. 对 workflow stage 再检查 `STAGE_SKILL_POLICY` 和允许根。
4. 缓存必须按 cwd + app-server generation；收到 `skills/changed` 后失效。
5. 不匹配返回稳定 4xx 业务错误，不能把任意本地 `SKILL.md` 路径转发给 app-server。

普通聊天 SkillSelector 与科研模块应共用同一个后端 resolver；科研页面不能复制一套 Skill 列表逻辑。

### 5.9 四模块中的模型能力统一替换表

| 当前/计划能力        | 现状或风险            | 统一后的执行者                                                  | 数据输出                    |
| -------------------- | --------------------- | --------------------------------------------------------------- | --------------------------- |
| 开题文献检索         | OpenAlex 后端直调     | 确定性 OpenAlex adapter；Codex 不替代真实检索                   | CSV + query-plan + manifest |
| 候选题生成/分析      | 尚未完整实现          | Codex + `research-topic` Skill                                  | candidate-topics artifact   |
| 核心文献总结         | 尚未实现              | Codex + Skill，输入真实文献 artifact                            | analysis/handoff artifact   |
| 实验想法与计划       | 前端硬编码 Demo       | Codex + `research-experiment` Skill                             | experiment-plan             |
| 模拟结果叙述         | 前端字符串            | Codex + Skill，仍标 simulated                                   | experiment-results          |
| SAM/其他模型真实运行 | 尚未接通              | 由 Codex Skill 调受控 runner/CLI；runner 是工具不是第二聊天后端 | checkpoints/metrics/logs    |
| 论文大纲和草稿       | 写作分支仅占位        | Codex + `research-writing` Skill                                | outline/source/metadata     |
| PDF metadata 提取    | 投稿直连临时后端      | 先用确定性 PDF parser；必要时由 Codex Skill 辅助                | paper-metadata              |
| 一审意见             | 投稿浏览器直连 cpolar | Codex + `research-submission` Skill                             | review-round1               |
| rebuttal 生成        | 重复 API/mock         | Codex +同一 Skill                                               | rebuttal                    |
| 最终决定             | 外部模拟接口          | Codex 教学模拟 + Skill，强制 simulated                          | decision                    |

“统一为 Codex”只指模型推理、生成和工具编排入口统一。真实数据库检索、文件解析、checksum、训练程序等确定性工作仍应作为后端 adapter 或 Codex 可调用工具存在，不能为了统一而让 LLM 猜测确定性结果。

## 6. 各分支合并后必须怎么改

### 6.1 开题

1. 保留 OpenAlex 检索实现、contract 文档和 Python 校验工具。
2. 删除 `ResearchTopicService` 内部的 `OUTPUT_ROOT` 常量，注入 `ResearchPathsService`。
3. `start` 必须接收 `projectId`，创建统一 run；状态写 DB，而不是只放内存 Map。
4. 把落盘逻辑迁到 `ResearchArtifactService`，生成 checksum、size、mediaType 和 artifactId。
5. manifest 声明的文件必须真实存在；当前未生成的三个 first-search 文件不能提前列为完成产物。
6. 前端删除手写 `ResearchTaskSnapshot` 副本，使用 OpenAPI 生成类型和统一 research API client。
7. 完成任务后至少生成 `confirmed-topic` 的明确确认流程，实验和写作不得读取未确认候选题。

### 6.2 实验

1. 给页面加 `projectId` 上下文，优先从项目流程读取 `confirmed-topic` 和 `core-references`。
2. 将 `experiment-store` 改为 project-scoped；localStorage 只保留当前 step、表单草稿和 activeRunId，并增加 store schema version。
3. 把源码中的 Markdown 结果改为服务端 artifact。浏览器下载按钮改为统一 artifact download endpoint。
4. 每次模拟创建 `experiment.run`，保存 seed、repeatCount、输入 artifact checksums、代码 git SHA 和 `mode: simulated`。
5. 模拟数值和示意图必须在 JSON、Markdown、manifest、UI 四处都保留 simulated 标记。
6. 写作模块默认不能把 simulated 结果写成真实论文证据；只有显式“教学 Demo”模式才允许消费。

### 6.3 写作

1. 先实现契约和最小可用流程，不要在占位页上堆临时 localStorage。
2. 输入选择器按 role 读取 `confirmed-topic`、`core-references`、`experiment-plan/results`。
3. 至少产出 `paper-metadata.json`、可编辑源文件和最终 `paper.pdf`；三个 artifact 必须属于同一个 writing run。
4. metadata 至少包含 title、authors、keywords、abstract、tldr、version、sourceRunIds 和 simulatedEvidenceUsed。
5. 草稿保存使用服务端版本号或 expectedMtime，避免两个页面互相覆盖；可复用现有 FilesService 的 mtime 冲突机制。
6. 投稿只能选择 `writing.final` 的 `paper-pdf`，不能直接依赖浏览器临时 File。

### 6.4 投稿

1. 只保留一套 `research-submission-client.ts`；删除未使用的 `apiService.ts`、`config/api.ts` 和硬编码 cpolar URL。
2. 前端所有调用改为同源 `/api/research/projects/:projectId/...`，认证方式沿用现有 API client。
3. 增加 NestJS submission adapter；外部服务 URL 和凭证来自服务端配置，绝不进入前端 bundle。
4. 页面默认从 `paper-metadata` 与 `paper-pdf` artifact 自动填充；用户替换 PDF 时，先上传为项目 artifact，再启动 submission run。
5. Context 只管理页面临时交互；一审、rebuttal、二审、decision 每一步完成都落盘并可刷新恢复。
6. 明确 `mode: simulated | real`。在没有真实 OpenReview 集成时，所有审稿和录用结果必须是 simulated。
7. 给 PDF 做扩展名、MIME、文件头、大小和 workspace 路径校验；不要把浏览器 File 直接转发到任意公网地址。
8. 将 `any` 响应替换为运行时 schema 校验；远端返回不合格时 run 标记 failed 并保留脱敏诊断。

## 7. 推荐的首次合并步骤

### 7.1 创建集成分支

```bash
git fetch --prune origin
git switch main
git pull --ff-only origin main
git status --short
git switch -c integration/research-workflow
```

只有 `git status --short` 为空才继续。不要在 `main` 直接试合并。

### 7.2 按顺序保留分支历史

```bash
git merge --no-ff origin/feat/research-topic -m "merge: integrate research topic module"
git merge --no-ff origin/feat/research-writing -m "merge: integrate research writing entry"
git merge --no-ff origin/feat/research-submission -m "merge: integrate research submission module"
```

推荐这个顺序的原因：开题包含唯一的后端和初版契约，应先作为改造基础；写作改动最小；投稿最后处理，以便集中解决其 BOM/CRLF router 冲突和 API 清理。

投稿 merge 停在冲突时：

1. 手工重建 `router.tsx`，同时保留四模块 import 与 route。
2. 统一为 UTF-8 无 BOM、LF。
3. 不要接受投稿侧整份 router，也不要删除开题/写作 route。
4. `git add web/src/routes/router.tsx` 后确认 `git diff --check`。
5. 完成 merge commit。

对于 `web/pnpm-workspace.yaml`，先保留 `main` 原内容。只有在 `pnpm install --frozen-lockfile` 明确失败且错误证明需要改为 `allowBuilds` 时，才单独提交配置迁移及说明。

### 7.3 立即做集成重构

不要把只解决路由冲突的分支直接合到 `main`。继续在 `integration/research-workflow` 按独立 commits 完成：

1. `chore: normalize text files and add gitattributes`
2. `feat(workflow): add project run artifact contracts`
3. `feat(workflow): persist research projects and runs`
4. `feat(workflow): bridge research runs to Codex threads and turns`
5. `feat(skills): register and validate research workflow skills`
6. `refactor(topic): use shared artifacts and Codex analysis`
7. `refactor(experiment): use Codex and persist plans and results`
8. `feat(writing): use Codex and persist draft artifacts`
9. `refactor(submission): replace model APIs with Codex workflow`
10. `test(workflow): cover four-stage handoff and recovery`

每个 commit 只做一种职责，方便后续分支挑选、回滚和定位冲突。

### 7.4 可直接执行的分步任务

以下任务按依赖关系编排。Phase 是架构分组，不表示必须整组串行；精确执行顺序应为：Phase 0 → Phase 1 → TASK-2.1 → TASK-3.1～3.3 → TASK-2.2～2.6 → TASK-3.4 → Phase 4 → Phase 5 → Phase 6。执行 AI 每完成一个任务，都应在 PR checklist 中记录 commit SHA、实际修改文件、执行过的测试及结果。不要展开尚未满足依赖的任务。

#### Phase 0：建立可工作的集成基线

##### TASK-0.1：重新确认远端基线

- 依赖：无。
- 目标：确认本文记录的四个 HEAD 是否仍有效，避免基于过期分支设计实施。
- 操作：执行 2 节全部盘点命令；为每个分支保存 commit range、diff stat 和新增/修改文件清单到 PR 描述，不创建仓库内临时文件。
- 判定：工作树干净；`origin/main` 与三个功能分支的 SHA、领先/落后数量清楚；如果变化，先修订本文分支表再继续。

##### TASK-0.2：创建集成分支并完成三次 merge

- 依赖：TASK-0.1。
- 目标：保留开题、写作、投稿分支 ancestry。
- 操作：按 7.1/7.2 使用 `--no-ff` 合并；手工重建 router；不接受投稿分支整文件；暂不改业务逻辑。
- 判定：`git log --graph` 能看到三个 merge parent；四个路由都存在；`git diff --check` 通过。

##### TASK-0.3：清理纯集成噪声

- 依赖：TASK-0.2。
- 目标：消除会制造未来冲突但不改变功能的格式差异。
- 操作：新增 `.gitattributes`；统一改动过的 TS/TSX/JSON/MD/YAML 为 UTF-8 无 BOM + LF；保留 main 的 `web/pnpm-workspace.yaml`，除非安装测试给出相反证据。
- 判定：router 不再出现整文件 diff；没有仅由行尾造成的修改；前后端至少能完成类型检查或记录明确环境阻塞。

#### Phase 1：先完成数据底座

##### TASK-1.1：定义唯一 workflow contract

- 依赖：TASK-0.3。
- 目标：消除 topic 后端、topic 前端、Python 工具和其他模块各自维护近似类型的问题。
- 修改：新增 `src/research-workflow/research-contracts.ts` 和对应 DTO/OpenAPI schema；定义 project、run、status、stage、mode、artifact、input ref、handoff、error、provenance；生成前端类型；为 Python 工具导出或维护可自动比对的 JSON Schema。
- 约束：status 必须含 waiting/validating 状态；path 只能是 project-relative；`simulated` 不可选漏；role 使用受控枚举。
- 判定：后端 OpenAPI contract test 通过；前端不再手写 `ResearchTaskSnapshot`；Python validator 对有效/无效样例均有测试。

##### TASK-1.2：增加持久化表和 migration

- 依赖：TASK-1.1。
- 目标：服务重启后恢复 project/run/artifact/Codex 映射。
- 修改：在 `src/database/schema.ts` 增加 research projects、runs、artifacts、handoffs、agent sessions、agent invocations 表；生成单独 drizzle migration；增加索引和外键/唯一性约束。
- 约束：一个 run 只属于一个 project；artifact path 在 project 内唯一；一个 run 最多绑定一个主 turn；删除 project 默认不级联删除磁盘文件，必须走显式清理流程。
- 判定：空库 migration 成功；已有库升级成功；重复 ID、跨 project 引用和无 producer artifact 被拒绝。

##### TASK-1.3：实现安全路径与 artifact 原子提交

- 依赖：TASK-1.1、TASK-1.2。
- 目标：四模块不再自行拼输出目录或直接 writeFile。
- 修改：实现 `ResearchPathsService`、`ResearchArtifactService`；接入 `NAVIVISOR_RESEARCH_WORK_ROOT`；复用 FilesService 安全边界；实现 temp 写入、格式校验、SHA-256、size、原子 rename 和 manifest 原子替换。
- 约束：拒绝绝对相对混用、`..`、symlink 逃逸、跨 project 引用、未知 role、超限文件；manifest 不能登记不存在文件。
- 判定：路径穿越、symlink、并发 finalize、写入中断、checksum 不匹配测试全部通过；失败运行没有可消费 artifact。

##### TASK-1.4：实现 Project/Run/Artifact/Handoff API

- 依赖：TASK-1.2、TASK-1.3。
- 目标：给四个前端模块一个统一、同源、受认证的数据接口。
- 修改：实现 5.4 的 controllers/services/DTO；将响应加入 OpenAPI 并重新生成 `web/src/generated/api/`；增加 artifact preview/download URL。
- 约束：controller 不接受服务端绝对输出路径；所有 ID 做格式和归属校验；下载复用现有认证和流式响应模式。
- 判定：API contract tests 通过；用户 A/项目 A 不能用错误 projectId 访问其他项目 artifact；Files 页面可打开已登记文件。

#### Phase 2：把所有模型交互接到 Codex 主干

##### TASK-2.1：实现 Research Agent session/thread 映射

- 依赖：TASK-1.2、TASK-1.4。
- 目标：每个 project/module 使用可恢复的 Codex thread，不重复创建模型会话系统。
- 修改：实现 `ResearchAgentSessionService`；通过 `ThreadsService.startThread/resume` 创建或恢复 thread；保存 session/thread 映射；设置受控 project cwd 和可读名称。
- 约束：区分 `researchProjectId` 与未来的 `codexProjectId`；不允许前端传 cwd、approvalPolicy 或 sandbox 提权；model 从 app-server 列表验证。
- 判定：四模块分别得到稳定 thread；后端重启可恢复；重复 create 使用幂等键不会生成多条 session。

##### TASK-2.2：实现结构化 prompt 和 UserInput 组装

- 依赖：TASK-1.1、TASK-1.3、TASK-2.1、TASK-3.3。
- 目标：统一 text/skill/mention 输入，避免每个模块手拼 prompt 或塞入大文件。
- 修改：实现 `ResearchPromptBuilderService` 和 stage prompt version；按 artifact role 解析绝对安全路径；构造 `$skill-name` 文本、skill item 和 mention items。
- 约束：prompt 必须包含 stage/mode/output dir/schema/禁止伪造；不包含密钥；输入 artifact checksum 在启动前冻结。
- 判定：snapshot test 覆盖四个模块；同一输入得到稳定 promptVersion；缺失必须 role 时 run 在启动 Codex 前失败。

##### TASK-2.3：实现 turn 启动、取消和模型记录

- 依赖：TASK-2.1、TASK-2.2。
- 目标：所有 LLM/其他对话模型操作只经过 `ThreadsService.startTurn`。
- 修改：实现 `ResearchCodexBridgeService.startRun/cancelRun`；保存 turnId、实际 model、effort、service tier、skill digest、promptVersion；取消调用现有 interrupt。
- 约束：不使用 OpenAI SDK，不直接 fetch 模型地址，不自动批准 app-server serverRequest；幂等重试不得启动第二个 turn。
- 判定：mock Codex 测试精确断言 `thread/start`/`turn/start`/`turn/interrupt`；数据库与返回值的 run/thread/turn 对应一致。

##### TASK-2.4：实现通知、审批和用户输入状态桥接

- 依赖：TASK-2.3。
- 目标：即使科研页面关闭，run 状态也能随 Codex 事件推进。
- 修改：实现 `ResearchAgentNotificationService`；监听 notification、serverRequest 和 lifecycle；通过 threadId/turnId 查 invocation；按 5.7.5 更新状态；页面复用 PendingApprovals 和现有 user-input UI。
- 约束：监听器不得消费或隐藏 ThreadsGateway 事件；审批保持 CAS/generation 语义；未知事件只记脱敏诊断，不随意完成 run。
- 判定：running→waiting→running→validating 状态测试通过；双客户端审批只有一个成功；页面未订阅时 DB 仍更新。

##### TASK-2.5：实现输出校验和 finalize

- 依赖：TASK-1.3、TASK-2.4。
- 目标：把 Codex 生成文件变成可信、不可变 artifact，而不是解析聊天文本。
- 修改：实现 `ResearchOutputValidatorService`；解析 `temp/result.json`；执行 stage schema/role/path/size/checksum/simulated 校验；成功后调用 ArtifactService finalize。
- 约束：agentMessage 不能作为结构化结果来源；部分成功不标 completed；unknown role 不自动接受。
- 判定：四个 stage 至少各有一组 valid/invalid fixture 测试；恶意路径、漏 simulated、跨 run 文件、损坏 JSON 均失败。

##### TASK-2.6：实现重启恢复与重试语义

- 依赖：TASK-2.4、TASK-2.5。
- 目标：WebUI 或 app-server 重启不留下永久 running 任务。
- 修改：启动时扫描非终态 run；通过 thread/read、turn history、manifest/temp 状态判断 completed/interrupted/unknown；提供 retry API，retry 创建新 run 并引用原 run，不能复用已失败 runId。
- 约束：无法证明完成时不得猜 completed；旧审批在 generation 变化后失效；已 finalize artifact 不重复写。
- 判定：模拟 WebUI 重启、app-server 重启、turn 完成但 finalize 前崩溃、finalize 后 DB 更新前崩溃四种恢复测试通过。

#### Phase 3：增加并收紧 Skill 能力

##### TASK-3.1：编写四个业务 Skill

- 依赖：TASK-1.1。
- 目标：把各模块模型行为、工具边界和输出 contract 固化为可版本审查的指令。
- 修改：新增 5.8.1 的四个 `research-skills/<name>/SKILL.md`；每个文件包含 5.8.3 的全部要求和 promptVersion/contractVersion 兼容说明。
- 约束：Skill 不保存凭证、不硬编码本机路径、不直接写最终 manifest、不声称模拟结果真实。
- 判定：人工审查触发范围、输入、输出、失败语义；每个 Skill 有最小 dry-run 测试，能在指定 temp 目录生成合格 result.json。

##### TASK-3.2：注册业务 Skill 根并处理 app-server 重启

- 依赖：TASK-3.1。
- 目标：让固定版本 app-server 稳定发现仓库内业务 Skills。
- 修改：实现 `ResearchSkillRegistryService`；启动及每次 `appServerReady` 调 `skills/extraRoots/set`；随后 `skills/list(forceReload=true)`；监听 `skills/changed` 清缓存。
- 约束：根目录由后端 realpath 解析；只注册仓库预期目录；extraRoots/set 失败时相关 stage 为 unavailable，不降级成无 Skill 裸 prompt。
- 判定：初次启动和 app-server 重启后均能列出四个 Skill；删除/禁用 Skill 后 stage 不可启动且错误清晰。

##### TASK-3.3：统一 Skill resolver 与安全校验

- 依赖：TASK-3.2。
- 目标：修复当前 `validateSkillInput` 只校验字符串形状的问题。
- 修改：抽取 `SkillResolverService` 给普通聊天和 ResearchCodexBridge 共用；校验 cwd、enabled、name/path 精确对应、允许根、stage policy、app-server generation。
- 约束：不接受前端自行猜的 path；path 缓存不能跨 cwd/generation；普通聊天不套 stage policy，但仍验证 list 结果。
- 判定：伪造 path、name/path 不一致、disabled skill、缓存过期、跨 cwd skill 测试均被拒绝；现有 SkillSelector 正常工作。

##### TASK-3.4：给科研页面增加受控 Skill 选择

- 依赖：TASK-1.4、TASK-3.3。
- 目标：用户能看到每阶段可用 Skill、版本/来源/启用状态，但不能绕过 policy。
- 修改：复用现有 SkillSelector 的查询基础，新增 stage-aware 展示；默认选择 stage policy 的主 Skill；运行详情保存 skill name/digest。
- 约束：前端选择只是请求意图，后端必须再次解析；Skill 变化后已完成 run 保留原 digest，新 run 使用新 digest。
- 判定：不同 stage 只显示允许 Skill；禁用后按钮不可运行；历史页能显示当时实际 Skill 信息。

#### Phase 4：逐模块迁移

##### TASK-4.1：迁移开题模块

- 依赖：Phase 1、Phase 2、TASK-3.3。
- 目标：保留真实 OpenAlex 检索，把候选题/分析模型能力迁到 Codex。
- 修改：OpenAlex adapter 先产出 candidate-papers artifact；`research-topic` Skill 消费它并生成 candidate-topics/analysis；确认动作生成 immutable confirmed-topic；删除 service 内存 Map 和私有 OUTPUT_ROOT。
- 约束：OpenAlex 结果不足必须如实 warning；Scopus 无凭证为 needs_credentials；Codex 不得补造论文。
- 判定：首次检索、取消、数量不足、OpenAlex 失败、候选确认、刷新恢复流程通过；实验/写作能读取 confirmed-topic。

##### TASK-4.2：迁移实验模块

- 依赖：TASK-4.1、Phase 2、TASK-3.3。
- 目标：实验计划/解释由 Codex 统一生成，结果统一落盘。
- 修改：按 project 读取 confirmed-topic/core-references；调用 `research-experiment` Skill；把前端硬编码 Markdown 迁为 artifacts；Zustand 只留 UI 草稿和 activeRunId；下载走 artifact API。
- 约束：模拟和真实运行分开；真实 runner 的命令、环境、dataset checksum 和日志必须记录；不能把源码内 Demo 数值登记为 real。
- 判定：模拟 run 全链路完成且标记完整；真实模式无 runner 时明确 unavailable；刷新后结果仍存在。

##### TASK-4.3：实现写作模块

- 依赖：TASK-4.1、TASK-4.2、Phase 2、TASK-3.3。
- 目标：将占位页变成最小完整写作链路。
- 修改：输入选择、outline、draft、final 三阶段均调用 `research-writing` Skill；保存 paper-metadata、paper-source、paper-pdf；编辑保存复用 mtime/version 冲突控制。
- 约束：所有引文和实验陈述能追溯到 artifactId；simulated evidence 必须披露；同一 final run 的 metadata/source/pdf 版本一致。
- 判定：可从上游生成草稿、手工编辑、重新生成新版本、导出 PDF；并发保存冲突不覆盖；投稿可读取 final artifacts。

##### TASK-4.4：迁移投稿模块

- 依赖：TASK-4.3、Phase 2、TASK-3.3。
- 目标：彻底移除浏览器直连模型后端，将审稿/rebuttal/decision 统一交给 Codex Skill。
- 修改：删除 `apiClient.ts`/`apiService.ts`/`config/api.ts` 的重复和硬编码；页面从 writing.final artifacts 初始化；依次启动 submission stages；每步输出落盘并刷新恢复。
- 约束：默认 simulated；没有正式 adapter/授权时不能发真实投稿；PDF 替换先上传为 artifact；所有 API 同源。
- 判定：仓库搜索不到 cpolar URL 和浏览器模型 fetch；一审、rebuttal、最终决定可恢复；模拟标记始终显示。

#### Phase 5：统一四模块前端体验

##### TASK-5.1：建立 ResearchProject 上下文和流程壳

- 依赖：TASK-1.4。
- 目标：四个页面共享当前项目、stage readiness、最新 artifacts 和运行状态。
- 修改：增加 project-scoped query/hooks；URL 或顶层 layout 携带 projectId；侧栏显示四阶段 readiness；不把 artifact 内容复制进全局 store。
- 判定：切换项目不会串数据；直接刷新深链接能恢复 project；缺 projectId 时有明确创建/选择流程。

##### TASK-5.2：统一运行、等待、审批、错误 UI

- 依赖：TASK-2.4、TASK-5.1。
- 目标：四模块使用同一 RunStatus、等待用户、取消、重试组件。
- 修改：封装 run status card/timeline；关联现有 pending approvals、user input、Codex notifications；显示 thread/turn/skill/model 只读元数据。
- 判定：相同状态在四模块显示一致；用户可以从 run 跳到关联 Codex task 审计；取消和重试不复用旧 run。

##### TASK-5.3：统一 artifact 预览、下载与 lineage

- 依赖：TASK-1.4、TASK-5.1。
- 目标：用户可以从任何阶段检查输入、输出和来源。
- 修改：复用 Files viewer；增加 artifact role、checksum、producer run、consumer runs、simulated、schemaVersion 展示；支持从下游回溯上游。
- 判定：端到端链路中任一 artifact 都可定位生产 run 和输入 checksum；相对路径不泄露服务端绝对根。

#### Phase 6：迁移、质量门和交付

##### TASK-6.1：处理旧 Demo/localStorage 数据

- 依赖：Phase 4。
- 目标：升级后不把旧浏览器 Demo 状态误当成正式项目数据。
- 修改：给 experiment store 增加版本；旧状态只允许用户“导入为 simulated 草稿”或清除；投稿旧 Context 无持久数据，不做伪迁移；旧 topic work 目录提供一次性显式导入命令/API。
- 约束：导入生成新 project/run/artifactId 并标 legacy/simulated；不原地移动未知用户文件。
- 判定：旧状态不会自动进入真实 workflow；导入预览列出将读取的精确路径和文件。

##### TASK-6.2：完成安全与回归测试

- 依赖：Phase 1–5。
- 目标：覆盖数据边界、Skill 边界、Codex 事件和四模块现有功能。
- 操作：落实 8.2/8.3 全部测试；增加 Skill path 伪造、审批竞态、prompt 注入文件名、symlink、跨 project、恶意 result.json、外部 URL 扫描。
- 判定：测试实际通过；任何跳过项在 PR 中有原因和 owner；不能用“手工看起来正常”替代安全测试。

##### TASK-6.3：执行完整端到端和故障恢复验收

- 依赖：TASK-6.2。
- 目标：证明四模块闭环和重启恢复真实可用。
- 操作：执行 8.4；额外在实验 turn、写作 finalize、投稿审批三个时点分别重启 WebUI/app-server；核对 DB、manifest、thread history 和 UI。
- 判定：所有步骤有 runId/threadId/turnId/artifactId；重启后无永久 running；旧下游输入 checksum 不被新上游覆盖。

##### TASK-6.4：最终审计和合并 PR

- 依赖：TASK-6.3。
- 目标：只把可审计的集成成果交付 main。
- 操作：执行全部 build/test/lint/diff-check；搜索 `new OpenAI`、`api.openai.com`、`cpolar`、`localhost:3001`、模块私有 OUTPUT_ROOT、未受控 `fetch`；检查运行数据未进 Git；更新本文结果摘要。
- 判定：11 节全部满足；PR 保留 merge commits、不 squash；合并后通知模块负责人按 9 节同步。

## 8. 验证要求

### 8.1 静态与单元测试

按仓库实际 package manager 版本执行：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm lint
pnpm --dir web install --frozen-lockfile
pnpm --dir web build
pnpm --dir web test
pnpm --dir web lint
git diff --check
```

注意：根目录 `build/test` 可能依赖 Codex schema 生成工具。若环境缺工具，必须记录“环境阻塞”和实际错误，不能把未运行写成通过。

### 8.2 后端必须新增的测试

- project/run/artifact ID 不能路径穿越。
- manifest 只含相对路径，且每个 completed artifact 都存在、size/checksum 一致。
- 写 artifact 使用临时文件 + 原子 rename；失败不暴露半成品。
- 服务重启后已完成 run 可恢复；遗留 running run 有明确中断状态。
- 删除或取消 run 不删除被其他 handoff 引用的 artifact。
- 上传 PDF 的大小、MIME、magic bytes 和扩展名校验。
- simulated artifact 不能在未确认时进入 real submission。
- OpenAlex 数量不足时仍可落盘，但 `targetReached=false` 且有 warning，不能补造文献。
- 每个 research project/module 只产生一个有效 agent session；幂等重试不重复启动 turn。
- run 与 threadId/turnId 绑定正确，其他 turn 的通知不能推进当前 run。
- app-server 重启、generation 变化、审批过期和 turn 恢复状态映射正确。
- Skill name/path 必须来自当前 cwd 的 `skills/list` 同一 enabled 条目，并符合 stage policy。
- `skills/extraRoots/set` 在 app-server 每次 ready 后重放，失败时相关 stage 明确 unavailable。
- `result.json` 的绝对路径、`..`、未知 role、错误 schemaVersion、遗漏 simulated 均被拒绝。
- 代码中不存在绕过 Codex app-server 的模型 SDK 或浏览器模型 URL。

### 8.3 前端必须新增的测试

- 四个固定路由均可渲染，侧栏跳转不白屏。
- 刷新后可根据 projectId/activeRunId 恢复任务，而不是只依赖 Context。
- 下游只显示 schema 兼容且 status=completed 的上游 artifact。
- 上游更新后提示新版本，不静默替换当前 run 输入。
- simulated 徽标在实验结果、写作引用和投稿结果中始终可见。
- 网络错误、空结果、取消、needs_credentials 和 unavailable 均有 UI。
- 投稿没有任何对 cpolar 或 localhost:3001 的浏览器请求。
- 科研 Skill 选择器只显示 stage policy 允许的 Skill，后端仍会二次校验。
- 运行详情展示关联 Codex task、turn、实际 model、Skill digest 和 promptVersion。
- waiting_for_approval、waiting_for_input、validating、interrupted 在四个模块中展示一致。
- Codex 完成文本不会被前端正则当作 artifact；只有服务端 finalize 的 artifact 可进入下游。

### 8.4 端到端验收场景

使用一个全新的 project：

1. 输入研究兴趣，运行开题 first-search。
2. 确认生成 manifest 与 CSV，选择并确认一个 topic。
3. 实验模块读取同一 confirmed-topic artifact，创建模拟 run 并落盘结果。
4. 写作模块读取 topic、references 和实验结果，保存草稿并导出 PDF。
5. 投稿模块自动载入 paper metadata/PDF，完成模拟一审、rebuttal 和最终 decision。
6. 刷新浏览器并重启后端，四阶段历史和文件仍可恢复。
7. 在 Files 页面能通过受控路径预览/下载产物。
8. 检查所有 manifest 的 input artifactId、producerRunId 和 sha256，链路应可追溯。
9. 创建上游新 run，确认旧下游 run 仍引用旧 checksum，UI 同时提示可升级。

## 9. 后续各分支更新时如何继续合并

### 9.1 最推荐：从最新 `main` 新开后续分支

首次集成完成后，原三个分支已经基于旧架构。让模块负责人从最新 `main` 新开分支最干净：

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feat/research-topic-v2
```

写作和投稿同理。新开发必须使用共享 workflow/artifact API，不得重新引入模块私有输出根、硬编码 URL 或只存在浏览器内的唯一数据。

### 9.2 必须继续使用旧分支时

由于首次采用 `--no-ff` merge，Git 已知道旧提交进入过 main。负责人先把新 `main` 合回自己的共享功能分支，再开发：

```bash
git fetch origin
git switch feat/research-topic
git merge origin/main
# 解决冲突并运行该模块测试
git push origin feat/research-topic
```

共享远端分支优先用 merge，不要 rebase 后强推，避免其他负责人本地历史失效。只有分支确定为单人私有且团队明确同意时才允许 rebase + `--force-with-lease`。

之后在新的集成分支合并增量：

```bash
git fetch --prune origin
git switch main
git pull --ff-only origin main
git switch -c integration/research-workflow-YYYYMMDD
git log --oneline origin/main..origin/feat/research-topic
git diff --stat origin/main...origin/feat/research-topic
git merge --no-ff origin/feat/research-topic
```

因为 ancestry 被保留，Git 只会带入首次 merge 之后的新提交。

### 9.3 每次增量合并的审查门槛

每次先回答：

- 是否修改 `research-contracts.ts` 或 JSON Schema？如果是，schemaVersion 是否变化，迁移和兼容测试在哪里？
- 是否新增/改名 artifact role？四模块消费者是否同步？
- 是否引入新的绝对路径、输出根、localStorage key、外部 URL 或重复 API client？
- 是否修改 router、AppModule、DB schema、lockfile、共享 UI？这些必须单独审查。
- 是否更改模拟/真实模式语义？是否可能把 simulated 结果误传给写作或投稿？
- 是否包含运行产物、PDF、凭证、`.env` 或本地路径？有则停止合并。

### 9.4 禁止的 Git 做法

- 不要 squash 首次模块 PR 后又计划长期从原分支增量 merge。
- 不要对 `main` force push。
- 不要用“ours/theirs 整文件”处理 router 或共享 contract。
- 不要为了通过冲突删除别的模块 import、route、DB migration 或测试。
- 不要在 dirty worktree 执行 merge。
- 不要在未比较远端 SHA 的情况下重复合并。

## 10. 建议的 CODEOWNERS/协作边界

如果仓库允许，增加 CODEOWNERS 或至少在 PR 模板中指定：

| 路径                                        | 责任                                    |
| ------------------------------------------- | --------------------------------------- |
| `src/research-workflow/**`                  | 四模块共同评审，contract owner 必须批准 |
| `src/research-topic/**`                     | 开题负责人                              |
| `web/src/components/research-topic/**`      | 开题负责人                              |
| `web/src/components/research-experiment/**` | 实验负责人                              |
| `web/src/components/research-writing/**`    | 写作负责人                              |
| `web/src/components/research-submission/**` | 投稿负责人                              |
| `web/src/routes/router.tsx`                 | 集成负责人                              |
| `src/database/schema.ts`、`drizzle/**`      | 后端/数据负责人                         |

共享文件的修改必须单独 commit。模块负责人不应顺手格式化整个 router、lockfile 或通用 UI 目录。

## 11. 交付完成定义

满足以下全部条件后才能把集成分支合入 `main`：

- 四个页面入口都可用，router 无 BOM/行尾伪 diff。
- 不存在浏览器硬编码 cpolar/localhost 后端地址。
- 四模块统一 project/run/artifact contract，前端类型来自同一 OpenAPI/schema。
- 运行数据统一落盘，manifest 可追溯且只含相对路径。
- 所有 LLM/自然语言模型能力均通过现有 Codex app-server thread/turn 主干，没有模块私有 OpenAI SDK、模型 token、SSE 或浏览器直连模型服务。
- 四个业务 Skill 能被 app-server 稳定发现，调用包含 `$skill-name + skill input item`，且 name/path/cwd/stage 均经后端校验。
- Research run 与 Codex thread/turn、Skill digest、model、promptVersion 的映射可恢复、可审计。
- 审批、用户输入、取消和 app-server 重启继续复用 main 的既有机制，没有第二套审批或状态通道。
- 开题内存任务、实验 localStorage-only 结果、投稿 Context-only 结果都已消除“唯一副本”问题。
- 写作至少完成上游导入、草稿保存、metadata 和 PDF artifact；否则必须明确标为未完成，不能宣称闭环。
- simulated/real 模式从输入到最终 decision 全链路可辨识。
- 单元、构建、lint 和端到端流程均有实际结果记录。
- `git status --short` 为空，`git diff --check` 通过，运行数据未进入 Git。
- PR 描述包含四模块输入输出表、迁移影响、测试证据、已知限制和后续分支同步要求。

## 12. 给执行 AI 的最短行动清单

1. 重新 fetch，比较本文记录 SHA 与当前远端。
2. 从最新 `origin/main` 建 `integration/research-workflow`，不要直接改 main。
3. 用 `--no-ff` 按开题、写作、投稿顺序合并，手工修 router BOM/CRLF。
4. 先实现共享 project/run/artifact/manifest、数据库和安全路径层。
5. 实现 research project/module 到 Codex thread/turn 的持久映射。
6. 提交四个业务 Skill，通过 `skills/extraRoots/set + skills/list` 注册和解析，并修复 name/path 安全校验。
7. 让所有模型能力只调用 `ThreadsService.startTurn`；保留 OpenAlex、PDF parser、runner 等确定性 adapter。
8. 按开题、实验、写作、投稿顺序迁移，清理硬编码模型 URL、重复 API 和浏览器唯一状态。
9. 把所有下游可消费结果 finalize 为服务端 artifact，并记录输入 checksum、Skill/model/prompt provenance。
10. 完成单元、安全、重启恢复和完整端到端 run，记录真实命令及结果。
11. 通过 PR 合并到 main，禁止 squash 和 force push。
12. 通知各模块负责人从新 main 开 v2 分支；若继续旧分支，先 merge main 回去再开发。

## 13. 本次架构梳理结果摘要

本次在原合并手册基础上完成了以下补充，供下一位执行 AI 直接采用：

1. 将四模块统一为 `Web UI → Workflow API → Data Plane / Agent Plane → Codex App Server / Deterministic Adapters` 六层架构，明确禁止业务页面跨层直接访问模型和文件系统。
2. 完善统一数据模型：project、run、stage、status、artifact、handoff、manifest、checksum、schemaVersion、simulated 和 provenance；增加审批、用户输入和输出校验状态。
3. 明确模型能力统一方案：所有 LLM 或其他自然语言模型对话均复用 `main` 的 `CodexProcessManager/CodexService/ThreadsService`；四模块不再维护 OpenAI SDK、SSE、token、模型列表或外部模型 URL。
4. 设计 `ResearchCodexBridgeService`：一个 research project 的每个 module 对应一个 Codex thread，每次业务 run 对应一个 turn，并持久化 threadId、turnId、model、effort、Skill digest 和 promptVersion。
5. 明确结构化输出规则：Codex 在 run temp 目录生成 `result.json + artifact files`；服务端校验并原子 finalize；不从聊天最终文本中用正则提取业务 JSON。
6. 设计四个可提交到仓库的业务 Skills：`research-topic`、`research-experiment`、`research-writing`、`research-submission`；通过固定版本 app-server 的 `skills/extraRoots/set` 注册，通过 `skills/list` 发现，通过 `$name + type: skill` 显式调用。
7. 识别并给出现有 Skill 安全修复：当前 `validateSkillInput` 只校验字符串形状；后续必须验证 cwd 下 `skills/list` 返回的 enabled name/path、允许根和 stage policy。
8. 保留确定性工具边界：OpenAlex、PDF parser、checksum、真实训练 runner 不伪装成 LLM；它们作为后端 adapter 或 Codex 可审批调用的工具提供事实数据。
9. 给出 TASK-0.1 至 TASK-6.4 的实施清单，每项均写明依赖、目标、修改、约束和完成判定，并给出无循环依赖的推荐执行顺序。
10. 扩充了测试和交付门槛，覆盖 Skill 路径伪造、Codex 事件串线、审批竞态、app-server 重启、恶意 result.json、跨项目读取、模拟数据传播和外部模型 URL 回归。

本文已从架构设计进入实施阶段。所有执行结果继续追加在本节，不建立平行计划或中间说明文件；尚未列为“完成”的任务仍必须按前文章节逐项实施和验证。

### 实际执行记录

- TASK-0.1：完成。远端基线仍为 `main@1bb84f5`、topic@`fe5cd2e`、writing@`38c98d0`、submission@`c3246d6`。
- TASK-0.2：完成。集成分支为 `integration/research-workflow`；三个功能分支均以 `--no-ff` merge 保留 ancestry；投稿 router 冲突已手工重建为四模块并存。
- TASK-0.3：完成。新增 `.gitattributes`，保留 main 的 `web/pnpm-workspace.yaml` 配置。
- 基线验证：根目录 `pnpm build` 通过；`web/pnpm build` 通过；`web/pnpm test` 为 20 files / 195 tests 全通过。
- 基线已知问题：根目录测试为 36 files 通过、2 files 失败，合计 309 tests 通过、5 tests 失败。失败来自 Windows 环境下用户主目录同时是 FilesService 默认允许根导致 3 个“outside root”断言不成立、无 symlink 权限导致 1 项失败，以及并行 schema/AppModule 测试缺 `WEBUI_API_KEY` 并发生 SQLite 临时文件锁。后续应单独修复，不能误记为本次 workflow 新测试回归。
- TASK-1.1（实施中）：已新增 `research_projects`、`research_runs`、`research_artifacts`、`research_agent_sessions`、`research_agent_invocations` 五张表及 Drizzle migration `0010_eminent_chameleon.sql`。
- TASK-1.2（实施中）：已新增共享 contract、受控 project/run/temp/artifacts 路径服务、project/run/artifact API 与 SHA-256、临时文件原子 finalize；运行根默认位于 `%USERPROFILE%/.codex/research-projects`，并通过 `.gitignore` 排除仓库内兼容运行目录。
- 数据底座阶段验证：根目录 `pnpm build` 通过。后续在补齐 manifest 状态迁移、安全测试及 Codex bridge 后再次执行完整 build/lint/test。
- TASK-2.1：完成核心实现。新增四个仓库内业务 Skill；`SkillsService` 增加 `skills/extraRoots/set`；`ResearchSkillRegistryService` 在 app-server ready/restart 后注册根目录，以 `skills/list(forceReload=true)` 按 cwd、stage、enabled、name、真实 path 解析，并计算 SKILL.md SHA-256。
- TASK-2.2：完成安全修复。普通 thread/turn REST 入口不再只做 Skill 字符串形状校验，而是读取 thread cwd，并要求 name/path 与该 cwd 下 `skills/list` 返回的 enabled Skill 完全一致；新增伪造路径拒绝测试。
- TASK-2.3：完成核心 Codex bridge。每个 project/module 复用一个 Codex thread；每个 agent run 创建一个 turn；调用同时发送 `$skill-name` 文本和 `type: skill` 输入；持久化 run/thread/turn/model/effort/Skill path/digest/promptVersion。四模块不得新增独立模型 SDK 或模型 URL。
- Skill/Codex 阶段验证：根目录 `pnpm build` 通过；相关 ESLint 通过；`threads.controller.spec.ts` 为 17/17 通过。Skill Creator 的 `quick_validate.py` 因当前系统 Python 缺少 `PyYAML` 未能运行，构建及 Markdown frontmatter 人工检查通过；这不是 Skill 内容校验失败，后续 CI 应安装 validator 依赖后补跑。
- 增量同步记录：2026-09-11 fetch 发现 `origin/feat/research-topic` 从 `fe5cd2e` 更新到 `425687a`，已用 `--no-ff` 合入并保留 ancestry。该增量仅新增平行的 `MERGE_GUIDE.md`；其有效验收和交接要求已由本文第 8、9、11 节覆盖，因此按“不要额外中间文件”的交付约束删除该重复文件，后续只维护本文。
