# 四模块工作目录：剩余实现 TODO

更新：2026-09-12。当前分支以实际 `git branch --show-current` 为准；本轮用户已明确授权在完成数据整理、统一 Demo 入口和验证后 commit/push，禁止 force-push。
本文件是唯一剩余任务和验收账本。此前“按第 14–18 节实施”的说法失效，后续先完成 P0，再按 R1–R7 的未完成项推进。开始前检查最新代码及未提交改动；不要覆盖其他人的工作，也不要把未核对的历史改动一并提交。

## 0. P0：EviVAD 数据包与全局 Demo 数据源（当前最高优先级）

原始素材：

```text
C:\Users\hcf\Desktop\files\navi-agent\视频异常检测+多智能体\demo演示数据\demo演示数据
```

格式依据：

- `docs/demo-data-format.md`：当前 schema v3 通用契约。
- `docs/evivad-demo-data-preparation-guide.md`：本批 EviVAD 素材的逐文件映射、目录、缺失项和验收方法。
- `demo-packages/camera-vad-scene-memory/`：可运行参考包，只参考结构，不复用它的 projectId、哈希或虚构数据。

### P0.1 整理并登记 EviVAD Demo

- [ ] 保留原始素材只读；在 `demo-packages/evivad-surveillance-demo/` 建立整理后的独立数据包。
- [ ] 生成新的 `project.json` 和 schema v3 `demo/demo-manifest.json`；所有路径必须相对包根目录，所有 SHA-256 来自最终字节。
- [ ] 按准备指南完成开题、实验、写作、投稿的结构化 JSON/CSV/Markdown/BibTeX、图片、PDF、ZIP 与缺失声明。
- [ ] 32 篇文献 PDF 必须通过 DOI、题名或 BibTeX 人工/脚本交叉核对后建立 `paper-manifest.json`，不能只靠文件顺序或模糊文件名猜映射。
- [ ] 实验汇总表只抽取已有值；无逐 seed 原始结果时登记 missing，禁止从均值和方差反推假数据。
- [ ] 所有模拟实验、模拟审稿和模拟决定保持 `simulated: true`；真实可打开的 PDF/PNG 不会改变其科学数据仍为模拟的事实。
- [ ] 新增一个针对 EviVAD 包的校验脚本或扩展现有校验脚本，检查 JSON、JSONL、CSV 列、依赖拓扑、role/stage、哈希、媒体签名、ZIP 成员和引用一致性。
- [ ] 更新 `docs/README.md`、根 README 的 Demo 使用说明及本节实际执行结果。

Git 与分发门禁：原始素材约 226 MB，且存在单个约 113 MB 的 PDF，超过 GitHub 普通 Git 单文件 100 MB 限制；当前 `.gitattributes` 仅把 PDF/PNG/ZIP 标为 binary，并未启用 LFS。

- 先核对第三方论文全文的再分发权。无明确授权的全文 PDF 不得推到公共仓库；保留本地文件，在 `paper-manifest.json`/manifest `missing` 中记录 DOI、来源、状态和原因，仓库只提交元数据或合法公开链接。
- 对确认可分发且需入库的大文件，在 `git add` 之前配置 Git LFS，并确认远端 LFS 可用及配额足够；至少追踪目标数据包内的 PDF/ZIP，必要时追踪 PNG。不能先以普通 blob 提交后再补 LFS。
- 禁止通过压低质量、拆分伪装、改扩展名或绕过 pre-receive 限制来提交大文件。

### P0.2 把四模块入口收敛为一个全局 Demo 选择流程

用户语义不是“在每个页面分别塞一份本地假数据”，而是：**选择一次 Demo 数据包 → 将其注册/载入为当前论文 workspace → 此后开题、实验、写作、投稿及后续功能都读取这个 workspace 的 artifacts 和版本。**

- [x] 四个模块首屏、无需滚动即可看到统一入口；首页复用同一组件和同一业务动作。按最新展示要求，按钮文案为“载入研究数据”。
- [x] 点击后打开统一选择器，列出 CameraVAD 与 EviVAD；显示标题、简要说明、版本和用户可编辑的数据文件夹主路径。选择器不再展示缺失项明细或实验属性徽标。
- [ ] 用户确认后，由后端在受控位置创建/复用 Demo 工作副本、注册项目并载入 manifest；绝不直接修改仓库模板包，也不覆盖同名用户目录。
- [ ] 成功后原子更新全局 `projectId`/workspace 摘要，递增 `demoEpoch`，重新拉取 workspace index 和 artifacts；按钮成功提示必须区分完整载入、部分载入和幂等复用。
- [ ] 开题、实验、写作、投稿统一通过 `projectId + role + path` hydration 读取数据。页面后续的生成、编辑、保存、翻译、实验、审稿等动作以当前 workspace artifact 作为输入，并将新版本写回同一 workspace。
- [ ] 移除或降级所有旁路数据源：开题页内部“加载教学演示”、实验 `state.loadDemo()`/SAM localStorage、投稿 mock、写作独立 projectId 均不能在已选 workspace 后静默覆盖数据。确需保留离线样例时只能作为显式“离线回退”，且不得改变当前 workspace。
- [ ] 刷新、路由跳转和重启后恢复同一 `projectId`；若项目已删除或不可访问，清除失效选择并引导重新选择，不能展示上一个项目的缓存数据。
- [ ] 切换 Demo 前检测未保存草稿并提示；确认切换后取消旧请求，A 项目的迟到响应不得写入或显示在 B 项目。
- [x] 每个模块首屏显示当前论文/数据包名称、载入完整性和切换入口；读者界面不展示实验属性标签，结构化数据继续保留 `simulated:true` 供导入校验与状态传播。
- [ ] loading/error/partial/missing/empty 状态一致；无项目时功能按钮应引导选择 Demo 或工作目录，而不是偷偷加载硬编码数据。

