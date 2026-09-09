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

pnpm start:dev          # 后端，默认 8172
cd web && pnpm dev      # 前端，http://localhost:5173
```

打开 http://localhost:5173 ，用 `.env` 里的 `WEBUI_API_KEY` 登录 WebUI。

要用 GPT 账号跑 Codex：进入 **设置 → 账户**，选择 **ChatGPT**，点「开始设备登录」，在打开的网页里用 ChatGPT 账号完成授权。

更完整的安装、Docker、环境变量和功能说明见 [docs/codex-webui.md](./docs/codex-webui.md)（英文：[docs/codex-webui.en.md](./docs/codex-webui.en.md)）。

## 上游项目

本项目基于 [LimLLL/codex-webui](https://github.com/LimLLL/codex-webui) 二次开发。
