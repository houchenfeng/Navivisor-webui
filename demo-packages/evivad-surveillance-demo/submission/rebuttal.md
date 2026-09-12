# Authors' Rebuttal — EviVAD

We thank all three reviewers. Scores 5 / 4 / 5 recognise the problem cut (verifiable explanations + graceful degradation) and ask for the same missing pieces: **named nearest-neighbour methods, extra isolating experiments, and tighter writing**. We answer every weakness and question. Commitments below will appear in the camera-ready or the supplementary (page-budget split is stated under R3-Q4). No score-chasing: several of Reviewer 2’s asks are limitations we already hold, and we say so.

**Shared protocol card (frozen, used in every new number).** UCF-Crime official split; frame-level AUC/AP; clips of 32 frames at 8 fps; 224×224; CLIP ViT-B/16 frozen unless named otherwise; thresholds fit on val only; seeds {42, 3407, 2026}; mean±std. Rows that cannot be run under this card go to a grey “reported, incomparable” block.

---

## Reviewer 1 (Weak Accept, 5) — novelty, PEFT, citations

We agree EviVAD is a **composition**. The claim we will defend is not “a new VLM” but: **on a frozen CLIP, three constraints that existing stacks do not jointly satisfy**—(i) start-point-identical domain PEFT, (ii) *falsifiable* evidence slots with a removal test, (iii) an explicit abstain / retrieval-prior path when the VLM is off-distribution.

### W1. Composition vs LoRA+RAG+confidence

**Non-composable sentence.** “B0 + LoRA + RAG + a scalar confidence threshold” can raise AUC and can retrieve extra text; it **cannot** implement the EAR removal test (the cited interval/cue must be necessary for the claim) nor DAG’s **typed** failure (retrieval-miss vs low-quality vs low-confidence abstain). RAG4VAD conditions generation on documents; it does not bind each sentence to `(t_s, t_e, cue)` that a counterfactual clip can falsify. A confidence threshold does not route to a prior path or mark retrieval-miss.

**Ablation cell that must stay significant.** Full EviVAD vs (DAA+RAG-text, no slots) vs (DAA+EAD, no DAG) vs (B0+max-prob abstain, no DAG). We will add this 4-row table. Existing 8-cell ablation already isolates DAA→AUC, EAD→EAR/HR, DAG→degradation-grid AUC; the new row tests the “just RAG+threshold” strawman Reviewer 1 asked for.

**Mechanism of weak synergy.** Camera-ready will include: (a) with/without blocking `L_EA` into the vision tower (gradient isolation); (b) routing histogram of DAG weights on clean vs severity-3 clips. Hypothesis: isolation stops EAD from trading AUC for EAR; DAG only moves mass on degraded clips, so clean AUC is almost additive.

### W2. Named algorithms in Table 1

We will split Table 1 into **Block A (same protocol card, our runs or official weights)** and **Block B (paper-reported, incomparable)**.

| Intended Block A row | Role | What we run |
|---|---|---|
| B0 (frozen CLIP, text scoring, temporal smooth) | internal lower bound | already |
| Fully fine-tuned last CLIP block | PEFT upper bound, same data | new |
| Zanella et al. training-free LLM localiser | named TF baseline (replace generic “Training-free-LLM-2024”) | reimplement under our clips |
| CLIP-TSA / VadCLIP (official or public reimplementation) | CLIP-VAD nearest neighbours | protocol card; if training budget fails → Block B with mismatch note |
| RTFM, MGFN (I3D features) | WS-VAD reference | Block B unless we can evaluate their scores on our frame grid |
| Khedher-style rule prompts; RAG4VAD-style retrieve-then-explain | explanation EAR/HR baselines, **no** DAA/DAG | new, same clips |

Abstract will say **“+5.3 AUC vs B0 under this card”**, not SOTA. If VadCLIP under the same card exceeds 82.1, we will say so.

### W3. Citations to add (Intro + Related Work)

We will add a **lineage paragraph** and bibliography entries for: Hu et al. LoRA (ICLR 2022); Gao et al. CLIP-Adapter; Zhou et al. CoOp/CoCoOp; Oord et al. InfoNCE; Geifman & El-Yaniv selective prediction; Hendrycks ImageNet-C; Tian et al. RTFM; Chen et al. MGFN; Wu et al. open-vocabulary VAD; Zanella CLIP-VAD and training-free LLM-VAD; Kim DT-VAD; Sun RAG4VAD; Pei DRVAD; Khedher trustworthy VLM–LLM; Du causation benchmark; Mo et al. low-light TF failure. 2025–2026 surveys stay, but **after** this paragraph, not instead of it.

