# 开题、写作、投稿模块 Git 协作开发指南

> **用途**：分模块开发时的分支、同步与提交约定。  

本文面向负责“开题”“写作”“投稿”子页面的队友，说明如何同步主分支、创建自己的功能分支、接入页面并提交代码。请勿直接在 `main` 上开发或强制推送。

## 1. 第一次获取仓库

```bash
git clone https://github.com/houchenfeng/Navivisor-webui.git
cd Navivisor-webui
pnpm install
cd web
pnpm install
cd ..
```

已经克隆过仓库的队友，不需要再次 clone。

## 2. 开始开发前同步最新 main

先保存自己尚未提交的修改，然后切回主分支并拉取：

```bash
git status
git switch main
git pull --ff-only origin main
```

`--ff-only` 可以避免一次普通拉取意外产生无意义的 merge commit。如果 `git status` 显示有未提交修改，请先提交到已有个人分支，或使用 `git stash push -u -m "临时保存"`；不要丢弃别人的文件。

## 3. 为自己的模块创建分支

每位队友只选择自己负责的模块。推荐分支名：

```bash
# 开题模块
git switch -c feat/research-topic

# 写作模块
git switch -c feat/research-writing

# 投稿模块
git switch -c feat/research-submission
```

如果同一模块由多人开发，在末尾增加功能名，例如：

```bash
git switch -c feat/research-writing-editor
git switch -c feat/research-submission-journal-match
```

## 4. 页面入口和文件位置

三个现有入口都在 `web/src/routes/router.tsx`：

| 模块 | 左侧按钮 | 路由 | 当前状态 |
|---|---|---|---|
| 开题 | 开题 | `/research/topic` | `ResearchModuleRoute` 占位页 |
| 写作 | 写作 | `/research/paper` | `ResearchModuleRoute` 占位页，代码内名称目前为“论文” |
| 投稿 | 投稿 | `/research/submit` | `ResearchModuleRoute` 占位页 |

通用占位组件位于 `web/src/routes/research-module-route.tsx`。不要把三个完整模块都继续写入这个通用文件，否则多人协作时很容易冲突。每个模块应建立自己的目录：

```text
web/src/components/
├── research-topic/
│   └── topic-page.tsx
├── research-writing/
│   └── writing-page.tsx
└── research-submission/
    └── submission-page.tsx
```

复杂模块可以继续拆分 `components/`、`stores/`、`types.ts` 和 `data.ts`，但页面顶层组件应保持单一明确的导出。

## 5. 将自己的页面接入路由

以下示例以“开题”为例。

创建 `web/src/components/research-topic/topic-page.tsx`：

```tsx
export function TopicPage() {
  return (
    <main className="min-h-0 flex-1 overflow-auto p-6">
      <h1 className="text-2xl font-semibold">开题智能体</h1>
      <p className="mt-2 text-muted-foreground">在这里实现开题模块。</p>
    </main>
  );
}
```

然后修改 `web/src/routes/router.tsx`：

```tsx
import { TopicPage } from '@/components/research-topic/topic-page';

const proposalRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/research/topic',
  component: TopicPage,
});
```

写作和投稿采用同样方式：

```tsx
import { WritingPage } from '@/components/research-writing/writing-page';
import { SubmissionPage } from '@/components/research-submission/submission-page';

// /research/paper   -> component: WritingPage
// /research/submit  -> component: SubmissionPage
```

只替换自己负责路由的 `component`，不要改变路径。左侧导航已经依赖这些固定路径。

## 6. 开发约定

- 优先复用 `web/src/components/ui/` 中已有的 Button、Dialog、Input、Textarea、Badge 等组件。
- 使用 `@/` 别名导入 `web/src` 下的文件。
- 页面必须保留 `min-h-0 flex-1 overflow-auto`，避免嵌入主布局后无法滚动。
- 不要修改实验模块 `web/src/components/research-experiment/`，除非任务明确要求。
- Demo 数据与 UI 状态分开存放；跨页面状态推荐放入 `web/src/stores/`。
- 新增交互后至少覆盖：正常状态、空状态、加载状态和错误状态。
- 提交前不要把密钥、数据库、模型权重、构建产物或本地绝对路径加入 Git。

## 7. 本地检查

前端类型检查、生产构建和测试：

```bash
cd web
pnpm build
pnpm test
```

开发模式可运行：

```bash
pnpm dev
```

然后根据终端显示的地址访问，并检查自己的固定路由。至少确认：页面不是白屏、控制台没有新增错误、左侧导航可以进入页面、窄屏下可以滚动。

## 8. 提交并推送个人分支

先确认提交范围，只加入自己负责的文件：

```bash
git status
git diff
git add web/src/components/research-topic web/src/routes/router.tsx
git commit -m "feat(topic): implement research proposal module"
git push -u origin feat/research-topic
```

写作和投稿队友需要把目录、分支名和提交信息替换为自己的模块。例如：

```bash
git add web/src/components/research-writing web/src/routes/router.tsx
git commit -m "feat(writing): implement paper writing module"
git push -u origin feat/research-writing
```

## 9. 提交 Pull Request

在 GitHub 创建 PR：

- Base：`main`
- Compare：自己的功能分支
- 标题示例：`feat(topic): implement research proposal module`
- 描述中写清页面入口、实现功能、Demo 操作步骤和验证结果。
- 附页面截图；若有未完成项或模拟数据，必须明确说明。

不要自行合并存在冲突或检查失败的 PR。

## 10. main 更新后的分支同步

开发期间如果 `main` 有新提交：

```bash
git fetch origin
git switch feat/research-topic
git rebase origin/main
```

解决冲突后逐个加入已解决文件并继续：

```bash
git add <已解决的文件>
git rebase --continue
```

已经推送过且 rebase 改写了个人分支历史时，只允许对自己的功能分支执行：

```bash
git push --force-with-lease
```

禁止对 `main` 使用强制推送。若不熟悉 rebase，可在群里请求协助后再继续。

## 11. 多人同时修改 router.tsx 时的冲突处理

`router.tsx` 是最可能冲突的共享文件。处理原则：

1. 同时保留其他队友新增的 import。
2. 只把自己负责路由的 `component` 改为新组件。
3. 不删除实验模块路由或其他模块路由。
4. 解决后重新执行 `pnpm build` 和 `pnpm test`。

最终目标应类似：

```text
/research/topic   -> TopicPage
/research/paper   -> WritingPage
/research/submit  -> SubmissionPage
```

这样三个模块可以独立开发、独立评审，并在合并后共享同一套左侧导航和主页面布局。
