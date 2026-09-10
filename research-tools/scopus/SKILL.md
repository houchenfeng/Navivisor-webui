# Scopus 来源适配规范

状态：待授权（不可在当前环境直接运行）。本文件是未来适配器的边界说明，不是伪可运行下载器。

适配器前置条件：

- 合法 Scopus/Elsevier API 或机构 API 权限；
- 受控的凭证保管方式，凭证不得进入前端、仓库、CSV、manifest、日志或截图；
- 明确的元数据、摘要和全文使用许可。

适配器接口应接收 `contract.md` 的统一输入，并增加来源专属配置，例如 API 版本、查询字段、分页参数和权限策略。没有合法授权时必须返回 `needs_credentials` 或 `unavailable`；授权被拒或权限范围不足时保留 `not_authorized` 错误和可合法保留的元数据状态。

授权齐备后，适配器必须输出同一组 `first-search-papers.csv`、`candidate-topics.csv`、`first-search-analysis.md`、`query-plan.json` 和 `manifest.json`，并遵守相同的文献字段、候选状态、相对路径和错误记录要求。它不负责把元数据变成全文，不得下载未获许可的 PDF，不得伪造摘要、引用或访问状态。

禁止任何绕过登录、付费墙、robots 或版权访问控制的实现。前端只读取后端的 `runId + status + files + errors`，最终来源策略由后端配置选择。
