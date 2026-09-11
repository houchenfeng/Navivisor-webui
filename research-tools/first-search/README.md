# 启航科研智能体｜首次检索与候选题服务交接规范

> 版本：2026-09-11  |  阶段：`first-search`  |  性质：服务层交接契约（非真实检索结果）

## 1. 边界与事实状态

本服务把“研究方向/上下文”转换为可追溯的论文元数据、摘要集合和最多三个候选课题，供开题页面 P02 消费。它不下载 PDF、不生成 BibTeX、不接入 Codex CLI，也不替代核心文献包、实验、写作或投稿模块。

本交接包只完成契约与离线验证草稿。当前没有 Scopus 凭证，因此 Scopus 必须返回 `needs_credentials`；浏览器登录或存在会话不能视为 API 授权。OpenAlex 可用时也不保证每条记录有摘要。候选课题永远是 `candidate_pending_verification`，不代表已证明研究空白或创新。

## 2. 请求接口

建议服务接口：`POST /api/opening/candidates/generate`。

请求 JSON：

```json
{
  "projectId": "project-demo",
  "researchInterest": "计算机视觉中的可解释空间学习",
  "context": {
    "userLevel": "beginner",
    "object": ["视觉模型"],
    "task": ["分类", "解释"],
    "scenario": ["教学数据集"]
  },
  "yearRange": {"from": 2020, "to": 2025},
  "documentTypes": ["journal-article", "conference-paper"],
  "sourcePolicy": ["OpenAlex", "Scopus"],
  "selection": {"targetCount": 300},
  "runRoot": "work/research-topic/runs",
  "runId": "first-search-20260911-001"
}
```

必填：`researchInterest`。服务端生成或校验 `runId`，不得使用绝对路径。`sourcePolicy` 只声明允许尝试的来源，不等于来源可用；未提供数量时只报告实际命中数，不制造固定论文数量承诺。

`selection.targetCount` 是首次检索的目标/上限策略，合法值为 300–800 的整数，默认值为 300。它不是“保证拿到这么多篇”的承诺；服务可以配置为 800，但任何情况下不得输出超过 800 篇。开题个人分支只实现第一阶段 API/UI 适配；本规范是首次检索数量与候选题协议的唯一来源。核心文献包任务负责另一个 `core-literature` 阶段，数量范围为 100–300，并负责 PDF/Bib，不与本服务重复实现。

## 3. 来源状态与适配器结果

每个来源先返回状态，再决定是否合并记录：

| 状态 | 含义 | 是否允许进入合并结果 |
|---|---|---|
| `available` | 已获得合法 API 响应 | 是 |
| `needs_credentials` | 缺少 API 凭证或机构授权（当前 Scopus） | 否，保留状态与错误 |
| `not_requested` | 不在 `sourcePolicy` 中 | 否 |
| `request_error` | 已尝试但网络/API 请求失败 | 否，保留可重试信息 |
| `invalid_response` | 响应无法按适配器契约解析 | 否 |
| `partial` | 有部分可用记录，同时有分页/字段错误 | 是，但必须在 manifest 中告警 |

适配器只负责把来源响应映射成统一 `PaperRecord`，不生成候选题。统一结果至少包含：`sourceName`、`sourceStatus`、`retrievedAt`、`query`、`pages`、`papers`、`errors`。OpenAlex 适配器必须使用 cursor 分页，不能只请求一页；每页不超过来源允许的最大值（当前实现上限 100），达到 `targetCount` 后停止并记录分页计数。Scopus 适配器在无凭证时必须返回 `needs_credentials`，不得发起绕过登录的请求。

来源和去重后的唯一论文少于 300 时，manifest 的 `status`/来源状态应反映 `insufficient_results` 或 `partial`，并记录实际数量、查询、已消费页数和原因。达到 target 后应停止后续分页；若某页原始数量使结果超过 target，只保留不超过 target 的唯一记录，并记录 `target_reached`、原始获取量和去重数量。

统一论文记录：

```json
{
  "sourceName": "OpenAlex",
  "sourceRecordId": "https://openalex.org/W123",
  "doi": "10.1234/example",
  "title": "Example paper",
  "authors": ["Author A"],
  "institutions": ["Example University"],
  "venue": "Example Conference",
  "publicationYear": 2024,
  "citedByCount": 12,
  "abstract": "",
  "landingUrl": "https://doi.org/10.1234/example",
  "abstractStatus": "missing",
  "sourceStatus": "metadata_from_OpenAlex"
}
```

`abstractStatus` 只能是 `available`、`missing` 或 `unparseable`。摘要缺失时保留空字符串，不用标题或模型猜测补摘要。`doi`、机构、来源和链接缺失时留空并保留来源状态。

## 4. 合并、标准化与去重

合并顺序为：来源记录标准化 → DOI 去重 → 无 DOI 时按 OpenAlex ID 去重 → 保留来源证据。DOI 比较需去掉 `https://doi.org/`、大小写不敏感并去除首尾空格；不能用标题相似度静默合并。跨源重复记录保留 `sourceNames` 或来源状态，主记录选择字段更完整者，但不得丢弃来源 ID。

