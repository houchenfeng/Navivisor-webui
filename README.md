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

需要 Node.js ≥ 20、pnpm ≥ 9，以及已安装的 Codex CLI。

```bash
pnpm install
cd web && pnpm install && cd ..

cp .env.example .env
# 编辑 .env，至少设置 WEBUI_API_KEY（Web 登录密钥，不是 ChatGPT 账号）
# 开题检索与核心文献 PDF 下载还需要配置自己的 OpenAlex Key：
# OPENALEX_API_KEY=...
# Windows 建议设置 CODEX_BIN 指向本机 codex.exe

pnpm start:dev          # 后端，默认 8172
cd web && pnpm dev      # 前端，常见 http://localhost:5173 或 5174
```

打开前端地址，用 `.env` 里的 `WEBUI_API_KEY` 登录。

要用 GPT 账号跑 Codex：进入 **设置 → 账户**，选择 **ChatGPT**，完成设备登录授权。

## 简要使用说明

登录后从侧栏进入科研模块（首页：`/research/home`）：

| 模块 | 路径 | 怎么用 |
|---|---|---|
| 首页 | `/research/home` | 四模块入口；底栏卡片为 Demo |
| 开题 | `/research/topic` | 填方向 → OpenAlex 试检索 → 候选课题 → 核心文献 |
| 实验 | `/research/experiment` | 导入 SAM Demo → 模拟执行 → 查看/下载成果 |
| 写作 | `/research/paper` | 填入实验素材 → 任意跳步 → AI 生成走 Codex |
| 投稿 | `/research/submit` | 走完审稿 Demo（默认本地 mock） |

写作 AI 需 Codex 已登录。第 10 步可由后端调用本机 LaTeX 编译 PDF；也可下载包含官方模板文件的 zip 后离线编译。页面中的模拟结果必须视为教学 Demo，不能作为真实论文证据。

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

## OpenAlex 开题检索

当前 `topic` 版本已接通开题检索的实际后端链路：

```text
页面 -> POST /api/research/topic/first-search
     -> 后端生成 OpenAlex OQL
     -> OpenAlex API
     -> 去重、保存 CSV 和检索记录
     -> Codex 生成三个待核验候选课题
     -> 用户确认分类后检索核心文献
     -> 核心文献打包并尝试获取合法 OA PDF
```

后端 `.env` 中配置：

```env
OPENALEX_API_KEY=你的OpenAlex_API_Key
```

API Key 只在后端使用，不能写入前端源码、浏览器存储、提交记录、日志、CSV、BibTeX 或截图。

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

## 上游项目

