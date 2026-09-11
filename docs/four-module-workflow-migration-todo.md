# 四模块工作目录：剩余实现 TODO

更新：2026-09-11。复核基线：`a612f9f`，分支 `feat/writing-workflow-unification`。
本文件已移除历史计划、已完成项与重复示例，是唯一剩余任务和验收账本。此前“按第 14–18 节实施”的说法失效，后续按本文 R1–R7 执行。开始前检查最新代码及未提交改动；不要覆盖其他人的工作。没有新的授权不提交、不推送。

## 1. 最终交付边界

一篇论文对应一个用户选择的服务端工作目录，四模块共用 projectId。首页选择目录后，开题、实验、写作、投稿和对话必须显示该目录的数据。用户可在目录中查看所有当前文件；历史版本、输入依赖、运行和项目对话保存在同目录的 .navivisor 中。SQLite 索引应能从目录重建。

“从工作目录载入 Demo”读取已有文件，不执行模型、不生图、不训练。重复载入相同有效内容不产生重复记录。“创建 Demo 副本”复制示例到新目录，不覆盖用户文件。真实生成是另一项显式操作。

本轮功能完成目标：完整的模拟科研旅程、真实文件存储、四模块联动和恢复能力。真实训练、真实文献检索、GPT 生图和 LaTeX 编译按 R6 单独验收。真实训练未实现可明确 unavailable；不能因此把 Demo 中有效图片/PDF的要求一并省略。外部能力缺失时如实记阻塞，继续完成其他任务。

## 2. 执行顺序和回写方式

按 R1 → R2 → R3 → R4 → R5 → R6 → R7 推进；数据清单补齐可在契约确定后提前做。
现有注册、路径绑定、快照、按钮、stage/role 基础代码可复用，不从零重写。

| 项目 | 状态 | 交付目标 |
|---|---|---|
| R1 存储与目录恢复 | 待完成 | 不覆盖元数据、快照可追踪、目录可迁移、失败可恢复 |
| R2 Demo 导入契约 | 待完成 | 拓扑依赖、缺失传播、幂等、占位隔离、事务对账 |
| R3 Demo 数据补齐 | 待完成 | 第 4 节全部文件内容、格式、引用和 manifest 完整 |
| R4 同一项目与四模块数据 | 待完成 | 目录内容真正填入四模块，写作引用正确项目和输入 |
| R5 对话与文件展示 | 待完成 | 摘要卡片、文件预览、历史与刷新恢复 |
| R6 生成与证据链 | 待完成 | 模拟/真实正确传播，GPT 图片、有效 PDF、引用校验 |
| R7 集成验收 | 待完成 | 第 8 节场景和必要测试通过 |

每完成一项在该节追加：日期、实际文件、实现结果、验证命令及结果、剩余问题；同步改表。不要新建日报、阶段报告、平行 TODO。标记“完成”必须满足验收条件，不依据提交标题或仅 tsc 通过。用户成果文件如 plan.md、results.md 属于正式产物，不受“不要中间文档”限制。

## 3. R1–R2：先修后端与数据契约

### R1：存储、路径与迁移

主要位置：src/research-workflow/research-paths.service.ts、research-workspace.service.ts、research-workflow.service.ts、database/schema.ts。