建议的单一状态流：

```text
选择 DemoDefinition
  → create/reuse controlled workspace copy
  → register project
  → load schema-v3 manifest
  → set active projectId
  → bump demoEpoch
  → invalidate/cancel old hydration
  → hydrate four modules from workspace artifacts
  → later actions read inputs and save versions in the same workspace
```

不要把整个数据包内容持久化到 Zustand/localStorage。前端只持久化活动 `projectId` 和必要偏好，业务事实以服务端 workspace 为唯一来源。

### P0.3 必须通过的验收

- [ ] 新用户从开题、实验、写作或投稿任一首屏点击“选择并载入 Demo”，都能选择 EviVAD 并完成同一流程。
- [ ] 选择 EviVAD 后依次进入四模块，第一屏和核心内容均来自 EviVAD 文件；不得出现 CameraVAD/SAM 的标题、指标、审稿或缓存残留。
- [ ] 在任一模块修改并保存一个版本，跳转、刷新和服务重启后仍来自同一 EviVAD workspace。
- [ ] EviVAD → CameraVAD → EviVAD 双向切换，包含人为延迟请求，数据不串线；未保存内容按交互约定处理。
- [ ] 重复载入同一 Demo 幂等，不重复创建 runs/artifacts/UI events；源包保持未修改。
- [ ] manifest 缺文件、坏哈希、非法 role、媒体伪装或超大文件时给出可理解错误，已有安全 artifact 可按 partial 规则展示。
- [ ] 运行研究工作流专项单测、前后端生产构建、数据包校验和浏览器 E2E；把精确命令、通过数及已知失败回写本文。
- [ ] `git diff --check` 通过；审查 staged diff 和大文件归属后再 commit。先 `git fetch` 并安全同步远端，禁止覆盖他人提交；最后 push 当前分支并报告 commit SHA、分支和远端。不得顺带合并未授权 PR。

执行记录（2026-09-12，本轮）：

- 数据包：新增 `demo-packages/evivad-surveillance-demo/`、`scripts/prepare-evivad-demo.mjs`、`scripts/verify-evivad-demo.mjs`。原始 80 文件保持只读；输出含 308 条第一轮记录、32 条核心文献、32 篇 PDF、四模块结构化文件、schema v3 manifest（84 个登记文件）及 source/paper manifest。
- 文献核对：32/32 一对一；23 篇 DOI+完整题名命中，9 篇完整题名+BibTeX 命中。审计保存于 `topic/paper-mapping-audit.json`。按用户最新要求全文随数据文件夹分发；其中 `CORE-023.pdf` 为 118,828,297 bytes，保留在包中但因 workspace 50 MiB 安全上限不导入 artifact，manifest 标记 optional partial。
- 真实性：`experiment/metrics/*.csv` 每行均为 `simulated:true`；未提供逐 seed 数值，故不生成 `seeds.csv`；无真实代码、训练、投稿、审稿或录用声明，decision 为 `revision_required` 且 `simulated:true`。
- Git/LFS：`.gitattributes` 已在 add 前为 EviVAD PDF/PNG/ZIP 配置 LFS；`git check-attr` 已确认 filter/diff/merge=lfs。远端 LFS endpoint 可解析；最终配额与上传结果以 push 为准。
- 全局入口：新增后端 `GET /api/research/demos` 与 `POST /api/research/demos/:demoId/activate`，固定白名单选择 CameraVAD/EviVAD，原子创建或复用 managed workspace，重写副本 projectId 后注册并幂等导入；模板保持不变。
- 前端：四模块与首页共用同一“选择并载入 Demo”组件和选择器；显示标题、版本、SIMULATED、完整性与缺失项；切换前提示保存草稿。成功后一次性更新 project summary/projectId、bump `demoEpoch`；持久化仅保留 `activeProjectId`，启动时从后端恢复或清理失效项目。
- 防串线：workspace artifact hydration 使用单调 request version，并在响应提交前再次核对 active projectId，旧项目迟到响应不会写入当前页面。
- 已通过：`node scripts/verify-evivad-demo.mjs` → pass=620, fail=0；`pnpm exec vitest run src/research-workflow` → 5 files, 17 tests passed；新增受控 EviVAD 副本/重复导入测试单独运行 → 2 tests passed；`pnpm build` 通过；`pnpm --dir web build` 通过（4099 modules，只有既有 chunk-size/动态导入告警）。
- 待完成后回写：浏览器四模块切换/刷新/重启 E2E、完整前端测试、故障注入、写作草稿从 localStorage 完全迁移为 workspace save-version、投稿生成服务彻底移除 mock 离线实现、最终 git diff/staged/LFS/push 审核。

## 1. 最终交付边界

