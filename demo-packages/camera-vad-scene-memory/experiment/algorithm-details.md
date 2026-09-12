# Algorithm details (SYNTHETIC)

implementationStatus=simulated

## Pipeline

```
sample_clip -> fast_score(s,u) -> should_review(u,s)
  -> [optional] retrieve_memory(topK)
  -> [optional] verify_with_vlm(JSON evidence)
  -> calibrate_fuse(w_f,w_m,w_v) -> output_event
```

## Modules

1. **Sample**: 16 frames @ 4 FPS teaching metadata (no real decode required for Demo).
2. **Fast score**: deterministic lightweight score \(s\) and uncertainty \(u=1-|2s-1|\).
3. **Trigger (I1)**: review if \(s\ge 0.65\) or \(u\ge 0.2\).
4. **Memory (I2)**: top-5 retrieval from train-normal bank; `excludeTestLabels=true`.
5. **VLM (I3)**: simulated JSON `{score, rationale, evidence_spans}`.
6. **Fusion**: default weights 0.4 / 0.2 / 0.4; renormalize when a branch is off.

See `code/pipeline.py` (`python pipeline.py`) for a seeded runnable demo batch.
