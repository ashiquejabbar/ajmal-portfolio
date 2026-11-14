"""Turn raw works (works-source/) into site media in public/work + a manifest — at full quality.

usage: python -I scripts/process-works.py <source_dir> <public_work_dir> <manifest.json>

Quality policy
  * Videos   — the original file, untouched (only re-wrapped so playback starts before the whole
               file downloads). Codecs browsers can't all play (HEVC) also get an H.264 fallback
               encoded visually lossless (CRF 18, same resolution & frame rate).
  * Photos   — the original file, untouched, when its long edge is <= 4096px and it is <= 15 MB.
               Bigger masters (8K/16K, 50-190 MB) are saved at 4096px, JPEG quality 95 (4:4:4) —
               sharper than any screen shows them. The viewer links to the Drive original anyway.
  * Grid     — small thumbnails / 6 s muted hover loops are generated only for the grid tiles.

Each top-level folder in <source_dir> becomes a category; sub-folders become groups.
Re-runnable: skips outputs that already exist.
"""
import json, os, re, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageOps
import imageio_ffmpeg

Image.MAX_IMAGE_PIXELS = None  # our own masters can be 16K+
SRC, OUT, MANIFEST = sys.argv[1:4]
FF = imageio_ffmpeg.get_ffmpeg_exe()
IMG = {".jpg", ".jpeg", ".png", ".webp"}
VID = {".mp4", ".mov", ".m4v"}
MAX_EDGE, MAX_BYTES = 4096, 15 * 1024 * 1024
# Where full-length videos play from:
#   "drive" = Google Drive's embedded player (default — nothing big on the site, no bandwidth cost;
#             Drive re-compresses slightly and its controls sit over the video on phones)
#   "site"  = untouched originals in public/work, played by the browser's own player (best
#             quality, native controls on phones; uses the host's bandwidth)
VIDEO_HOST = os.environ.get("VIDEO_HOST", "drive")

ids_path = os.path.join(SRC, "_drive_ids.json")
DRIVE_IDS = json.load(open(ids_path, encoding="utf-8")) if os.path.exists(ids_path) else {}

# Folder name -> (category label, slug). Unknown folders fall back to their own name.
CATEGORIES = {
    "real estate": ("Real Estate", "real-estate"),
    "f&b": ("Food & Beverage", "fnb"),
    "menu shoot": ("Menu Shoot", "menu"),
    "gym & out doors": ("Fitness & Outdoors", "fitness"),
    "pet shop": ("Pet Care", "pet-care"),
    "travels": ("Travel", "travel"),
    "bday partys": ("Birthday Parties", "birthdays"),
    "pixieset": ("Events", "events"),
    "joy alukkas": ("Jewellery", "jewellery"),
}


def slug(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-") or "item"


def title(name):
    t = re.sub(r"[_\.]+", " ", os.path.splitext(name)[0])
    t = re.sub(r"\(\d+\)|\bfinal\b", "", t, flags=re.I)
    t = re.sub(r"\s+", " ", t).strip()
    if re.fullmatch(r"(untitled|img|dsc|vid|mvi)?[\s_-]*[\d\s]*", t, flags=re.I):
        return ""  # camera/export names say nothing — the site shows the category instead
    return t[:1].upper() + t[1:]


def probe(path):
    out = subprocess.run([FF, "-hide_banner", "-i", path], capture_output=True, text=True, errors="replace").stderr
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out)
    dur = int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0
    v = re.search(r"Video: (\w+).*?, (\d{2,5})x(\d{2,5})", out)
    if not v:
        raise RuntimeError(f"no readable video stream in {path}")
    codec, w, h = v[1], int(v[2]), int(v[3])
    rot = re.search(r"rotation of (-?\d+)|rotate\s*:\s*(-?\d+)", out)
    if rot and abs(int(rot[1] or rot[2])) in (90, 270):
        w, h = h, w
    return dur, codec, w, h


def _tmp(out):
    root, ext = os.path.splitext(out)
    return f"{root}.part{ext}"  # keep the extension so ffmpeg/PIL pick the right format


def ff(*args):
    """Run ffmpeg; the last arg is the output, written atomically (a crash never leaves a half file)."""
    out = args[-1]
    tmp = _tmp(out)
    r = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args[:-1], tmp], capture_output=True, text=True, errors="replace")
    if r.returncode:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise RuntimeError(r.stderr[-400:])
    os.replace(tmp, out)