### W4. Notation and format

Unified glossary in §3: DAA / EAD / DAG only (no “Domain Adapter” / “quality gate”). `L_EA`: InfoNCE over 1 positive evidence slot and *K*=7 negatives (temporal shift + cue swap + other-video), stated next to the equation. Two-column tables split; Fig.1–2 relabelled to match §3.

### Q1. One sentence of novelty

“EviVAD is the first frozen-CLIP VAD system in which **every explanation token is bound to a removable visual-temporal slot, and every low-quality clip has a typed abstain/retrieval path**, with PEFT that is bit-wise B0 at step 0.” False for LoRA+RAG+threshold. True only if the new strawman row and the removal-test EAR both hold.

### Q2. Why LoRA on blocks 9–12 Q/V

Deployment: ≤5.5M, hot-swap per scene, start-point identity. **PEFT bake-off (same budget)** will be added: LoRA last-4 Q/V (ours) vs CLIP-Adapter residual vs BitFit vs 10 visual prompt tokens vs last-block full FT (upper bound, extra params). We expect LoRA to win the AUC/#params knee; if CLIP-Adapter matches AUC at fewer params we will say so and keep LoRA for the swap-file reason.

### Q3. Where EAD negatives come from (circularity)

Training slots: **automatic** (motion/energy peaks + CLIP-text cue proposals), not the EAR gold. EAR gold: **human** minimal sufficient sets, held-out videos, annotators never see model slots. Camera-ready: this data-flow diagram + the IAA numbers Reviewer 2 requested. That breaks self-justifying circularity.

### Q4. Papers in the SOTA table

See W2. Each Block B row will carry one mismatch line (e.g. “RTFM: I3D, 16-frame, 10-crop, video-level AUC”).

---

## Reviewer 2 (Borderline Accept, 4) — experiments that must exist

We treat this review as the acceptance bar. Several items are **already in the package** (8-cell ablation, 4×3 grid, three seeds, failure modes). The rest are listed as **CR** (camera-ready) or **Supp**.

### W1. Matched comparisons

Accepted. Block A/B as above. We will not mix literature 85% AUC with our 76.8 B0 in one ranking.

### W2. Extra experiments (checklist)

| ID | Experiment | Venue | Status |
|---|---|---|---|
| E1 | r∈{1,2,4,8,16} × α∈{4,8,16} × last {2,4,8} blocks | Supp (heatmap) | **CR** |
| E2 | PEFT bake-off ≤5.5M | Main, small table | **CR** |
| E3 | EAR codebook + Cohen’s κ / Krippendorff’s α (n≥2 annotators, ≥100 clips) | Supp + one main sentence | **CR** |
| E4 | Memory N∈{64,256,1024,4096}; UCF→XD retrieval-miss | Supp | **CR** |
| E5 | Video-level bootstrap 95% CI on ΔAUC, ΔEAR; Wilcoxon | Table footnote | **CR** |
| E6 | Real night / rain subset vs synthetic grid (sim-to-real ΔAUC) | Main paragraph | **CR**; if we cannot film, we subsample UCF-Crime night-like videos by brightness percentile and **relabel the grid as a stress test** (R2-Q2) |
| E7 | ShanghaiTech and/or CUHK Avenue, same 32×8 fps card | Supp | **CR** if public splits + time; else limitation stays |
| E8 | Batch-1 FPS on one named GPU (e.g. RTX 4090) | Efficiency table | **CR** |

The current evidence supports the **interpretation** of E1/E2 qualitatively (DAA +2.6 AUC as the accuracy term; EAD +22 EAR; DAG on the grid). New runs will replace that qualitative split with the sweeps.

### W3. Protocol card and B0

Printed in the main paper (box). Abstract rewritten: gains **versus B0 under the card**. If a Block A CLIP-VAD baseline exceeds EviVAD, we revise the SOTA interpretation and retain the **verifiability / RPR** analysis, which those detectors do not report.

### W4. Result writing

After Table 1: “DAA is the AUC term (+2.6); EAD is the EAR/HR term (+26.9 / −16.6) with <1 AUC tax; DAG is the grid term (62.5→71.3) with near-zero clean-AUC tax.” Error bars = three-seed std. Internal provenance columns are excluded from camera-ready tables.

