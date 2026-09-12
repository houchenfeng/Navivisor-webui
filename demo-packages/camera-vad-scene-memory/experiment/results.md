# Results (SIMULATED DEMO)

All numbers below are copied from `metrics/*.csv`. They are **teaching simulations**, not public benchmark claims.

## Main comparison (`main.csv`)

| dataset | method | AUROC % | AP % | F1 % | VLM call % | mean latency ms | simulated |
|---|---|---:|---:|---:|---:|---:|---|
| camera-demo | Lightweight | 81.2 | 57.8 | 61.4 | 0 | 18 | true |
| camera-demo | VLM-all | 85.9 | 64.1 | 66.2 | 100 | 680 | true |
| camera-demo | FastSlow-I1 | 84.8 | 62.5 | 65.1 | 18 | 137 | true |
| camera-demo | MemoryFastSlow-I1I2I3 | 87.1 | 67.2 | 68.0 | 12 | 99 | true |

Relative to Lightweight, Ours (MemoryFastSlow-I1I2I3) gains **+5.9 pp AUROC**, **+9.4 pp AP**, **+6.6 pp F1**, while using **12%** VLM calls versus **100%** for VLM-all.

## Ablation (`ablation.csv`)

| variant | I1 | I2 | I3 | AUROC % | AP % | mean latency ms |
|---|---|---|---|---:|---:|---:|
| baseline | false | false | false | 81.2 | 57.8 | 18 |
| trigger | true | false | false | 84.8 | 62.5 | 137 |
| trigger-memory | true | true | false | 85.6 | 64.3 | 103 |
| full | true | true | true | 87.1 | 67.2 | 99 |

Monotonic AUROC under this simulated incremental design: full (87.1) ≥ trigger-memory (85.6) ≥ trigger (84.8) ≥ baseline (81.2). Incremental configs are **not** independent causal effects.

## Seed statistics (`seeds.csv`)

Only **MemoryFastSlow-I1I2I3** was evaluated on seeds `{11, 23, 47}`:

| seed | AUROC % | AP % | F1 % |
|---:|---:|---:|---:|
| 11 | 86.8 | 66.9 | 67.7 |
| 23 | 87.1 | 67.2 | 68.0 |
| 47 | 87.4 | 67.5 | 68.3 |

Mean ± std (sample std, n=3):

- AUROC: **87.10 ± 0.30**
- AP: **67.20 ± 0.30**
- F1: **68.00 ± 0.30**

Other methods: **seed variance not measured** in this Demo (do not invent ± ranges).

## Budget comparison

| method | VLM call % | mean latency ms | note |
|---|---:|---:|---|
| Lightweight | 0 | 18 | cheapest, weakest AUROC |
| FastSlow-I1 | 18 | 137 | trigger without memory |
| MemoryFastSlow-I1I2I3 | 12 | 99 | meets ≤100 ms latency goal (simulated) |
| VLM-all | 100 | 680 | cost upper bound |

## Failure cases (simulated)

1. **Boundary flicker**: clips with `u` near \(\theta_u\) oscillate between fast/slow paths across seeds (see seed spread ±0.3 AUROC).
2. **Memory near-miss**: when top-1 normal memory is semantically close but lighting differs, \(s_{\mathrm{mem}}\) under-supports true anomalies (synthetic).
3. **Over-trigger on crowded scenes**: high uncertainty from occlusion raises call rate locally even when global rate is 12%.

## Limitations

- Synthetic `camera-demo` only; external datasets listed but not run.
- No real VLM API; evidence strings are placeholders.
- I4–I7 not enabled; cross-scene drift untested.
- Figures were generated with OpenAI's built-in GPT image tool and visually checked against the architecture and metric tables (see `figures/generation.json`).

## Disclosure

`simulated=true` on every metrics row. Do not cite these numbers as empirical SOTA.
