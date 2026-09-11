# 文献检索共同契约

OpenAlex 与 Scopus 都实现同一个“第一次文献检索”任务。来源适配器可以增加自己的配置，但不得改变下列上层输入、状态和输出格式。

## 输入

```json
{
  "runId": "由后端生成的任务标识",
  "researchInterest": "用户提供的研究兴趣",
  "context": "研究对象、场景、资源等上下文",
  "yearRange": { "from": 2022, "to": 2026 },
  "documentTypes": ["article", "conference-paper"],
  "sourcePolicy": { "preferred": "openalex", "allowScopus": false },
  "selection": { "targetCount": 300 }
}
```

`sourcePolicy` 表达来源选择，不等于权限已具备。第一次检索的 `selection.targetCount` 必须为 300–800，默认 300；第二阶段核心文献打包的 `selection.targetCount` 必须为 100–300，默认 100。来源可以扩展自己的配置，例如 OpenAlex 的会议 source、OQL 或分页选项；Scopus 的 API 版本、检索字段和权限状态也必须作为适配器配置保存。

## 状态

任务状态统一使用：`queued`、`running`、`completed`、`failed`、`cancelled`、`unavailable`、`needs_credentials`。

`completed` 只代表任务按当前权限完成落盘，不代表论文已阅读、研究空白已证实或创新性已证明。

当实际去重结果少于目标数量时，任务仍可完成落盘，但 `counts.targetReached` 必须为 `false` 并在 `warnings` 中说明 `insufficient_results`；不能补造论文。

## 第一阶段文件

成功或部分失败的任务都应保留真实状态，目标文件为：

- `first-search-papers.csv`
- `candidate-topics.csv`
- `first-search-analysis.md`
- `query-plan.json`
- `manifest.json`

文献 CSV 至少包含：标题、作者、机构、期刊/会议、年份、引用量、摘要、DOI、来源链接、来源状态。候选方向固定为 `偏可行`、`偏创新`、`偏平衡`，且新颖性必须标为 `candidate_pending_verification`。

## manifest

```json
{
  "runId": "run-example",
  "stage": "first-search",
  "status": "unavailable",
  "files": [],
  "counts": { "papers": 0, "candidates": 0 },
  "errors": [],
  "sourceQueries": [],
  "createdAt": "2026-01-01T00:00:00Z"
}
```

`files` 和所有 manifest 路径只能使用任务目录内的相对路径。`sourceQueries` 应保留来源、查询参数、分页/重试信息和结果状态；不得写入 API Key、账号或本机绝对路径。

第二阶段核心文献包使用独立目录，至少包含 `references.csv`、`references.bib`、`pdf/`、`download-report.json`、`handoff.md` 和 `manifest.json`。PDF 必须是通过合法 OA URL 和内容校验的文件；PDF 路径存在不代表已阅读或验证结论。

## 后端返回与前端边界

后端向前端返回 `runId + status + files + errors`，必要时通过轮询或事件订阅提供更新。前端只提交用户输入和来源策略、展示状态和文件元数据；不得直接持有 API Key、调用外部学术数据库、下载受限全文或执行 CLI。
