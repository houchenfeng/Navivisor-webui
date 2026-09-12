# Candidate topics (synthetic)

Derived from `candidate-topics.json`. Demo confirms **cand-balanced**.

## cand-innovative — 创新导向

- **Title**: 事件图谱记忆与多角色复核的跨摄像头异常检测
- **Question**: 结构化长期记忆能否提升跨摄像头事件推理一致性？
- **Method steps**: 事件建图 → 检索 → 多角色复核 → 证据融合
- **Innovations**: 事件图谱；多角色复核；跨镜关联
- **Feasibility**: medium-high
- **Risks**: 图构建成本；身份关联误差
- **Evidence**: DEMO-002, DEMO-003
- **Expected outputs**: graph, reviews

## cand-feasible — 可行导向

- **Title**: 轻量筛查与视觉语言大模型按需复核
- **Question**: 只复核不确定片段能否以较低成本提升检测效果？
- **Method steps**: 轻量评分 → 阈值触发 → VLM复核 → 分数融合
- **Innovations**: 不确定性触发；按需复核
- **Feasibility**: high
- **Risks**: 阈值迁移；时延
- **Evidence**: DEMO-001, DEMO-003
- **Expected outputs**: metrics, cost

## cand-balanced — 平衡导向（已确认）

- **Title**: 基于场景记忆与大模型复核的快慢双通路视频异常检测
- **Question**: 场景记忆能否在固定预算下改善疑难片段识别和解释？
- **Method steps**: 筛查 → 记忆检索 → VLM按需复核 → 校准融合
- **Innovations**: 不确定性触发；场景正常记忆；证据化复核与校准融合
- **Feasibility**: medium
- **Risks**: 记忆污染；场景漂移
- **Evidence**: DEMO-001, DEMO-002, DEMO-003
- **Expected outputs**: metrics, explanations

## Alternates

None (`alternates: []`).
