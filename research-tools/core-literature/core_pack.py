import argparse
import csv
import json
import os
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

FIELDS = ["direction", "openalexId", "paper_id", "title", "authors", "source", "year", "doi", "abstract", "bibKey", "pdfPath", "pdf_path", "downloadStatus", "sourceUrl"]
TERMINAL_PREFIXES = ("http_error_401", "http_error_403", "http_error_404", "http_error_410", "unexpected_content_type", "invalid_pdf_content", "pdf_too_large", "pdf_host_not_allowlisted", "pdf_url_not_https")


def now(): return datetime.now(timezone.utc).isoformat()
def text(value): return "; ".join(map(str, value)) if isinstance(value, list) else ("" if value is None else str(value))
def bib_text(value): return " and ".join(map(str, value)) if isinstance(value, list) else text(value)
def bib_escape(value): return bib_text(value).replace("\\", "\\textbackslash ").replace("{", "\\{").replace("}", "\\}").replace("&", "\\&").replace("%", "\\%").replace("_", "\\_")
def valid_pdf(path):
    try:
        with path.open("rb") as handle: return handle.read(5) == b"%PDF-"
    except OSError: return False
def read_json(path, errors, label):
    try: return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc: errors.append(f"无法读取 {label}: {type(exc).__name__}"); return None
def unique_urls(raw):
    values = [raw.get("pdfUrl")]
    values.extend(raw.get("pdfUrls") or []); values.extend(raw.get("alternatePdfUrls") or [])
    if not any(isinstance(value, str) and value.strip() for value in values):
        landing = raw.get("openAccessUrl")
        if isinstance(landing, str) and ".pdf" in urllib.parse.urlparse(landing).path.lower(): values.append(landing)
    result, seen = [], set()
    for value in values:
        if isinstance(value, str) and value.strip() and value not in seen: seen.add(value); result.append(value)
    return result
def normalize(raw):
    return {"openalexId": raw.get("openalexId") or raw.get("id") or "", "title": raw.get("title") or "", "authors": raw.get("authors") or [], "source": raw.get("source") or raw.get("venue") or "", "year": raw.get("year") or raw.get("publicationYear") or raw.get("publication_year") or "", "doi": raw.get("doi") or "", "abstract": raw.get("abstract") or "", "sourceUrl": raw.get("sourceUrl") or raw.get("landingUrl") or raw.get("doi") or raw.get("openalexId") or raw.get("id") or "", "pdfUrls": unique_urls(raw), "isOpenAccess": bool(raw.get("isOpenAccess") or raw.get("open_access")), "type": raw.get("type") or ""}
def record_key(paper):
    doi = paper["doi"].lower().replace("https://doi.org/", "").replace("http://doi.org/", "")
    return "doi:" + doi if doi else "openalex:" + paper["openalexId"].lower()
def entry_type(paper): return "inproceedings" if paper["type"] in {"proceedings-article", "proceedings_article"} else "article" if paper["source"] else "misc"
def allowed_url(url, policy):
    parsed = urllib.parse.urlparse(url); hosts = {str(host).lower() for host in policy.get("allowedPdfHosts", [])}
    if parsed.scheme != "https" and not policy.get("allowHttp", False): return False, "pdf_url_not_https"
    if not hosts or not parsed.hostname or parsed.hostname.lower() not in hosts: return False, "pdf_host_not_allowlisted"
    return True, ""
def host_for(url): return urllib.parse.urlparse(url).hostname or "unknown"
def is_terminal(status): return status.startswith(TERMINAL_PREFIXES) or status == "retry_limit_reached"
def load_state(path):
    if not path.exists(): return {"version": 1, "urls": {}, "hosts": {}, "updatedAt": None}
    try:
        loaded = json.loads(path.read_text(encoding="utf-8")); return {"version": 1, "urls": loaded.get("urls", {}), "hosts": loaded.get("hosts", {}), "updatedAt": loaded.get("updatedAt")}
    except (OSError, json.JSONDecodeError): return {"version": 1, "urls": {}, "hosts": {}, "updatedAt": None}
def save_state(path, state):
    state["updatedAt"] = now(); temp = path.with_suffix(".tmp"); temp.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8"); temp.replace(path)
def update_state(state, lock, url, status, detail):
    if not url: return
    host = host_for(url)
    with lock:
        previous = state["urls"].get(url, {}); attempts = previous.get("attempts", 0) + (1 if detail.get("attempted") else 0)
        state["urls"][url] = {"status": status, "attempts": attempts, "lastAttempted": now(), "httpStatus": detail.get("httpStatus"), "contentType": detail.get("contentType"), "error": detail.get("error", "")}
        stats = state["hosts"].get(host, {"attempts": 0, "successes": 0, "failures": 0}); stats["attempts"] += 1 if detail.get("attempted") else 0
        stats["successes"] += 1 if status == "downloaded_oa" else 0; stats["failures"] += 1 if detail.get("attempted") and status != "downloaded_oa" else 0
        state["hosts"][host] = stats