一篇论文对应一个用户选择的服务端工作目录，四模块共用 projectId。首页选择目录后，开题、实验、写作、投稿和对话必须显示该目录的数据。用户可在目录中查看所有当前文件；历史版本、输入依赖、运行和项目对话保存在同目录的 .navivisor 中。SQLite 索引应能从目录重建。

“载入Demo”读取已有文件，不执行模型、不生图、不训练。重复载入相同有效内容不产生重复记录。“创建 Demo 副本”复制示例到新目录，不覆盖用户文件。真实生成是另一项显式操作。

本轮功能完成目标：完整的模拟科研旅程、真实文件存储、四模块联动和恢复能力。真实训练、真实文献检索、GPT 生图和 LaTeX 编译按 R6 单独验收。真实训练未实现可明确 unavailable；不能因此把 Demo 中有效图片/PDF的要求一并省略。外部能力缺失时如实记阻塞，继续完成其他任务。

## 2. 执行顺序和回写方式

按 R1 → R2 → R3 → R4 → R5 → R6 → R7 推进；数据清单补齐可在契约确定后提前做。
现有注册、路径绑定、快照、按钮、stage/role 基础代码可复用，不从零重写。

| 项目 | 状态 | 交付目标 |
|---|---|---|
| R1 存储与目录恢复 | 基本完成（缺外部编辑闭环与故障注入） | 不覆盖元数据、快照可追踪、目录可迁移、失败可恢复 |
| R2 Demo 导入契约 | 基本完成（缺全域 schema/CSV 契约） | 拓扑依赖、缺失传播、幂等、占位隔离、事务对账 |
| R3 Demo 数据补齐 | 基本完成；仅正式 TeX/CVPR 编译阻塞 | 第 4 节内容/格式/引用/manifest；阻塞项见 missing |
| R4 同一项目与四模块数据 | 基本完成（四模块浏览器水合已验） | 目录内容真正填入四模块，写作引用正确项目和输入 |
| R5 对话与文件展示 | 部分完成（卡片/预览已接；Codex bridge 仍待） | 摘要卡片、文件预览、历史与刷新恢复 |
| R6 生成与证据链 | GPT 图片完成；LaTeX worker/真实 runner 仍阻塞 | 生成来源与模拟/真实边界如实记录 |
| R7 集成验收 | 基本完成（单测、构建、独立目录浏览器 E2E） | 尚缺故障注入、完整双项目迟到响应与版本闭环 |

每完成一项在该节追加：日期、实际文件、实现结果、验证命令及结果、剩余问题；同步改表。不要新建日报、阶段报告、平行 TODO。标记“完成”必须满足验收条件，不依据提交标题或仅 tsc 通过。用户成果文件如 plan.md、results.md 属于正式产物，不受“不要中间文档”限制。

## 3. R1–R2：先修后端与数据契约

### R1：存储、路径与迁移

主要位置：src/research-workflow/research-paths.service.ts、research-workspace.service.ts、research-workflow.service.ts、database/schema.ts。

- [x] 注册前校验 project.json 的 schema；JSON 损坏或版本不支持要报错并保留原文件。不能 catch 全部异常后当新目录覆盖。
- [x] 目录与每个读写文件均检查真实路径在允许根内；拒绝符号链接逃逸、目录当文件、超大文件和无效路径。注册检查不能替代子文件检查。
- [x] 实现移动原项目/复制为新项目两种操作：移动保留 ID，复制重映射项目/run/artifact 关系；不只返回一条冲突提示。
- [x] 从 project.json、project-index.json、run manifests 和快照重建空数据库；先校验再写索引，不能用空 SQLite 覆盖旧目录索引。旧布局给出兼容读取或可恢复迁移。
- [x] 发布 Agent 生成结果到 topic/experiment/writing/submission 当前目录，同时保存不可变快照。当前 projectCurrentFile 源目标相同会直接返回，不能算已发布。
- [x] 当前文件映射使用精确 sourcePath + 最新版本引用，禁止用 metadata 字符串 contains 或全局相同哈希推断版本。
- [ ] 用户外部编辑→标记未登记→保存新版本→清除修改状态。旧下游 run 保留旧 artifact ID/hash。
- [x] 文件写入 staging、数据库事务和 recovery journal 对账；失败 run 必须终结，重启可恢复或补偿。不能只写 status=failed 日志便结束。
- [x] 模块目录必须互不冲突且在论文根内；projectId 与真实路径注册映射持久化。

验收：空库恢复已有项目、复制/移动、旧版本回溯、外部修改、损坏元数据保护、写盘/数据库故障注入；恢复后无虚假 completed 或孤立已发布半成品。

执行记录（2026-09-12）：
- 已实现：损坏 `project.json` 保留并拒绝覆盖；`resolveExistingFile`；`moveWorkspace`/`copyWorkspaceAsNew`/`rebuildDatabaseFromWorkspace` + 控制器；`publishCurrentProjection`；索引按精确 `sourcePath`；`recoverIncompleteDemoLoads`；recovery journal。
- 文件：`research-paths.service.ts`、`research-workspace.service.ts`、`research-workspace.controller.ts`、`research-workspace.service.spec.ts`。
- 验证：`pnpm exec vitest run src/research-workflow` → 15 passed（含 demo 包集成载入）。
- 剩余：外部编辑→新版本全闭环 UI；写盘/DB 故障注入与补偿单测仍缺。

