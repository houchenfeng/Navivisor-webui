# 开题模块协作说明

GitHub 个人分支：`feat/research-topic`。固定入口：`/research/topic`。

## 当前权威规格

- 页面壳来源：当前仓库已合并的 Codex WebUI `AuthenticatedLayout`，包括深色左栏、深色顶栏和红色连接状态栏；本目录不重做这些共享部分。
- 右侧工作区唯一视觉母版：原始交接材料中的 `opening-frontend/src/App.tsx`、`opening-frontend/styles.css` 设计产物。
- 三步流程唯一名称：`实验研究方向` → `交叉研究候选课题选取` → `核心文献智能分析`。
- OpenAlex 真实试检索只属于第一步；完成试检索不等于候选课题或核心文献分析完成。
- 当前未实现：候选课题生成、核心文献包、PDF/BibTeX、实验方案和 Codex CLI 调度。

旧五步概念图、暖白/绿灰工作台、实验页截图不是当前页面流程，不应恢复到本模块。

## 目录边界

本目录只负责开题三步页面和第一步 OpenAlex 试检索展示。后端 adapter 位于 `src/research-topic/`；来源共用格式见 [`research-tools/contract.md`](../../../../research-tools/contract.md)。不修改实验、写作、投稿或共享布局。

## 运行与验证

```powershell
cd <repository-root>
pnpm start:dev
cd web
pnpm dev
```

打开 `/research/topic`，在第一步输入研究方向，点击“开始试检索”。后端接口为 `POST /api/research/topic/first-search`、`GET /api/research/topic/tasks/:runId` 和 `DELETE /api/research/topic/tasks/:runId`。真实输出写入相对目录 `work/research-topic/runs/<runId>/`，当前只包含 `first-search-papers.csv` 与 `manifest.json`。

验证应运行：根目录 `pnpm build`、`pnpm test`，以及 `web/` 内 `pnpm build`、`pnpm test`。页面须检查第一步输入、加载、取消、完成、空结果和失败重试；论文必须显示标题、年份、作者/来源、摘要节选、DOI/OpenAlex 链接及“真实元数据 · 待核验”。

## 接入与协作

前端只使用同源后端任务接口，不持有 API Key、不直连 OpenAlex、不调用 CLI。OpenAlex 是当前默认的公开元数据来源；Scopus 仍是 `状态：待授权（不可在当前环境直接运行）`，不能在页面中伪装为已接入。

实验、写作协作者如需消费开题结果，只读使用 `TopicHandoff`/统一契约中的 confirmed topic、用户边界、来源状态和 runId；投稿协作者只消费后续论文草稿与教学模拟状态。不要复制开题业务实现。

`router.tsx` 是共享文件，合并冲突时只保留其他人的 import 和 route，仅确保 `/research/topic` 的 component 指向 `TopicPage`；不得改 `/research/paper`、`/research/submit` 或实验路由。

## 当前完成度与下一阶段接口口径

已接通：OpenAlex 单源第一阶段试检索，返回可用元数据与可能缺失的摘要，生成 `first-search-papers.csv`、`manifest.json`。当前 MVP 兼容输出位置是 `work/research-topic/runs/<runId>/`；下一阶段统一使用 `work/research-topic/runs/<firstSearchRunId>/first-search/`，所有 manifest 路径均相对当前 run directory。

未接通：Scopus adapter（当前无合法 API/机构凭证）、两源去重合并、根据带来源摘要生成三个候选题、用户确认后的核心文献深检索、OA PDF、BibTeX 和实验模块自动消费。OpenAlex 只能提供书目信息、摘要和 OA location，不承诺每篇都有完整摘要或 PDF；Scopus 的唯一待办是授权接入，当前状态必须是 `needs_credentials`。

最终接口流程：第一次检索在合法授权后可采用 OpenAlex + Scopus，并按 DOI、再 OpenAlex/Scopus ID 去重，保留 `sourceProvenance` 与摘要缺失状态；候选题固定为“偏可行 / 偏创新 / 偏平衡”且标记 `candidate_pending_verification`；用户确认后才进入 `core-literature`。实验协作者只读消费确认课题、`references.csv` 的摘要/来源状态、有效 PDF 相对路径和 `handoff.md`，不得把有路径当成已读全文或实验结论已验证。详见 [`research-tools/contract.md`](../../../../research-tools/contract.md)。

## 参考与兼容性

已实际只读参考：`origin/main` 的 `web/src/routes/router.tsx`、`web/src/routes/research-module-route.tsx`、`web/src/routes/authenticated-layout.tsx`、`web/src/index.css`、`web/src/components/ui/button.tsx`；`origin/feat/research-writing` 的 `web/src/components/research-writing/writing-page.tsx` 与 `web/src/routes/router.tsx`。借鉴页面导出、布局滚动、既有 UI 和最小路由接法；没有复制相邻模块业务实现。`origin/feat/research-writing` 中的投稿页面路径未找到。

视觉与流程权威来源为：`opening-frontend/src/App.tsx`、`opening-frontend/styles.css`、`opening-frontend/README.md`、`outputs/启航科研智能体_开题前端按钮交互逻辑.md`、`outputs/启航科研智能体_开题阶段进度.md` 第 20–24 节。三步前端规格优先于旧五步概念图；其中与当前 MVP 冲突的真实后端/CLI 设想仍以本 README 的“当前未实现”为准。
