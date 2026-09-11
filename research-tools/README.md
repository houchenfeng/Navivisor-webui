# 文献检索来源方案

本目录定义“第一次文献检索”任务的两个可替换来源方案。两者目的相同：为开题提供可追溯的文献元数据、摘要和候选方向输入；两者共用同一输入、状态、文件和 manifest 契约，见 [`contract.md`](./contract.md)。

| 项目 | OpenAlex | Scopus |
| --- | --- | --- |
| 目的 | 为开题提供开放元数据与摘要检索 | 为开题提供可追溯的学术数据库记录 |
| 输入/输出 | 与 Scopus 相同，遵循 `contract.md` | 与 OpenAlex 相同，遵循 `contract.md` |
| 当前状态 | 当前默认、已验证的开放元数据方案 | 待授权，不可在当前环境直接运行 |
| 选择条件 | 网络可用即可尝试公开 API；运行时仍需验证 | 需要合法 Elsevier API/机构权限与受控凭证 |
| 全文 | 不负责保证或下载 PDF | 权限不足时只保留合法元数据与访问状态 |

当前前端默认选择 OpenAlex；Scopus 只显示为待接入选项。最终来源策略由后端配置决定，前端不硬编码数据库调用，也不持有 API Key。OpenAlex 与 Scopus 不能作为两套重复的前端逻辑实现。

## 目录职责

- `contract.md`：唯一共同格式，不在两个来源 README 重复。
- `openalex/`：已验证的默认来源说明与不联网 dry-run 配置。
- `scopus/`：待授权来源适配规范，不包含伪可运行下载器。

这里没有迁入 OpenAlex 的绝对路径、用户数据、PDF、账号、密钥或 533 篇实例。当前项目已在 `src/research-topic/` 接通一个最小 OpenAlex 试检索 adapter：它只返回真实元数据/摘要并写入 `first-search-papers.csv` 与 `manifest.json`，不是完整 `qihang-first-stage-literature-search` 的候选课题流水线。完整 Skill 的确定性脚本仍留在受控 Skill/服务环境，不复制进前端仓库。

前端调用 `POST /api/research/topic/first-search` 后轮询任务状态；后端固定公开 OpenAlex 域名、限制输入/数量、超时与重试，并将运行产物写入相对目录 `work/research-topic/runs/<runId>/`。验证可执行：根目录 `pnpm build`、`pnpm test`，以及 `web/` 内 `pnpm build`、`pnpm test`；运行页面 `/research/topic` 后输入研究兴趣并点击“试搜”。网络失败必须显示真实错误状态并可重试，不能伪造结果。

Scopus 的唯一待办是授权接入：在取得合法 API/机构权限、凭证保管方案和全文许可范围后，实现来源 adapter，并转换为本目录同一契约；当前不可运行、不可下载或伪造 PDF。