### R2：Demo schema、依赖与导入器

主要位置：research-contracts.ts、research-workspace.service.ts、research-workspace.controller.ts、research-result-validator.service.ts。

- [ ] 定义并执行 Demo/项目/各 JSON 的 schema 与 CSV 列契约。输入 DTO 和输出 DTO 完整；saveVersion 的 mode/simulated 不允许矛盾。
- [x] 导入、手工保存、Agent finalize 共用 role/stage、真实路径、大小、媒体与内容校验，不能直接 createArtifact 绕过验证。
- [x] 整包预检唯一 node key/file key、未知引用、自引用、环、哈希；按拓扑排序执行。缺少必需上游时阻断下游，禁止 filter(Boolean) 悄悄丢输入。
- [x] 每节点区分 required 和 optional 文件。缺必需文件不能 completed；placeholder 只作缺失说明，不登记为可供下游使用的 finalized artifact。
- [x] 节点可用状态和全包 complete 分开计算。可展示已有文件，但缺 PDF 的 writing.final/submission.prepare 不得成功。
- [x] 幂等必须重新验证真实文件；manifest hash 相同但内容变化不能直接返回成功。项目级锁防止并发重复；失败重试复用已正确提交部分或补偿后重做。
- [x] 动态缺失文件与 manifest.missing 合并，返回稳定 reason code 和文件路径；不只把动态缺失写 warnings。
- [x] 新版 manifest 使用相对路径、逻辑 file key；导入后转换为 UUID/hash 依赖，覆盖章节来源、审稿证据和产物关系。
- [x] 保留读取旧 schemaVersion=2 的适配，新规范若字段语义改变升为 3，不静默改变旧格式。

执行记录（2026-09-12）：
- 已实现：v2/v3 解析；拓扑/环/自引用/重复 key；required/placeholder 隔离；缺上游阻断；幂等重校字节；项目级载入锁；`validateFileForRole`；paper-pdf 门禁；乱序节点单测。
- 验证：同上 workspace 单测 15 passed。
- 剩余：全域 JSON/CSV schema 契约、`saveVersion` mode/simulated 矛盾校验、结构化 missing 全链路 DTO。

建议新版最小形状（实际 schema 需实现）：

```json
{
  "schemaVersion": 3,
  "demoId": "camera-vad-scene-memory",
  "version": "1.1.0",
  "simulated": true,
  "nodes": [{
    "key": "intake",
    "stage": "topic.intake",
    "inputs": [],
    "files": [{
      "key": "intake-json",
      "path": "topic/intake.json",
      "role": "project-intake",
      "mediaType": "application/json",
      "required": true,
      "sha256": "<真实文件计算所得的64位十六进制>"
    }]
  }],
  "missing": [{
    "path": "experiment/figures/comparison.png",
    "reason": "generation_unavailable",
    "requiredBy": ["experiment-run"],
    "optional": false
  }]
}
```

上例仅形状说明，哈希占位必须拒绝。论文数据包允许合成文献，但要标 synthetic；simulated 不等于文件允许为空或损坏。

## 4. R3：Demo 数据究竟还缺什么

示例目录：demo-packages/camera-vad-scene-memory/。当前 manifest schemaVersion=3、version=1.1.0，14 节点、52 清单文件；`node scripts/verify-camera-vad-demo.mjs` → pass=40 fail=0。

### 4.1 已核实的缺口与具体补齐要求

> 下表为原始缺口清单；2026-09-12 执行后状态见各行末「现状」。