输出 `first-search-papers.csv` 的最小字段：`openalexId,title,authors,institutions,source,year,cited_by_count,abstract,doi,sourceUrl,sourceStatus`。当前既有 Skill 的 `openalexId` 是兼容字段；Scopus-only 记录若没有 OpenAlex ID 不得伪造 ID，应在适配器层保留来源 ID，并由服务层决定是否映射为空。

## 5. 数量、分页与候选分析输入

数量字段建议如下：`counts.retrieved` 为分页收到的原始记录数，`counts.deduplicated` 为 DOI/OpenAlex ID 去重后的唯一记录数，`counts.eligibleForCandidates` 为实际交给候选题分析的记录数。候选分析输入必须覆盖实际获取的 300–800 篇（或在不足时覆盖全部实际唯一记录）；P02 可以只预览少量论文，但不能把预览数量当作总数。

## 6. 候选题输出规则

候选题最多三项，分类固定为：`偏可行`、`偏创新`、`偏平衡`。每项至少包含：

```json
{
  "classification": "偏可行",
  "title": "候选课题标题",
  "research_question": "可验证的研究问题",
  "why_worth_testing": "基于摘要/元数据的待核验理由",
  "feasibility": "数据、实现与资源风险的说明",
  "evidence_paper_ids": ["https://openalex.org/W123"],
  "novelty_status": "candidate_pending_verification",
  "verification_needed": ["核对全文相关工作", "确认数据集和基线"]
}
```

`evidence_paper_ids` 至少一个时才可作为有证据候选；ID 必须来自合并后的论文记录。没有摘要只能形成“待核验线索”，不能把摘要缺失的论文写成已支持的研究空白。缺候选题、超过三项、缺标题/问题或证据 ID 不存在时，写入 `errors`/`warnings`，不得静默补造或截断。

## 7. 统一运行产物

每次运行的目录固定为：

```text
work/research-topic/runs/<firstSearchRunId>/first-search/
  first-search-papers.csv
  candidate-topics.csv
  first-search-analysis.md
  query-plan.json
  manifest.json
```

manifest 中的 `files` 与 `paths` 全部使用以上运行目录为基准的相对路径，例如 `first-search-papers.csv`；禁止写入 `C:\...`、`D:\...`、用户目录、密钥、账号或模型名。

建议 `manifest.json`：

```json
{
  "runId": "first-search-20260911-001",
  "stage": "first-search",
  "status": "completed",
  "selection": {"targetCount": 300},
  "files": ["first-search-papers.csv", "candidate-topics.csv", "first-search-analysis.md", "query-plan.json", "manifest.json"],
  "paths": {
    "papersCsv": "first-search-papers.csv",
    "candidateTopicsCsv": "candidate-topics.csv",
    "analysisMarkdown": "first-search-analysis.md",
    "queryPlan": "query-plan.json"
  },
  "counts": {"retrieved": 300, "deduplicated": 300, "eligibleForCandidates": 300, "abstracts": 0, "topics": 3},
  "sourceStatuses": {
    "OpenAlex": "available",
    "Scopus": "needs_credentials"
  },
  "errors": [],
  "warnings": ["Scopus 未执行：缺少 API 凭证"],
  "sourceQueries": [],
  "createdAt": "2026-09-11T00:00:00Z"
}
```

`status` 只表示文件处理状态：`planned`、`dry-run`、`completed` 或 `failed`。它不表示论文已阅读、创新已证实、Scopus 已授权或用户已确认候选题。

## 8. 交给开题模块的字段

P02 只需读取：`manifest.status`、`manifest.selection.targetCount`、`manifest.sourceStatuses`、`manifest.counts`、`candidate-topics.csv`、`first-search-analysis.md` 和 `paths`。请求应接收或内部默认 `targetCount: 300`，支持配置到 800。候选卡片展示 `classification`、`title`、`research_question`、`why_worth_testing`、`feasibility`、`evidence_paper_ids`、`novelty_status`；当 `status` 非 `completed`、候选题为空、来源状态为 `request_error`/`partial` 或存在 `insufficient_results` 时显示“待核验/需重试”，不得显示为确定结论。页面可预览少量论文，但 manifest 与分析输入必须覆盖实际获取的数量。

该服务不修改 `outputs/启航科研智能体_开题前端按钮交互逻辑.md` 所描述的页面；前端只消费字段和状态。

## 9. 离线验证边界

本交接使用 `interfaces/source_adapter_contract.py` 和 `scripts/validate_source_contract.py` 做结构校验，并以 dry-run 配置验证五个文件、相对路径、Scopus `needs_credentials`、摘要缺失和候选题 `candidate_pending_verification`。`--self-test` 还验证 299/300/800/801 边界以及跨两页 DOI/OpenAlex ID 去重。当前未进行真实 OpenAlex 大规模查询，未达到真实运行条件；离线验证不证明 OpenAlex 当前可访问、不证明真实候选题成立。
