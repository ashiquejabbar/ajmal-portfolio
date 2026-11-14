"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { allOrdered, categories, fmtDuration, works, type WorkItem } from "@/data/works";
import { profile } from "@/data/site";
import { lockPage } from "@/lib/overlay";
import { registerAutoplay } from "@/lib/autoplay";

const PAGE = 24;

// Column count follows the breakpoint (matches Tailwind md / xl).
const colsNow = () => (window.matchMedia("(min-width: 1280px)").matches ? 4 : window.matchMedia("(min-width: 768px)").matches ? 3 : 2);
const onResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const useColumns = () => useSyncExternalStore(onResize, colsNow, () => 2);
// phones & tablets: touch screen or narrow window
const isTouchNow = () => window.matchMedia("(pointer: coarse), (max-width: 767px)").matches;
const useIsTouch = () => useSyncExternalStore(onResize, isTouchNow, () => false);

const MAX_STRETCH = 0.35; // in column widths (~1/3 of a tile)
const GAP = 0.045; // the 16px gap, roughly, in column widths

/**
 * Masonry that reads left-to-right: each item drops into the shortest column (stable — loading
 * more only ever appends). Short columns then borrow upcoming items from `pool` that fit their gap.
 * On the final page (empty pool) the small leftover gap is closed by stretching each column's last
 * tile (≤ MAX_STRETCH). While more pages exist, the grid is instead cut on a straight line (see
 * Gallery). Heights are in column widths (h / w), so it's screen-size independent.
 */
function distribute(items: WorkItem[], k: number, n: number, pool: WorkItem[]) {
  const cols: WorkItem[][] = Array.from({ length: n }, () => []);
  const heights = new Array(k).fill(0);
  const h = (it: WorkItem) => it.h / it.w + GAP;
  for (const it of items) {
    const i = heights.indexOf(Math.min(...heights));
    cols[i].push(it);
    heights[i] += h(it);
  }
  const rest = [...pool];
  for (let guard = 0; guard < 24 && rest.length; guard++) {
    const top = Math.max(...heights);
    const lo = heights.indexOf(Math.min(...heights));
    const gap = top - heights[lo];
    if (gap <= MAX_STRETCH) break;
    const fit = rest.slice(0, 30).findIndex((it) => h(it) <= gap + 0.2);
    if (fit < 0) break;
    const it = rest.splice(fit, 1)[0];
    cols[lo].push(it);
    heights[lo] += h(it);
  }
  const top = Math.max(...heights);
  const final = pool.length === 0;
  const fill = cols.map((c, i) => final && i < k && c.length > 0 && top - heights[i] > 0.001 && top - heights[i] <= MAX_STRETCH);
  return { cols, fill, spread: top - Math.min(...heights), placed: cols.reduce((a, c) => a + c.length, 0) };
}

/** On the last page a small set can use one column fewer (same tile size) if that ends level. */
function toColumns(items: WorkItem[], n: number, pool: WorkItem[]) {
  const best = distribute(items, n, n, pool);
  if (pool.length || n < 3 || best.spread <= MAX_STRETCH) return best;
  const fewer = distribute(items, n - 1, n, pool);
  return fewer.spread < best.spread ? fewer : best;
}

