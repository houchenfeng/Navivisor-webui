import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "interfaces"))
from source_adapter_contract import (
    DEFAULT_TARGET_COUNT,
    paginate_unique_records,
    validate_manifest,
    validate_source_result,
    validate_target_count,
)


def run_self_test() -> list[str]:
    errors: list[str] = []
    for value, expected in ((299, False), (300, True), (800, True), (801, False)):
        passed = not validate_target_count(value)
        if passed != expected:
            errors.append(f"targetCount boundary failed: {value}")
    pages = [
        [{"openalexId": f"W{i}"} for i in range(150)],
        [{"doi": "https://doi.org/10.1/a", "openalexId": "W0"}]
        + [{"openalexId": f"W{i}"} for i in range(150, 301)],
    ]
    result = paginate_unique_records(pages, target_count=300)
    if result["deduplicated"] != 300 or result["duplicatesSkipped"] != 1 or not result["targetReached"] or result["pagesConsumed"] != 2:
        errors.append(f"pagination/dedup failed: {result}")
    if DEFAULT_TARGET_COUNT != 300:
        errors.append("default target count is not 300")
    return errors


def main() -> int:
    if len(sys.argv) == 2 and sys.argv[1] == "--self-test":
        errors = run_self_test()
        if errors:
            for error in errors:
                print(f"ERROR: {error}")
            return 2
        print("source adapter self-test: PASS")
        return 0
    if len(sys.argv) != 2:
        raise SystemExit("usage: python validate_source_contract.py <contract-fixture.json>")
    payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    errors = validate_source_result(payload.get("sourceResult")) + validate_manifest(payload.get("manifest"))
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 2
    print("source adapter contract: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
