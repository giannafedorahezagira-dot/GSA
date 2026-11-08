#!/usr/bin/env python3
"""Patient background driver for z-ai image-search with 429 backoff."""
import json, os, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

IMG_DIR = "/home/z/my-project/scripts/img"
os.makedirs(IMG_DIR, exist_ok=True)

# key|count|query
QUERIES = [l.strip() for l in open("/tmp/img_queries.txt") if l.strip()]
DEADLINE = time.time() + 60 * 40  # 40 min global budget

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

def parse(key):
    for line in QUERIES:
        k, c, q = line.split("|", 2)
        if k == key:
            return int(c), q
    raise KeyError(key)

def run_one(key):
    count, query = parse(key)
    out = f"{IMG_DIR}/{key}.json"
    if os.path.exists(out) and os.path.getsize(out) > 0:
        return f"skip {key}"
    backoff = 30
    while time.time() < DEADLINE:
        try:
            r = subprocess.run(
                ["z-ai", "image-search", "-q", query, "-c", str(count), "--gl", "us", "--no-rank"],
                capture_output=True, text=True, timeout=200)
            text = r.stdout or ""
            # the CLI prints emoji logs, then pretty JSON starting at first "{"
            idx = text.find("{")
            if idx >= 0:
                try:
                    data = json.JSONDecoder().raw_decode(text[idx:])[0]
                except Exception:
                    data = None
                if isinstance(data, dict) and data.get("success") and data.get("results"):
                    with open(out, "w") as f:
                        json.dump(data, f)
                    return f"done {key}: {len(data['results'])} imgs"
                if data is not None:
                    log(f"{key}: api says failure: {str(data)[:120]}")
                    time.sleep(15)
                    continue
            full = (r.stderr or "") + text
            if "429" in full or "Too many requests" in full:
                log(f"{key}: 429, sleep {backoff}s")
                time.sleep(backoff)
                backoff = min(backoff + 15, 150)
                continue
            log(f"{key}: no json, error {(r.stderr or text)[:200]}".replace("\n", " "))
            time.sleep(15)
        except subprocess.TimeoutExpired:
            log(f"{key}: timeout")
        time.sleep(3)
    return f"FAIL {key}"

keys = [l.split("|")[0] for l in QUERIES]
with ThreadPoolExecutor(max_workers=2) as ex:
    for res in ex.map(run_one, keys):
        log(res)

missing = [k for k in keys if not (os.path.exists(f"{IMG_DIR}/{k}.json") and os.path.getsize(f"{IMG_DIR}/{k}.json") > 0)]
log(f"COMPLETE. missing: {missing if missing else 'none'}")
