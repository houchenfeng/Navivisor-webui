# OpenAlex 本地接入与检索交接文档

> 用途：交给协作者本地的 AI，使其能够让本地页面通过后端安全调用 OpenAlex，完成开题试检索和核心文献检索。
>
> 适用项目：Navivisor WebUI
>
> 重要：本文档只说明配置方式和接口契约，不包含任何真实 API Key。API Key 必须由协作者在自己的本地环境中配置。

## 一、给本地 AI 的任务说明

请在本地项目中完成以下工作：

1. 阅读项目根目录的 `AGENTS.md`、`README.md` 和现有 Research Topic 模块。
2. 让页面通过本地后端调用 OpenAlex，不要让浏览器直接携带 OpenAlex API Key。
3. 优先复用现有接口 `POST /api/research/topic/first-search`，不要另起一套前端 OpenAlex 请求封装。
4. 使用 OpenAlex OQL 检索语法，而不是把用户原始中文描述直接作为 `search` 参数。
5. 对检索结果进行数量检查、去重和查询过程记录。
6. 当第一轮结果不足时，自动扩大关键词范围；每次扩大都要保存使用过的 OQL 和切换原因。
7. 不要把 API Key 写进前端源码、浏览器 localStorage、CSV、日志、截图、Git 提交或错误提示。
8. 修改前先检查 Git 状态，保留协作者已有的无关改动。

完成判定：本地页面输入研究方向后，可以通过同源后端启动检索；后端实际访问 `api.openalex.org`；页面能够看到任务状态和检索结果；OpenAlex 失败时页面能显示可理解的错误信息。

## 二、API Key 配置

在后端项目根目录的 `.env` 中配置：

```env
OPENALEX_API_KEY=协作者自己的OpenAlex_API_Key
```

不要把真实 Key 写入 `.env.example`。`.env` 必须被 Git 忽略。

API Key 的获取流程：

