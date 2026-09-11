# 开题模块协作说明

GitHub 个人分支：`feat/research-topic`。固定入口：`/research/topic`。

来源方案总说明：[`research-tools/README.md`](../../../../research-tools/README.md)。

## 参考与兼容性

实际参考的分支与文件：`origin/main` 的 `web/src/routes/router.tsx`、`web/src/routes/research-module-route.tsx`、`web/src/routes/authenticated-layout.tsx`、`web/src/index.css` 和 `web/src/components/ui/button.tsx`；`origin/feat/research-writing` 的 `web/src/components/research-writing/writing-page.tsx` 与 `web/src/routes/router.tsx`。借鉴原则是：页面独立目录、顶层组件明确导出、保留 `min-h-0 flex-1 overflow-auto`、复用现有 UI、只替换自己负责路由的 component。未复制其他模块的业务实现；投稿页面目录在该远程分支中未找到。

本目录只负责开题五个学习节点：研究兴趣与边界、检索策略与试搜、证据与研究空白、三个候选方向、用户修改并确认方向。不要把写作、投稿、实验逻辑或全局布局放进这里。

## 运行与验证

```powershell
cd C:\Navivisor-webui\web
pnpm install
pnpm build
pnpm test
```

当前已接通 OpenAlex 第一阶段“试检索”最小闭环：页面输入研究兴趣后由项目后端创建任务，后端固定访问公开 OpenAlex Works API，页面轮询并展示真实返回的论文元数据与摘要节选。它不是 `qihang-first-stage-literature-search` 的完整候选课题产物；本次不生成候选课题、PDF、BibTeX，不调用 Codex CLI，也不接入 Scopus。没有返回结果或网络失败时，页面显示空/错误状态并支持重试。

本地运行：根目录启动后端 `pnpm dev`（默认 API 端口 `8172`），另在 `web/` 执行 `pnpm dev`。接口为 `POST /api/research/topic/first-search`、`GET /api/research/topic/tasks/:runId` 和可选取消接口 `DELETE /api/research/topic/tasks/:runId`；输出保存于项目内相对目录 `work/research-topic/runs/<runId>/`，包含本次的 `first-search-papers.csv` 与 `manifest.json`。服务端限制输入长度、返回数量、超时和重试次数，不向浏览器暴露凭证或文件系统绝对路径。

## 接入接口

`topic-workflow-contract.ts` 导出 `TopicWorkflowClient`、`ResearchTaskSnapshot` 和 `TopicHandoff`。当前页面通过同源 API adapter 接入 OpenAlex；后续服务仍应遵循 `research-tools/contract.md`，不得在组件中写固定外部数据库地址、绝对路径、密钥或 CLI 调用。

实验协作者只读消费 `TopicHandoff` 的 `confirmedTopic`、`boundary`、候选证据状态和 `evidenceRunId`。写作协作者消费 confirmed topic、来源状态和核心文献包。投稿协作者不从开题直接接管，只消费之后生成的论文草稿与教学模拟状态。

## 路由冲突处理

`web/src/routes/router.tsx` 是共享文件。只保留其他队友的 import 和 route，只将 `/research/topic` 的 component 指向 `TopicPage`；冲突解决后重新运行 build/test。不要修改 `/research/paper`、`/research/submit` 或实验路由。

## 状态边界

页面覆盖正常、空、加载、错误、禁用和接口未接入状态。颜色不是唯一状态依据，所有状态同时使用文字和图标说明。没有真实来源的内容不能进入真实论文或研究结论。
