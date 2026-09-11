# OpenAlex：当前默认来源

状态：当前默认、已验证的开放元数据方案。

OpenAlex 可使用公开 API，不要求 API Key；但网络可用性、请求限制和每次查询结果仍需在运行时验证。它负责第一次检索阶段的文献元数据与摘要，不等同于阅读全文，也不保证 PDF。用户确认课题后的 PDF/Bib/核心文献包属于另一个阶段。

已验证能力包括：可复现检索计划、会议 × 年份查询展开、OQL 计划、cursor 分页、按 DOI/OpenAlex ID 去重，以及 429/5xx/网络错误的有界重试（由受控适配器执行）。严格会议检索需要经核验的 source ID；找不到、多个候选或网络失败时必须保留禁用/待复核状态，不能猜测 source ID。OpenAlex 适配器不会下载 PDF，也不会自行生成候选事实。

## dry-run

不联网的 dry-run 只生成查询计划和空输出契约：

```powershell
python first_stage.py --config examples/dry-run.json --mode dry-run
```

本目录只保留配置形状示例；完整 Skill 脚本未复制进本仓库。当前项目的 `src/research-topic/` 仅提供本次所需的最小“试检索”后端适配器，不能从该目录推断完整候选课题流水线已经迁入。所有实际适配器都应将结果转换为 [`../contract.md`](../contract.md) 定义的文件和 manifest。

## 后端接入

受控后端适配器接收 `researchInterest`、`context`、年份、文献类型、来源策略和 limits，生成 `runId`，记录 source query 与状态，并返回统一契约。前端选择 OpenAlex 的示例是将 `sourcePolicy.preferred` 设为 `openalex`；前端不直接调用 OpenAlex。
