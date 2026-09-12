#!/usr/bin/env python3
"""SYNTHETIC DEMO — deterministic simulated CameraVAD pipeline.

implementationStatus=simulated
NOT real training, NOT real VLM inference, NOT benchmark evidence.
All scores are seeded pseudo-random functions of clip_id for reproducible teaching demos.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Sequence


SIMULATED = True
IMPLEMENTATION_STATUS = "simulated"


@dataclass
class PipelineConfig:
    score_threshold: float = 0.65
    uncertainty_threshold: float = 0.2
    top_k: int = 5
    fast_weight: float = 0.4
    memory_weight: float = 0.2
    vlm_weight: float = 0.4
    seed: int = 23
    enable_memory: bool = True
    enable_vlm: bool = True
    enable_trigger: bool = True


@dataclass
class Event:
    clip_id: str
    path: str
    score: float
    uncertainty: float
    reviewed: bool
    memory_hits: int
    vlm_score: Optional[float]
    rationale: Optional[str]
    simulated: bool = True


def _stable_unit(seed: int, clip_id: str, salt: str) -> float:
    h = hashlib.sha256(f"{seed}:{clip_id}:{salt}".encode("utf-8")).hexdigest()
    return int(h[:12], 16) / float(16**12)


def sample_clip(clip_id: str, cfg: PipelineConfig) -> Dict[str, Any]:
    """Simulate frame sampling metadata for a clip."""
    rng = random.Random(cfg.seed ^ int(_stable_unit(cfg.seed, clip_id, "sample") * 1e9))
    n_frames = 16
    return {
        "clip_id": clip_id,
        "n_frames": n_frames,
        "sample_fps": 4,
        "keyframes": [rng.randint(0, n_frames - 1) for _ in range(3)],
        "simulated": True,
    }


def fast_score(clip: Dict[str, Any], cfg: PipelineConfig) -> Dict[str, float]:
    """Deterministic lightweight anomaly score and uncertainty.

    Confident normals keep s<=0.08 so u<0.2 (no trigger). About 12% of
    clips are high-score or mid-score uncertain under default thresholds,
    aligning the demo_batch call rate with main.csv teaching numbers.
    """
    r = _stable_unit(cfg.seed, clip["clip_id"], "score")
    if r >= 0.94:
        # High anomaly score -> review via scoreThreshold (~6%)
        s = 0.72 + 0.25 * _stable_unit(cfg.seed, clip["clip_id"], "high")
    elif r >= 0.88:
        # Near 0.5 -> high uncertainty -> review via uncertaintyThreshold (~6%)
        s = 0.46 + 0.08 * _stable_unit(cfg.seed, clip["clip_id"], "boundary")
    else:
        # Confident normal: s in [0.02, 0.08] => u in [0.04, 0.16] < 0.2
        s = 0.02 + 0.06 * _stable_unit(cfg.seed, clip["clip_id"], "normal")
    u = 1.0 - abs(2.0 * s - 1.0)
    return {"score": round(s, 6), "uncertainty": round(u, 6)}


def should_review(s: float, u: float, cfg: PipelineConfig) -> bool:
    if not cfg.enable_trigger:
        return cfg.enable_vlm
    return (s >= cfg.score_threshold) or (u >= cfg.uncertainty_threshold)


def retrieve_memory(
    clip: Dict[str, Any],
    memory: Sequence[Dict[str, Any]],
    cfg: PipelineConfig,
) -> Dict[str, Any]:
    """Retrieve top-k normal memories; score is inverse rank distance (simulated)."""
    if not cfg.enable_memory or not memory:
        return {"hits": [], "s_mem": 0.0}
    q = _stable_unit(cfg.seed, clip["clip_id"], "emb")
    ranked = sorted(
        memory,
        key=lambda m: abs(m["emb"] - q),
    )[: cfg.top_k]
    if not ranked:
        return {"hits": [], "s_mem": 0.0}
    dist = abs(ranked[0]["emb"] - q)
    s_mem = max(0.0, min(1.0, 1.0 - dist))
    return {
        "hits": [m["clip_id"] for m in ranked],
        "s_mem": round(s_mem, 6),
    }


def verify_with_vlm(
    clip: Dict[str, Any],
    memory_pack: Dict[str, Any],
    fast: Dict[str, float],
    cfg: PipelineConfig,
) -> Dict[str, Any]:
    """Simulated VLM JSON evidence — not a real model call."""
    base = 0.55 * fast["score"] + 0.45 * (1.0 - memory_pack.get("s_mem", 0.0))
    noise = (_stable_unit(cfg.seed, clip["clip_id"], "vlm") - 0.5) * 0.1
    s_vlm = max(0.0, min(1.0, base + noise))
    return {
        "score": round(s_vlm, 6),
        "rationale": (
            f"SIMULATED: clip {clip['clip_id']} vs {len(memory_pack.get('hits', []))} "
            "normal memories; evidence for teaching only."
        ),
        "evidence_spans": ["keyframe:0", "memory:top1"],
        "simulated": True,
    }


def fuse_scores(
    s_fast: float,
    s_mem: float,
    s_vlm: Optional[float],
    cfg: PipelineConfig,
) -> float:
    if s_vlm is None:
        w_f, w_m = cfg.fast_weight, cfg.memory_weight
        if not cfg.enable_memory:
            w_f, w_m = 1.0, 0.0
        z = w_f + w_m
        return round((w_f * s_fast + w_m * s_mem) / z, 6)
    w_f, w_m, w_v = cfg.fast_weight, cfg.memory_weight, cfg.vlm_weight
    if not cfg.enable_memory:
        w_m = 0.0
    z = w_f + w_m + w_v
    return round((w_f * s_fast + w_m * s_mem + w_v * s_vlm) / z, 6)


def run_pipeline(
    video_or_clip_id: str,
    cfg: Optional[PipelineConfig] = None,
    memory: Optional[Sequence[Dict[str, Any]]] = None,
) -> Event:
    """sample → score → trigger → memory → vlm → fuse → event (all simulated)."""
    cfg = cfg or PipelineConfig()
    memory = list(memory or [])
    clip = sample_clip(video_or_clip_id, cfg)
    fast = fast_score(clip, cfg)
    reviewed = should_review(fast["score"], fast["uncertainty"], cfg)

    s_mem = 0.0
    hits: List[str] = []
    vlm_score = None
    rationale = None
    path = "fast"

    if reviewed:
        path = "slow"
        mem = retrieve_memory(clip, memory, cfg)
        hits = list(mem["hits"])
        s_mem = float(mem["s_mem"])
        if cfg.enable_vlm:
            vlm = verify_with_vlm(clip, mem, fast, cfg)
            vlm_score = float(vlm["score"])
            rationale = vlm["rationale"]
        final = fuse_scores(fast["score"], s_mem, vlm_score, cfg)
    else:
        final = fast["score"]

    return Event(
        clip_id=clip["clip_id"],
        path=path,
        score=final,
        uncertainty=fast["uncertainty"],
        reviewed=reviewed,
        memory_hits=len(hits),
        vlm_score=vlm_score,
        rationale=rationale,
        simulated=True,
    )


def build_demo_memory(seed: int = 23, n: int = 20) -> List[Dict[str, Any]]:
    """Train-normal only synthetic memory bank."""
    bank = []
    for i in range(n):
        cid = f"train-normal-{i:03d}"
        bank.append(
            {
                "clip_id": cid,
                "emb": _stable_unit(seed, cid, "emb"),
                "label": "normal",
                "split": "train",
            }
        )
    return bank


def demo_batch(seed: int = 23) -> Dict[str, Any]:
    cfg = PipelineConfig(seed=seed)
    memory = build_demo_memory(seed=seed)
    # 1000 clips so call rate converges near the teaching ~12% figure.
    clip_ids = [f"demo-clip-{i:04d}" for i in range(1000)]
    events = [asdict(run_pipeline(cid, cfg, memory)) for cid in clip_ids]
    call_rate = sum(1 for e in events if e["reviewed"]) / len(events)
    return {
        "simulated": True,
        "implementationStatus": IMPLEMENTATION_STATUS,
        "seed": seed,
        "n_events": len(events),
        "vlm_call_rate": round(call_rate, 4),
        "events_preview": events[:8],
    }


if __name__ == "__main__":
    out = demo_batch(seed=23)
    print(json.dumps(out, ensure_ascii=False, sort_keys=True, indent=2))
    summary = {
        "simulated": True,
        "seed": out["seed"],
        "n_events": out["n_events"],
        "vlm_call_rate": out["vlm_call_rate"],
        "first_event_score": out["events_preview"][0]["score"],
        "first_event_path": out["events_preview"][0]["path"],
    }
    print("---SUMMARY---")
    print(json.dumps(summary, sort_keys=True))