function Tile({ item, onOpen, fill = false }: { item: WorkItem; onOpen: () => void; fill?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLButtonElement>(null);
  const isVideo = item.type === "video";
  // phones: the most central video tile plays its preview by itself (one at a time — lib/autoplay)
  useEffect(() => registerAutoplay(video.current, frame.current), [item.preview]);

  return (
    <button
      ref={frame}
      type="button"
      onClick={onOpen}
      onPointerEnter={(e) => e.pointerType === "mouse" && video.current?.play().catch(() => {})}
      onPointerLeave={() => {
        const v = video.current;
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
      }}
      data-cursor={isVideo ? "Play" : "View"}
      className={`gallery-tile on-media group relative block w-full overflow-hidden bg-ink-2 text-left ${fill ? "grow" : ""}`}
      style={{ aspectRatio: `${item.w} / ${item.h}` }}
    >
      <span className="sr-only">{isVideo ? "Play film: " : "View photo: "}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={isVideo ? (item.posterSm ?? item.poster) : item.thumb}
        srcSet={
          isVideo
            ? item.posterXs && item.posterSm && `${item.posterXs} 480w, ${item.posterSm} 900w`
            : item.thumbXs && `${item.thumbXs} 480w, ${item.thumb} 900w`
        }
        sizes="(min-width: 1280px) 24vw, (min-width: 768px) 32vw, 48vw"
        alt={item.title ? `${item.title} — ${item.category}` : `${item.category} ${isVideo ? "film" : "photograph"}`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out)] group-hover:scale-105"
      />
      {isVideo && item.preview && (
        <video
          ref={video}
          src={item.preview}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 data-[autoplay=on]:opacity-100"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 transition-opacity duration-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100" />
      {isVideo && (
        <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/55 px-2 py-1 font-mono text-[10px] tracking-[0.15em] text-bone uppercase">
          <span className="rec-dot size-1.5 rounded-full bg-rec" /> {fmtDuration(item.duration) || "Film"}
        </span>
      )}
      <span className="absolute inset-x-3 bottom-3 translate-y-0 transition-transform duration-500 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:group-hover:translate-y-0">
        <span className="block font-mono text-[10px] tracking-[0.2em] text-bone/60 uppercase">
          {item.group ? `${item.category} · ${item.group}` : item.category}
        </span>
        {item.title && (
          <span className="mt-1 block font-serif text-xl leading-tight text-bone transition-opacity duration-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
            {item.title}
          </span>
        )}
      </span>
    </button>
  );
}

// Google Drive API key (free, restricted to this site's address). With it, Drive-hosted films stream
// as the untouched original file in the site's own player; without it, Drive's player is used.
const DRIVE_KEY = process.env.NEXT_PUBLIC_DRIVE_API_KEY;
const driveOriginal = (id: string) => `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${DRIVE_KEY}`;

function DriveVideo({ item }: { item: WorkItem }) {
  // HEVC originals don't play in every browser — only try the original stream for H.264
  const canStream = !!DRIVE_KEY && !!item.driveId && item.codec !== "hevc";
  const [useIframe, setUseIframe] = useState(!canStream); // fresh per film: the viewer keys this by item id
  const [ready, setReady] = useState(false); // Drive's player shows black for ~2s while it boots

  return (
    <FilmFrame item={item}>
      {/* poster + spinner while Drive's player loads, instead of a black box */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.posterSm ?? item.poster} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
      {!ready && (
        <span
          className="pointer-events-none absolute top-1/2 left-1/2 size-12 -translate-1/2 animate-spin rounded-full border-2 border-white/30 border-t-white"
          aria-label="Loading"
        />
      )}
      {useIframe ? (
        <iframe
          src={item.src}
          title={`${item.title || item.category} — video`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => setTimeout(() => setReady(true), 400)}
          className={`absolute inset-0 size-full border-0 transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
        />
      ) : (
        <video
          src={driveOriginal(item.driveId!)}
          poster={item.poster}
          controls
          autoPlay
          playsInline
          preload="metadata"
          onCanPlay={() => setReady(true)}
          onError={() => setUseIframe(true)} // quota / blocked / unsupported -> Drive's player
          className="absolute inset-0 size-full bg-black"
        />
      )}
    </FilmFrame>
  );
}

/** Fits a box of the film's own shape inside the available space (no letterbox, no overflow). */
function FilmFrame({ item, children }: { item: WorkItem; children: React.ReactNode }) {
  return (
    <div className="pointer-events-none flex size-full items-center justify-center [container-type:size]">
      <div
        className="pointer-events-auto relative bg-black"
        style={{ aspectRatio: `${item.w} / ${item.h}`, width: `min(100cqw, calc(100cqh * ${item.w / item.h}))` }}
      >
        {children}
      </div>
    </div>
  );
}

function SiteVideo({ item, src }: { item: WorkItem; src?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused" | "error">("loading");

  // try to start right away; phones that block it (iOS) get the big play button instead
  useEffect(() => {
    video.current?.play().catch(() => setState((s) => (s === "loading" ? "idle" : s)));
  }, []);

  const start = () => {
    setState("loading");
    video.current?.play().catch(() => setState("idle"));
  };

  return (
    <FilmFrame item={item}>
      <video
        ref={video}
        poster={item.poster}
        controls={state !== "idle" && state !== "error"}
        playsInline
        preload="metadata"
        onPlaying={() => setState("playing")}
        onPause={() => setState((s) => (s === "error" ? s : "paused"))}
        onWaiting={() => setState("loading")}
        onCanPlay={() => setState((s) => (s === "loading" && video.current?.paused ? "paused" : s))}
        onError={() => setState("error")}
        className="absolute inset-0 size-full bg-black"
      >
        {src ? (
          <source src={src} type="video/mp4" />
        ) : (
          <>
            {/* browser picks the first source it can decode: the original, else the H.264 copy */}
            <source src={item.src} type={item.codec === "hevc" ? 'video/mp4; codecs="hvc1"' : "video/mp4"} />
            {item.fallback && <source src={item.fallback} type="video/mp4" onError={() => setState("error")} />}
          </>
        )}
      </video>

      {state === "idle" && (
        <button onClick={start} className="absolute inset-0 grid place-items-center bg-black/20" aria-label={`Play ${item.title || "film"}`}>
          <span className="grid size-20 place-items-center rounded-full bg-bone/95 text-ink shadow-2xl">
            <svg viewBox="0 0 24 24" className="ml-1 size-8" fill="currentColor" aria-hidden>
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          </span>
        </button>
      )}

      {state === "loading" && (
        <span
          className="pointer-events-none absolute top-1/2 left-1/2 size-12 -translate-1/2 animate-spin rounded-full border-2 border-bone/25 border-t-bone"
          aria-label="Loading"
        />
      )}

      {state === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
          <p className="text-sm text-bone/80">
            This film couldn’t load on this connection.
            {item.drive && (
              <>
                <br />
                <a href={item.drive} target="_blank" rel="noreferrer" className="mt-3 inline-block text-bone underline">
                  Open the original ↗
                </a>
              </>
            )}
          </p>
        </div>
      )}
    </FilmFrame>
  );
}

function Viewer({ list, index, onClose, onStep }: { list: WorkItem[]; index: number; onClose: () => void; onStep: (d: number) => void }) {
  const item = list[index];
  const isTouch = useIsTouch();
  const touch = useRef<{ x: number; y: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // a focused video uses ←/→ to seek — don't also jump to the next item
      if (e.defaultPrevented || (e.target as Element | null)?.closest?.("video, input, textarea")) return;
      if (e.key === "ArrowRight") onStep(1);
      if (e.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    root.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onStep]);

  useEffect(() => lockPage({ includeHeader: true }), []);

  // warm the next photo so arrowing through feels instant
  useEffect(() => {
    const next = list[(index + 1) % list.length];
    if (next?.type === "image") new Image().src = next.src;
  }, [index, list]);

  return (
    <div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={item.title || item.category}
      data-lenis-prevent
      className="media-dark fixed inset-0 z-[95] flex flex-col overscroll-contain bg-ink text-bone outline-none [touch-action:pinch-zoom]"
      onTouchStart={(e) => {
        touch.current = null;
        if (e.touches.length > 1) return; // pinch-zoom, not a swipe
        const t = e.touches[0];
        // the bottom strip of a video is its seek bar — dragging there scrubs, it doesn't swipe
        const v = (e.target as Element).closest("video");
        if (v && t.clientY > v.getBoundingClientRect().bottom - 72) return;
        touch.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const s = touch.current;
        touch.current = null;
        if (!s) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s.x;
        const dy = t.clientY - s.y;
        // clearly sideways and long enough
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onStep(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 font-mono text-[11px] tracking-[0.2em] text-bone/70 uppercase md:px-8 md:py-4">
        <span className="truncate">
          {item.category}
          {item.group ? ` · ${item.group}` : ""}
          {item.title && <> — <span className="text-bone">{item.title}</span></>}
        </span>
        <span className="flex shrink-0 items-center gap-5">
          <span>
            {String(index + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
          </span>
          {item.drive && (
            <a href={item.drive} target="_blank" rel="noreferrer" className="hidden hover:text-bone sm:inline">
              Original ↗
            </a>
          )}
          <button
            onClick={onClose}
            className="grid size-11 place-items-center rounded-full border border-line text-base text-bone hover:text-rec md:-m-3 md:size-auto md:border-0 md:p-3 md:text-[11px]"
            aria-label="Close viewer"
          >
            <span className="hidden md:inline">Close ✕</span>
            <span className="md:hidden" aria-hidden>
              ✕
            </span>
          </button>
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-2 md:px-20 md:pb-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {item.type === "video" && item.player === "drive" && isTouch && item.mobile ? (
          <SiteVideo key={item.id} item={item} src={item.mobile} />
        ) : item.type === "video" && item.player === "drive" ? (
          <DriveVideo key={item.id} item={item} />
        ) : item.type === "video" ? (
          <SiteVideo key={item.id} item={item} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.id} src={item.src} alt={item.title || item.category} className="max-h-full max-w-full object-contain" />
        )}

        <button
          onClick={() => onStep(-1)}
          className="absolute top-1/2 left-2 hidden -translate-y-1/2 p-3 font-serif text-4xl text-bone/60 hover:text-bone md:block"
          aria-label="Previous"
        >
          ←
        </button>
        <button
          onClick={() => onStep(1)}
          className="absolute top-1/2 right-2 hidden -translate-y-1/2 p-3 font-serif text-4xl text-bone/60 hover:text-bone md:block"
          aria-label="Next"
        >
          →
        </button>
      </div>

      {/* phones: prev / next as real buttons (swiping also works) */}
      <div className="flex items-center justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))] font-mono text-[11px] tracking-[0.2em] text-bone/70 uppercase md:hidden">
        <button onClick={() => onStep(-1)} className="flex min-h-11 items-center gap-2 pr-4" aria-label="Previous">
          ← Prev
        </button>
        <span className="text-bone/40">Swipe</span>
        <button onClick={() => onStep(1)} className="flex min-h-11 items-center gap-2 pl-4" aria-label="Next">
          Next →
        </button>
      </div>
    </div>
  );
}

export default function Gallery() {
  const root = useRef<HTMLElement>(null);
  const [cat, setCat] = useState("all");
  const [kind, setKind] = useState<"all" | "video" | "image">("all");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<{ list: WorkItem[]; index: number } | null>(null);

  const list = useMemo(() => {
    const base = cat === "all" ? allOrdered : works.filter((w) => w.categorySlug === cat);
    const filtered = kind === "all" ? base : base.filter((w) => w.type === kind);
    return cat === "all" ? filtered : [...filtered.filter((w) => w.type === "video"), ...filtered.filter((w) => w.type === "image")];
  }, [cat, kind]);
  const nCols = useColumns();
  const { cols: columns, fill, placed } = useMemo(() => toColumns(list.slice(0, shown), nCols, list.slice(shown)), [nCols, list, shown]);
  const more = placed < list.length;

  // While more pages exist, end the grid on one straight line (the shortest column's bottom) with a
  // soft fade into "Load more" — tiles below the line appear when the next page loads.
  const grid = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el) return;
    const apply = () => {
      el.querySelectorAll<HTMLElement>(".gallery-tile").forEach((t) => (t.inert = false));
      el.style.maxHeight = "";
      el.style.overflow = "";
      delete el.dataset.cut;
      if (!more) return;
      const top = el.getBoundingClientRect().top;
      const ends = [...el.children]
        .map((c) => c.lastElementChild?.getBoundingClientRect().bottom)
        .filter((b): b is number => b !== undefined);
      if (ends.length < 2) return;
      const cut = Math.min(...ends) - top;
      if (Math.max(...ends) - top - cut < 2) return; // already level
      el.style.maxHeight = `${cut}px`;
      el.style.overflow = "hidden";
      el.dataset.cut = "1";
      el.querySelectorAll<HTMLElement>(".gallery-tile").forEach((t) => {
        if (t.getBoundingClientRect().top - top > cut - 60) t.inert = true; // hidden by the fade -> next page
      });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [columns, more]);
  const videoCount = works.filter((w) => w.type === "video").length;

  const opener = useRef<HTMLElement | null>(null);
  const openAt = useCallback((l: WorkItem[], index: number) => {
    opener.current = document.activeElement as HTMLElement | null;
    setOpen({ list: l, index });
  }, []);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((o) => (o ? { ...o, index: (o.index + d + o.list.length) % o.list.length } : o)), []);

  // open from elsewhere on the page (reel cards)
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const i = allOrdered.findIndex((w) => w.id === id);
      if (i >= 0) openAt(allOrdered, i);
    };
    window.addEventListener("open-work", onOpen);
    return () => window.removeEventListener("open-work", onOpen);
  }, [openAt]);


  // keyboard users land back on the tile they opened when the viewer closes
  const isOpen = open !== null;
  useEffect(() => {
    if (isOpen) return;
    opener.current?.focus({ preventScroll: true });
    opener.current = null;
  }, [isOpen]);


  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".gal-title .gt", {
        yPercent: 110,
        stagger: 0.08,
        duration: 1.3,
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    },
    { scope: root },
  );

  const chip = (active: boolean) =>
    `shrink-0 border px-3 py-2.5 font-mono text-[11px] tracking-[0.15em] uppercase transition-colors duration-300 ${
      active ? "border-bone bg-bone text-ink" : "border-line text-bone/70 hover:border-bone/50 hover:text-bone"
    }`;

  return (
    <section ref={root} id="portfolio" data-hide-nav className="relative px-4 py-24 md:px-8 md:py-36">
      <div className="mb-10 flex flex-col justify-between gap-6 md:mb-14 md:flex-row md:items-end">
        <h2 className="gal-title font-serif text-[16vw] leading-[0.85] md:text-[6.5vw]">
          <span className="line-mask block">
            <span className="gt block">The full</span>
          </span>
          <span className="line-mask block">
            <span className="gt block pl-[8vw] italic">archive</span>
          </span>
        </h2>
        <p className="max-w-xs text-sm text-bone/70 md:text-right">
          {videoCount} films and {works.length - videoCount} stills across real estate, food, fitness, travel and events.
          Select any frame to watch or view it full screen.
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-4 mb-8 flex flex-col gap-3 bg-ink/95 px-4 py-3 md:bg-ink/85 md:backdrop-blur-md md:-mx-8 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Category">
          <button aria-pressed={cat === "all"} className={chip(cat === "all")} onClick={() => (setCat("all"), setShown(PAGE))}>
            All <span className="opacity-80">{works.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              aria-pressed={cat === c.slug}
              className={chip(cat === c.slug)}
              onClick={() => (setCat(c.slug), setShown(PAGE))}
            >
              {c.label} <span className="opacity-80">{c.count}</span>
            </button>
          ))}
        </div>
        <div className="flex shrink-0 gap-2" role="group" aria-label="Media type">
          {(["all", "video", "image"] as const).map((k) => (
            <button key={k} aria-pressed={kind === k} className={chip(kind === k)} onClick={() => (setKind(k), setShown(PAGE))}>
              {k === "all" ? "Both" : k === "video" ? "Films" : "Photos"}
            </button>
          ))}
        </div>
      </div>

      {list.length ? (
        <div className="relative">
        <div ref={grid} className="peer flex items-stretch gap-3 md:gap-4">
          {columns.map((col, c) => (
            <div key={c} className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4">
              {col.map((item, i) => (
                <Tile
                  key={item.id}
                  item={item}
                  fill={fill[c] && i === col.length - 1} // last tile closes a small gap so columns end level
                  onOpen={() => openAt(list, list.indexOf(item))}
                />
              ))}
            </div>
          ))}
        </div>
        {/* fade into "Load more" where the grid is cut */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[120px] bg-gradient-to-b from-transparent to-ink peer-data-[cut]:block" />
        </div>
      ) : (
        <p className="py-20 text-center text-bone/65">Nothing in this filter yet.</p>
      )}

      <div className="mt-12 flex flex-col items-center gap-4">
        {more && (
          <button
            onClick={() => setShown(placed + PAGE)}
            className="border border-line px-8 py-4 font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-500 hover:bg-bone hover:text-ink"
          >
            Load more — {list.length - placed} left
          </button>
        )}
        <div className="flex flex-col items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-mute uppercase sm:flex-row sm:gap-8">
          <a href={profile.driveArchive} target="_blank" rel="noreferrer" className="hover:text-bone">
            More work on Google Drive ↗
          </a>
          <a href={profile.gallery} target="_blank" rel="noreferrer" className="hover:text-bone">
            Client gallery on Pixieset ↗
          </a>
        </div>
      </div>

      {open && createPortal(<Viewer list={open.list} index={open.index} onClose={close} onStep={step} />, document.body)}
    </section>
  );
}
