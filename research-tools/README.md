# 科研文献工具

本目录保存可提交的工具代码、使用说明与接口契约；不保存用户论文、PDF、CSV、Bib、fixture、运行日志或任何凭证。

| 项目 | OpenAlex | Scopus |
| --- | --- | --- |
| 目的 | 为开题提供开放元数据与摘要检索 | 为开题提供可追溯的学术数据库记录 |
| 输入/输出 | 与 Scopus 相同，遵循 `contract.md` | 与 OpenAlex 相同，遵循 `contract.md` |
| 当前状态 | 当前默认、已验证的开放元数据方案 | 待授权，不可在当前环境直接运行 |
| 选择条件 | 网络可用即可尝试公开 API；运行时仍需验证 | 需要合法 Elsevier API/机构权限与受控凭证 |
| 全文 | 不负责保证或下载 PDF | 权限不足时只保留合法元数据与访问状态 |

当前开题 MVP 默认使用 OpenAlex；Scopus 只显示为待授权选项。最终来源策略由后端配置决定，前端不硬编码数据库调用，也不持有 API Key。OpenAlex 与 Scopus 不能作为两套重复的前端逻辑实现。

## 两阶段工具边界

| 阶段 | 责任 | 数量策略 | 工具与说明 |
| --- | --- | --- | --- |
| `first-search` | 研究方向 -> 元数据/摘要 -> 三个待核验候选题 | `targetCount` 300–800，默认 300 | [`first-search/README.md`](./first-search/README.md) |
| `core-literature` | 确认课题 -> 核心文献/Bib/合法 OA PDF -> 实验交接包 | `targetCount` 100–300，默认 100 | [`core-literature/README.md`](./core-literature/README.md) |

第一阶段的 OpenAlex 分页 MVP 位于 `src/research-topic/`；本目录的 `first-search/` 提供跨来源、候选题和离线契约工具。第二阶段只在用户确认课题后执行。PDF 数量独立于核心文献数量，绝不承诺每篇均可合法获取全文。

## 目录职责

- `contract.md`：两种来源的共同格式。
- `openalex/`：已验证的默认来源说明与不联网 dry-run 配置。
- `scopus/`：待授权来源适配规范，不包含伪可运行下载器。
- `first-search/`：300–800 篇首次检索的协议验证工具。
- `core-literature/`：100–300 篇核心文献与合法 OA PDF 打包工具。

当前项目已在 `src/research-topic/` 接通 OpenAlex 分页试检索：默认目标 300，最多 800；页面只预览前 20 条，完整计数与 CSV 写入运行目录。它不生成候选题，不接入 Scopus，不下载 PDF/Bib，也不调用 Codex CLI。

前端调用 `POST /api/research/topic/first-search` 后轮询任务状态；后端固定公开 OpenAlex 域名、限制输入/数量、超时与重试。第一阶段产物写入 `work/research-topic/runs/<firstSearchRunId>/first-search/`；第二阶段产物写入 `work/research-topic/runs/<coreLiteratureRunId>/core-literature/`。这些目录已被 Git 忽略。网络失败或数量不足必须显示真实状态，不能伪造结果。

Scopus 的唯一待办是授权接入：在取得合法 API/机构权限、凭证保管方案和全文许可范围后，实现来源 adapter，并转换为本目录同一契约；当前不可运行、不可下载或伪造 PDF。
