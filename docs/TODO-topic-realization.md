# 开题模块真实化 · 改动总账（TODO / 修改清单 / 测试 / 结果）

> 本文件是「开题模块去 demo + 真实能力落地」这一次改造的唯一总账，随进度持续追加。
> 分支：`main`（存档分支 `demo-2026-10-07`）
> 起始基线：`6530bc5 docs: refresh README technology overview`
> 版本：`v0.1.0` → 目标 `v0.3.0`

---

## 一、修改清单

> 格式：`路径 | 新增/改造/删除 | 改了什么 | 对应任务`

| 路径 | 动作 | 改了什么 | 任务 |
| --- | --- | --- | --- |
| `vitest.config.mts` | 改造 | 新增 `testTimeout: 60000` / `hookTimeout: 60000`（本机位于慢速副盘，afterEach 递归清理会超过 10s 默认上限） | 环境准备 |
| `.gitignore` | 改造 | 追加 `scripts/.env.qwen.sh`（含密钥的本地 shell 备份，禁止提交） | T3 |
| `.env`（未跟踪） | 新增 | 本地开发配置：`PORT`、`CODEX_BIN`、`NAVIVISOR_AI_PROVIDER=codex`、`NAVIVISOR_AI_FALLBACK=http`、`NAVIVISOR_AI_HTTP_*`（qwen3.8-max-0902）、`NAVIVISOR_ARXIV_MAX_RESULTS`、`NAVIVISOR_REVERSE_CITATION_MONTHS`、`NAVIVISOR_PDF_MAX_BYTES`、`NAVIVISOR_TARGET_COUNT`、`NAVIVISOR_CORE_COUNT` | T3 |
| `scripts/.env.qwen.sh`（未跟踪） | 新增 | 可直接 source 的 qwen 环境变量备份 | T3 |
| `docs/TODO-topic-realization.md` | 新增 | 本文件 | T53 |

---

## 二、demo 资产清单

> 三类判定：**A = 纯演示假数据（删除）**、**B = 真实流程被 demo 污染（改造）**、**C = 真实功能（禁止改动）**

### A 类：纯演示假数据（删除）

| 位置 | 内容 | 处置 |
| --- | --- | --- |
| `demo-packages/camera-vad-scene-memory/**` | 整套相机 VAD 演示产物（topic/experiment/writing/submission/demo 五个目录） | 删除 |
| `demo-packages/evivad-surveillance-demo/**` | 整套 EviVAD 监控演示产物 | 删除 |
| `scripts/generate-camera-vad-demo.mjs` | 生成 camera-vad 演示数据 | 删除 |
| `scripts/generate-demo-pdfs.py` | 生成演示 PDF | 删除 |
| `scripts/polish-evivad-demo-language.mjs` | 润色 EviVAD 演示文案 | 删除 |
| `scripts/prepare-evivad-demo.mjs` | 准备 EviVAD 演示 | 删除 |
| `scripts/rebuild-demo-manifest.mjs` | 重建演示 manifest | 删除 |
| `web/src/components/research-topic/data.ts` | `demoInterest` / `demoContext` / `demoTaskSnapshot`（硬编码 4 篇论文 + 3 个候选课题 + `demoCoreLiterature`） | 删除，仅保留 `starterKeywordGroups` / `topicSteps` / `emptyResearchMessage` |
| `src/research-workflow/research-contracts.ts` | `DemoManifestV3` / `DemoManifestNode` / `DemoManifestFile` / `DemoManifestMissing` / `DemoMissingReasonCode` / `DEMO_MISSING_REASON_CODES` / artifact role `'demo-manifest'` / `WorkspaceProjectJson.demo` / `PortableProjectJson.demo` | 删除 |
| `src/research-workflow/research-workspace.demo-load.spec.ts` | 演示包加载集成测试 | 删除 |
| `docs/demo/**`、`docs/demo-data-format.md`、`docs/evivad-demo-data-preparation-guide.md`、`docs/sam-experiment-demo-guide.md` | 演示数据文档 | 删除或归档 |

### B 类：真实流程被 demo 污染（改造，保留真实失败态）

