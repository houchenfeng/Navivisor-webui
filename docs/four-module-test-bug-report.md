# 四模块测试与缺陷报告

> **用途**：四模块联测结果与缺陷记录（历史快照）。  

更新日期：2026-09-11

## 1. 测试范围与环境

- Windows 本地生产构建，Codex app-server 正常初始化。
- 桌面视口及 390×844 移动视口。
- 使用临时 API key 和临时 SQLite，未使用用户业务数据。
- 覆盖开题、实验、写作、投稿四个前端入口，以及本次两个 PR 与集成分支的兼容性。

## 2. 自动化结果

| 检查 | 结果 |
| --- | --- |
| 根目录 `pnpm build` | 通过（合并 PR 前基线） |
| Research Workflow 定向测试 | 3 个文件、23 项通过（合并 PR 前基线） |
| `web` 的 `pnpm test` | 20 个文件、195 项通过（合并 PR 前基线） |
| 合并写作 PR 后 `web` 的 `pnpm build` | 通过 |
| 合并写作 PR 后 `web` 的 `pnpm test` | 20 个文件、195 项通过 |
| 合并写作 PR 后根目录 `pnpm test` | 37 个文件通过、2 个文件失败；314 项通过、5 项失败 |

写作 PR 原始代码首次构建失败，原因包括错误的 `@/` 根路径假设、使用未安装的 `react-router-dom`、缺少 `jszip`，以及自带 UI 组件依赖与主工程不一致。集成时已修复导入和路由、复用主工程 UI、补充 `jszip`，生产构建恢复通过。

根目录 5 项失败均属于已知 Windows/测试环境问题：workspace root 越界断言受当前环境配置影响、Windows 普通权限无法创建 symlink、`AppModule` 测试缺少 `WEBUI_API_KEY` 且 SQLite 清理遇到 `EBUSY`。本次写作 PR 没有修改这些后端路径；它们与写作模块回归分开记录。

## 3. PR 处理结论

- PR #1（投稿）：唯一提交已存在于 `integration/research-workflow`，不得再次合并；待本分支 push 后应以“已集成到集成分支”为由关闭。
- PR #2（写作）：首个提交原先已存在，后两个提交已合入当前集成分支并完成兼容改造；待 push 后应关闭原 PR，避免它继续直接进入 `main`。
- 两个 PR 的 base 都错误地指向较旧的 `main`。后续四模块 PR 必须以 `integration/research-workflow` 为 base，最终只由该集成分支向 `main` 发起一次总 PR。

## 4. 当前缺陷清单

1. **P0：投稿仍调用旧服务。** `apiClient.ts`、`config/api.ts` 包含 cpolar 地址，`apiService.ts` fallback 到 `localhost:3001`。必须由 TODO-C4 改为统一 Research Workflow/Codex API。
2. **P0：写作 UI 已合入，但模型能力尚未接入统一 Workflow。** 本次已阻止写作生成、翻译、生图和 PDF 编译访问旧 `localhost:3001`；按钮会明确报错。下一步由 TODO-C3 将这些动作映射为 agent run、skill 和 artifact。
3. **P1：写作仍以 localStorage 保存业务草稿。** 当前键 `writing-app:data:v1` 只能视为临时 UI 草稿缓存，不是跨模块真实来源；需改为 project/artifact/version 管理。
4. **P1：开题只实现第一步。** 候选课题与核心文献分析仍标为待接入，无法完整 handoff 到实验。
5. **P1：实验仍为离线 Demo/localStorage。** 尚未从统一 project/artifact 恢复，也不能形成可靠的跨模块交接。
6. **P1：投稿 AI Assist 缺少前置条件反馈。** 未选择 PDF 时点击不会显示提示；应提供禁用态或明确错误。
7. **P2：投稿移动端横向溢出。** 390×844 下 OpenReview 顶栏和步骤条超出视口。

## 5. 四模块烟雾测试摘要

| 模块 | 页面状态 | 当前结论 |
| --- | --- | --- |
| 开题 | 页面可加载，第一步可操作 | 部分可用，artifact handoff 未完成 |
| 实验 | Demo 可导入并生成方案 | Demo 可用，统一数据管理未完成 |
| 写作 | 完整分步 UI 已合入，构建通过 | 手工编辑可用，模型/数据/编译仍待统一接入 |
| 投稿 | 页面和表单可访问 | UI 可用，旧服务链和移动端问题未修复 |

## 6. 回归要求

- 每次模块分支更新后先合并到临时集成分支，运行根目录构建/测试及 `web` 构建/测试。
- 搜索并阻断新增的 cpolar、硬编码 localhost、模块专属模型 SDK 和未经 Workflow 管理的业务 localStorage。
- 浏览器回归至少覆盖四个路由、桌面与 390×844、刷新恢复、错误态、审批/用户输入及跨模块 artifact handoff。
- 修复结果直接更新本文件对应条目的状态和证据，不再写入架构 TODO，也不另建中间报告。
