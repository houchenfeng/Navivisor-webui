# Navivisor 全项目测试与 Bug 记录

> **用途**：对首页 / 开题 / 实验 / 写作 / 投稿 / Research Workflow / 鉴权与工程测试做一轮缺陷盘点；每条给出简要改法。  
> **盘点日期**：2026-09-12  
> **分支基线**：`feat/writing-workflow-unification`（含真实运行配置 `083661b` 之后）  
> **方法**：代码走读 + 自动化测试 + 对照产品文案（「四模块共用 projectId」等）  
> **说明**：本文是测试账本，不替代 `four-module-workflow-migration-todo.md` 的实施 TODO。

## 1. 自动化验证快照

| 命令 | 结果 |
|---|---|
| `pnpm exec vitest run` | **320 passed / 4 failed**（1 个文件失败：`src/files/files.service.spec.ts`） |
| `pnpm exec tsc -p tsconfig.build.json --noEmit` | 通过 |
| `cd web && pnpm exec tsc -b` | 通过 |

### 1.1 失败单测（环境相关，Windows）

| ID | 用例 | 现象 | 简要改法 |
|---|---|---|---|
| T1 | `FilesService` 拒绝 workspace 外创建/复制/加根 | 断言期望 reject，实际 resolve（本机 home 常被当作允许根） | 单测用独立临时目录作唯一 `workspaceRoots`，不要依赖「home 外」假设；或在 Windows CI 跳过并标注 |
| T2 | `deletePath` 删除 symlink | `EPERM` 无法创建 symlink | Windows 无开发者模式时跳过 symlink 用例，或用 junction / mock `fs.symlink` |

---

## 2. Bug 清单（按严重度）

### P0 — 合入 / 演示前应修

| ID | 模块 | 问题 | 如何复现 | 简要改法 |
|---|---|---|---|---|
| B01 | 跨模块 | 首页声称「四模块共用同一 projectId」，写作实际另建项目 | 首页注册工作目录 → 写作点 AI 生成 → 后端出现名为 `Navivisor Writing` 的托管项目，与 workspace `projectId` 不同 | `qwen.ts` / `translate.ts` 的 `ensureWritingProjectId` 改为优先读 `useResearchProjectStore`；无项目则提示回首页注册 |
| B02 | 跨模块 | 开题 / 实验 / 投稿也不消费共享 `projectId` | 注册 workspace 后各模块状态仍在私有 store / 旧 topic API / mock | 各模块读写统一 store；产出走 workspace/artifact API |
| B03 | 实验 | 「真实运行」模式卡文案暗示会立刻执行命令占 GPU | 第三步看「真实运行」卡片与免责声明 | 改为「配置真实运行目标（执行能力尚未接入）」；免责声明与第四步披露对齐 |
| B04 | 实验 | 步骤条 / 页脚「下一步」可绕过免责与配置校验 | 第三步不勾声明，点步骤条进第四步；或第四步真实模式未填 SSH 仍点「下一步」进执行 | `go()` 统一门禁；不满足时禁用步骤条与页脚前进 |

### P1 — 易误导或功能残缺

| ID | 模块 | 问题 | 如何复现 | 简要改法 |
|---|---|---|---|---|
| B05 | 实验 | 真实配置默认 `./experiment/...`，未预填已注册 workspace | 选真实运行 → 第四步看工作目录默认值 | 进入真实配置时用 `rootPath + /experiment/{code,datasets,results}` 预填；无项目则禁用并引导注册 |
| B06 | 实验 | 真实路径点「查看成果模板」会 `completed=true`，成果页仍是模拟表 +「模拟」徽章 | 真实模式走完执行页进成果 | 拆 `configConfirmed` / `runCompleted`；真实未跑时标题写「成果模板（未执行）」 |
| B07 | 实验 | 顶栏固定「Demo · 离线模拟」，与可选真实模式并存 | 任意选真实运行后看页眉 | 按 `runMode` 切换徽章文案（如「配置中 · 执行未接入」） |
| B08 | 首页 | zustand 水合后路径输入框不同步 | 刷新首页：卡片显示已注册项目，输入框为空 | `useEffect` 跟随 `project` 同步 path/title；注册成功写回规范化 `rootPath` |
| B09 | 写作 | 生图回退 artifact URL 无鉴权，`<img>` 易 401 | Codex 生图后走 `/api/research/projects/.../content` 直链 | 用 SDK 拉 blob → `createObjectURL`；或受控 query token（评估泄漏） |
| B10 | 写作↔实验 | 「填入实验素材」强行把实验标成已完成 | 实验未跑完，写作点填入素材 | 只读映射；不要改 `completed` / `disclaimerAccepted` |
| B11 | 投稿 | AI Assist 无 PDF 时静默空操作 | Step3 不上传文件点 AI Assist | toast「请先上传 PDF」；无文件禁用按钮 |
| B12 | Workflow | `projectId` 冲突错误提到 Move/Copy，前端无入口 | 复制含 `project.json` 的目录二次注册冲突 | 改错误文案为可操作说明，或补 Move/Copy API+UI |

### P2 — 体验 / 工程质量

