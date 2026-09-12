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

首次初始化会创建根目录 .env，生成并打印 WEBUI_API_KEY，用它登录 WebUI；这不是 ChatGPT 密码。请保留自己的配置，不提交 .env。

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

## 上游与许可

基于 [LimLLL/codex-webui](https://github.com/LimLLL/codex-webui) 二次开发，使用 AGPL-3.0-or-later，见 [LICENSE](./LICENSE)。更多资料见 [文档索引](./docs/README.md)。