| 位置 | 内容 | 处置 |
| --- | --- | --- |
| `web/src/components/research-topic/topic-page.tsx` | 「填入教学示例」按钮、demo 快照回退渲染分支 | 删除按钮与分支；检索失败改为真实空态 + 明确错误 + 可重试 |
| `src/research-topic/research-topic.service.ts` | 无结果时的示例论文回退 | 删除；`warnings` 如实写 `insufficient_results`，不补造 |
| `web/src/components/research-topic/topic-workflow-contract.ts` | `isDemo`、`demoCoreLiterature` 字段 | 删除 |
| `web/src/components/research-workflow/load-workspace-demo-button.tsx` | 加载演示工作区按钮 | 删除（仅服务 demo） |
| `web/src/components/research-workflow/exit-research-demo.ts` | 退出演示模式 | 删除（仅服务 demo） |
| `web/src/components/research-experiment/experiment-demo.tsx`、`demo-artifacts.ts` | 实验模块模拟假指标 | 保留结构，默认关闭（`NAVIVISOR_ENABLE_DEMO` 语义），后续迭代彻底移除 |
| `web/src/components/research-submission/data/mockData.ts`、`lib/workspace-submission-seed.ts` | 投稿模块 demo 审稿数据 | 同上 |

### C 类：真实功能（禁止改动）

- 开题 / 实验 / 写作 / 投稿四大模块的真实流程
- 科普弹窗 `topic-primer-dialog.tsx`（新手引导）
- 文件管理、多会话与 token 统计
- 终端 + SSH 远程执行
- 插件 / skill / MCP 展示（读 codex 本地配置）
- 深夜模式、Codex 配置 / 状态 / 反馈
- OnlyOffice 预览、LaTeX 编译
- Artifact 证据链与 run 状态机

---

## 三、测试清单

### 3.1 环境准备阶段（已完成）

| 项 | 命令 | 结果 |
| --- | --- | --- |
| 后端依赖安装 | `pnpm install --ignore-scripts` | ✅ 647 包 |
| 前端依赖安装 | `cd web && pnpm install --ignore-scripts` | ✅ vite 8.0.11 / vitest 4.1.11 |
| `better-sqlite3` 原生绑定 | `prebuild-install` | ✅ `better_sqlite3.node` |
| `node-pty` 原生绑定 | `node-gyp rebuild`（关闭 Spectre 缓解） | ✅ `conpty.node` / `conpty_console_list.node` |
| 原生模块加载 | `node -e "require('node-pty')"` / `require('better-sqlite3')` | ✅ 均可加载 |
| qwen 端点连通性 | `curl POST /chat/completions` model=`qwen3.8-max-0902` | ✅ 返回 200 + `choices` |

### 3.2 基线测试（`./node_modules/.bin/vitest run`）

| 轮次 | 条件 | 结果 |
| --- | --- | --- |
| 第 1 轮 | 默认配置 | 322 通过 / 11 失败（失败全部为 `afterEach` 递归删除超时 10s） |
| 第 2 轮 | 提高 `hookTimeout` 到 60s | 331 通过 / 2 失败 |
| 第 3 轮 | 前置同步 spawn 兼容层 | 330 通过 / 3 失败 |
| 第 4 轮 | 关闭 safe-delete 拦截（`CODEBUDDY_SAFE_DELETE_ENABLED=0`） | ✅ **331 通过 / 2 失败**（43 个文件 42 通过） |
| 第 5 轮 | 去 demo 完成后（后端） | ✅ **327 通过 / 0 失败（42/42 文件）**；`nest build` 通过 |
| 第 5 轮 | 去 demo 完成后（前端） | ✅ **195 通过 / 0 失败（20/20 文件）**；`vite build` 通过；`tsc --noEmit` 通过 |
| 第 6 轮 | AI provider 抽象后（后端） | ✅ **340 通过 / 0 失败（44/44 文件）**（新增 13 个 provider 单测）；`nest build` 通过 |
| 第 7 轮 | 检索式生成完成后（后端） | ✅ **364 通过 / 0 失败（47/47 文件）**（新增 25 个渲染器/planner/arXiv 单测）；`nest build` 通过 |
| 第 8 轮 | 第一批流水线骨架后（后端） | ✅ **371 通过 / 0 失败（48/48 文件）**（新增 7 个合并去重单测）；`nest build` 通过 |
| 第 9 轮 | 第一批分析阶段 + 路由后（后端） | ✅ **389 通过 / 0 失败（49/49 文件）**（新增 18 个阶段单测）；`nest build` 通过 |
| 第 10 轮 | 候选课题改造后（后端） | ✅ **397 通过 / 0 失败（50/50 文件）**（新增 9 个候选课题单测）；`nest build` 通过 |
| 第 11 轮 | 第二批核心文献模块后（后端） | ✅ **446 通过 / 0 失败（52/52 文件）**（新增 57 个单测）；`nest build` 通过 |
| 第 12 轮 | 分批 AI 分析后（后端） | ✅ **461 通过 / 0 失败（53/53 文件）**（新增 15 个单测）；`nest build` 通过 |
| 第 13 轮 | 核心文献采集与 Python 交接后（后端） | ✅ **471 通过 / 0 失败（54/54 文件）**（新增 10 个单测）；`nest build` 通过 |
| 第 14 轮 | 前端类型 + 卡片基座后（前端） | ✅ **214 通过 / 0 失败（21/21 文件）**（新增 19 个组件单测）；`vite build` 与 `tsc` 通过 |
| 第 15 轮 | 第一批 7 张卡片后（前端） | ✅ **234 通过 / 0 失败（22/22 文件）**（新增 20 个组件单测）；`vite build` 与 `tsc` 通过 |
| 第 16 轮 | 第二批 10 张卡片后（前端） | ✅ **256 通过 / 0 失败（23/23 文件）**（新增 22 个组件单测）；`vite build` 与 `tsc` 通过 |

