"""First-search source adapter contract; intentionally network-free.

Adapters should return this shape after legal source-specific retrieval. This
module validates the boundary; it does not retrieve papers or generate topics.
"""

from __future__ import annotations

from typing import Any

DEFAULT_TARGET_COUNT = 300
MIN_TARGET_COUNT = 300
MAX_TARGET_COUNT = 800
SOURCE_STATUSES = {
    "available", "needs_credentials", "not_requested", "request_error",
    "invalid_response", "partial",
}
ABSTRACT_STATUSES = {"available", "missing", "unparseable"}


def validate_target_count(value: Any) -> list[str]:
    """Validate selection.targetCount without coercing booleans or strings."""
    if value is None:
        return []
    if isinstance(value, bool) or not isinstance(value, int):
        return ["selection.targetCount must be an integer"]
    if not MIN_TARGET_COUNT <= value <= MAX_TARGET_COUNT:
        return [f"selection.targetCount must be between {MIN_TARGET_COUNT} and {MAX_TARGET_COUNT}"]
    return []


def paginate_unique_records(pages: Any, target_count: int = DEFAULT_TARGET_COUNT) -> dict[str, Any]:
    """Offline reference algorithm for cursor pages and DOI/OpenAlex-ID deduplication.

    `pages` is an iterable of page arrays. It stops once target_count unique
    records are collected, while retaining raw/page counters for the manifest.
    """
    errors = validate_target_count(target_count)
    if errors:
        raise ValueError(errors[0])
    unique: list[dict[str, Any]] = []
    seen: set[str] = set()
    seen_dois: set[str] = set()
    seen_ids: set[str] = set()
    raw_retrieved = duplicate_count = pages_consumed = 0
    target_reached = False
    for page in pages:
        pages_consumed += 1
        if not isinstance(page, list):
            raise ValueError(f"page {pages_consumed} must be an array")
        for record in page:
            raw_retrieved += 1
            if not isinstance(record, dict):
                continue
            doi = str(record.get("doi") or "").strip().lower()
            for prefix in ("https://doi.org/", "http://doi.org/"):
                doi = doi.removeprefix(prefix)
            source_id = str(record.get("openalexId") or record.get("sourceRecordId") or "").strip().lower()
            key = f"doi:{doi}" if doi else f"openalex:{source_id}"
            if not doi and not source_id:
                continue
            if key in seen or (doi and doi in seen_dois) or (source_id and source_id in seen_ids):
                duplicate_count += 1
                continue
            seen.add(key)
            if doi:
                seen_dois.add(doi)
            if source_id:
                seen_ids.add(source_id)
            if len(unique) < target_count:
                unique.append(record)
            if len(unique) >= target_count:
                target_reached = True
                break
        if target_reached:
            break
    return {
        "records": unique,
        "pagesConsumed": pages_consumed,
        "rawRetrieved": raw_retrieved,
        "deduplicated": len(unique),
        "duplicatesSkipped": duplicate_count,
        "targetReached": target_reached,
        "insufficientResults": len(unique) < target_count,
    }


def validate_source_result(result: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(result, dict):
        return ["source result must be an object"]
    for key in ("sourceName", "sourceStatus", "retrievedAt", "query", "papers", "errors"):
        if key not in result:
            errors.append(f"missing {key}")
    if result.get("sourceStatus") not in SOURCE_STATUSES:
        errors.append("invalid sourceStatus")
    if not isinstance(result.get("papers", []), list):
        errors.append("papers must be an array")
    for index, paper in enumerate(result.get("papers", [])):
        if not isinstance(paper, dict):
            errors.append(f"papers[{index}] must be an object")
            continue
        for key in ("sourceRecordId", "title", "abstract", "abstractStatus", "sourceStatus"):
            if key not in paper:
                errors.append(f"papers[{index}] missing {key}")
        if paper.get("abstractStatus") not in ABSTRACT_STATUSES:
            errors.append(f"papers[{index}] invalid abstractStatus")
        if paper.get("abstractStatus") == "missing" and paper.get("abstract") not in ("", None):
            errors.append(f"papers[{index}] missing abstract must be empty")
    return errors

def validate_manifest(manifest: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(manifest, dict):
        return ["manifest must be an object"]
    for key in ("runId", "stage", "status", "selection", "files", "paths", "counts", "sourceStatuses", "errors", "warnings", "sourceQueries", "createdAt"):
        if key not in manifest:
            errors.append(f"manifest missing {key}")
    if manifest.get("stage") != "first-search":
        errors.append("manifest stage must be first-search")
    selection = manifest.get("selection")
    if not isinstance(selection, dict):
        errors.append("manifest selection must be an object")
    else:
        errors.extend(validate_target_count(selection.get("targetCount")))
    counts = manifest.get("counts")
    if not isinstance(counts, dict):
        errors.append("manifest counts must be an object")
    else:
        for key in ("retrieved", "deduplicated", "eligibleForCandidates"):
            if key not in counts or not isinstance(counts[key], int) or counts[key] < 0:
                errors.append(f"manifest counts.{key} must be a non-negative integer")
        target = (selection or {}).get("targetCount", DEFAULT_TARGET_COUNT) if isinstance(selection, dict) else DEFAULT_TARGET_COUNT
        if isinstance(counts.get("deduplicated"), int) and counts["deduplicated"] > target:
            errors.append("manifest deduplicated count exceeds targetCount")
    files = manifest.get("files", [])
    paths = manifest.get("paths", {})
    for value in list(files) + list(paths.values() if isinstance(paths, dict) else []):
        if not isinstance(value, str) or value.startswith(("/", "\\")) or ":" in value or ".." in value.split("/"):
            errors.append(f"manifest path must be relative: {value}")
    statuses = manifest.get("sourceStatuses", {})
    if statuses.get("Scopus") != "needs_credentials":
        errors.append("Scopus status must be needs_credentials in this contract fixture")
    return errors
