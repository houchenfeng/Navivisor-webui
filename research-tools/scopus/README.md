# Scopus：待授权来源

## 状态：待授权（不可在当前环境直接运行）

Scopus 与 OpenAlex 的目标相同，都是为开题提供可追溯文献记录；当前没有可交给项目使用的 Scopus/Elsevier API 或机构权限。浏览器网页登录不等于 API 授权，也不能据此声称已登录、已拿到 API 或能够下载 PDF。

未来接入前必须具备：合法 Scopus/Elsevier API 或机构授权、经批准的凭证保管方式，以及明确的全文许可范围。不得绕过登录、付费墙、robots 或版权限制。

当前只保留来源适配器规范：缺少授权时返回 `needs_credentials` 或 `unavailable`，缺少 API 权限时可使用 `not_authorized` 作为适配器内部错误码；同时保留合法可获得的元数据和访问状态，不下载或伪造 PDF。

权限齐备后，Scopus adapter 必须把结果转换到 [`../contract.md`](../contract.md) 的同一输入、文件和 manifest 格式。它不能创建第二套前端逻辑，也不能把 Scopus 的权限状态伪装为 OpenAlex 的开放访问状态。