### Q1. VadCLIP / CLIP-TSA / RTFM under our card

We will run or mark incomparable. We do not invent a number here.

### Q2. Degradation calibration

Parameters will be tabulated (gamma/brightness; scattering β; H.264 CRF; translation σ). Overlay histograms vs a night-like UCF subset. **Wording change:** “synthetic stress grid inspired by ImageNet-C,” not “the surveillance degradation distribution,” unless E6’s sim-to-real gap is small.

### Q3. EAR scoring rules

Codebook: (i) interval IoU≥0.5 and cue in the approved list → credit; (ii) correct interval, wrong cue → partial credit, counted separately; (iii) cue without interval → no credit. κ will be reported. Hours and annotator count in Supp.

### Q4. Memory leakage

Index = **training-split normal clips only** (UCF-Crime train, no test video ids). Cross-domain: training normals from source only. We will add a leakage audit (embedding nearest-neighbour to any test id must be empty).

### Q5. Compute appendix

GPU, DAA hours, peak GB, decode ms breakdown (vision / LoRA / EAD slots / DAG probe). We expect EAD sequential slot decoding to dominate the +29 ms.

### Limitations we keep

Single-view; no snow/glare/IR/PTZ; no camera graph. Multi-view (Mishra et al.) remains future work, not a silent claim.

---

## Reviewer 3 (Weak Accept, 5) — writing and format

### W1. Claim calibration

Title/abstract/intro rewrite: **frozen CLIP ViT-B/16, 5.5M trainable, three modules with disjoint intended effects.** “Large-model” only refers to the frozen backbone. Numbers follow the protocol card.

### W2. Nearest-neighbour table (writing)

Main paper, one table:

| Method | Backbone | Trainable | Bound explanation | Degradation path | Abstain |
|---|---|---|---|---|---|
| Zanella TF-LLM | frozen LLM+vis | ~0 | free text | none | no |
| Wu open-vocab | CLIP-like | method-specific | category name | none | no |
| VadCLIP | CLIP | CLIP-side | weak | none | no |
| RAG4VAD | VLM+index | method-specific | retrieved docs | none | no |
| Khedher | VLM–LLM | rules | constrained text | none | no |
| Mo low-light | TF | ~0 | — | diagnoses failure | no |
| **EviVAD** | frozen CLIP | **5.5M LoRA+heads** | **slots+removal** | **probe+retrieval/prior** | **yes** |

### W3. CVPR format

`[review]` style; captions under figures; wide tables split or `tiny`; vector plots; acronym identity list in the rebuttal appendix matching Fig.1, Fig.2, §3.2–3.4; equation numbers cited in text.

### W4. Interpreting tables; C1–C3

Intro claims C1–C3 = DAA / EAD / DAG. Experiment subsections titled “Test of C1/C2/C3”. Failure modes → 4-row table.

### Q1. Differences table

Yes — W2 table, main paper.

### Q2. Acronym audit

We will publish a three-column list (Fig.1 | Fig.2 | §3) and eliminate “Domain Adapter” / “quality gate”.

### Q3. Cross-modal slots

One paragraph, RGB+audio only, shared evidence space, no thermal/depth promise. Dataset candidate: any public campus audio–video set we can name at CR time; otherwise “requires paired audio, out of scope.”

### Q4. Page budget

**Main (≤8 pages content):** protocol card, nearest-neighbour table, Table 1 Block A, 8-cell ablation compact, take-home sentences, efficiency+FPS, limitations.
**Supplementary:** r–α–depth heatmap, PEFT extra rows, 12-config corruption matrix, IAA codebook, leakage audit, Avenue/ShanghaiTech, compute appendix.

---

## Closing

We will not claim SOTA on UCF-Crime unless Block A supports it. We **will** claim a frozen-CLIP system that (1) adapts with a B0-identical LoRA, (2) makes explanations removable-evidence tests, (3) degrades and abstains on purpose. That is the paper Reviewers 1–3 described; the camera-ready will match that paper rather than the current over-claiming abstract.

**CR checklist:** protocol card; Block A/B table; PEFT + r/α sweeps; EAR codebook+κ; memory/leakage; stress-grid wording; C1–C3 writing; figure glossary; FPS; bootstrap CIs.
