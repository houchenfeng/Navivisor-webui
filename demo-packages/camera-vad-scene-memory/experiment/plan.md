# Experiment plan (SYNTHETIC DEMO)

## Summary

本教学 Demo 演示固定摄像头视频异常检测的快慢双通路：轻量模型对每个 clip 给出异常分与不确定性；仅在不确定或高分候选上触发场景正常记忆检索与视觉语言大模型（VLM）复核；最后校准融合输出事件。所有指标为合成模拟数，不报告真实训练或公开榜成绩。

Selected innovations: **I1** 不确定性触发、**I2** 场景正常记忆、**I3** 证据化 VLM 复核。

## Baseline

| ID | Method | Description |
|---|---|---|
| B0 | Lightweight | 仅快路径评分，无 VLM、无记忆 |
| B1 | VLM-all | 每个 clip 均调用 VLM（成本上界） |
| B2 | FastSlow-I1 | 快路径 + 不确定性触发 VLM，无记忆 |
| Ours | MemoryFastSlow-I1I2I3 | I1+I2+I3 完整模拟流程 |

对比在同一合成数据集 `camera-demo`、相同 clip 划分与固定阈值下进行。

## Datasets and splits

- Primary: `camera-demo`（synthetic teaching clips；见 `dataset-manifest.json`）。本包不附带真实视频字节。
- External candidates (not bundled / not verified): UCF-Crime, XD-Violence, ShanghaiTech, UBnormal.
- Simulated split: train 60% / val 20% / test 20% by clip id hash; **memory bank 仅从 train 中标注为 normal 的片段构建**；`excludeTestLabels=true`。
- Clip params: `clipFrames=16`, `sampleFps=4`（见 `config.json`）。

## Metrics and formulas

令预测异常分数为 \(s \in [0,1]\)，标签 \(y\in\{0,1\}\)。

- **AUROC (%)**: ROC 曲线下面积 ×100。
- **AP (%)**: Precision–Recall 平均精度 ×100。
- **F1 (%)**: 在验证集上网格搜索阈值 \(\tau\)，取 \(\mathrm{F1}=2PR/(P+R)\) 最大值 ×100。
- **VLM call (%)**: 触发 VLM 的 clip 占比 ×100。
- **Mean latency (ms)**: 单 clip 端到端模拟时延均值。

Uncertainty: \(u = 1 - |2s-1|\)（靠近 0.5 时不确定）。触发条件（I1）：

\[
\mathrm{should\_review} = (s \ge \theta_s) \lor (u \ge \theta_u)
\]

默认 \(\theta_s=0.65\), \(\theta_u=0.2\)。融合（I3 后）：

\[
s_{\mathrm{final}} = w_f s + w_m s_{\mathrm{mem}} + w_v s_{\mathrm{vlm}}
\]

默认 \(w_f=0.4, w_m=0.2, w_v=0.4\)（未触发 VLM 时 \(w_v=0\) 并重归一化）。

## Seven innovations (I1–I7)

| ID | Title | Selected | Role in this Demo |
|---|---|---|---|
| I1 | 不确定性触发 | yes | 控制 VLM 调用率 |
| I2 | 场景正常记忆 | yes | 为难例提供正常对照 |
| I3 | 证据化 VLM 复核 | yes | 结构化证据与分数 |
| I4 | 融合分数校准 | no | 预留温度缩放 |
| I5 | 记忆污染过滤 | no | 预留异常入池过滤 |
| I6 | 时间一致性约束 | no | 预留时序平滑 |
| I7 | 跨场景适配 | no | 预留场景适配器 |

完整字段见 `innovations.json`。

## Selected procedures (I1–I3)

### I1 Uncertainty trigger

1. 对每个 clip 运行轻量 `fast_score` → `(s, u)`。
2. 若 `should_review`，进入慢路径；否则直接输出快路径事件。
3. Ablation: trigger on/off；对照 always-VLM 与 never-VLM。
4. Acceptance: 模拟 VLM call rate **< 20%**（主表 Ours=12%）。

### I2 Scene normal memory

1. 从 train-normal 构建记忆库（embedding + 元数据）；禁止写入 test 标签。
2. 触发后检索 top-K=5 相似正常片段，得到 memory support score \(s_{\mathrm{mem}}\)。
3. Ablation: memory on/off（`trigger` vs `trigger-memory`）。
4. Acceptance: 无测试泄漏；构建日志可追溯划分哈希。

### I3 Evidence VLM review

1. 将 clip 关键帧 + 记忆摘要送入模拟 VLM，返回 JSON：`{score, rationale, evidence_spans}`。
2. 与快路径、记忆分融合并输出可解释事件。
3. Ablation: VLM on/off（`trigger-memory` vs `full`）。
4. Acceptance: 结构化输出字段齐全。

Seeds: `[11, 23, 47]`。仅 Ours 报告三种子均值±标准差；其余方法未测多种子。

## Resource budget

| Resource | Budget |
|---|---|
| GPU | 单卡原型（模拟） |
| Latency goal | ≤100 ms mean（Ours 模拟 99 ms） |
| VLM budget | 仅复核候选；目标 call rate ≤20% |
| Memory | maxEntries=10000, topK=5 |

## Go / No-Go

**Go** if (simulated):

- Ours AUROC ≥ Lightweight + 4 pp
- VLM call rate ≤ 20%
- Mean latency ≤ 150 ms
- Ablation 单调性：full ≥ trigger-memory ≥ trigger ≥ baseline（AUROC）

**No-Go** if any of the above fails, or memory 构建混入 test labels。

预期（已写入 metrics）：Lightweight AUROC 81.2 → Ours 87.1（+5.9 pp）；VLM-all call 100% → Ours 12%。

## Limitations

- 全部指标为 **simulated teaching numbers**，不可用于真实科研主张。
- 无真实视频、无真实 VLM API 调用。
- I4–I7 未实现；跨场景与长期漂移未验证。
- 消融为递增配置，不能严格解释为独立因果贡献。

## Simulated disclosure

`mode=simulated`。CSV 列 `simulated=true`。本方案、代码与结果仅用于 Navivisor 四模块教学演示。