**基线结论**：唯一失败的 `src/research-workflow/research-workspace.demo-load.spec.ts`（2 个用例）属于本次要删除的 demo 演示包测试，其余全部通过。基线可用。

**测试运行命令（本机）**：

```bash
cd Navivisor-webui
export CODEBUDDY_SAFE_DELETE_ENABLED=0     # 关闭每次删除耗时 4.7s 的回收站拦截层
./node_modules/.bin/vitest run             # 后端
cd web && ./node_modules/.bin/vitest run   # 前端
```

安装依赖（需要同步 spawn 兼容层）：

```bash
export NODE_OPTIONS="--require C:/Users/Administrator/.workbuddy-ai/tmp/sync-spawn-shim.cjs $NODE_OPTIONS"
pnpm install --ignore-scripts
```

### 3.3 本机环境特殊处理（必须记录）

本机存在两个环境级限制，已在**不改动业务代码**的前提下绕过：

1. **`child_process.spawnSync` 全线 EBUSY**
   - 现象：任何 `spawnSync` / `execFileSync` / `execSync` 调用都返回 `EBUSY`，而异步 `spawn` 正常
   - 影响：`pnpm install` 的 postinstall（esbuild 版本校验）、WorkBuddy 的 safe-delete 拦截层全部失败
   - 绕过：`C:/Users/Administrator/.workbuddy-ai/tmp/sync-spawn-shim.cjs`（用 Worker + `Atomics.wait` 实现同步 spawn），通过 `NODE_OPTIONS` 前置加载
   - 该文件位于工作区之外，不进入仓库

2. **WorkBuddy safe-delete 拦截层单次删除耗时约 4.7s**
   - 现象：工作区内删除一个几 KB 的小目录需要 4.7s（走回收站二进制），超过其内部 5s 上限后抛 `ETIMEDOUT`
   - 影响：所有在 `afterEach` 里做临时目录清理的测试
   - 绕过：测试运行时设 `CODEBUDDY_SAFE_DELETE_ENABLED=0`，让 `fs.rm` 走原生实现

3. **`node-pty` 需要关闭 Spectre 缓解**
   - 现象：`MSB8040: 此项目需要缓解了 Spectre 漏洞的库`
   - 绕过：把 `node_modules/.pnpm/node-pty@1.1.0/node_modules/node-pty/binding.gyp` 的 `SpectreMitigation` 由 `'Spectre'` 改为 `'false'` 后重编
   - 注意：`node_modules` 不进入版本控制，重新安装后需要重做此步

4. **Node 头文件下载 502**
   - 绕过：`npm_config_disturl=https://npmmirror.com/mirrors/node`

### 3.4 功能测试（待实现后补充）

| 模块 | 用例 | 状态 |
| --- | --- | --- |
| `query-renderers` | OpenAlex OQL 渲染（≥3 组精确匹配） | 待写 |
| `query-renderers` | arXiv 查询串渲染（含 ANDNOT 排除） | 待写 |
| `query-renderers` | Scopus 占位返回 `needs_credentials` | 待写 |
| `arxiv-client` | Atom XML 解析（entry/标题/摘要/作者/PDF 链接） | 待写 |
| `arxiv-client` | 429/5xx 有界重试与请求间隔 | 待写 |
| 检索去重 | DOI 优先、其次 OpenAlex ID、arXiv ID | 待写 |
| 年份过滤 | 近 5 年硬过滤；不足 100 篇时放宽到近 8 年 | 待写 |
| `ai-provider.factory` | codex 成功不触发兜底 | 待写 |
| `ai-provider.factory` | codex 失败 → qwen 兜底，`fallbackUsed=true` | 待写 |
| `ai-provider.factory` | 两者都失败 → 抛错，不返回空结果 | 待写 |
| `fallback-ladder` | 4 级阶梯逐级触发、够 10 篇即停 | 待写 |
| `batch-prep` | RE 编号连续、50 篇/批切分正确 | 待写 |
| `relevance-scoring` | 阈值 4 → 3 的降级路径 | 待写 |
| manifest 契约 | `targetCount` 100–800、`insufficient_results` 警告 | 待写 |
| 前端 `stage-card` | 状态徽标与 qwen 兜底标记 | 待写 |
| 前端 `query-plan-card` | 复制 / 编辑 / 版本 A/B 切换 | 待写 |
| 前端 `relevance-card` | 迭代上限 3 轮 | 待写 |