本项目基于 [LimLLL/codex-webui](https://github.com/LimLLL/codex-webui) 二次开发。完整安装与能力说明见 [docs/codex-webui.md](./docs/codex-webui.md)。

## 两个对话的合并改动记录

两个 Codex 对话使用的是同一个工作目录：`C:\Navivisor-webui-main-clean`。以下内容已经出现在当前 `topic` 工作区中；它们尚未提交到远端，也没有修改 `main`。

### 对话一：开题检索、核心文献与论文 LaTeX

- 完成开题阶段的 OpenAlex 自适应检索链路：生成 OQL，按 `focused`、`balanced`、`broad` 分层调整检索范围，分页获取并去重论文。
- 支持候选课题生成、用户确认后进入核心文献检索，以及 CSV、BibTeX、检索记录和合法 OA PDF 的打包。
- 接入 OpenAlex Content API PDF 下载逻辑。API Key 只由后端使用；没有可验证 OA 内容的论文保留元数据，不伪造 PDF。
- 优化写作页面的检索/生成数据衔接，并保留课题、实验素材、文献和图片的来源边界。
- 接入 CVPR 官方 Author Kit 的本地 LaTeX 编译：后端提供 `/api/research/writing/compile`，前端第 10 步可以下载包含模板的文章包或请求生成 PDF。
- README 已补充 MiKTeX、TeX Live、`pdflatex`、`bibtex` 的安装和离线编译说明。

主要涉及：

`src/research-writing/`、`src/app.module.ts`、`src/main.ts`、`web/src/components/research-writing/components/writing/Step9Export.tsx`、`web/src/components/research-writing/lib/cvprTex.ts`、`web/public/cvpr-template/`。

### 对话二：实验说明到 CVPR 算法流程图

- 在 `research-writing` Skill 中新增 `generate-algorithm-flowchart` action。
- 规定以实验详细说明 Markdown 和明确声明的 artifact 为唯一科学依据，先提取结构化 `flowchart-spec.json`，再生成提示词和确定性的 SVG/PNG 草稿。
- 增加流程图结构校验要求：检查节点、边、方向、分支、融合、标签和证据；证据不足时返回 `needs_input`，不允许猜测算法结构。
- 设计 CVPR 风格成图流程：只有草稿通过结构检查后才调用账户提供的 ImageGen；生成失败时如实记录 `unavailable` 或 `needs_credentials`。
- 增加拓扑保持、精确标签、二次修正、图片元数据和 `paper-figure` artifact 的要求，避免把漂亮但错误的图片写入论文。
- 新增无依赖的流程图草稿渲染脚本和 Skill 评估样例。
- 将写作图片生成请求接入 Research Workflow 的 run/artifact 追踪边界，要求记录输入版本、提示词、模型和生成结果。

主要涉及：

`research-skills/research-writing/SKILL.md`、`research-skills/research-writing/references/algorithm-flowchart-generation.md`、`research-skills/research-writing/scripts/render_flowchart_draft.mjs`、`research-skills/research-writing/evals/`、`web/src/components/research-writing/components/writing/Step5Algorithm.tsx` 及相关 Workflow 客户端代码。

### 当前状态与验证边界

- 当前分支：`topic`；`HEAD` 与 `origin/topic` 仍为原有提交，以上新增内容主要是本地未提交改动。
- 已验证：后端 Nest 构建、前端 Vite 生产构建、CVPR 官方模板 smoke test，以及后端 LaTeX 编译接口返回有效 PDF。
- VGGT 完整 CVPR 源码已使用本地 MiKTeX 独立编译验证，但这不等于写作页面已经支持直接导入完整 `.tar.gz`/`.tex` 工程。
- 算法流程图 Skill 的规范、脚本和前端接入已在目录中；ImageGen 的真实调用、最终图片质量和完整 artifact 闭环仍需单独运行验收。
- 当前未执行 commit、push、PR 合并或 `main` 修改。

## Skill 清单与来源

以下路径均相对于仓库根目录 `C:\Navivisor-webui-main-clean`。

### 项目内自研/本次对话产生或修改的 Skill

| 类型 | Skill 名称 | 路径 | 作用 |
|---|---|---|---|
| 开题阶段 Skill | `research-topic` | `research-skills/research-topic/SKILL.md` | 根据声明的研究输入和文献证据生成可追溯的候选研究方向。 |
| 论文写作优化 Skill | `research-writing` | `research-skills/research-writing/SKILL.md` | 负责论文草稿、改写、翻译、渲染、配图和写作产物管理；要求所有内容有来源依据，明确待核验项。 |
| 流程图 action | `generate-algorithm-flowchart` | `research-skills/research-writing/references/algorithm-flowchart-generation.md` | `research-writing` Skill 内的算法流程图动作：从实验 Markdown 提取证据，生成流程图规格、提示词和确定性草稿，再进行 CVPR 风格成图。它是 action，不是独立的 `SKILL.md`。 |

配套文件：

- 流程图草稿脚本：`research-skills/research-writing/scripts/render_flowchart_draft.mjs`
- Skill 评估样例：`research-skills/research-writing/evals/evals.json`
- 实验阶段 Skill：`research-skills/research-experiment/SKILL.md`
- 投稿阶段 Skill：`research-skills/research-submission/SKILL.md`

其中，`research-writing` 是本项目中专门用于优化论文内容和论文配图流程的 Skill；算法流程图 action 是它的扩展能力，不应单独当作一个完整 Skill 安装。

### GitHub 上找到的外部项目或 Skill

本次曾检查 GitHub 上可用于论文写作和科研工作流的现有项目，但没有把外部 Skill 原样安装到本仓库，也没有在运行时依赖一个未记录来源的 GitHub Skill。当前仓库中的 `research-topic`、`research-writing` 及流程图 action 均属于项目内的工作流实现，不应标记为 GitHub 第三方 Skill。

本项目的上游 WebUI 来源是 [LimLLL/codex-webui](https://github.com/LimLLL/codex-webui)，它是基础 WebUI 项目，不是本项目的论文优化 Skill。GitHub 仓库来源和二次开发关系见 [上游项目](#上游项目)。