def save(img, out, fmt, **kw):
    tmp = _tmp(out)
    try:
        img.save(tmp, fmt, **kw)
    except Exception:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise
    os.replace(tmp, out)


def copy(src, out):
    tmp = _tmp(out)
    shutil.copyfile(src, tmp)
    os.replace(tmp, out)


def has_alpha(im):
    return im.mode in ("RGBA", "LA") and im.getchannel("A").getextrema()[0] < 255


def do_image(src, dst_base):
    ext = os.path.splitext(src)[1].lower().replace(".jpeg", ".jpg")
    thumb = dst_base + "-sm.webp"
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        w, h = im.size
        alpha = has_alpha(im)
        if max(w, h) <= MAX_EDGE and os.path.getsize(src) <= MAX_BYTES:
            full = dst_base + ext
            if not os.path.exists(full):
                copy(src, full)  # untouched original
            master = True
        else:
            full = dst_base + (".png" if alpha else ".jpg")
            if not os.path.exists(full):
                c = im.copy()
                c.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
                if alpha:
                    save(c, full, "PNG", optimize=True)
                else:
                    save(c.convert("RGB"), full, "JPEG", quality=95, subsampling=0, optimize=True, progressive=True)
            master = False
        if not os.path.exists(thumb):
            c = im.copy()
            c.thumbnail((900, 900), Image.LANCZOS)
            save(c, thumb, "WEBP", quality=88, method=5)
        thumb_xs = dst_base + "-xs.webp"  # phones: ~180px-wide tiles at 2-3x
        if not os.path.exists(thumb_xs):
            c = im.copy()
            c.thumbnail((480, 480), Image.LANCZOS)
            save(c, thumb_xs, "WEBP", quality=80, method=5)
        with Image.open(full) as f:
            fw, fh = ImageOps.exif_transpose(f).size  # displayed size (EXIF rotation applied)
    return {"type": "image", "w": fw, "h": fh, "src": full, "thumb": thumb, "thumbXs": thumb_xs, "original": master,
            "_base": dst_base}


