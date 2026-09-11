# 开题模块合并指南

本文用于把 `feat/research-topic` 的开题模块安全合入 `main`，并让实验、写作、投稿模块能在不互相覆盖的前提下继续集成。

## 1. 合并目标与原则

- 合并入口是 GitHub Pull Request：`feat/research-topic` -> `main`。不要直接在 `main` 开发或提交。
- 本分支只提供开题三步页面、第一阶段 OpenAlex 试检索，以及两阶段检索工具/契约说明。
- 保留 `main` 已有的应用壳：深色左栏、顶栏、连接状态栏和其它模块路由；不要用开题页替换实验、论文或投稿页面。
- 不提交用户检索数据、PDF、CSV、BibTeX、运行日志、fixture、凭证或本机路径。运行数据统一在 `work/research-topic/runs/`，并由 `.gitignore` 排除。

## 2. 本分支包含什么

| 区域 | 文件/目录 | 合并后的职责 |
| --- | --- | --- |
| 后端 | `src/research-topic/` | 第一阶段任务接口、OpenAlex 分页、去重、状态、CSV/manifest 落盘。 |
| 后端注册 | `src/app.module.ts` | 注册 `ResearchTopicModule`；保留其它模块注册。 |
| 开题前端 | `web/src/components/research-topic/` | 三步开题工作区与第一步试检索展示。 |
| 前端路由 | `web/src/routes/router.tsx` | 仅新增 `/research/topic` -> `TopicPage`。 |
| 可复用工具 | `research-tools/` | 首次检索和核心文献包的契约、使用说明、校验工具。 |
| 忽略规则 | `.gitignore` | 排除运行数据与 Python 字节码缓存。 |

当前不包含：Scopus 已授权 adapter、两源真实合并、三个候选题实际生成、核心文献实际下载、OA PDF/BibTeX 实际生成、实验方案、论文写作、投稿或 Codex CLI 调度。

## 3. 推荐合并顺序

1. 在 GitHub 创建从 `feat/research-topic` 到 `main` 的 Pull Request，并以此文档做 review 清单。
2. 合并后端：先加入 `src/research-topic/`，再只在 `src/app.module.ts` 追加 `ResearchTopicModule` 注册。
3. 合并前端组件：加入 `web/src/components/research-topic/`，不替换共享 `AuthenticatedLayout` 或全局视觉样式。
4. 合并路由：在 `web/src/routes/router.tsx` 保留 `main` 和其它功能分支已有的 imports/routes，只增加开题页面路由。
5. 合并 `research-tools/`、`.gitignore` 和本文件；确认没有把 `work/` 下的运行结果带进 PR。
6. 解决冲突并验证后再合并 PR；不要通过复制整份 `router.tsx`、`app.module.ts` 的方式解决冲突。

## 4. 容易冲突的文件与处理规则

| 文件 | 冲突处理 |
| --- | --- |
| `src/app.module.ts` | 保留所有既有 module imports；只追加 `ResearchTopicModule`，不得删除实验、写作或投稿模块。 |
| `web/src/routes/router.tsx` | 保留所有既有 routes；确保 `/research/topic` 指向 `TopicPage`。不要改动 `/research/paper`、投稿或实验路由的组件指向。 |
| `.gitignore` | 只合并新增的 `work/research-topic/runs/` 与 `__pycache__/` 忽略规则，不覆盖主干已有规则。 |
| `research-tools/contract.md` | 这是跨模块的文献交接契约。若后续模块要扩展字段，应向后兼容、记录版本，并避免重命名已消费字段。 |

若两个分支同时修改同一个共享文件，应由集成人员逐行合并；不要选择“使用当前分支的全部内容”或“使用传入分支的全部内容”。

## 5. 模块交接边界

### 开题模块提供

- 页面路由：`/research/topic`。
- 后端接口：
  - `POST /api/research/topic/first-search`
  - `GET /api/research/topic/tasks/:runId`
  - `DELETE /api/research/topic/tasks/:runId`
- 首次检索数量：`300–800`，默认 `300`；页面只展示前 20 条，完整 CSV 与 manifest 写入当前 run 目录。
- 第一阶段检索产物和跨来源交接格式：见 `research-tools/contract.md` 与 `research-tools/first-search/README.md`。

### 后续模块消费规则

- 候选题模块只能基于检索得到的元数据、摘要、来源状态和去重结果生成三个**待核验**候选题：偏可行、偏创新、偏平衡。
- 核心文献模块只在用户确认候选题后启动；目标数量为 `100–300`，默认 `100`。其工具说明见 `research-tools/core-literature/README.md`。
- 实验模块只读取已确认课题、文献引用信息、合法 PDF 状态/相对路径与 handoff；不得把“存在 PDF 路径”当作“已读全文”或“实验结论已验证”。
- 写作和投稿模块不能改变开题模块的检索原始记录；它们应引用已确认的版本与来源状态。

## 6. 合并验收

在合并 PR 前，至少完成以下检查：

```powershell
# 仓库根目录：开题检索服务定向测试
pnpm exec vitest run src/research-topic/research-topic.service.spec.ts

# 首次检索工具的离线契约校验
python research-tools/first-search/validate_source_contract.py --self-test

# 前端生产构建（Windows）
cd web
.\node_modules\.bin\vite.cmd build
```

人工检查：

1. 打开 `/research/topic`，能看到“实验研究方向 → 交叉研究候选课题选取 → 核心文献智能分析”三步流程。
2. 第一阶段输入、加载、取消、完成、空结果和失败提示均可见；界面不把 OpenAlex、Scopus、PDF 或候选题未完成能力伪装为已完成。
3. 结果运行目录不出现在 `git status` 的暂存清单中；PR 不含 CSV、Bib、PDF、`work/`、`__pycache__/` 或凭证。
4. 路由仍可进入实验、论文与投稿模块；它们没有被开题模块替换。

全量测试若因现有本机依赖（例如 `better-sqlite3` 原生绑定）失败，应单独记录环境问题；不能把该失败直接归因于开题模块，也不能把它当作已通过全量验收。

## 7. 相关文档

- 开题页面与路由协作说明：`web/src/components/research-topic/README.md`
- 检索工具总说明：`research-tools/README.md`
- 数据/交接契约：`research-tools/contract.md`
- 首次检索工具：`research-tools/first-search/README.md`
- 核心文献工具：`research-tools/core-literature/README.md`
