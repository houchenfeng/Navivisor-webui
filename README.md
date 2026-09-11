# 启航科研智能体（Navivisor · 研途启航）

未央黑客松参赛作品。

面向大一新生的 vibe research 科研智能体：借助 AI，从零体验开题、实验、写作到会议投稿的全流程。

## 痛点与应用场景

定位在**科普和教育**。

大一新生往往还不了解科研是怎么走完一圈的。Navivisor 用可交互的方式，带着同学从零走一遍：

- 科研选题
- 设计实验方案
- 开展实验
- 会议投稿
- 中稿之后的体验

目标是提供一次上手机会，增进对科研的了解，帮人跨过 **0 → 1** 这一关。

## 这是什么

本仓库是 Navivisor 的 Web 界面，在浏览器里对接 [OpenAI Codex CLI](https://github.com/openai/codex)：多会话对话、文件管理、终端、审批与插件等，用来支撑上面的科研体验流程。

四个科研模块不是四套相互独立的页面。目标架构以一个 `research project` 为主线，把每一步执行记录为不可变的 `run`，把 CSV、PDF、Markdown、图片、TeX 等结果记录为有版本和校验和的 `artifact`。下游模块只引用上游 artifact ID，不依赖复制粘贴、浏览器内存或某一段聊天历史。

```text
开题检索与选题
  -> 核心文献与确认课题 artifacts
  -> 实验方案与实验结果 artifacts
  -> 论文源码、参考文献、图片与 PDF artifacts
  -> 投稿包、审稿意见、Rebuttal 与决定 artifacts
```

业务文件采用“SQLite 元数据 + 项目目录文件”双层显式存储：数据库保存项目、运行、产物关系和状态，文件系统保存真实内容；每个 run 的 manifest 固定记录输入 artifact ID 和 SHA-256，因此刷新页面、重试任务或产生新版本后仍能还原当时使用的上下文。

## 快速开始

### 需要先安装 / 下载的东西

| 项 | 用途 | 说明 |
|---|---|---|
| [Node.js](https://nodejs.org/) ≥ 20 | 跑前后端 | 建议 LTS |
| [pnpm](https://pnpm.io/) ≥ 9 | 包管理 | `npm i -g pnpm` |
| 本仓库依赖 | 后端 Nest + 前端 Vite/React + 内置 Codex CLI 包 | `pnpm install`（根目录与 `web/`）各装一次 |
| ChatGPT 账号（可选但推荐） | 让 Codex 真正对话 / 写作 AI | 首次在 WebUI **设置 → 账户** 里设备登录；也可用 `OPENAI_API_KEY` |

前端开发一般**不用**单独配 `.env`：Vite 已把 `/api`、`/socket.io` 代理到后端 `8172`。  
后端必须有根目录 `.env`（可由首次启动自动生成）。

### 前后端配置

**后端（仓库根目录 `.env`）**

| 变量 | 是否必须 | 说明 |
|---|---|---|
| `WEBUI_API_KEY` | 是 | Web 登录密钥（**不是** ChatGPT 密码）。首次运行会自动生成随机值并写入 `.env` |
| `PORT` | 否 | 默认 `8172` |
| `CODEX_BIN` | 建议 | Codex 可执行文件路径；Windows 可指向 `pnpm install` 后的 `node_modules/@openai/codex-win32-x64/.../codex.exe` |
| `OPENAI_API_KEY` | 否 | 不用 ChatGPT 登录、改走 API Key 时再填 |
| `CODEX_HOME` / `WEBUI_DB_PATH` | 否 | 默认在用户目录下的 Codex/SQLite 路径 |
| `NAVIVISOR_RESEARCH_WORK_ROOT` | 否 | 科研托管项目根目录；默认 `~/.codex/research-projects` |

**前端（`web/`，可选）**

| 变量 | 是否必须 | 说明 |
|---|---|---|
| （无） | — | 本地 `pnpm dev` 默认代理到 `http://localhost:8172` |
| `VITE_SUBMISSION_API_BASE_URL` | 否 | 仅当投稿模块要打远程 API 时设置；不设则用本地 mock |

### 首次运行会生成随机密钥

第一次执行 `pnpm start:dev`（或 `pnpm ensure:env`）时：

1. 若还没有 `.env`，会从 `.env.example` 复制一份；
2. 若 `WEBUI_API_KEY` 仍是占位符 `change-me-to-a-random-secret`，会换成**随机密钥**并写回 `.env`；
3. 终端会打印一次，例如：

```text
============================================================
First run: created .env and generated WEBUI_API_KEY
WEBUI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
Use this value to log in to the Web UI.
============================================================
```

请用这个值在浏览器登录页登录，并自行保管（不要提交到 Git）。之后再启动不会重新生成，除非你删掉 `.env` 或把密钥改回占位符。

### 命令步骤

```bash
# 1) 安装依赖（根目录 = 后端；web = 前端）
pnpm install
cd web && pnpm install && cd ..

# 2) 准备环境变量（也可直接 start:dev，会自动 ensure:env）
pnpm ensure:env
# 需要时编辑 .env：Windows 建议设置 CODEX_BIN

# 3) 开两个终端
pnpm start:dev          # 后端 → http://localhost:8172
cd web && pnpm dev      # 前端 → http://localhost:5173（或 5174）
```

打开前端地址，用 `.env` 里打印/保存的 `WEBUI_API_KEY` 登录。

要用 GPT 账号跑 Codex：进入 **设置 → 账户**，选择 **ChatGPT**，完成设备登录授权。

### 第一次跑通：最短清单

1. 安装 Node.js ≥ 20、pnpm ≥ 9  
2. `pnpm install` + `cd web && pnpm install`  
3. `pnpm start:dev`（记下终端里生成的 `WEBUI_API_KEY`）  
4. 另开终端：`cd web && pnpm dev`  
5. 浏览器打开前端，用该密钥登录  
6. （可选）设置里用 ChatGPT 登录 Codex；Windows 可在 `.env` 配好 `CODEX_BIN`  

工作目录 Demo 示例包在 `demo-packages/camera-vad-scene-memory/`（需落在 Files 服务允许的 workspace 根目录内再注册）。

## 简要使用说明

登录后从侧栏进入科研模块（首页：`/research/home`）：

| 模块 | 路径 | 怎么用 |
|---|---|---|
| 首页 | `/research/home` | 四模块入口；底栏卡片为 Demo |
| 开题 | `/research/topic` | 填方向 → 试检索（OpenAlex）；Step2/3 暂为占位 |
| 实验 | `/research/experiment` | 导入 SAM Demo → 模拟执行 → 查看/下载成果 |
| 写作 | `/research/paper` | 填入实验素材 → 任意跳步 → AI 生成走 Codex |
| 投稿 | `/research/submit` | 走完审稿 Demo（默认本地 mock） |

写作 AI 需 Codex 已登录；PDF 请下载 zip 后本地编译。  
目前开题后两步、真实实验、在线 PDF 编译和真实投稿仍未完成；页面中的模拟结果必须视为教学 Demo，不能作为真实论文证据。

四模块产物链、文件契约、统一 Demo 按钮和后续实施状态统一记录在 [四模块 Workflow TODO](./docs/four-module-workflow-migration-todo.md)。每完成一项直接回写该文件，不另建阶段性中间文档。当前缺口见 [四模块缺口报告](./docs/research-modules-gap-report.md)，完整文档入口见 [文档索引](./docs/README.md)。

## 产物如何衔接

最新工作目录设计：一篇论文对应一个用户在首页选择的工作目录，四模块共享该目录中的 `topic/`、`experiment/`、`writing/`、`submission/`。对话窗口显示项目简述和产物链接；统一「从工作目录载入 Demo」读取目录中的示例文件。契约与进度见 [TODO 第 14–18 节](./docs/four-module-workflow-migration-todo.md#14-最新产品决定一篇论文一个工作目录)。

- 同一项研究始终使用同一个 `projectId`。
- 每次检索、生成、实验、写作或审稿都是一个独立 `runId`，失败重试也创建新 run。
- CSV、PDF、BibTeX、Markdown、PNG、TeX 等文件完成校验后获得独立 `artifactId` 和 SHA-256。
- 下游 run 通过 `inputArtifactIds` 显式选择输入，manifest 保存当时输入的 ID、角色、来源 run 和校验和。
- Codex 对话用于执行，不作为科研数据的唯一存储；即使切换会话，Workflow 仍可从 artifacts 恢复上下文。
- Demo 也必须通过相同的 project/run/artifact 链导入，并标记 `mode=simulated`、`simulated=true`，不能直接把数据塞进 localStorage。

## 上游项目

本项目基于 [LimLLL/codex-webui](https://github.com/LimLLL/codex-webui) 二次开发。完整安装与能力说明见 [docs/codex-webui.md](./docs/codex-webui.md)。
