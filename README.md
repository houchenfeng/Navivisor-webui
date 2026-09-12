# 启航科研智能体 · Navivisor

未央黑客松参赛作品，面向科研新手的教学工作台：从开题、实验到论文写作和模拟投稿。同时保留 Codex WebUI 的对话、文件、终端和工具管理能力。

## 安装与启动

使用 Node.js 22.12+、pnpm 10（仓库锁定 10.18.3）。后端为 NestJS，前端为 React/Vite，数据使用 SQLite 和本地文件目录。

```bash
git clone https://github.com/houchenfeng/Navivisor-webui.git
cd Navivisor-webui
pnpm install
pnpm --dir web install
pnpm ensure:env
```

首次初始化会创建根目录 `.env`。WebUI 不再要求部署登录密钥，打开页面即可进入；ChatGPT/Codex 账户授权仍在“设置 → 账户”中单独完成。请保留自己的配置，不提交 `.env`。

打开两个终端，在仓库根目录分别运行：

```bash
pnpm start:dev
```

```bash
pnpm --dir web dev
```

打开前端终端显示的地址，默认 [localhost:5173](http://localhost:5173)；后端默认 8172。前端已代理 API/WebSocket，通常无需额外 .env。后端改端口时同步修改 web/vite.config.ts 的代理目标。

在“设置 → 账户”完成 ChatGPT 设备登录后即可使用 Codex；API Key 模式可按账户配置设置 OPENAI_API_KEY。后端须能启动 Codex CLI，找不到时在 .env 配置 CODEX_BIN 为本机实际可执行文件路径。仓库包含固定版本 Codex 依赖；Windows 可参考 .env.example 的路径示例并核对实际安装位置。

| 可选配置 | 用途 |
|---|---|
| PORT | 后端端口，默认 8172 |
| CODEX_BIN / CODEX_HOME | Codex 可执行文件与运行数据目录 |
| WEBUI_DB_PATH | SQLite 数据库路径 |
| NAVIVISOR_RESEARCH_WORK_ROOT | 未绑定用户目录时的科研托管根目录 |

完整配置见 [.env.example](./.env.example)，容器部署见 [Docker 说明](./docs/docker.md)。

## 使用科研模块

登录后进入首页，填写服务端可访问的论文目录并注册，再进入各模块。目录需要处于 Files 服务允许的工作区范围；远程部署选择的是服务器目录。

| 模块 | 路径 | 当前用途 |
|---|---|---|
| 首页 | /research/home | 注册论文工作目录、载入目录 Demo、查看项目摘要 |
| 开题 | /research/topic | 自适应 OpenAlex 检索、三个候选课题及核心文献交接 |
| 实验 | /research/experiment | 实验方案和结果的模拟演示 |
| 写作 | /research/paper | 章节编辑、Codex 生成/翻译、TeX/ZIP 导出 |
| 投稿 | /research/submit | 本地模拟审稿、Rebuttal 与决定 |

Demo 位于 [camera-vad-scene-memory](./demo-packages/camera-vad-scene-memory/)。先复制到独立论文目录，再注册并点击“从工作目录载入 Demo”。载入操作读取文件，不运行模型。

写作 AI 需 Codex 已登录。第 10 步可由后端调用本机 LaTeX 编译 PDF；也可下载包含官方模板文件的 zip 后离线编译。页面中的模拟结果必须视为教学 Demo，不能作为真实论文证据。

### 模型服务边界

科研模块的文本生成、翻译和论文配图统一通过 Research Workflow 调用当前登录的 Codex，不在浏览器或业务后端中维护 Qwen、Gemini、Anthropic、DeepSeek、Ollama 等独立 LLM 客户端、密钥或模型接口。写作实现位于 `web/src/components/research-writing/lib/codex.ts`；生成任务携带 `projectId`、`runId` 和输入 `artifactId`，便于追踪来源与恢复上下文。

OpenAlex 文献检索、文件解析、校验和、LaTeX 编译及实验 runner 属于确定性工具，不是 LLM 服务，继续由后端执行。实验页的可选 API 字段仅用于用户自己的实验平台或数据服务，不会被 Navivisor 当作模型接口调用。

### LaTeX / CVPR PDF 编译环境

项目使用你提供的 CVPR 官方 Author Kit（当前模板为 CVPR 2026 风格），生成包会包含 `cvpr.sty`、`preamble.tex` 和 `ieeenat_fullname.bst`。一键编译依赖本机安装以下工具之一：

- Windows：安装 [MiKTeX](https://miktex.org/download) 或 [TeX Live](https://www.tug.org/texlive/)，并把 `pdflatex`、`bibtex` 加入 PATH；
- macOS：安装 MacTeX；Linux：安装 TeX Live，并确保同样的命令可在终端执行。

可用下面的命令检查：

```bash
pdflatex --version
bibtex --version
```

如果后端找不到 `pdflatex`，页面会提示安装环境，而不会伪造 PDF。需要使用其他命令时，可在 `.env` 中设置 `LATEX_COMMAND`。后端编译会在临时目录中执行，编译结束后自动清理。

离线编译下载的文章包：

```bash
pdflatex -interaction=nonstopmode -halt-on-error main.tex
bibtex main
pdflatex -interaction=nonstopmode -halt-on-error main.tex
pdflatex -interaction=nonstopmode -halt-on-error main.tex
```

### 质量检查

提交前建议运行：

```bash
pnpm build
pnpm test
pnpm --dir web build
pnpm --dir web test
pnpm --dir web lint
```

Windows 未启用开发者模式或管理员权限时，创建 symlink 的测试可能因 `EPERM` 失败；工作区根目录覆盖系统临时目录时，Files 服务的“目录外拒绝”用例也可能不成立。这些属于测试环境约束，应与真实功能回归分开判断。

当前全量前端 lint 还会报告部分既有 React Hook、Fast Refresh 和旧投稿模拟代码问题；新增或修改文件应至少做到无新增 lint error，并逐步清理存量问题。生产构建和前后端测试仍应分别执行，不能以 lint 结果代替运行验证。

真实开题检索需在后端 `.env` 配置 `OPENALEX_API_KEY`。密钥仅由后端调用 OpenAlex 时使用；不得写入前端、浏览器存储或检索产物。检索会从 focused 自适应放宽到 balanced/broad，并记录每次查询、去重结果和切换原因。详细接入说明见 [OpenAlex 本地接入交接文档](./outputs/OpenAlex本地接入_AI协作者交接文档.md)。

当前目录注册和基础导入已实现，但四模块内容恢复、项目统一及对话产物卡片仍未完全贯通。Demo 文献与指标为合成数据，图片/PDF 仍有占位；真实训练、在线 LaTeX 编译和真实投稿尚未完成。进度和验收统一记录在 [剩余任务 TODO](./docs/four-module-workflow-migration-todo.md)。

## Codex 对话与工具

除科研页面外，可通过侧栏新建或打开 Codex 对话，选模型与工作目录后发送任务。主要能力包括：

- 多会话历史、流式回复、继续对话、运行中追加指令或中断。
- 会话分叉、消息分支、归档与取消归档、上下文压缩。
- 文件浏览、上传、编辑、预览，以及代码变更差异查看。
- 全局终端、命令输出和执行审批。
- 模型与账户设置，Skills、MCP、插件和 Apps 管理。
- Token 用量、错误与诊断信息查看。

具体可用工具取决于当前 Codex 版本、登录状态和安装配置。操作协议可查 [REST API](./docs/rest-api.md)、[终端](./docs/terminal.md) 与 [审批](./docs/approval.md)。

## 数据格式

目标是一篇论文一个目录：

```text
paper-workspace/
  project.json          项目身份和模块目录
  demo/demo-manifest.json
  topic/                输入、检索、文献 CSV/BibTeX/PDF
  experiment/           方案、配置、代码、指标 CSV、结果 MD、图片
  writing/              章节、TeX、BibTeX、图片和 PDF
  submission/           投稿包、审稿 JSON/MD、Rebuttal
  .navivisor/           运行、历史快照、索引和项目对话
```

JSON 保存结构化信息，CSV 保存文献及指标，Markdown 保存可读说明，BibTeX 保存引用，PNG/PDF/ZIP 保存交付文件。manifest 声明文件角色、依赖和 SHA-256；projectId/runId/artifactId 分别标识项目、运行与产物。当前清单并未覆盖全部业务文件，完整数据链仍在实施。

逐文件字段说明、仓库实际示例与缺失状态见 [Demo 数据格式文档](./docs/demo-data-format.md)。这是数据参考；后续实现进度只回写 TODO。

## OpenAlex 检索与产物衔接

检索采用三层自适应策略：先使用 `focused` 高精度命名变体和标题排除词；去重结果不足时切换 `balanced`；仍不足时切换 `broad` 保底。每次请求都会记录 OQL、关键词、排除词、OpenAlex `meta.count`、返回数、去重数和切换原因。视频异常检测已配置专用的命名变体和跨领域排除词。

核心文献阶段会请求 OpenAlex 的 `open_access`、`has_content` 和 `content_urls` 字段。对于 OpenAlex 官方缓存的 PDF，下载器访问 `content.openalex.org` 时才从后端环境变量临时加入 API Key，不把 Key 写入交接文件。PDF 下载仍受 OpenAlex 内容覆盖、额度、HTTPS、域名白名单、文件大小和 PDF 文件头校验限制；无法获取全文时保留元数据并标记状态，不伪造 PDF。

给协作者本地 AI 的详细接入说明见 [OpenAlex 本地接入交接文档](./outputs/OpenAlex本地接入_AI协作者交接文档.md)。

四模块产物链、文件契约、统一 Demo 按钮和后续实施状态统一记录在 [四模块 Workflow TODO](./docs/four-module-workflow-migration-todo.md)。每完成一项直接回写该文件，不另建阶段性中间文档。当前缺口见 [四模块缺口报告](./docs/research-modules-gap-report.md)，完整文档入口见 [文档索引](./docs/README.md)。

## 产物如何衔接

最新工作目录设计：一篇论文对应一个用户在首页选择的工作目录，四模块共享该目录中的 `topic/`、`experiment/`、`writing/`、`submission/`。对话窗口显示项目简述和产物链接；统一“从工作目录载入 Demo”按钮读取目录中的示例文件。此能力尚待实现，文件格式、视频异常检测示例与实施清单见 [TODO 第 14–18 节](./docs/four-module-workflow-migration-todo.md#14-最新产品决定一篇论文一个工作目录)。

- 同一项研究始终使用同一个 `projectId`。
- 每次检索、生成、实验、写作或审稿都是一个独立 `runId`，失败重试也创建新 run。
- CSV、PDF、BibTeX、Markdown、PNG、TeX 等文件完成校验后获得独立 `artifactId` 和 SHA-256。
- 下游 run 通过 `inputArtifactIds` 显式选择输入，manifest 保存当时输入的 ID、角色、来源 run 和校验和。
- Codex 对话用于执行，不作为科研数据的唯一存储；即使切换会话，Workflow 仍可从 artifacts 恢复上下文。
- Demo 也必须通过相同的 project/run/artifact 链导入，并标记 `mode=simulated`、`simulated=true`，不能直接把数据塞进 localStorage。

## 上游与许可

基于 [LimLLL/codex-webui](https://github.com/LimLLL/codex-webui) 二次开发，使用 AGPL-3.0-or-later，见 [LICENSE](./LICENSE)。完整安装与能力说明见 [docs/codex-webui.md](./docs/codex-webui.md)，更多资料见 [文档索引](./docs/README.md)。