- [ ] 注册前校验 project.json 的 schema；JSON 损坏或版本不支持要报错并保留原文件。不能 catch 全部异常后当新目录覆盖。
- [ ] 目录与每个读写文件均检查真实路径在允许根内；拒绝符号链接逃逸、目录当文件、超大文件和无效路径。注册检查不能替代子文件检查。
- [ ] 实现移动原项目/复制为新项目两种操作：移动保留 ID，复制重映射项目/run/artifact 关系；不只返回一条冲突提示。
- [ ] 从 project.json、project-index.json、run manifests 和快照重建空数据库；先校验再写索引，不能用空 SQLite 覆盖旧目录索引。旧布局给出兼容读取或可恢复迁移。
- [ ] 发布 Agent 生成结果到 topic/experiment/writing/submission 当前目录，同时保存不可变快照。当前 projectCurrentFile 源目标相同会直接返回，不能算已发布。
- [ ] 当前文件映射使用精确 sourcePath + 最新版本引用，禁止用 metadata 字符串 contains 或全局相同哈希推断版本。
- [ ] 用户外部编辑→标记未登记→保存新版本→清除修改状态。旧下游 run 保留旧 artifact ID/hash。
- [ ] 文件写入 staging、数据库事务和 recovery journal 对账；失败 run 必须终结，重启可恢复或补偿。不能只写 status=failed 日志便结束。
- [ ] 模块目录必须互不冲突且在论文根内；projectId 与真实路径注册映射持久化。

验收：空库恢复已有项目、复制/移动、旧版本回溯、外部修改、损坏元数据保护、写盘/数据库故障注入；恢复后无虚假 completed 或孤立已发布半成品。

### R2：Demo schema、依赖与导入器

主要位置：research-contracts.ts、research-workspace.service.ts、research-workspace.controller.ts、research-result-validator.service.ts。

- [ ] 定义并执行 Demo/项目/各 JSON 的 schema 与 CSV 列契约。输入 DTO 和输出 DTO 完整；saveVersion 的 mode/simulated 不允许矛盾。
- [ ] 导入、手工保存、Agent finalize 共用 role/stage、真实路径、大小、媒体与内容校验，不能直接 createArtifact 绕过验证。
- [ ] 整包预检唯一 node key/file key、未知引用、自引用、环、哈希；按拓扑排序执行。缺少必需上游时阻断下游，禁止 filter(Boolean) 悄悄丢输入。
- [ ] 每节点区分 required 和 optional 文件。缺必需文件不能 completed；placeholder 只作缺失说明，不登记为可供下游使用的 finalized artifact。
- [ ] 节点可用状态和全包 complete 分开计算。可展示已有文件，但缺 PDF 的 writing.final/submission.prepare 不得成功。
- [ ] 幂等必须重新验证真实文件；manifest hash 相同但内容变化不能直接返回成功。项目级锁防止并发重复；失败重试复用已正确提交部分或补偿后重做。
- [ ] 动态缺失文件与 manifest.missing 合并，返回稳定 reason code 和文件路径；不只把动态缺失写 warnings。
- [ ] 新版 manifest 使用相对路径、逻辑 file key；导入后转换为 UUID/hash 依赖，覆盖章节来源、审稿证据和产物关系。
- [ ] 保留读取旧 schemaVersion=2 的适配，新规范若字段语义改变升为 3，不静默改变旧格式。

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

示例目录：demo-packages/camera-vad-scene-memory/。当前 manifest 有 14 节点、28 文件；所有清单文件哈希已匹配，但“文件存在”不等于内容完成。

### 4.1 已核实的缺口与具体补齐要求