def do_video(src, dst_base, drive_id=None):
    dur, codec, w, h = probe(src)
    mp4, prev, poster = dst_base + ".mp4", dst_base + "-preview.mp4", dst_base + ".jpg"
    # Videos that live on Google Drive play from Drive's player — no full-size copy on the site.
    hosted = bool(drive_id) and VIDEO_HOST == "drive"
    fallback = dst_base + "-h264.mp4" if codec in ("hevc", "h265") and not hosted else None
    if not hosted and not os.path.exists(mp4):
        # stream copy = bit-for-bit the same picture & sound, just web-optimised container
        ff("-i", src, "-map", "0:v:0", "-map", "0:a?", "-c", "copy", "-tag:v", "hvc1" if fallback else "avc1",
           "-movflags", "+faststart", mp4)
    if fallback and not os.path.exists(fallback):
        ff("-i", src, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", fallback)
    mobile = dst_base + "-mobile.mp4"
    if hosted and not os.path.exists(mobile):
        # Phones: a 1080p H.264 copy (looks the same as the original on a phone screen, ~1/5 the
        # size) played in the phone's own clean player — Drive's embedded player covers the video
        # with its controls on touch screens. Short side capped at 1080, original frame rate kept.
        scale = "scale='if(gt(iw,ih),-2,min(1080,iw))':'if(gt(iw,ih),min(1080,ih),-2)'"
        ff("-i", src, "-vf", scale, "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-profile:v", "high",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", mobile)
    start = f"{min(dur * 0.2, 8):.2f}" if dur > 6 else "0"
    if not os.path.exists(prev):  # grid hover loop only
        small = "scale='if(gt(iw,ih),min(720,iw),-2)':'if(gt(iw,ih),-2,min(720,ih))'"
        ff("-ss", start, "-t", "6", "-i", src, "-vf", small, "-an", "-c:v", "libx264", "-preset", "slow",
           "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", prev)
    if not os.path.exists(poster):
        ff("-ss", start, "-i", src, "-frames:v", "1", "-q:v", "2", poster)
    poster_sm = dst_base + "-poster-sm.webp"  # grid tiles / reel cards — the full poster is for the viewer
    if not os.path.exists(poster_sm):
        with Image.open(poster) as im:
            im.thumbnail((900, 900), Image.LANCZOS)
            save(im, poster_sm, "WEBP", quality=86, method=5)
    poster_xs, poster_card = dst_base + "-poster-xs.webp", dst_base + "-card.webp"
    with Image.open(poster) as im:
        if not os.path.exists(poster_xs):
            c = im.copy(); c.thumbnail((480, 480), Image.LANCZOS); save(c, poster_xs, "WEBP", quality=80, method=5)
        if not os.path.exists(poster_card):  # "Selected reels" cards (~400 css px wide, 2x DPR)
            c = im.copy(); c.thumbnail((1000, 1000), Image.LANCZOS); save(c, poster_card, "WEBP", quality=84, method=5)
    info = {"type": "video", "w": w, "h": h, "duration": round(dur, 1), "preview": prev, "poster": poster,
            "posterSm": poster_sm, "posterXs": poster_xs, "card": poster_card, "_base": dst_base}
    if hosted:
        # src = Drive's own player (always works). With a Drive API key the site streams the
        # untouched original from the API instead and keeps this as the fallback.
        info.update(src=f"https://drive.google.com/file/d/{drive_id}/preview", player="drive", driveId=drive_id,
                    codec="hevc" if codec in ("hevc", "h265") else "h264", mobile=mobile)
    else:
        info.update(src=mp4, codec="hevc" if fallback else "h264", original=True)
        if fallback:
            info["fallback"] = fallback
    return info


def main():
    for d, _, fs in os.walk(OUT):
        for f in fs:
            if ".part." in f:
                os.remove(os.path.join(d, f))
    jobs, used = [], set()
    for top in sorted(os.listdir(SRC)):
        top_path = os.path.join(SRC, top)
        if not os.path.isdir(top_path):
            continue
        label, cslug = CATEGORIES.get(top.strip().lower(), (top.strip().title(), slug(top)))
        for dirpath, _, files in os.walk(top_path):
            group = os.path.relpath(dirpath, top_path)
            group = None if group == "." else title(group)
            for f in sorted(files, key=lambda n: [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", n)]):
                ext = os.path.splitext(f)[1].lower()
                if ext not in IMG | VID:
                    continue
                out_dir = os.path.join(OUT, cslug)
                os.makedirs(out_dir, exist_ok=True)
                base = slug((group or "") + "-" + os.path.splitext(f)[0])
                # same name, different extension (e.g. "x.jpg" + "x.png") -> keep both, distinct ids
                n, unique = 2, base
                while os.path.join(out_dir, unique) in used:
                    unique, n = f"{base}-{n}", n + 1
                base = unique
                used.add(os.path.join(out_dir, base))
                rel = os.path.relpath(os.path.join(dirpath, f), SRC).replace(os.sep, "/")
                jobs.append((os.path.join(dirpath, f), os.path.join(out_dir, base), ext, label, cslug, group, f, rel))

    def run(j):
        src, base, ext, label, cslug, group, f, rel = j
        try:
            info = do_image(src, base) if ext in IMG else do_video(src, base, DRIVE_IDS.get(rel))
        except Exception as e:  # keep going; report at the end
            print("FAIL", src, e, flush=True)
            return None
        print("ok", src, flush=True)
        info.update(category=label, categorySlug=cslug, title=title(f), group=group)
        if rel in DRIVE_IDS:
            info["drive"] = f"https://drive.google.com/file/d/{DRIVE_IDS[rel]}/view"
        return info

    with ThreadPoolExecutor(4) as ex:
        items = [i for i in ex.map(run, jobs) if i]

    pub = os.path.dirname(os.path.abspath(OUT))
    for it in items:
        for k in ("src", "thumb", "thumbXs", "preview", "poster", "posterSm", "posterXs", "card", "fallback", "mobile"):
            if k in it and not it[k].startswith("http"):
                it[k] = "/" + os.path.relpath(os.path.abspath(it[k]), pub).replace(os.sep, "/")
        base = it.pop("_base")  # local output path without extension, e.g. public/work/menu/x
        rel_base = os.path.relpath(os.path.abspath(base), os.path.abspath(OUT)).replace(os.sep, "/")
        it["id"] = rel_base  # "<category>/<name>"
    with open(MANIFEST, "w", encoding="utf-8") as fh:
        json.dump(items, fh, indent=1, ensure_ascii=False)
    print(f"DONE {len(items)} items -> {MANIFEST}")


main()
