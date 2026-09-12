# Experiments

数据集：合成 `camera-demo`。对照：Lightweight、VLM-all、FastSlow-I1、MemoryFastSlow-I1I2I3。

主表（与 `experiment/metrics/main.csv` 一致）：

| method | AUROC | AP | F1 | VLM% | ms |
|---|---:|---:|---:|---:|---:|
| Lightweight | 81.2 | 57.8 | 61.4 | 0 | 18 |
| VLM-all | 85.9 | 64.1 | 66.2 | 100 | 680 |
| FastSlow-I1 | 84.8 | 62.5 | 65.1 | 18 | 137 |
| Ours | 87.1 | 67.2 | 68.0 | 12 | 99 |

消融：baseline 81.2 → trigger 84.8 → trigger-memory 85.6 → full 87.1（AUROC）。
Ours 三种子均值±标准差：AUROC 87.10±0.30（seeds 11/23/47）。其余方法未测多种子。

比较图：`figures/comparison.png`。失败案例与局限见 `experiment/results.md`。