def known_status(state, lock, url, policy):
    with lock: entry = dict(state["urls"].get(url, {}))
    status = entry.get("status", "")
    if is_terminal(status): return "known_terminal_url"
    if status.startswith("download_failed") and entry.get("attempts", 0) >= int(policy.get("maxTransientAttempts", 2)): return "retry_limit_reached"
    return ""
def download_one(url, target, pdf_policy):
    ok, reason = allowed_url(url, pdf_policy)
    if not ok: return reason, {"url": url, "attempted": False}
    max_bytes = int(pdf_policy.get("maxBytes", 25 * 1024 * 1024)); timeout = int(pdf_policy.get("timeoutSeconds", 20))
    try:
        request_url = url
        parsed = urllib.parse.urlparse(url)
        if parsed.hostname and parsed.hostname.lower() == "content.openalex.org":
            api_key = os.environ.get("OPENALEX_API_KEY", "").strip()
            if not api_key:
                return "openalex_content_api_key_missing", {"url": url, "attempted": False}
            query = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
            query["api_key"] = [api_key]
            request_url = urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(query, doseq=True)))
        request = urllib.request.Request(request_url, headers={"User-Agent": "QihangResearchSkill/1.2", "Accept": "application/pdf"})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            final_url = response.geturl(); ok, reason = allowed_url(final_url, pdf_policy); content_type = response.headers.get_content_type(); length = response.headers.get("Content-Length")
            detail = {"url": url, "finalUrl": final_url, "attempted": True, "httpStatus": response.status, "contentType": content_type}
            if not ok: return reason, detail
            if content_type not in set(pdf_policy.get("allowedContentTypes", ["application/pdf", "application/octet-stream"])): return "unexpected_content_type:" + content_type, detail
            if length and int(length) > max_bytes: return "pdf_too_large", detail
            data = response.read(max_bytes + 1)
            if len(data) > max_bytes: return "pdf_too_large", detail
            if not data.startswith(b"%PDF-"): return "invalid_pdf_content", detail
            temp = target.with_suffix(".part"); temp.write_bytes(data); temp.replace(target); detail["bytes"] = len(data)
            return "downloaded_oa", detail
    except urllib.error.HTTPError as exc: return f"http_error_{exc.code}", {"url": url, "attempted": True, "httpStatus": exc.code}
    except Exception as exc: return "download_failed:" + type(exc).__name__, {"url": url, "attempted": True, "error": str(exc)[:300]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True); parser.add_argument("--mode", choices=["plan", "dry-run", "run"], required=True)
    parser.add_argument("--input-dir"); parser.add_argument("--output-dir", required=True); parser.add_argument("--download-oa", action="store_true")
    args = parser.parse_args(); errors, warnings = [], []
    config = read_json(Path(args.config), errors, "config") or {}; output = Path(args.output_dir); output.mkdir(parents=True, exist_ok=True); pdf_dir = output / "pdf"; pdf_dir.mkdir(exist_ok=True)
    if not config.get("confirmedTopic"): errors.append("confirmedTopic 是必填项")
    selection = config.get("selection") or {}; required = [key for key in ("rankingRule",) if key not in selection]
    if required: errors.append("缺少筛选配置: " + ", ".join(required))
    try: target_count = int(selection.get("targetCount", 100))
    except (TypeError, ValueError): target_count = 0; errors.append("selection.targetCount 必须是 100–300 的整数")
    if target_count < 100 or target_count > 300: errors.append("selection.targetCount 必须是 100–300 的整数")
    download_policy = config.get("downloadPolicy", {}); target_success = download_policy.get("targetSuccessfulPdfs")
    try: target_success = int(target_success) if target_success is not None else None
    except (TypeError, ValueError): errors.append("downloadPolicy.targetSuccessfulPdfs 必须是正整数"); target_success = None
    if target_success is not None and target_success <= 0: errors.append("downloadPolicy.targetSuccessfulPdfs 必须是正整数")
    raw_papers = []
    if args.mode == "run":
        path = Path(args.input_dir or "") / "papers.json"
        if not args.input_dir or not path.exists(): errors.append("run 模式需要 inputDir/papers.json")
        else: raw_papers = read_json(path, errors, "papers.json") or []
        if not isinstance(raw_papers, list): errors.append("papers.json 必须是数组"); raw_papers = []
    papers, seen = [], set()
    for raw in raw_papers:
        if not isinstance(raw, dict): warnings.append("跳过一条非对象论文记录"); continue
        paper = normalize(raw)
        if not paper["title"] or not paper["openalexId"]: warnings.append("跳过缺少 title 或 openalexId 的论文记录"); continue
        key = record_key(paper)
        if key in seen: warnings.append("去重跳过：" + paper["openalexId"]); continue
        seen.add(key); papers.append(paper)
    selected = papers[:target_count]
    if len(papers) < target_count: warnings.append("insufficient_results: 候选池不足 targetCount，按实际数量交接")
    state_path = output / "download-state.json"; state = load_state(state_path); state_lock = threading.Lock(); state_file_lock = threading.Lock(); result_lock = threading.Lock(); host_gate_lock = threading.Lock(); results = {}
    workers = max(1, min(32, int(download_policy.get("maxWorkers", 8))))
    per_host = max(1, min(workers, int(download_policy.get("maxWorkersPerHost", 2))))
    circuit_limit = max(0, int(download_policy.get("hostFailureThreshold", 3)))
    host_gates = {}
    host_failures = defaultdict(int)
    def persist_state():
        with state_lock:
            with state_file_lock: save_state(state_path, state)
    def gate_for(host):
        with host_gate_lock:
            if host not in host_gates: host_gates[host] = threading.BoundedSemaphore(per_host)
            return host_gates[host]
    def host_open(host):
        with result_lock: return circuit_limit == 0 or host_failures[host] < circuit_limit
    def note_host_failure(host):
        with result_lock: host_failures[host] += 1
    def key_for(paper): return "openalex_" + paper["openalexId"].rstrip("/").rsplit("/", 1)[-1]
    def process(paper):
        key = key_for(paper); target = pdf_dir / f"{key}.pdf"
        if valid_pdf(target): return {"status": "downloaded_existing", "pdfPath": "pdf/" + target.name, "detail": {"attempted": False, "reused": True, "bibKey": key, "status": "downloaded_existing"}}
        if not paper["isOpenAccess"]: return {"status": "not_open_access", "pdfPath": "", "detail": {"attempted": False, "bibKey": key, "status": "not_open_access"}}
        if not paper["pdfUrls"]: return {"status": "no_oa_pdf_url", "pdfPath": "", "detail": {"attempted": False, "bibKey": key, "status": "no_oa_pdf_url"}}
        last = "known_terminal_url"; details = []
        for url in paper["pdfUrls"]:
            known = known_status(state, state_lock, url, download_policy)
            if known:
                details.append({"url": url, "attempted": False, "status": known}); last = known; continue
            host = host_for(url)
            if not host_open(host):
                details.append({"url": url, "attempted": False, "status": "host_circuit_open"}); last = "host_circuit_open"; continue
            with gate_for(host):
                known = known_status(state, state_lock, url, download_policy)
                if known:
                    details.append({"url": url, "attempted": False, "status": known}); last = known; continue
                if not host_open(host):
                    details.append({"url": url, "attempted": False, "status": "host_circuit_open"}); last = "host_circuit_open"; continue
                status, detail = download_one(url, target, config.get("pdfPolicy", {})); detail.update({"bibKey": key, "status": status}); update_state(state, state_lock, url, status, detail); persist_state(); details.append(detail); last = status
                if detail.get("attempted") and status != "downloaded_oa": note_host_failure(host)
            if status == "downloaded_oa": return {"status": status, "pdfPath": "pdf/" + target.name, "detail": detail, "alternates": details}
        return {"status": last, "pdfPath": "", "detail": details[-1] if details else {"bibKey": key, "attempted": False, "status": last}, "alternates": details}
    for paper in selected:
        key = key_for(paper); target = pdf_dir / f"{key}.pdf"
        if args.mode != "run" or not args.download_oa:
            status = "not_attempted_dry_run" if args.mode != "run" else "download_not_requested"
            results[key] = {"status": status, "pdfPath": "", "detail": {"bibKey": key, "attempted": False, "status": status}}
        elif valid_pdf(target) or not paper["isOpenAccess"] or not paper["pdfUrls"]: results[key] = process(paper)
    success_count = sum(result["status"] in {"downloaded_oa", "downloaded_existing"} for result in results.values())
    if args.mode == "run" and args.download_oa:
        queue = []
        for paper in selected:
            key = key_for(paper)
            if key in results: continue
            candidates = [url for url in paper["pdfUrls"] if not known_status(state, state_lock, url, download_policy)]
            if not candidates: results[key] = process(paper); continue
            queue.append(paper)
        def worker(paper): return key_for(paper), process(paper)
        with ThreadPoolExecutor(max_workers=workers) as executor:
            while queue:
                with result_lock:
                    remaining = target_success - success_count if target_success is not None else len(queue)
                if target_success is not None and remaining <= 0: break
                batch_size = min(workers, len(queue), remaining)
                batch, queue = queue[:batch_size], queue[batch_size:]
                for key, result in executor.map(worker, batch):
                    results[key] = result
                    if result["status"] in {"downloaded_oa", "downloaded_existing"}: success_count += 1
    persist_state()
    report, rows, bibliography = [], [], []
    for paper in selected:
        key = key_for(paper); result = results.get(key, {"status": "not_needed_after_target", "pdfPath": "", "detail": {"bibKey": key, "attempted": False, "status": "not_needed_after_target"}})
        detail = result["detail"]; report.append(detail if "alternates" not in result else {"bibKey": key, "status": result["status"], "attempted": any(item.get("attempted") for item in result["alternates"]), "alternates": result["alternates"]})
        row = {"direction": config.get("confirmedTopic", ""), "openalexId": paper["openalexId"], "paper_id": paper["openalexId"], "title": paper["title"], "authors": paper["authors"], "source": paper["source"], "year": paper["year"], "doi": paper["doi"], "abstract": paper["abstract"], "bibKey": key, "pdfPath": result["pdfPath"], "pdf_path": result["pdfPath"], "downloadStatus": result["status"], "sourceUrl": paper["sourceUrl"]}; rows.append(row)
        bibliography.append(f"@{entry_type(paper)}{{{key},\n  title = {{{bib_escape(row['title'])}}},\n  author = {{{bib_escape(row['authors'])}}},\n  year = {{{bib_escape(row['year'])}}},\n  journal = {{{bib_escape(row['source'])}}},\n  doi = {{{bib_escape(row['doi'])}}},\n  url = {{{bib_escape(row['sourceUrl'])}}}\n}}\n")
    with (output / "references.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS); writer.writeheader(); writer.writerows([{name: text(row.get(name, "")) for name in FIELDS} for row in rows])
    (output / "references.bib").write_text("\n".join(bibliography), encoding="utf-8")
    (output / "download-report.json").write_text(json.dumps({"attempted": args.mode == "run" and args.download_oa, "items": report}, ensure_ascii=False, indent=2), encoding="utf-8")
    downloaded_count = sum(row["downloadStatus"] in {"downloaded_oa", "downloaded_existing"} for row in rows)
    if target_success is not None and downloaded_count < target_success: warnings.append(f"有效 PDF 不足：目标 {target_success}，实际 {downloaded_count}")
    failure_count = sum(row["downloadStatus"] not in {"downloaded_oa", "downloaded_existing"} for row in rows)
    handoff = ["# 核心文献交接说明", "", f"- 已确认课题：{config.get('confirmedTopic', '未提供')}", f"- 筛选配置：{json.dumps(selection, ensure_ascii=False)}", f"- 核心文献目标（targetCount）：{target_count} 篇", f"- 候选池实际输入：{len(papers)} 条", f"- 实际 references：{len(rows)} 篇", f"- 有效 PDF：{downloaded_count} 篇", f"- 失败或不可获取 PDF：{failure_count} 篇", f"- PDF 独立目标（targetSuccessfulPdfs）：{target_success if target_success is not None else '未设置'}", "", "检索相关性顺序由调用方提供；核心文献数量与 PDF 数量独立统计。下载队列只跳过已记录的终态失败 URL，不把单一失败链接扩大为整个域名黑名单。", ""]
    (output / "handoff.md").write_text("\n".join(handoff), encoding="utf-8")
    status = "failed" if errors else ("planned" if args.mode == "plan" else "dry-run" if args.mode == "dry-run" else "partial" if len(papers) < target_count else "completed")
    files = sorted({path.name for path in output.iterdir() if path.is_file()} | {"manifest.json"})
    manifest = {"runId": config.get("runId") or config.get("taskId") or "core-pack-local", "stage": "core-literature-pack", "status": status, "files": files, "counts": {"candidateInput": len(papers), "candidateAttempted": len(selected), "targetCount": target_count, "references": len(rows), "pdfDownloaded": downloaded_count, "pdfUnavailable": failure_count, "targetSuccessfulPdfs": target_success}, "errors": errors, "warnings": warnings, "sourceQueries": config.get("queries", []), "createdAt": now()}
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False)); return 2 if errors else 0


if __name__ == "__main__": sys.exit(main())
