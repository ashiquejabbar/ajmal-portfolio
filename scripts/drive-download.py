"""Crawl a public Google Drive folder tree and download every file, preserving folders."""
import html, os, re, sys, urllib.request, concurrent.futures as cf

ROOT_ID, OUT = sys.argv[1], sys.argv[2]
UA = {"User-Agent": "Mozilla/5.0"}
ENTRY = re.compile(r'<a href="(https://drive.google.com/(file/d|drive/folders)/([^/"?]+)[^"]*)".*?flip-entry-title">([^<]*)', re.S)


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120)


def crawl(fid, path, jobs):
    s = get(f"https://drive.google.com/embeddedfolderview?id={fid}").read().decode("utf-8", "replace")
    for m in ENTRY.finditer(s):
        kind, cid, name = m.group(2), m.group(3), html.unescape(m.group(4)).strip()
        name = re.sub(r'[<>:"/\\|?*]', "_", name)
        if kind == "drive/folders":
            crawl(cid, os.path.join(path, name), jobs)
        else:
            jobs.append((cid, os.path.join(path, name)))


def fetch(job):
    cid, dest = job
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return f"skip {dest}"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    url = f"https://drive.usercontent.google.com/download?id={cid}&export=download&confirm=t"
    tmp = dest + ".part"
    with get(url) as r, open(tmp, "wb") as f:
        ctype = r.headers.get("Content-Type", "")
        if "text/html" in ctype:
            return f"FAIL (html) {dest}"
        while chunk := r.read(1 << 20):
            f.write(chunk)
    os.replace(tmp, dest)
    return f"ok {os.path.getsize(dest)//1024}KB {dest}"


jobs = []
crawl(ROOT_ID, OUT, jobs)
print(f"{len(jobs)} files", flush=True)
# remember each file's Drive id so the site can link to the full-resolution original
import json
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "_drive_ids.json"), "w", encoding="utf-8") as fh:
    json.dump({os.path.relpath(d, OUT).replace(os.sep, "/"): cid for cid, d in jobs}, fh, indent=1, ensure_ascii=False)
with cf.ThreadPoolExecutor(6) as ex:
    for res in ex.map(fetch, jobs):
        print(res, flush=True)
print("DONE", flush=True)