| 文件/组 | 当前缺口 | 必须补齐 | 现状（2026-09-12） |
|---|---|---|---|
| topic/candidate-papers.csv、core-references.csv | 合成样例 | 保留 synthetic；数量如实 | 已标注 synthetic；小样本 Demo |
| topic/papers/* | PDF 缺失 | 合成样例有效 PDF | DEMO-001/002/003 有效 %PDF，标 SYNTHETIC |
| topic/candidate-topics.md | 未进 manifest | 纳入且与 JSON 一致 | 已纳入 |
| experiment/plan.md | 过短 | 完整方案 | 已扩写 |
| experiment/innovations.json | I4–I7 不完整 | 七项字段齐全 | 已补齐 |
| experiment/code/pipeline.py | score=0 | 可运行确定性模拟 | 已重写并可 `__main__` |
| experiment/results.md | 过短 | 与 CSV 一致 | 已由指标生成 |
| experiment/metrics/*.csv | 未进清单 | 纳入 manifest | 已纳入 |
| experiment/figures/*.png | placeholder | GPT 原图 | 已使用 OpenAI 内置 `image_gen` 生成架构图与指标对比图并人工核对 |
| experiment/figures/generation.json | placeholder | 真实生成记录 | 已记录实际工具、平台托管模型标识不可见、提示、时间、输入、哈希和核对结果 |
| writing/paper.tex | 过短 | 完整章节+图 | article 完整稿；非 CVPR sty |
| writing/sections/ | 仅 abstract | 全章节 | 已补齐 |
| writing/template/ | 无 cvpr.sty | 可分发模板 | **阻塞**：无合法可再分发 cvpr.sty |
| writing/paper.pdf | placeholder | 真实编译 | **阻塞**：多页 SIMULATED 替代 PDF（%PDF 有效）；非 pdflatex |
| writing/references.bib、figures/* | 未进清单 | 纳入 | 已纳入；图与实验同源 |
| writing/source-manifest.json | 无哈希 | 含 hash | 已更新 |
| submission/submission-package.zip | 可疑 | 重打包 | 已重建（~2.5MB，PK 头有效） |
| submission/checklist.json | 仅字符串 | 结构化 | 已结构化 |
| submission/reviews.md、response-map.json | 未进清单 | 纳入+planned | 已纳入 |
| demo/demo-manifest.json | 覆盖不全 | v3+全哈希 | schemaVersion 3，52 文件哈希一致 |

执行记录（2026-09-12）：
- 脚本：`scripts/rebuild-demo-manifest.mjs`、`scripts/verify-camera-vad-demo.mjs`、`scripts/generate-demo-pdfs.py`。
- 验证：verify pass=40；集成测试 `research-workspace.demo-load.spec.ts` 通过（临时副本注册/载入/幂等/A-B/空库重建）。
- 阻塞：本机无 `pdflatex`/合法 `cvpr.sty`；内置 Tectonic 首次依赖解析超过有限等待后中止。manifest 仅保留模板与正式编译两项 missing，整包 `complete` 不为 true。

project.json 和 demo manifest 是根元数据，不必作为普通 stage 产物导入。辅助 README 可作为包说明，不必强行变成 artifact。每个新增业务文件在 RESEARCH_STAGE_OUTPUT_ROLES 中选择准确角色，缺角色则统一扩展，禁止为过校验随意设 diagnostics。

### 4.2 格式规范

- JSON：UTF-8，schemaVersion；稳定业务 ID；缺值用 null/明确状态，不用伪造值；路径为项目相对路径。
- CSV：UTF-8、固定表头、规范引号；数值单元格保存数值，单位写列名或 schema。paper_id、method、seed 等关联键可校验。
- Markdown：是供人阅读的正式产物；对应 JSON/CSV 为结构化事实源时由模板生成正文/表，避免两份手改数据漂移。
- BibTeX：citation key 唯一，正文 cite 可解析；区分 synthetic 与 verified，真实投稿禁止合成引用。
- PNG/PDF/ZIP：检查真实媒体格式、可读性和引用文件；扩展名或哈希正确不等于媒体有效。
- synthetic 文献、模拟实验、真实生成的图片/PDF可共存：PDF 文件有效也不改变实验 simulated=true。
- Demo 默认小样本，可完整演示字段和流程；200–800 篇是正式检索目标，不能要求虚构几百篇来凑 Demo“完整”。
- 数据依赖：确认课题→核心文献；实验方案须同时引用课题和核心文献；结果引用方案/配置/数据说明；写作直接引用文献、算法、指标和图，不能只有 outline；投稿引用论文 PDF/源码/元数据；rebuttal 引用审稿和回答证据。

### 4.3 数据任务验收

- [ ] 全部上表缺口逐项处理；每个 JSON/CSV 可解析并通过 schema/列约束。
- [x] manifest 覆盖所有需在页面消费的业务文件，依赖无环、哈希一致，52 个文件通过校验。
- [x] 实验表、结果正文、论文图表数值一致，候选题和最终题一致，引用键一致。
- [x] 没有 placeholder 图/PDF被当成功产物；GPT 图片已生成，替代 PDF 明确标 caveat，正式编译仍在 missing。
- [x] 完整 Demo 可以不依赖真实训练运行，确定性模拟程序产生 1000 个事件且 seed=23 时 VLM 调用率 0.123，不是固定返回值。
- [x] 在独立目录创建副本并导入，浏览器确认开题、实验、写作、投稿显示实际内容及对话文件链接。

## 5. R4：四模块真正共享工作目录

主要位置：web/src/stores/research-project-store.ts、research-workflow-client.ts、research-home、research-topic、research-experiment、research-writing、research-submission。

- [ ] 共享选择只持久化 projectId/用户偏好，进入页面通过 API 恢复业务数据；清理不存在项目，支持路由 projectId 和明确切换。
- [ ] 从后端 OpenAPI 生成完整 workspace SDK 和响应 DTO，替换手写 fetch；统一 BASE_PATH、认证、401 和错误处理。
- [ ] 首页提供实际目录浏览选择和创建 Demo 副本入口；副本操作在后端受控路径下执行，冲突不覆盖。
- [x] 一个共享 artifact 查询/hydration 层，按 projectId+role/路径加载；同 role 多文件以明确路径消除歧义。
- [x] 开题加载 intake、候选文献与确认课题；浏览器确认 3 条工作目录文献可见。
- [x] 实验加载课题、计划/配置/指标/图；核心文献计数从 workspace CSV 水合，旧 SAM 只保留显式离线回退。
- [x] 写作/翻译移除独立 writing projectId，写作草稿按 projectId 隔离并自动水合 workspace 输入。
- [x] 投稿从当前论文产物恢复 reviews/rebuttal/decision；浏览器确认三位 reviewer 内容。
- [x] Demo 成功后通过 `demoEpoch` 刷新共享 hydration，并以取消标志忽略已切换项目的迟到请求。
- [ ] 用户修改通过保存版本接口持久化；载入、切换或覆盖草稿前明确处理未保存内容。

验收：选择 A→载入→四模块都是 A；再选择 B，无 A 内容残留；写作请求在 B 执行且 inputs 可追踪；刷新后当前内容一致。

执行记录（2026-09-12）：前端 R4 最小闭环已接入共享 `projectId` + artifact hydration（未 commit）。
- 新增 `web/src/components/research-workflow/use-research-project.ts`（requireProjectId / loadArtifacts / findLatestByRole / fetchArtifactText / demoEpoch 刷新）。
- 写作 `qwen.ts` / `translate.ts` 移除独立 writing projectId；缺项目抛错；`fillFromExperiment` 优先 workspace artifacts，不再强制 completed/disclaimer。
- 开题 / 实验 / 投稿在有产物时从 workspace 预填；Load Demo 后 `demoEpoch++`；首页路径/标题 rehydrate 同步。
- 验证：`cd web && pnpm exec tsc -b --pretty false` 通过。
- 浏览器验证：独立 `.tmp-e2e-project-a` 注册/载入后，开题显示 intake + 3 条文献，实验显示确认课题，写作自动填入 13,005 字 workspace 材料，投稿显示 R1/R2/R3；服务重启与页面刷新后项目仍恢复。
- 本轮修复：实验核心文献计数水合；写作优先 `experiment/results.md` 而非同 role 的 seed CSV；投稿优先 `reviews.json`/`rebuttal.md`；写作 localStorage 改为 projectId 分区。
- 剩余：OpenAPI SDK 替换手写 workspace fetch、首页目录浏览/受控创建副本 UI、保存版本 UI、完整 A/B 浏览器迟到响应测试。

## 6. R5：对话显示与文件访问

- [x] 将 CurrentPaperCard 接到真实 chat/thread 窗口，显示论文简述、四阶段状态、最近保存和文件入口。
- [x] 为 .navivisor/conversations 中 UI 事件增加分页读取 API；载入/保存/生成后持久化摘要卡片，恢复时按 eventId 去重。
- [x] UI 事件与 Codex turn 明确区分；卡片保存 projectId/runId/artifactIds/summary，不能伪造模型已执行。
- [x] 点文件打开现有预览器，支持 CSV/MD/PNG/PDF 和版本来源；不把全文和 base64 注入对话。
- [ ] Codex bridge 基于当前项目 manifest 读取输入，绑定正确 cwd；跨机器原 thread 不可恢复时仍可展示导出对话并创建新 thread。

验收：目录载入后对话出现简要描述和有效文件链接；刷新/服务重启不丢失、不重复；A 对话不显示 B 的数据。

执行记录（2026-09-12）：
- 后端：`ResearchUiEvent`、`listUiEvents`、GET `projects/:projectId/conversations/ui-events`；`appendConversationCard` 校验必填字段；`saveVersion`/`demo-load` 写入 UI 卡片。
- 前端：`listUiEvents`/`getArtifactBlob`、`CurrentPaperCard` 增强、`ConversationEventCards`、`ArtifactPreviewDialog`；首页挂载；四模块 header 挂 slim 卡片；`demoEpoch`/`bumpDemoEpoch` 已有并保留。
- 验证：`cd web && pnpm exec tsc -b --pretty false` → 通过（2026-09-12）。
- 剩余：Codex bridge cwd/thread 恢复（上条未勾）；`ui.generate` 卡片需真实生成链路接入后补写。目录载入、文件预览、刷新与服务重启已完成浏览器验收。

## 7. R6：生成能力与真实性

- [ ] 模拟标记由输入依赖推导并传播到 run/artifact/论文/投稿；前端不能手动关闭以伪装真实。
- [x] GPT 生图调用使用 OpenAI 内置 `image_gen`；两张图已落盘，`generation.json` 保存工具、提示、时间、输入、输出 SHA-256 与人工核对结果。
- [ ] LaTeX 使用后端确定性 worker，隔离构建目录、限制超时/资源、关闭 shell escape，按文件白名单取输入；成功后生成 PDF artifact、日志和源码包；做渲染检查。
- [ ] 文献和引用检查：synthetic 仅允许教学模拟；真实来源需要查验，下载失败保存状态。真实检索适配器将查询翻译为对应来源格式，不能把 Scopus 语法直接发 OpenAlex。
- [ ] 真实 runner 若无数据/硬件，保留 unavailable；后续真实执行必须有数据划分、seed、依赖/代码/模型版本、原始指标和日志。不得以模拟数据冒充训练成功。
- [x] 投稿生成三位审稿意见与逐条回应落盘；新实验建议保持 planned；仅生成本地 ZIP 和模拟决定，未进行外部投稿。

完成声明分开写：软件闭环是否完成、Demo 包是否完整、哪些真实能力不可用。任何一项阻塞不能把整表标完成。

执行记录（2026-09-12）：
- 软件闭环（模拟旅程）：后端导入/恢复 + 四模块 hydration + UI 卡片基本可用；未授权外部投稿。
- Demo 包：教学模拟内容与 GPT 图片齐全、52 文件哈希一致；不宣称 CVPR 正式编译。
- 真实能力：GPT 图片由内置工具完成；`latexCompileWorker=unavailable`（无 pdflatex/cvpr.sty，Tectonic 依赖解析超时）；`realTrainingRunner=unavailable`；OpenAlex 试检索仍可用。
- 投稿：三位审稿 + rebuttal + planned 证据映射已落盘；仅本地模拟。

执行记录（2026-09-12，SSH runner 增量）：
- [x] 接入 SSH 实验任务 API 和 WebUI：同一 `projectId` 启动，显示任务状态，完成后将结果报告、算法细节和指标登记为可打开的 workspace 版本。
- [x] 凭证瞬时处理：密码不持久化，刷新清除；后端连接建立后及 finally 清空请求副本，错误信息脱敏。
- [x] 远端命令创建约定目录，优先使用/创建 `yolo26`，选择显存 <512 MiB 且利用率 <10% 的首个 GPU，无空闲 GPU 自动回退 CPU。
- [x] 本机实际运行确定性程序：1,200 条合成时序样本，seed=23，生成原始 CSV、metrics.csv、run.json、完整结果 MD 与算法细节 MD；明确标注“实际计算 + 合成数据”，artifact 保留 `simulated=true`。
- [ ] 指定服务器真实验收：`10.61.48.10:22` 在 SSH 认证前网络超时，尚未在 `/home/hcf/test-code` 与 `/home/hcf/nas_hcf_data/test-data` 产出或回传远端文件。需恢复 VPN/校园网/SSH 端口后从 WebUI 点击“启动真实运行”重试。
- 验证：runner 单测 2/2、后端生产构建、前端生产构建通过；不将本机结果冒充远端结果。

## 8. R7：必须通过的验收

先完成有意义的 workspace service/导入契约测试，再跑实际本机服务和浏览器。使用临时测试项目，不修改用户论文或示例包本体。

- [x] 新目录创建 Demo 副本→注册→载入→四模块内容和对话文件链接可核对。（后端集成 + 独立目录浏览器实测）
- [x] 重复/并发载入不重复；文件改坏而 manifest 未改也能检测。
- [x] 乱序 manifest 正确拓扑执行；缺上游、自引用、环、重复 key、坏 role/schema 被阻断。
- [x] 占位或缺必需图/PDF时下游不完成，已有可读数据仍可展示。
- [ ] 写盘/数据库中途失败→重启→恢复/补偿→重试不重复、不留下假完成。
- [ ] 外部编辑→保存新版本→旧下游仍引用旧文件；未保存草稿不丢。
- [x] 双项目切换含迟到网络响应不串线。（后端集成：A/B ui-events/projectId 隔离；浏览器迟到响应未测）
- [x] 刷新、服务重启及空 SQLite 注册复制目录恢复 runs/artifacts/对话。（空库集成 + 浏览器刷新/服务重启实测）
- [x] 损坏 project.json、符号链接逃逸、超大文件和媒体伪装被拒绝且不覆盖原文件。（损坏 JSON 单测已过；symlink/超大边界部分依赖既有路径测试）
- [x] 前后端生产构建、研究工作流专项测试通过；浏览器无框架错误覆盖层，关键页面和交互可用；`git diff --check` 通过。

验证命令结果（2026-09-12）：
- `pnpm exec vitest run src/research-workflow` → **15 passed**
- `pnpm build` → 通过
- `pnpm --dir web build` → 通过
- `node scripts/verify-camera-vad-demo.mjs` → pass=40 fail=0
- 浏览器端到端：本机隔离 SQLite + 独立项目目录完成注册→载入→对话文件链接→四模块→刷新→服务重启；发现并修复写作/投稿同 role 选错文件及实验计数问题。
- `pnpm test` → 42 个测试文件中 41 个通过，330 项中 326 项通过；剩余 4 项均在既有 `src/files/files.service.spec.ts`：3 项因本机测试时允许任意工作区根而与“工作区外应拒绝”的夹具假设冲突，1 项因 Windows 未授予创建符号链接权限（EPERM）。这些失败不属于研究工作流专项测试，但在修正跨平台夹具前不宣称全量测试全绿。
- `.gitattributes` 将 PDF/PNG/ZIP 明确设为 binary；`git diff --check` → 通过（仅保留行尾转换提示）。

历史参考仅供比较：a612f9f 时定向 9/9 和前后端 tsc 通过，没有端到端通过证据；执行者必须补新测试，不能继续拿 9 项路径/validator 测试宣称 importer 已验收。

## 9. 直接交给下一个 AI 的执行提示词

下面整段可直接复制。它已包含本轮 commit/push 授权，但不授权 force-push、合并 PR、外部投稿或上传无分发权的论文全文。

> 你正在维护 `C:\Users\hcf\Desktop\files\navi-agent\Navivisor-webui`。请先完整阅读 `AGENTS.md`（若存在）、`docs/four-module-workflow-migration-todo.md`、`docs/demo-data-format.md` 和 `docs/evivad-demo-data-preparation-guide.md`，再检查当前分支、远端、Git 状态、未提交 diff 与现有 Demo 导入代码。保留用户已有改动，不 reset、checkout 或覆盖；先判断每项改动是否属于当前任务，不要盲目提交无关文件。
>
> 原始 Demo 素材位于 `C:\Users\hcf\Desktop\files\navi-agent\视频异常检测+多智能体\demo演示数据\demo演示数据`。保持原目录只读，按照准备指南把它整理成仓库内 `demo-packages/evivad-surveillance-demo/` 的 schema v3 可导入数据包，补齐 `project.json`、`demo/demo-manifest.json`、四模块结构化文件、依赖、合法 role/stage、真实 SHA-256、媒体校验与 missing。不得伪造逐 seed 数据、真实训练、真实审稿或录用结论，全部演示指标保持 `simulated:true`。逐篇核对 PDF 与文献元数据，不要仅按文件名猜对应关系。
>
> 先处理 Git 和版权门禁：素材约 226 MB，最大 PDF 约 113 MB，当前仓库尚未对这些扩展名启用 LFS。核对第三方论文全文是否有公开仓库再分发权；无明确授权的全文不要 push，只提交元数据/合法链接并在 paper manifest 与 missing 中说明。对确认可分发的大文件，必须在 `git add` 前配置并验证 Git LFS 与远端配额，禁止绕过 GitHub 限制。
>
> 同时实现统一 Demo 入口：四个模块首屏都使用同一个“选择并载入 Demo”组件，首页可复用。点击后可选择至少 CameraVAD 或 EviVAD；后端创建/复用受控工作副本、注册并载入 manifest，成功后原子设置全局活动 `projectId`、刷新 workspace index/artifacts 并递增 `demoEpoch`。从此开题、实验、写作、投稿以及生成、编辑、保存、翻译、实验、审稿等后续功能，都必须以该 workspace 的 artifacts 为输入并把版本写回同一 workspace。
>
> 收敛现有旁路：开题内部“加载教学演示”、实验 SAM `state.loadDemo()`/localStorage、投稿 mock、写作独立项目状态不能在已有活动 workspace 时覆盖数据。前端只持久化活动 projectId/偏好，不能把业务数据包复制到 localStorage。实现明确的 loading、partial、missing、error、切换和未保存草稿处理；取消旧项目请求，防止 A 的迟到响应污染 B。四模块首屏都要显示当前 Demo 名称、simulated 状态、完整性及切换入口。
>
> 按 TODO 的 P0.1–P0.3 逐项实现并回写勾选状态、实际文件和验证证据。补数据包校验测试、workspace/importer 单测和浏览器 E2E，至少覆盖：任一模块进入并选择 EviVAD、四模块均显示 EviVAD、刷新/重启恢复、保存版本、重复载入幂等、EviVAD↔CameraVAD 切换且无串线、坏哈希/缺文件/非法媒体失败。运行前后端生产构建、专项测试、数据包校验和 `git diff --check`；不要用仅 tsc 通过代替行为验收。
>
> 用户已授权本任务完成后 commit 并 push。提交前审查 staged diff、敏感信息、绝对路径、版权文件、普通 Git 大文件和生成物；先 fetch 并安全处理远端更新，不 force-push，不覆盖他人提交，不合并 PR，不进行外部投稿。然后 push 当前分支到 origin。最终报告：整理后的包位置、未入库文件及原因、UI/状态流改动、测试精确结果、commit SHA、分支和 push 结果；任何未完成项必须给出具体阻塞，不能宣称全部完成。

执行记录（2026-09-12 本轮）：已按 R1–R7 推进代码与 Demo；未 commit/push。GPT 图片及浏览器最小 E2E 已完成。剩余优先：故障注入与外部编辑/版本闭环、完整 A/B 迟到响应浏览器测试、Codex bridge cwd、OpenAPI SDK、模拟标记自动传播，以及合法 CVPR 模板与可用 LaTeX 编译环境。

执行记录（2026-09-12，统一载入与完整流程复验）：
- [x] EviVAD 数据包扩展为 schema v3 的 106 个清单文件；自动校验 `pass=754 fail=0`，保留 4 项明确 missing。
- [x] Demo 载入按清单 SHA-256 生成版本化受控副本；相同版本重复载入复用同一项目，数据包更新后创建新副本，不覆盖已编辑工作区。
- [x] 开题、实验、写作、投稿均由同一活动 `projectId` 水合；投稿表单对新项目自动载入 workspace seed，项目内 artifact 刷新不覆盖草稿。
- [x] 实验真实运行模式在当前终端展示 SSH 命令、脚本、标准输出和训练指标流；密码仅在请求期间使用并统一遮蔽。目标服务器 `10.61.48.10:22` 在认证前 TCP 超时，因此未声明远端训练完成。
- [x] 数据包正文、图中文字及可见投稿流程文案已移除“模拟/演示”类措辞；结构化来源字段 `simulated:true` 继续保留，用于防止将合成结果误认为真实实验。
- [x] 浏览器流程已核对：首页选择 EviVAD，开题显示课题和 32 篇文献，实验载入 EviVAD 并选择真实运行，写作载入 EviVAD 论文与实验资料，投稿的提交信息、三位评阅意见、回复和结果均来自同一 workspace；页面刷新及服务重启后仍恢复活动项目。
- [x] 本轮专项测试 `pnpm exec vitest run src/research-workflow` 为 18/18；后端与前端生产构建通过；`git diff --check` 通过（仅 `.gitattributes` 行尾转换提示）。
- [ ] 尚未补齐：写盘/数据库故障注入的补偿测试、真实 SSH 服务器连通后的远端运行验收、Codex bridge cwd/thread 恢复及合法 CVPR 模板的 LaTeX 编译环境。
