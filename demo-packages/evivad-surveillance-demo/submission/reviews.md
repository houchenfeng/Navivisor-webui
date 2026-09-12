# CVPR 2026 Reviews — English Paper

**Paper Title**: EviVAD: Verifiable Explanation and Degradation-Aware Gating for Large-Model Video Anomaly Detection in Surveillance Cameras
**Review mode**: 3 reviewers, OpenReview 1–6 scale
**Scores**: R1 = 5 (Weak Accept), R2 = 4 (Borderline Accept), R3 = 5 (Weak Accept) · mean 4.67

The official structured reviews (summary / strengths / weaknesses / questions / justification) are in `reviews.json`. This file is the same content in reading order.

---

## Official Review by Reviewer 1 — Method novelty vs prior art — 5/6

See `reviews.json` Reviewer 1. Headline asks: isolate EviVAD from “LoRA + RAG + a confidence head”; name and beat Zanella / Wu / VadCLIP / Khedher / RAG4VAD; cite LoRA, CLIP-Adapter, CoOp, InfoNCE, selective prediction; add a PEFT bake-off.

## Official Review by Reviewer 2 — Experiments — 4/6

See `reviews.json` Reviewer 2. Headline asks: matched SOTA table; r/α and PEFT sweeps; IAA on EAR; real night/rain vs synthetic grid; ShanghaiTech/Avenue sanity check; bootstrap/Wilcoxon; protocol card for UCF-Crime AUC.

## Official Review by Reviewer 3 — Writing and format — 5/6

See `reviews.json` Reviewer 3. Headline asks: stop over-claiming a new large model; nearest-neighbour comparison table; CVPR two-column / 8-page hygiene; figure–text acronym identity; interpret tables in prose.

---

## Score table

| Reviewer | Focus | Score | Label |
|---|---|---|---|
| 1 | Innovation vs composition and citations | 5 | Weak Accept |
| 2 | Experiments, SOTA, extra ablations | 4 | Borderline Accept |
| 3 | Writing, format, claim calibration | 5 | Weak Accept |