| ID | 模块 | 问题 | 简要改法 |
|---|---|---|---|
| B13 | 实验 Intake | 「PDF 可用 / 仅摘要」用 `paperCount±3` 假统计 | 按 CSV `pdf_path` 是否非空计数，或删除该指标 |
| B14 | 开题 | 顶栏三步始终可点，可跳过试检索进占位页 | Step2/3 仅在试检索完成（或显式「预览占位」）后可进 |
| B15 | 实验 | `apiKeyHint` 随 zustand persist 进 localStorage | `partialize` 排除敏感字段；输入框禁止当密钥用 |
| B16 | 写作 | Step8 引用：`length` 不等就强制覆盖用户增删 | 仅在 bib 文本变化时同步，或加「从 bib 重新解析」按钮 |
| B17 | 写作 | `ensureWritingProjectId` 在 qwen/translate 各一份 | 抽公共 helper 并接共享 store（与 B01 一起做） |
| B18 | 投稿 | 流程页 OpenReview 感强，本地 mock 披露不够 | ProgressBar / 结果页常驻「本地 Demo mock」徽章 |
| B19 | 投稿 | `VITE_SUBMISSION_API_BASE_URL` 远程 fetch 无 Authorization | 复用 `getAuthorizationHeader()`，或文档标明仅教学公开 API |
| B20 | 实验 | `RunPage` 完成 effect 依赖不全 | 补 `setFields` 依赖，或在进度到 100 时一次性写入 |
| B21 | 死代码 | `research-submission/services/apiService.ts` 仍写死 `localhost:3001` | 确认无引用后删除；CI 扫描 `localhost:3001`/`cpolar` |
| B22 | 产品缺口 | 开题 Step2/3、在线 LaTeX、投稿 Workflow、真训练 runner 未实装 | 见 `research-modules-gap-report.md` / migration TODO；演示时必须标 Demo |

---

## 3. 分模块冒烟清单（建议手工再测）

### 3.1 环境与登录

- [ ] `pnpm ensure:env` / 首次 `start:dev` 打印并写入 `WEBUI_API_KEY`
- [ ] 前端用该密钥登录；改 `.env` 密钥后旧 JWT 失效需重登
- [ ] Windows：`CODEX_BIN` 指向内置 `codex.exe`；设置 → 账户 ChatGPT 设备登录

### 3.2 首页工作目录

- [ ] 注册允许根内路径成功；非法路径失败信息可读
- [ ] 「载入 Demo」幂等（同 manifest 不重复 artifact）
- [ ] 刷新后 `CurrentPaperCard` 与路径输入一致（当前有 B08）

### 3.3 开题

- [ ] Step1 OpenAlex 试检索（需网络）
- [ ] 取消 / 失败状态真实展示，不伪造文献
- [ ] Step2/3 明确为占位（当前可跳过，见 B14）

### 3.4 实验

- [ ] 模拟全流程：模式 → 实验配置 → 执行进度 → 成果（模拟徽章）
- [ ] 真实运行：可选；配置本机/SSH、算力、三目录、GPU、可选 API
- [ ] 确认门禁不可被步骤条绕过（当前有 B04）
- [ ] 真实路径不把模板表误标为已跑通（当前有 B06）

### 3.5 写作

- [ ] 填入实验素材 / 各步 AI 生成 / 翻译（需 Codex）
- [ ] 生图：成功落盘或明确 `needs_credentials`/`unavailable`
- [ ] 下载 tex/zip；「一键编译」提示未接入
- [ ] 确认写作 `projectId` = 首页项目（当前有 B01）

### 3.6 投稿

- [ ] 默认无 `VITE_SUBMISSION_API_BASE_URL` 时走本地 mock
- [ ] 审稿 / Rebuttal / decision 全流程可点完
- [ ] AI Assist 无 PDF 有提示（当前有 B11）

### 3.7 Research Workflow API（后端）

- [ ] `POST /api/research/workspaces/register`
- [ ] `POST /api/research/projects/:id/demo/load`（可对 `demo-packages/camera-vad-scene-memory` 拷贝目录）
- [ ] 坏 SHA / 依赖环返回明确 400
- [ ] agent-run 写 `.navivisor/runs/.../context.json`

---

## 4. 建议修复顺序

1. **B01 + B02 + B17**：统一 `projectId`（否则工作目录方案无法端到端成立）  
2. **B03 + B04 + B05 + B06 + B07**：实验真实运行披露与门禁（刚加的能力，误导成本高）  
3. **B08 + B09 + B10**：首页水合、写作生图鉴权、填入素材副作用  
4. **B11 + B18 + B19 + B21**：投稿体验与死代码清理  
5. **T1/T2**：把 FilesService Windows 单测标成环境条件，避免 CI 噪音  
6. **B22**：按 migration TODO 排真实 runner / LaTeX / 开题后两步

---

## 5. 相关文档

- `docs/four-module-workflow-migration-todo.md` — 工作目录 W1–W11 实施账本  
- `docs/research-modules-gap-report.md` — 四模块缺口（偏产品未完成）  
- `docs/four-module-test-bug-report.md` — 历史联测记录  
- `docs/demo-data-format.md` — Demo 文件格式  
- `README.md` — 首次安装与随机密钥

---

## 6. 修订记录

| 日期 | 说明 |
|---|---|
| 2026-09-12 | 初版：自动化 320/324、跨模块 projectId、实验真实运行、写作/投稿/首页等共 22+2 条 |
