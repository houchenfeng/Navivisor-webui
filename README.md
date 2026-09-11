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

## 快速开始

需要 Node.js ≥ 20、pnpm ≥ 9，以及已安装的 Codex CLI。

```bash
pnpm install
cd web && pnpm install && cd ..

cp .env.example .env
# 编辑 .env，至少设置 WEBUI_API_KEY（Web 登录密钥，不是 ChatGPT 账号）
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
| 开题 | `/research/topic` | 填方向 → 试检索（OpenAlex）；Step2/3 暂为占位 |
| 实验 | `/research/experiment` | 导入 SAM Demo → 模拟执行 → 查看/下载成果 |
| 写作 | `/research/writing` | 填入实验素材 → 任意跳步 → AI 生成走 Codex |
| 投稿 | `/research/submission` | 走完审稿 Demo（默认本地 mock） |

写作 AI 需 Codex 已登录；PDF 请下载 zip 后本地编译。  
缺口清单：[docs/research-modules-gap-report.md](./docs/research-modules-gap-report.md)。文档索引：[docs/README.md](./docs/README.md)。

## 上游项目

本项目基于 [LimLLL/codex-webui](https://github.com/LimLLL/codex-webui) 二次开发。完整安装与能力说明见 [docs/codex-webui.md](./docs/codex-webui.md)。
