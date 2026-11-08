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
    backoff = 20
    while time.time() < DEADLINE:
        try:
            r = subprocess.run(
                ["z-ai", "image-search", "-q", query, "-c", str(count),
                 "--gl", "us", "--no-rank", "-o", out],
                capture_output=True, text=True, timeout=200)
            if os.path.exists(out) and os.path.getsize(out) > 0:
                with open(out) as f:
                    data = json.load(f)
                n = len(data.get("results", []))
                if data.get("success") and n > 0:
                    return f"done {key}: {n} imgs"
                os.remove(out)
                log(f"{key}: empty result, retrying")
            else:
                err = (r.stderr or r.stdout or "")[:200].replace("\n", " ")
                if "429" in err:
                    log(f"{key}: 429, sleep {backoff}s")
                    time.sleep(backoff)
                    backoff = min(backoff + 10, 90)
                    continue
                log(f"{key}: error {err}")
                time.sleep(10)
        except subprocess.TimeoutExpired:
            log(f"{key}: timeout")
        time.sleep(2)
    return f"FAIL {key}"

keys = [l.split("|")[0] for l in QUERIES]
with ThreadPoolExecutor(max_workers=2) as ex:
    for res in ex.map(run_one, keys):
        log(res)

missing = [k for k in keys if not (os.path.exists(f"{IMG_DIR}/{k}.json") and os.path.getsize(f"{IMG_DIR}/{k}.json") > 0)]
log(f"COMPLETE. missing: {missing if missing else 'none'}")
