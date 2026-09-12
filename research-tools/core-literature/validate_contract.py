import csv
import json
import sys
from pathlib import Path


def main():
    directory = Path(sys.argv[1])
    fields = ["direction", "openalexId", "paper_id", "title", "authors", "source", "year", "doi", "abstract", "bibKey", "pdfPath", "pdf_path", "downloadStatus", "sourceUrl"]
    with (directory / "references.csv").open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if set(fields) - set(reader.fieldnames or []): raise SystemExit("references.csv missing compatibility fields")
        rows = list(reader)
    for filename in ("references.bib", "handoff.md", "download-report.json", "download-state.json", "manifest.json"):
        if not (directory / filename).exists(): raise SystemExit("missing " + filename)
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    for key in ("runId", "stage", "status", "files", "counts", "errors", "sourceQueries", "createdAt"):
        if key not in manifest: raise SystemExit("manifest missing " + key)
    if manifest["stage"] != "core-literature-pack": raise SystemExit("unexpected stage")
    counts = manifest["counts"]
    target_count = counts.get("targetCount")
    if not isinstance(target_count, int) or isinstance(target_count, bool) or not 100 <= target_count <= 300: raise SystemExit("manifest targetCount must be an integer from 100 to 300")
    if counts.get("references") != len(rows): raise SystemExit("manifest references count mismatch")
    if counts.get("pdfDownloaded") != sum(row["downloadStatus"] in {"downloaded_oa", "downloaded_existing"} for row in rows): raise SystemExit("manifest PDF count mismatch")
    if manifest["status"] == "partial" and counts.get("candidateInput", 0) >= target_count: raise SystemExit("partial status requires insufficient candidates")
    for filename in manifest["files"]:
        if Path(filename).is_absolute() or ".." in Path(filename).parts: raise SystemExit("manifest contains non-relative path")
    report = json.loads((directory / "download-report.json").read_text(encoding="utf-8"))
    if not isinstance(report.get("items"), list) or any("status" not in item for item in report["items"]): raise SystemExit("download report has missing item status")
    for row in rows:
        if row["paper_id"] != row["openalexId"]: raise SystemExit("paper_id compatibility alias mismatch")
        if row["pdf_path"] != row["pdfPath"]: raise SystemExit("pdf_path compatibility alias mismatch")
        if row["downloadStatus"] in {"downloaded_oa", "downloaded_existing"} and not (directory / row["pdfPath"]).is_file(): raise SystemExit("downloaded row has no PDF file")
        if row["pdfPath"] and row["downloadStatus"] not in {"downloaded_oa", "downloaded_existing"}: raise SystemExit("failed row has a PDF path")
    print("core-pack contract: PASS")


if __name__ == "__main__": main()
