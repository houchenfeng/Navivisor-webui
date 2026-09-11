# 科研四模块缺口与测试记录

> **用途**：记录四模块当前已修问题、可用能力与未实装缺口，便于联调与排期。  
> 更新日期：2026-09-11  
> 范围：首页 / 开题 / 实验 / 写作 / 投稿，以及统一 Research Workflow ↔ Codex

## 1. 本次已修复

| 问题 | 处理 |
|---|---|
| 写作 AI 生成被旧 localhost 阻断 | 改为 Research Workflow `agent-runs` → Codex（`writing.draft` + `$research-writing`） |
| 写作翻译同样阻断 | 同上路径接入 Codex |
| 写作算法配图「生成图片」阻断 | 接入 Codex 生图能力（依赖账号是否开通 image gen） |
| 投稿默认打到失效 cpolar | `apiClient` 默认改本地 Demo mock；远程需设 `VITE_SUBMISSION_API_BASE_URL` |
| 引用步骤用 `useMemo` 写副作用 | 改为 `useEffect` |
| 实验消融表 React key 冲突 | 改为 `${rowIndex}-${cellIndex}` |
| PDF「一键编译」假装可调旧服务 | 明确提示未接入，引导下载 zip 本地编译 |
| 首页 arXiv / 旅程易被当成真实数据 | 标注 **Demo** |

## 2. 当前可用（可联调）

| 模块 | 能力 | 说明 |
|---|---|---|
| 首页 | 四入口跳转 | 底栏三卡为静态 Demo |
| 开题 | Step1 OpenAlex 试检索 | 需后端 + 登录；Step2/3 仅占位页 |
| 实验 | 全流程离线 Demo | 模拟结果，非真实训练；「本地真实运行」禁用 |
| 写作 | 素材上传 / 填入实验素材 / 自由跳步 | 本地 `localStorage` |
| 写作 | AI 生成各章节、翻译 | 走 Codex；需后端 Codex 已登录 |
| 写作 | 配图上传 / URL /（尝试）AI 生图 | 生图依赖 Codex 图片工具 |
| 写作 | 下载 tex / zip | 可用 |
| 投稿 | 全流程 UI + 本地 mock 审稿 | 不依赖外网；非真实 OpenReview |

## 3. 未实装 / 仍缺口（需后续排期）

### P0（合入 main / 真用前建议补齐）

1. **写作在线 PDF 编译**  
   - 现状：只能下载 zip，无 CVPR 模板服务端编译  
   - 建议：`writing.final` agent-run + 确定性 LaTeX 渲染，或独立 compile worker

2. **投稿接入统一 Research Workflow**  
   - 现状：本地 mock，未走 `$research-submission` / artifact  
   - 建议：按 `docs/four-module-workflow-migration-todo.md` TODO-C4

3. **写作/实验/开题 artifact 贯通**  
   - 现状：写作 instructions 内嵌 WritingData；实验 MD 仅前端共享常量；开题检索结果未成 artifact  
   - 建议：开题确认 → `confirmed-topic`；实验交付 → `experiment-results`；写作 `inputArtifactIds` 引用它们

4. **删除遗留死代码**  
   - `research-submission/services/apiService.ts`（仍写死 `localhost:3001`，当前无引用）  
   - 写作侧 `generateWithQwen` 命名（可逐步改成 `generateWritingSection`）

### P1（产品完整度）

| 模块 | 缺口 |
|---|---|
| 开题 Step2 | 候选课题比较 / 取向选择 — `FuturePage` |
| 开题 Step3 | 核心文献包、PDF、BibTeX、实验方案 — `FuturePage` |
| 实验 | 真实本地训练 / GPU 运行 |
| 实验 | 产出写入 Research Artifact，而非仅 store + 静态 MD |
| 写作 | 章节生成的 run 状态 UI（进度、取消、失败重试） |
| 写作 | 生图失败时的凭证/额度提示细化（`needs_credentials`） |
| 首页 | 真实「最近项目」、真实 arXiv 订阅、真实旅程统计 |
| 投稿 | 真实 PDF 解析、真实审稿模型、OpenReview 对接 |

### P2（体验 / 工程质量）

- 写作与翻译各自维护 `ensureWritingProjectId`，可抽公共 helper  
- 投稿 `aiService.ts` 仍是 delay + mock 文案（表单 AI Assist 部分路径）  
- 实验 Demo 与写作交接缺少「去写作」一键跳转（写作侧已有「填入实验素材」）  
- Research Workflow 前端尚无通用 `useResearchRun` / SSE；写作目前轮询 turn

## 4. 环境依赖（联调检查清单）

- [ ] 后端 `pnpm start:dev` 在跑，且 `CODEX_BIN` 指向本机 `codex`  
- [ ] Codex 已登录（聊天能正常 turn）  
- [ ] 前端 `pnpm dev`，写作 AI 生成不出现旧 localhost 报错  
- [ ] 投稿不设置 `VITE_SUBMISSION_API_BASE_URL` 时，提交应走本地 mock  
- [ ] 开题试检索：后端可访问 OpenAlex（网络）

## 5. 建议下一步（按性价比）

1. 写作 run 状态条 + 取消按钮（用户感知最强）  
2. 开题 first-search 结果落 artifact，供写作引用  
3. PDF：最小可用「套模板 zip」下载（含 CVPR cls），再做在线编译  
4. 删掉投稿 `apiService.ts` / 扫描残留 cpolar、localhost:3001

## 6. 相关文档

- `docs/four-module-workflow-migration-todo.md`  
- `docs/writing-workflow-data-model-unification-plan.md`  
- `docs/four-module-test-bug-report.md`
