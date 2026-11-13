# Ajmal Yaseen — Portfolio

Cinematic portfolio for a Dubai videographer / photographer.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · GSAP 3.15 (ScrollTrigger, SplitText) · Lenis smooth scroll · React Three Fiber + custom GLSL shader · Motion.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

### Portfolio archive (`#portfolio`)

The filterable gallery shows every file in `src/data/works.json`, which is generated from raw media:

```bash
pip install pillow imageio-ffmpeg           # once
# 1. pull the public Google Drive folder (each sub-folder = a category)
python -I scripts/drive-download.py <DRIVE_FOLDER_ID> ../works-source/drive
# 2. optional: drop extra photos/videos in ../works-source/drive/<Category name>/
# 3. resize photos (webp), compress videos (720p mp4 + 6s hover preview + poster)
python -I scripts/process-works.py ../works-source/drive public/work src/data/works.json
```

Re-running only processes new files.

**Full-length videos play from Google Drive** (Drive's player inside the site's viewer), so the
site itself only ships thumbnails, posters and 6-second hover previews — light enough for
Netlify's free plan. The Drive folder must stay shared as "Anyone with the link". To add a video:
upload it to the Drive folder, then run steps 1 and 3 above. To serve untouched copies from the
site instead (needs a host with plenty of bandwidth), run step 3 with `VIDEO_HOST=site`.

**Deploying (Netlify):** connect the repo; Netlify detects Next.js (build `npm run build`).
Link previews / sitemap use Netlify's address automatically — once you have your own domain,
set the environment variable `NEXT_PUBLIC_SITE_URL=https://your-domain.com`. Category names/labels and their order are set in
`CATEGORIES` (scripts/process-works.py) and `ORDER` (src/data/works.ts).
Raw originals stay in `../works-source/` (outside the site) — only optimised copies are deployed.

## Editing content

All copy, contacts, skills and projects live in **`src/data/site.ts`**.

### Adding real work (important)

The four project cards use styled film-frame placeholders until media is added:

1. Put files in `public/work/` (e.g. `brand-doc.jpg`, `brand-doc.mp4`).
2. In `src/data/site.ts`, set them on the project:
   ```ts
   { id: "01", title: "Brand Documentary", image: "/work/brand-doc.jpg", video: "/work/brand-doc.mp4", href: "https://youtu.be/..." }
   ```
   - `image` shows as the still; `video` (muted, looped) plays on hover.
   - `href` is where the card links (defaults to the Pixieset gallery).

Add or remove projects freely — the horizontal reel resizes itself.

## Sections

| Section | Interaction |
|---|---|
| Preloader | "REC" slate, timecode + counter, shutter-panel exit |
| Hero | WebGL portrait with chromatic lens following the cursor, viewfinder HUD (live timecode, ISO/f-stop), autofocus brackets, split-letter name reveal, scroll dolly-out |
| Marquee | Services ticker that speeds up / reverses with scroll velocity |
| Selected reels | Pinned horizontal scroll, 3D tilt cards, letterbox bars open on hover |
| About | Words "expose" as you scroll, clip-path photo reveal, 4-step process |
| Experience | Accordion "call sheet" |
| Toolkit | Skills as audio level meters, gear cards |
| Contact | Magnetic CTA, copy-email, WhatsApp, CV download, live Dubai clock in nav |

Custom cursor (labels like VIEW / FOCUS / PLAY), film grain overlay, and `prefers-reduced-motion` support throughout. Touch devices get a slow drifting lens instead of the cursor effect.

## Deploy

Push to GitHub and import into Vercel — no config needed.
