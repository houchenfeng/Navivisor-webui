# 启航科研智能体 · Navivisor

面向科研新手的工作台：从开题、实验、论文写作到会议投稿，四个模块共用同一篇论文的工作目录。同时保留 Codex 对话、文件、终端和工具管理能力。

## 安装与启动

需要 Node.js 22.12+、pnpm 10（仓库锁定 10.18.3）。后端为 NestJS，前端为 React/Vite，数据使用 SQLite 和本地文件目录。

```bash
git clone https://github.com/houchenfeng/Navivisor-webui.git
cd Navivisor-webui
pnpm install
pnpm --dir web install
pnpm ensure:env
```

首次初始化会创建根目录 `.env`。请保留自己的配置，不要把 `.env` 提交进仓库。

打开两个终端，在仓库根目录分别运行：

```bash
pnpm start:dev
```

```bash
pnpm --dir web dev
```

打开前端终端显示的地址，默认 [localhost:5173](http://localhost:5173)；后端默认 8172。前端已代理 API 与 WebSocket。后端改端口时，同步修改 `web/vite.config.ts` 的代理目标。

写作、翻译等生成能力依赖 Codex。在「设置 → 账户」完成 ChatGPT 设备登录；也可按账户配置使用 `OPENAI_API_KEY`。后端须能启动 Codex CLI；找不到可执行文件时，在 `.env` 把 `CODEX_BIN` 设为本机实际路径。Windows 可参考 `.env.example` 中的路径示例。

| 可选配置 | 用途 |
|---|---|
| PORT | 后端端口，默认 8172 |
| CODEX_BIN / CODEX_HOME | Codex 可执行文件与运行数据目录 |
| WEBUI_DB_PATH | SQLite 数据库路径 |
| NAVIVISOR_RESEARCH_WORK_ROOT | 未绑定用户目录时的科研托管根目录 |
| OPENALEX_API_KEY | 开题文献检索（仅后端调用 OpenAlex，不要写入前端） |
| LATEX_COMMAND | 本机 LaTeX 可执行文件；默认寻找 `pdflatex` |

完整配置见 [.env.example](./.env.example)，容器部署见 [Docker 说明](./docs/docker.md)。

---

## 科研模块使用说明

四个模块按顺序构成一条完整链路：**开题探索 → 实验验证 → 论文写作 → 投稿启航**。它们读写同一份工作目录，不要为同一篇论文建两套路径。

### 开始之前：注册论文工作目录

1. 打开 [科研首页](http://localhost:5173/research/home)（`/research/home`）。
2. 在「新论文工作目录」中选择**服务端可访问**的文件夹并注册。
3. 目录需要落在 Files 服务允许的工作区范围内。注册成功后，四个模块都会把课题、方案、稿件和审稿材料写进这个目录。
4. 侧栏可在「开题 / 实验 / 写作 / 投稿」之间切换；刷新后仍会记住当前论文。

一篇论文所有数据都在工作目录中，结构大致如下：

```text
paper-workspace/
  topic/         研究方向、文献表、核心 PDF、BibTeX
  experiment/    方案、配置、指标、结果说明、效果图
  writing/       章节草稿、LaTeX、参考文献、论文 PDF
  submission/    投稿信息、审稿意见、作者回复
```

---

### 一、开题探索（`/research/topic`）

**做什么：** 把模糊的兴趣收成一个可做的课题，并交出核心参考文献，供实验和写作使用。

**怎么用：**

1. 阅读开题说明后，在第一步填写 **研究方向**（必填），例如「视频异常检测」「语义分割」。可选填写研究目标或场景约束，例如「和视觉语言模型结合」「监控摄像头场景」。
2. 发起检索。系统用 OpenAlex 按自适应策略查文献（先收窄、不够再放宽），并给出相关论文列表。真实检索需在后端配置 `OPENALEX_API_KEY`。
3. 查看研究态势后，进入候选课题页：通常会得到若干交叉课题。点选最合适的一条并确认。
4. 进入 **核心参考文献**：系统会继续收敛最相关的文献，尽量拉取可获取的全文 PDF，并整理交接材料（文献表、BibTeX、开题说明）。
5. 核对名单与全文是否对齐后，从页面底部进入实验模块。

开题产出会写入 `topic/`，实验模块会读取其中的确认课题、核心文献和交接说明。

---

### 二、实验验证（`/research/experiment`）

**做什么：** 从核心文献出发，形成可执行的创新点方案，完成本机或远程实验（或整理已有结果），把表格、架构图和结果说明交给写作。

**步骤：**

1. **课题与文献**
   核对开题交接过来的核心文献和 PDF。名单对不上，后面的方案会对不上。
2. **方案确认**
   根据文献整理若干候选创新点。每一条应写清：Baseline、数据、指标、改动位置、训练与评测协议、通过/不通过的标准。会议论文通常最终保留约三个能独立验证的创新点。点开卡片可看完整方案，确认后再继续。
3. **模式选择**
   - **模拟运行**：按已确认方案整理配置与结果材料（适合先走通流程或已有结果只需归档）。
   - **真实运行**：填写本机或 SSH 算力；SSH 会在实验终端同步命令与输出。
4. **实验配置**
   补全代码目录、数据目录、结果目录；真实运行还要填主机、用户、端口等。
5. **实验执行**
   启动运行或确认配置。真实运行可在嵌入终端里看会话。
6. **成果交付**
   查看主结果表、消融、架构说明、效果图，下载 Markdown。完成后从底部进入写作模块。

实验产出在 `experiment/`（`plan.md`、`results.md`、指标 CSV、架构与对比图等）。写作页可以一键填入这些材料。

---

### 三、论文写作（`/research/paper`）

**做什么：** 按 CVPR 风格把实验成果写成中英文章，并导出 LaTeX / PDF。章节生成依赖 Codex 已登录。

**十步流程：**

| 步 | 名称 | 说明 |
|---|---|---|
| 1 | 上传素材 | 填写课题名称；放入实验细节、实验结果、BibTeX。可一键填入实验模块已有材料。 |
| 2 | 标题与摘要 | 写英文标题与摘要，需要时生成中文对照。 |
| 3–4 | 引言 / 相关工作 | 结合核心文献撰写；可用 AI 辅助生成或改写。 |
| 5 | 算法介绍 | 写方法章节；可生成或替换架构流程图、示意图。 |
| 6 | 实验结果 | 写实验章节，挂结果表与效果图。 |
| 7 | 讨论和展望 | 局限与后续工作。 |
| 8 | 引用文献 | 整理 `.bib` 条目。 |
| 9 | 全文预览 | 检查中英文稿是否齐套。 |
| 10 | 生成 LaTeX | 导出 `main.tex`，或一键编译 CVPR 格式 PDF；也可下载 zip 离线编译。 |

最后一步可从页面底部进入投稿模块。导出包会带上官方模板文件（`cvpr.sty`、`preamble.tex`、`ieeenat_fullname.bst`）。

**本机编译 PDF：** 需安装 MiKTeX / TeX Live / MacTeX，并保证 `pdflatex`、`bibtex` 在 PATH 中。检查：

```bash
pdflatex --version
bibtex --version
```

找不到 `pdflatex` 时页面会提示安装环境。可在 `.env` 设置 `LATEX_COMMAND`。离线编译示例：

```bash
pdflatex -interaction=nonstopmode -halt-on-error main.tex
bibtex main
pdflatex -interaction=nonstopmode -halt-on-error main.tex
pdflatex -interaction=nonstopmode -halt-on-error main.tex
```

---

### 四、投稿启航（`/research/submit`）

**做什么：** 按顶会（界面为 CVPR / OpenReview 风格）走完提交、初审、作者回复和最终决定。

**六步流程：**

1. **OpenReview 首页**
   了解会议入口与截稿信息。
2. **会议页**
   进入 CVPR 投稿入口。
3. **投稿表单**
   上传论文 PDF；标题、作者、关键词、摘要、TL;DR 可用 AI 辅助填写。字段默认留空，点对应按钮后再写入。若已载入当前论文的工作数据，上传 PDF 与 AI 辅助会读取该论文目录中的稿件与元数据（英文）。填完后提交。
4. **初审**
   阅读三位审稿人的意见（创新性、实验、写作与格式等）。评分说明侧栏默认收起，需要时再打开。
5. **Rebuttal**
   逐条回复 weakness 与 question；可用 AI 辅助生成回复草稿，再自行修改后提交。
6. **最终结果**
   查看决定与二轮分数。若接收，可上传 camera-ready PDF，并用 AI 辅助写致谢。

审稿与回复材料保存在 `submission/`。这是流程演练，不会把稿件提交到真实的 OpenReview 或 CVPR。

---

## Codex 对话与工具

侧栏可新建或打开 Codex 对话，选择模型与工作目录后发送任务。主要包括：多会话与流式回复、分叉与归档、文件浏览与差异、终端与审批、Skills / MCP / 插件、用量与诊断。协议见 [REST API](./docs/rest-api.md)、[终端](./docs/terminal.md)、[审批](./docs/approval.md)。

科研模块的文本生成、翻译和配图通过 Research Workflow 调用当前登录的 Codex。OpenAlex 检索、文件解析、校验和、LaTeX 编译属于确定性工具，由后端执行。

## 质量检查

```bash
pnpm build
pnpm test
pnpm --dir web build
pnpm --dir web test
pnpm --dir web lint
```

## Skill 清单

路径相对于仓库根目录。

| 阶段 | Skill | 路径 |
|---|---|---|
| 开题 | `research-topic` | `research-skills/research-topic/SKILL.md` |
| 实验 | `research-experiment` | `research-skills/research-experiment/SKILL.md` |
| 写作 | `research-writing` | `research-skills/research-writing/SKILL.md` |
| 投稿 | `research-submission` | `research-skills/research-submission/SKILL.md` |

算法流程图是 `research-writing` 内的动作，见 `research-skills/research-writing/references/algorithm-flowchart-generation.md`，不是单独安装的 Skill。

## 上游与许可

基于 [LimLLL/codex-webui](https://github.com/LimLLL/codex-webui) 二次开发，使用 AGPL-3.0-or-later，见 [LICENSE](./LICENSE)。更多资料见 [文档索引](./docs/README.md)。