1. 打开 [OpenAlex](https://openalex.org/) 并登录账号。
2. 进入个人设置或 API Key 页面。
3. 创建或复制自己的 API Key。
4. 只将 Key 写入后端运行环境的 `.env`。
5. 修改 `.env` 后重启后端，使配置重新加载。

如果没有 API Key，也可以访问 OpenAlex 的公开 API，但请求额度和稳定性可能较低。不能因为无 Key 就把 Key 暴露到前端作为临时方案。

## 三、推荐架构

```text
浏览器页面
  -> 本地后端 /api/research/topic/first-search
  -> 后端读取 OPENALEX_API_KEY
  -> 后端生成 OQL
  -> https://api.openalex.org/?oql=...
  -> 后端去重、记录检索过程、保存结果
  -> 页面轮询任务状态并展示结果
```

浏览器只知道本地后端地址和 `runId`，不应该知道 OpenAlex API Key，也不应该直接拼接 OpenAlex 请求。

## 四、现有后端接口契约

### 4.1 创建第一阶段检索任务

请求：

```http
POST /api/research/topic/first-search
Content-Type: application/json
```

请求体示例：

```json
{
  "researchInterest": "我想研究视频异常检测，关注摄像头视频中的异常事件识别和定位",
  "context": "希望了解公开数据集、主流方法和可行的本科生研究方向",
  "targetCount": 100
}
```

字段要求：

- `researchInterest`：必填，用户的研究兴趣或研究方向描述。
- `context`：可选，研究目标、数据集、应用场景等上下文。
- `targetCount`：可选，期望收集的结果数量；不得把它理解成保证数量。

接口返回任务对象，其中包含 `runId`。页面随后查询：

```http
GET /api/research/topic/tasks/{runId}
```

### 4.2 生成候选课题

第一阶段检索完成后：

```http
POST /api/research/topic/tasks/{runId}/candidates
```

### 4.3 生成核心文献

用户确认候选课题后：

```http
POST /api/research/topic/tasks/{runId}/core-literature
Content-Type: application/json
```

请求体示例：

```json
{
  "label": "基于场景记忆与大模型复核的快慢双通路视频异常检测"
}
```

核心文献阶段会把原始研究方向和确认后的候选课题合并，再执行自适应 OpenAlex 检索。

## 五、OpenAlex OQL 要求

主题检索必须使用：

```text
works where title/abstract has ("命名变体1" or "命名变体2") and title has (not ("排除词1" or "排除词2"))
```

不要直接把下面这种用户原文作为 OpenAlex 检索式：

```text
我想研究视频异常检测，关注摄像头视频中的异常事件识别和定位
```

以视频异常检测为例，第一层可以是：

```text
works where title/abstract has ("video anomaly detection" or "video anomaly localization" or "abnormal event detection" or "surveillance video anomaly detection") and title has (not ("medical image" or "industrial anomaly" or "network intrusion" or "audio anomaly" or "time series anomaly"))
```

请求 OpenAlex 时，将 OQL 放在 `oql` 查询参数中：

```text
https://api.openalex.org/?oql=<URL_ENCODED_OQL>&per-page=100&select=id,title,authorships,primary_location,publication_year,cited_by_count,abstract_inverted_index,doi
```

必须对 OQL 使用 URL 编码，不要手动拼接未编码的空格、引号或括号。

## 六、自适应检索规则

检索必须采用“从窄到宽”的分层策略。

### 第一层：focused

目标是获得高相关性结果，关键词少而明确，同时排除明显跨领域噪声。

视频异常检测示例：

- `video anomaly detection`
- `video anomaly localization`
- `abnormal event detection`
- `surveillance video anomaly detection`

### 第二层：balanced

如果第一层去重后结果不足，补充该领域常见但稍宽的表达：

- `video abnormal event detection`
- `surveillance video analysis`
- `anomaly detection in surveillance videos`

### 第三层：broad

如果前两层仍不足，再使用保底主题词，避免完全无结果：

- `video anomaly detection`
- `anomaly detection`
- `abnormal event detection`
- `video surveillance`
- `surveillance video`

### 切换判定

每轮至少记录以下信息：

- `tier`：`focused`、`balanced` 或 `broad`；
- `oql`：实际发送给 OpenAlex 的完整 OQL；
- `includeTerms`：主题命名变体；
- `excludeTitleTerms`：标题排除词；
- `matchedCount`：OpenAlex `meta.count`；
- `returned`：本页返回数量；
- `deduplicated`：当前累计去重数量；
- `reason`：为什么继续当前层或切换下一层。

建议逻辑：

```text
使用 focused
  -> 读取 meta.count，分页获取结果并按 DOI/OpenAlex ID 去重
  -> 如果累计去重结果达到 targetCount：结束
  -> 如果结果不足：记录 fallback，切换 balanced
  -> 如果仍不足：记录 fallback，切换 broad
  -> broad 完成后仍不足：保留实际数量，不伪造“已达到目标”
```

不要因为 `meta.count` 很大就直接声称结果都相关。数量检查只能决定是否需要扩大范围，不能替代人工核验和后续相关性筛选。

## 七、去重和结果字段

优先使用以下顺序去重：

1. DOI；
2. OpenAlex Work ID；
3. 没有 DOI 和 ID 时，不应仅凭标题草率合并，至少保留来源 URL 供人工检查。

结果至少保留：

- OpenAlex ID；
- 标题；
- 作者；
- 期刊、会议或来源；
- 发表年份；
- 引用数；
- 摘要；
- DOI；
- OpenAlex 页面或落地页 URL；
- `sourceStatus: openalex_public_api`；
- 本轮使用的 OQL 和检索层级。

摘要通常以 `abstract_inverted_index` 返回，需要在后端还原成普通文本后再交给页面或候选课题生成逻辑。

## 八、前端接入要求

前端页面应该：

- 调用本地同源 `/api/research/topic/...` 接口；
- 显示排队、运行、完成、失败、已取消等状态；
- 显示“正在扩大检索范围”而不是假装一次查询就得到全部结果；
- 在结果不足时明确显示实际数量；
- 允许用户查看当前 OQL、关键词、排除词和切换原因；
- 不显示 API Key；
- 不把教学示例数据标记成真实 OpenAlex 结果。

前端不应出现：

```ts
const OPENALEX_API_KEY = '...';
fetch('https://api.openalex.org/...');
```

## 九、本地启动与验证

后端项目根目录执行：

```powershell
pnpm install
pnpm start:dev
```

前端目录执行：

```powershell
cd web
pnpm install
pnpm dev
```

验证顺序：

1. 检查后端启动日志没有环境变量或网络错误。
2. 在页面输入“视频异常检测”。
3. 点击开始检索。
4. 检查浏览器请求只发送到本地后端。
5. 检查后端日志或任务结果中存在 OpenAlex OQL、`matchedCount` 和去重数量。
6. 检查结果中存在标题、作者、年份、摘要、DOI 或来源链接。
7. 使用一个明显无结果或极窄的方向，确认系统会记录并切换到下一层检索。
8. 使用一个较宽的方向，确认页面不会把大量结果直接宣称为“核心文献”，而是先作为候选文献并保留来源状态。

构建验证：

```powershell
# 后端
pnpm build

# 前端
cd web
pnpm exec vite build
```

构建通过只证明代码可以构建，不等于 OpenAlex 网络访问、API Key 有效或文献已经人工核验。三者需要分别验证。

## 十、禁止事项

- 不要把 API Key 提交到 GitHub。
- 不要把 API Key 写入前端、浏览器存储、截图或 Markdown 示例。
- 不要绕过 OpenAlex 登录、额度、robots 或版权限制。
- 不要把 OpenAlex 摘要当作论文全文。
- 不要把自动生成的候选课题当作已经证实的创新点。
- 不要在结果不足时复制论文、补造论文或伪造“已达到目标数量”。
- 不要为了接入 OpenAlex 重新创建第二套项目工作流、文件根目录或 API 客户端。

## 十一、交付报告格式

本地 AI 完成后，请向人类协作者报告：

```text
已完成：
- 修改文件：...
- API Key 配置位置：仅后端 .env，未写入代码或前端
- 页面调用接口：...
- OpenAlex 请求方式：OQL / endpoint ...
- 自适应检索：focused -> balanced -> broad
- 去重标识：...

已验证：
- 后端构建：通过/失败，原因...
- 前端构建：通过/失败，原因...
- 实际 OpenAlex 请求：通过/失败，HTTP 状态...
- 页面真实用户路径：已验证/未验证

已知限制：
- ...
```
