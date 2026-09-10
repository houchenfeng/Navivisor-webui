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

当前页面是可运行的前端教学流程：输入、编辑、页间返回、试搜状态、候选选择位置、方案修改和交接说明均在本地完成。它没有调用真实 AI、Codex CLI、OpenAlex、Scopus、PDF 下载或本地检索服务；示例结果与候选位置均明确标记为教学演示/待核验。

## 接入接口

`topic-workflow-contract.ts` 导出 `TopicWorkflowClient`、`ResearchTaskSnapshot` 和 `TopicHandoff`。后续服务只需实现该接口，再由页面注入 client；不得在组件中写固定端口、绝对路径、密钥或 CLI 调用。

实验协作者只读消费 `TopicHandoff` 的 `confirmedTopic`、`boundary`、候选证据状态和 `evidenceRunId`。写作协作者消费 confirmed topic、来源状态和核心文献包。投稿协作者不从开题直接接管，只消费之后生成的论文草稿与教学模拟状态。

## 路由冲突处理

`web/src/routes/router.tsx` 是共享文件。只保留其他队友的 import 和 route，只将 `/research/topic` 的 component 指向 `TopicPage`；冲突解决后重新运行 build/test。不要修改 `/research/paper`、`/research/submit` 或实验路由。

## 状态边界

页面覆盖正常、空、加载、错误、禁用和接口未接入状态。颜色不是唯一状态依据，所有状态同时使用文字和图标说明。没有真实来源的内容不能进入真实论文或研究结论。
