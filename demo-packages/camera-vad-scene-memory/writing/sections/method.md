# Method

流水线：`sample_clip → fast_score(s,u) → should_review → retrieve_memory → verify_with_vlm → fuse → event`。

- 快路径输出异常分 \(s\) 与不确定性 \(u=1-|2s-1|\)。
- 触发（I1）：\(s\ge 0.65\) 或 \(u\ge 0.2\)。
- 记忆（I2）：top-K=5，仅 train-normal，禁止测试标签入池。
- VLM（I3）：模拟 JSON `{score, rationale, evidence_spans}`。
- 融合权重默认 \(0.4/0.2/0.4\)。

框架示意见 `figures/architecture.png`。可运行确定性模拟见 `experiment/code/pipeline.py`。