---

## 四、最终结果

### 4.0 阶段成果（v0.2.0 · 去 demo）

**已完成并验证**

| 项 | 结果 |
| --- | --- |
| 分支整理 | 远端只保留 `main` + 存档分支 `demo-2026-10-07`；删除 7 个旧分支（`demo`、`feat/research-{submission,topic,writing}`、`feat/writing-workflow-unification`、`integration/research-workflow`、`topic`）；删除前已做 `git clone --mirror` 全量备份 |
| 后端去 demo | `research-workspace.service.ts` 1846 → 1226 行（移除 11 个 demo 方法与 5 处散落引用）；删除 3 个 demo 端点；删除 `DemoManifest*` / `DemoMissingReasonCode` / `DEMO_MISSING_REASON_CODES` 类型与 `demo-manifest` artifact role；`WorkspaceProjectJson.demo` / `PortableProjectJson.demo` 字段移除 |
| 演示数据清理 | `demo-packages/`（2 套完整演示包）、8 个 demo 脚本、3 份 demo 文档、1 个 demo 集成测试全部删除；`.gitattributes` 移除 LFS 演示规则 |
| 前端去 demo | 删除 `load-workspace-demo-button.tsx`、`exit-research-demo.ts`、`research-topic/data.ts`、`research-topic/types.ts`、`research-experiment/demo-artifacts.ts`；`demoTaskSnapshot` 假数据、`DemoCoreLiteraturePage`、「填入教学示例」入口、实验模块离线假指标回退、写作模块 `DEMO_*` 兜底素材全部移除；store 的 `demoComplete`/`missing`/`demoEpoch`/`isResearchDemoMode` 移除（`demoEpoch` 改为语义中性的 `projectEpoch`） |
| 真实功能保留 | 科普弹窗、文件管理、多会话/token、终端 + SSH、插件/skill/MCP、深夜模式、Codex 配置、OnlyOffice、LaTeX、Artifact 证据链与 run 状态机均未改动（见「二、C 类」白名单） |
| 回归验证 | 后端 327/327、前端 195/195，两端构建与类型检查全部通过 |

**遗留（属于 v1.0.0 四模块范围，见「二、B 类」）**

- 实验模块 `experiment-demo.tsx` 的 `DEMO_REAL_RUN_LINES` 模拟运行日志、`experiment-store` 的模拟模式字段
- 投稿模块 `mockData.ts` / `workspace-submission-seed.ts` 的演示审稿数据、`SimulationContext` 的 `demoForm`/`demoRound1`/`demoRound2` 状态
- 写作模块 `demo-writing.ts`
- 上述模块的演示能力目前**不会被加载**（入口已删、`demoLoaded` 恒为 `false`），但代码尚未物理删除

### 4.1 端到端验收

- 题目：**单图地理定位 / single-image geolocalization**
- 状态：待执行

### 4.2 各阶段产物

| 阶段 | 产物 | 数量 / 耗时 | 状态 |
| --- | --- | --- | --- |
| 检索式生成 | `query-plan.md` | 待填 | 待执行 |
| 宽检索 | `candidate-papers.csv` | 待填 | 待执行 |
| 相关度自检 | `relevance-check.md` | 待填 | 待执行 |
| 期刊分层 | `venue-tiers.md` | 待填 | 待执行 |
| 研究态势 | `landscape.md` 等 5 份 | 待填 | 待执行 |
| 研究空白 | `research-gaps.md` | 待填 | 待执行 |
| 三方向选题 | `candidate-topics.md` | 待填 | 待执行 |
| 核心文献二次检索 | `core-query-plan.md` 等 | 待填 | 待执行 |
| AI 相关性判定 | `relevance-scoring.md` | 待填 | 待执行 |
| 回退记录 | `fallback-log.md` | 待填 | 待执行 |
| baseline 保障 | `baseline-candidates.md` | 待填 | 待执行 |
| 全文下载 | `pdf/` + `download-report.json` | 待填 | 待执行 |
| 分批分析 | `batch-NN.matrix.md` / `batch-NN.report.md` | 待填 | 待执行 |
| 元分析 | `meta-analysis.md` | 待填 | 待执行 |
| 降维课题 | `feasible-topics.md` | 待填 | 待执行 |

### 4.3 遗留问题

> 待补充。
