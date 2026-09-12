"""Generate synthetic PDFs and sync writing figures for camera-vad demo."""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "demo-packages" / "camera-vad-scene-memory"


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def escape_pdf_text(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(pages_lines: list[list[str]], title_note: str) -> bytes:
    n = len(pages_lines)
    font_obj = 3
    first_page_obj = 4
    page_numbers = [first_page_obj + 2 * i for i in range(n)]
    content_numbers = [first_page_obj + 2 * i + 1 for i in range(n)]

    def stream_for_lines(lines: list[str], y0: int = 750, leading: int = 14) -> bytes:
        parts = ["BT", "/F1 11 Tf", f"50 {y0} Td", f"{leading} TL"]
        first = True
        for line in lines:
            t = escape_pdf_text(line)
            if first:
                parts.append(f"({t}) Tj")
                first = False
            else:
                parts.append(f"T* ({t}) Tj")
        parts.append("ET")
        return "\n".join(parts).encode("latin-1", errors="replace")

    objs: dict[int, bytes] = {}
    kids_str = " ".join(f"{p} 0 R" for p in page_numbers)
    objs[1] = b"<< /Type /Catalog /Pages 2 0 R >>"
    objs[2] = f"<< /Type /Pages /Kids [{kids_str}] /Count {n} >>".encode()
    objs[3] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"

    for i, lines in enumerate(pages_lines):
        header = [title_note, ""] + lines
        data = stream_for_lines(header)
        pobj = page_numbers[i]
        cobj = content_numbers[i]
        objs[pobj] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Contents {cobj} 0 R /Resources << /Font << /F1 {font_obj} 0 R >> >> >>"
        ).encode()
        objs[cobj] = (
            f"<< /Length {len(data)} >>\nstream\n".encode()
            + data
            + b"\nendstream"
        )

    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = {0: 0}
    max_obj = max(objs)
    for i in range(1, max_obj + 1):
        offsets[i] = len(out)
        out.extend(f"{i} 0 obj\n".encode())
        out.extend(objs[i])
        out.extend(b"\nendobj\n")
    xref_pos = len(out)
    out.extend(f"xref\n0 {max_obj + 1}\n".encode())
    out.extend(b"0000000000 65535 f \n")
    for i in range(1, max_obj + 1):
        out.extend(f"{offsets[i]:010d} 00000 n \n".encode())
    out.extend(
        f"trailer\n<< /Size {max_obj + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode()
    )
    return bytes(out)


def main() -> None:
    papers = {
        "DEMO-001": [
            [
                "SYNTHETIC SAMPLE -- NOT A REAL PUBLICATION",
                "Title: Fast Screening for Camera Anomaly Clips",
                "Authors: Demo Author A",
                "Venue: Demo Venue (2025)",
                "",
                "Abstract: Lightweight scoring selects suspicious camera clips.",
                "This PDF exists only so the Demo reader UI can open a valid file.",
                "Do not cite as scholarly evidence.",
            ]
        ],
        "DEMO-002": [
            [
                "SYNTHETIC SAMPLE -- NOT A REAL PUBLICATION",
                "Title: Memory Retrieval for Scene Understanding",
                "Authors: Demo Author B",
                "Venue: Demo Venue (2024)",
                "",
                "Abstract: Normal scene memories support retrieval and comparison.",
                "This PDF exists only so the Demo reader UI can open a valid file.",
                "Do not cite as scholarly evidence.",
            ]
        ],
        "DEMO-003": [
            [
                "SYNTHETIC SAMPLE -- NOT A REAL PUBLICATION",
                "Title: Language Guided Verification of Video Events",
                "Authors: Demo Author C",
                "Venue: Demo Venue (2026)",
                "",
                "Abstract: A vision language model explains uncertain event clips.",
                "This PDF exists only so the Demo reader UI can open a valid file.",
                "Do not cite as scholarly evidence.",
            ]
        ],
    }

    for pid, pages in papers.items():
        path = ROOT / "topic" / "papers" / f"{pid}.pdf"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(make_pdf(pages, "SYNTHETIC SAMPLE"))
        assert path.read_bytes().startswith(b"%PDF")
        print(pid, path.stat().st_size)

    paper_pages = [
        [
            "NOT produced by pdflatex (engine unavailable or cvpr.sty missing).",
            "",
            "Title: Scene-Memory Guided Fast-Slow Video Anomaly Detection",
            "       with Selective Vision-Language Verification",
            "",
            "Abstract:",
            "We study inference-cost control for fixed-camera VAD using lightweight",
            "screening, scene-normal memory, and selective VLM review. On synthetic",
            "camera-demo, Ours reaches AUROC 87.1% at 12% VLM call rate vs Lightweight",
            "81.2% and VLM-all 100% calls. ALL METRICS ARE SIMULATED.",
        ],
        [
            "Method",
            "",
            "Pipeline: sample -> fast_score(s,u) -> should_review -> retrieve_memory",
            "-> verify_with_vlm -> fuse -> event.",
            "I1 trigger: s>=0.65 or u>=0.2",
            "I2 memory: topK=5 train-normal only",
            "I3 VLM: simulated JSON evidence; fusion weights 0.4/0.2/0.4",
            "",
            "Figures: figures/architecture.png, figures/comparison.png",
            "(valid PNGs present; not GPT originals).",
        ],
        [
            "Results",
            "",
            "Method                     AUROC   AP    F1   VLM%   ms",
            "Lightweight                 81.2  57.8  61.4     0   18",
            "VLM-all                     85.9  64.1  66.2   100  680",
            "FastSlow-I1                 84.8  62.5  65.1    18  137",
            "MemoryFastSlow-I1I2I3       87.1  67.2  68.0    12   99",
            "",
            "Ablation AUROC: 81.2 -> 84.8 -> 85.6 -> 87.1",
            "Seeds 11/23/47 Ours AUROC mean+/-std: 87.10 +/- 0.30",
            "",
            "Conclusion: teaching demo only; real measurement required for claims.",
        ],
    ]
    paper_pdf = ROOT / "writing" / "paper.pdf"
    paper_pdf.write_bytes(
        make_pdf(paper_pages, "SIMULATED DEMO COMPILED SUBSTITUTE")
    )
    assert paper_pdf.read_bytes().startswith(b"%PDF")
    print("paper.pdf", paper_pdf.stat().st_size)

    for name in ["architecture.png", "comparison.png"]:
        src = ROOT / "experiment" / "figures" / name
        dst = ROOT / "writing" / "figures" / name
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
        magic = src.read_bytes()[:8]
        assert magic == b"\x89PNG\r\n\x1a\n", magic
        print(name, src.stat().st_size, sha256(src)[:16])

    print("OK")


if __name__ == "__main__":
    main()