| 文件/组 | 当前缺口 | 必须补齐 |
|---|---|---|
| topic/candidate-papers.csv、core-references.csv | 合成样例，不是实际检索结果 | 保留 synthetic=true；文献数量如实从 CSV 计算。真实来源另标 verified/source/URL，禁止伪造 DOI 或宣称已检索 300 篇 |
| topic/papers/* | 3 篇 DEMO 文献 PDF 缺失；对应文献本身是合成的 | 不能为虚构论文下载“真实 PDF”。将 synthetic 记录的 PDF 标 not_applicable；需要展示阅读器则提供明确标“合成阅读样例”的有效 PDF，或取得可用真实论文并核对引用 |
| topic/candidate-topics.md | 文件存在但未进 manifest | 纳入清单；与 JSON 三张推荐卡保持一致，补候选方法、可行性、风险和证据 |
| experiment/plan.md | 只有 Summary、2 条假设和模拟声明 | 补概要、baseline、数据集及划分、指标公式、七项创新、选定三项的完整实验步骤、资源预算、Go/No-Go、预期提升与局限 |
| experiment/innovations.json | I4–I7 只有名称和 selected | 七项都补 hypothesis/implementation/baseline/ablation/cost/acceptanceCriteria；I1–I3 给可执行参数和对比设计 |
| experiment/code/pipeline.py | 直接返回固定 score=0 | 补可运行的确定性模拟流程：采样→评分→触发→记忆检索→复核→融合→事件输出；标 simulated，不声称真实训练；可重复 seed 和输入/输出示例 |
| experiment/results.md | 只有提升描述和声明 | 从 CSV 生成主表、消融、预算比较、失败案例、局限；所有数字与表一致 |
| experiment/metrics/main.csv、ablation.csv、seeds.csv | 文件存在但全部未进入导入清单 | 纳入 manifest；校验方法/数据集/单位/seed；有重复数据才生成均值±标准差，否则标未测 |
| experiment/figures/*.png | 两张为 placeholder | 经 GPT 生图产生有效对比图和框架图；人工/程序核对尺寸、可读性、模块和数字；失败保持缺失 |
| experiment/figures/generation.json | tool=placeholder，model=null | 记录实际 tool/model/prompt/time/input refs/hash/核对结果；无生成记录不能宣称 GPT 图 |
| writing/paper.tex | article 文档中只有标题 | 换成完整 CVPR 工程，包含摘要、引言、相关工作、方法、实验讨论、结论展望、引用、两张图 |
| writing/sections/ | 仅 abstract.md | 补完整章节；选择 Markdown→TeX 或直接 TeX 为单一编辑源，生成产物不能有两份互相矛盾的正文 |
| writing/template/ | 仅说明，无 cvpr.sty | 核对并纳入可分发模板依赖、版本及来源；不得仅改 documentclass 名称伪装模板 |
| writing/paper.pdf、compile-log.txt | PDF 为 placeholder，尚非真实编译结果 | 从该目录源码实际编译、保存真实日志并检查渲染；失败不发布 PDF |
| writing/references.bib、figures/* | 存在但没进 manifest，图片仍是占位副本 | 与开题 BibTeX、实验图片以依赖相连，生成写作投影且记录版本；不要生成第二套独立数字/引用 |
| writing/source-manifest.json | 仅相对路径，没有版本哈希/已解析依赖 | bundle 用 file key+hash；导入后章节关联 artifact ID+hash，覆盖全文 |
| submission/submission-package.zip | 有文件，尚未证明成员是最终有效成果 | 最后从已校验 PDF、源码和元数据重新打包，检查 ZIP 完整性、成员清单与哈希 |
| submission/checklist.json | 仅字符串项，不能表达检查结果 | 每项 id/required/status/reason/evidenceRefs；缺 PDF 或模板时失败 |
| submission/reviews.md、response-map.json | 存在但没进 manifest；证据为空/planned | 与 reviews.json 一致；逐 questionId 对应 rebuttal 章节和证据，planned 不改成已完成 |
| demo/demo-manifest.json | 清单未覆盖多类关键文件，部分输入过少 | 加入下列漏项，补依赖，重新计算所有实际哈希；占位不算完成 |

目前未纳入 manifest、必须逐项处理的业务文件：
- topic/candidate-topics.md。
- experiment/innovations.json、code/pipeline.py、metrics/main.csv、metrics/ablation.csv、metrics/seeds.csv、figures/generation.json。
- writing/references.bib、sections/*、figures/*、template 的实际编译依赖、compile-log.txt、source-manifest.json。
- submission/checklist.json、reviews.md、response-map.json。

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
- [ ] manifest 覆盖所有需在页面消费的业务文件，依赖无环、哈希一致、引用完整。
- [ ] 实验表、结果正文、论文图表数值一致，候选题和最终题一致，引用键一致。
- [ ] 没有 placeholder 图/PDF被当成功产物。所需媒体真正生成后才移除 missing。
- [ ] 完整 Demo 可以不依赖真实训练运行，但不能用固定 score=0 的空实现代替有输入输出的模拟演示。
- [ ] 在新目录创建副本并导入，四模块能显示实际内容而不只是“已载入 N 项”。

## 5. R4：四模块真正共享工作目录

主要位置：web/src/stores/research-project-store.ts、research-workflow-client.ts、research-home、research-topic、research-experiment、research-writing、research-submission。

- [ ] 共享选择只持久化 projectId/用户偏好，进入页面通过 API 恢复业务数据；清理不存在项目，支持路由 projectId 和明确切换。
- [ ] 从后端 OpenAPI 生成完整 workspace SDK 和响应 DTO，替换手写 fetch；统一 BASE_PATH、认证、401 和错误处理。
- [ ] 首页提供实际目录浏览选择和创建 Demo 副本入口；副本操作在后端受控路径下执行，冲突不覆盖。
- [ ] 一个共享 artifact 查询/hydration 层，按 projectId+role+版本加载，不让四模块重复解析文件。
- [ ] 开题加载 intake、检索、候选、确认和文献；接入统一 runs，替换旧私有 task 接口或改成内部 adapter。
- [ ] 实验加载计划/配置/创新/表/图；旧 SAM 静态常量和 store 业务副本退役。
- [ ] 写作/翻译移除独立 ensureWritingProjectId 和 localStorage 项目键，必须用当前项目；传入真实 inputArtifactIds；移除 fillFromExperiment 自动注入旧 Demo。
- [ ] 投稿从当前论文产物恢复 review/rebuttal/decision；移除独立 mock 作为事实源的路径。
- [ ] 共享按钮成功后刷新相应 queries/hydration，不只更新项目摘要。切换项目时取消/忽略旧请求，避免返回结果覆盖新项目。
- [ ] 用户修改通过保存版本接口持久化；载入、切换或覆盖草稿前明确处理未保存内容。

验收：选择 A→载入→四模块都是 A；再选择 B，无 A 内容残留；写作请求在 B 执行且 inputs 可追踪；刷新后当前内容一致。

## 6. R5：对话显示与文件访问

- [ ] 将 CurrentPaperCard 接到真实 chat/thread 窗口，显示论文简述、四阶段状态、最近保存和文件入口。
- [ ] 为 .navivisor/conversations 中 UI 事件增加分页读取 API；载入/保存/生成后持久化摘要卡片，恢复时按 eventId 去重。
- [ ] UI 事件与 Codex turn 明确区分；卡片保存 projectId/runId/artifactIds/summary，不能伪造模型已执行。
- [ ] 点文件打开现有预览器，支持 CSV/MD/PNG/PDF 和版本来源；不把全文和 base64 注入对话。
- [ ] Codex bridge 基于当前项目 manifest 读取输入，绑定正确 cwd；跨机器原 thread 不可恢复时仍可展示导出对话并创建新 thread。

验收：目录载入后对话出现简要描述和有效文件链接；刷新/服务重启不丢失、不重复；A 对话不显示 B 的数据。

## 7. R6：生成能力与真实性

- [ ] 模拟标记由输入依赖推导并传播到 run/artifact/论文/投稿；前端不能手动关闭以伪装真实。
- [ ] GPT 生图调用走已有 Codex 能力链，保存真实调用来源；完成 R3 两张图和后续重生成。不可用则保存 unavailable/needs_credentials 和原因，继续其他任务。
- [ ] LaTeX 使用后端确定性 worker，隔离构建目录、限制超时/资源、关闭 shell escape，按文件白名单取输入；成功后生成 PDF artifact、日志和源码包；做渲染检查。
- [ ] 文献和引用检查：synthetic 仅允许教学模拟；真实来源需要查验，下载失败保存状态。真实检索适配器将查询翻译为对应来源格式，不能把 Scopus 语法直接发 OpenAlex。
- [ ] 真实 runner 若无数据/硬件，保留 unavailable；后续真实执行必须有数据划分、seed、依赖/代码/模型版本、原始指标和日志。不得以模拟数据冒充训练成功。
- [ ] 投稿生成三位审稿意见与逐条回应落盘；新实验建议保持 planned，只有取得证据才更新状态。没有外部提交授权只生成本地包和模拟审稿。

完成声明分开写：软件闭环是否完成、Demo 包是否完整、哪些真实能力不可用。任何一项阻塞不能把整表标完成。

## 8. R7：必须通过的验收

先完成有意义的 workspace service/导入契约测试，再跑实际本机服务和浏览器。使用临时测试项目，不修改用户论文或示例包本体。

- [ ] 新目录创建 Demo 副本→注册→载入→四模块内容和对话文件链接可核对。
- [ ] 重复/并发载入不重复；文件改坏而 manifest 未改也能检测。
- [ ] 乱序 manifest 正确拓扑执行；缺上游、自引用、环、重复 key、坏 role/schema 被阻断。
- [ ] 占位或缺必需图/PDF时下游不完成，已有可读数据仍可展示。
- [ ] 写盘/数据库中途失败→重启→恢复/补偿→重试不重复、不留下假完成。
- [ ] 外部编辑→保存新版本→旧下游仍引用旧文件；未保存草稿不丢。
- [ ] 双项目切换含迟到网络响应不串线。
- [ ] 刷新、服务重启及空 SQLite 注册复制目录恢复 runs/artifacts/对话。
- [ ] 损坏 project.json、符号链接逃逸、超大文件和媒体伪装被拒绝且不覆盖原文件。
- [ ] 前后端生产构建、相关测试及 git diff --check 通过；浏览器无新增错误。

建议检查命令：`pnpm build`、`pnpm --dir web build`、`pnpm exec vitest run src/research-workflow`、`pnpm --dir web test`、`git diff --check`。必要时再跑后端全套测试，既有 Windows symlink/文件边界问题与本次回归分别记录。避免直接使用带 --fix 的 lint 脚本修改无关文件。

历史参考仅供比较：a612f9f 时定向 9/9 和前后端 tsc 通过，没有端到端通过证据；执行者必须补新测试，不能继续拿 9 项路径/validator 测试宣称 importer 已验收。

## 9. 直接交给新 AI 的执行指令

> 请阅读本仓库 docs/four-module-workflow-migration-todo.md，按 R1–R7 完整实现剩余任务。先检查当前 Git 状态与代码，复用已实现基础设施，保留所有用户改动。目标是一篇论文一个工作目录，首页选择后四模块和对话共用该项目，从目录一键载入 Demo 并真实展示内容，支持版本、刷新、重启、幂等及目录迁移恢复。
>
> 重点逐项完成第 4 节 Demo 数据缺口：不是仅创建空文件或按钮，而是补完整实验方案/结果/模拟代码、论文全部章节、有效 GPT 图片和实际编译 PDF；将遗漏的指标、引用、章节和审稿文件纳入 manifest，校验格式、依赖、哈希及模拟标记。GPT/模板/运行环境缺失时先查可用能力，如实记录阻塞并继续独立任务，不造假。
>
> 修复存储与导入器的已知问题后接 UI；每完成一项更新本文件状态及测试结果，不另写中间报告。必须运行对应单测和浏览器端到端流程，不能只靠 tsc、文件存在或提交标题宣布完成。未授权不要 commit/push，不进行外部投稿。最后列出实际完成项、验证结果和不可完成项的具体原因。

执行记录（后续直接追加到相应 R 节）：尚未开始新一轮实现。本次仅收敛剩余计划与补查 Demo 内容，不代表上述问题已修复。
