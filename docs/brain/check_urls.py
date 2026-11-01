#!/usr/bin/env python3
"""Check every URL in research/*.jsonl and write research/url-check.json.

Verdicts: ok (2xx/3xx), blocked (401/403/429/999: the site refuses bots, not proof the page is gone),
dead (404/410/5xx/DNS/TLS/timeout after one retry). build.py refuses to cite a dead ref.

Usage: python3 -I check_urls.py [--only key1,key2]  (default: all rows)
Exit: 0 when no row is dead, 1 otherwise.
"""
import concurrent.futures as cf
import json
import shutil
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
UA = "Mozilla/5.0 (compatible; lld-url-check/1.0)"
TIMEOUT = 20


def probe(url: str) -> tuple[str, int | str]:
    ctx = ssl.create_default_context()
    last: int | str = "?"
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, method=method, headers={"User-Agent": UA, "Accept": "*/*"})
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as r:
                return "ok", r.status
        except urllib.error.HTTPError as e:
            last = e.code
            if e.code in (401, 403, 429, 999):
                return "blocked", e.code
            if method == "HEAD" and e.code in (400, 405, 501):
                continue  # server dislikes HEAD; retry as GET
            if e.code in (404, 410) or e.code >= 500:
                if method == "HEAD":
                    continue  # confirm with GET before calling it dead
                return "dead", e.code
            return "ok", e.code
        except Exception as e:  # DNS, TLS, timeout, reset
            last = type(e).__name__
            if method == "HEAD":
                continue
    return _curl_fallback(url, last)


def _curl_fallback(url: str, last: int | str) -> tuple[str, int | str]:
    """Python's TLS handshake is tarpitted by some bot filters (openai.com times out for urllib and answers curl
    with an instant 403). When urllib failed on a transport error, ask curl once and map its HTTP code the same way."""
    if isinstance(last, int) or not shutil.which("curl"):
        return "dead", last
    try:
        out = subprocess.run(["curl", "-s", "-o", "/dev/null", "-m", str(TIMEOUT), "-L", "-w", "%{http_code}", "-A", UA, url],
                             capture_output=True, text=True, timeout=TIMEOUT + 5, check=False).stdout.strip()
        code = int(out)
    except (subprocess.TimeoutExpired, ValueError):
        return "dead", last
    if code in (401, 403, 429, 999):
        return "blocked", code
    if code == 0 or code in (404, 410) or code >= 500:
        return "dead", code or last
    return "ok", code


def main(argv) -> int:
    only = set(argv[argv.index("--only") + 1].split(",")) if "--only" in argv else None
    rows = []
    for f in sorted((HERE / "research").glob("*.jsonl")):
        for line in f.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                if not only or r["key"] in only:
                    rows.append(r)
    out_path = HERE / "research" / "url-check.json"
    prev = json.loads(out_path.read_text()) if out_path.exists() and only else {}
    urls = sorted({r["url"] for r in rows})
    with cf.ThreadPoolExecutor(16) as ex:
        res = dict(zip(urls, ex.map(probe, urls)))
    result = dict(prev)
    for r in rows:
        v, code = res[r["url"]]
        result[r["key"]] = {"url": r["url"], "verdict": v, "code": code, "status": r.get("status", "")}
    out_path.write_text(json.dumps(result, indent=1, sort_keys=True), encoding="utf-8")
    tally: dict[str, int] = {}
    for x in result.values():
        tally[x["verdict"]] = tally.get(x["verdict"], 0) + 1
    print(f"checked {len(urls)} unique urls for {len(rows)} rows: {tally}")
    dead = [(k, x["code"], x["url"]) for k, x in sorted(result.items()) if x["verdict"] == "dead"]
    for k, c, u in dead:
        print(f"  DEAD {k} [{c}] {u}")
    return 1 if dead else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
