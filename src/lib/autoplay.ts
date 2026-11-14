"use client";

import { onLockChange } from "./overlay";

/**
 * Touch screens have no hover, so the muted preview loops play on their own instead — but only ever
 * ONE at a time: the video whose frame is closest to the middle of the screen, once scrolling has
 * settled for a moment. Anything that leaves the screen pauses at once. Skipped entirely with
 * Data Saver / 2G, reduced motion, or a mouse (desktop keeps hover-to-play).
 *
 * The playing <video> gets data-autoplay="on" — components fade it in with a data-[autoplay=on] class.
 */
type Entry = { video: HTMLVideoElement; frame: HTMLElement };

const SETTLE_MS = 400; // wait this long after the last scroll before choosing a video
const MIN_VISIBLE = 0.6; // share of the frame that must be on screen

const entries = new Map<HTMLElement, Entry>();
let current: Entry | null = null;
let timer = 0;
let io: IntersectionObserver | null = null;
let listening = false;

function enabled() {
  if (typeof window === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return (
    window.matchMedia("(hover: none), (pointer: coarse)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !conn?.saveData &&
    !/(^|-)2g$/.test(conn?.effectiveType ?? "")
  );
}

function stop(e: Entry | null) {
  if (!e) return;
  e.video.pause();
  delete e.video.dataset.autoplay;
}

function visibleShare(r: DOMRect) {
  const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
  const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
  return r.width && r.height ? (w * h) / (r.width * r.height) : 0;
}

/** Pick the most central, mostly-visible video and play only that one. */
function choose() {
  timer = 0;
  let best: Entry | null = null;
  let bestDist = Infinity;
  const cx = innerWidth / 2, cy = innerHeight / 2;
  for (const e of entries.values()) {
    if (!e.frame.isConnected || e.frame.closest("[inert]")) continue; // a viewer / menu covers the page
    const r = e.frame.getBoundingClientRect();
    if (visibleShare(r) < MIN_VISIBLE) continue;
    // horizontal rows (the reel cards) are clipped by their scroller — count only what's really in view
    const scroller = e.frame.closest<HTMLElement>("[data-autoplay-row]");
    if (scroller) {
      const s = scroller.getBoundingClientRect();
      if (r.left < s.left - 1 || r.right > s.right + 1) continue;
    }
    const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
    if (d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  if (best === current) return;
  stop(current);
  current = best;
  if (best) {
    const v = best.video;
    v.play()
      .then(() => {
        if (current?.video === v) v.dataset.autoplay = "on";
      })
      .catch(() => {}); // Low Power Mode etc. block autoplay — the still poster stays, which is fine
  }
}

const schedule = () => {
  clearTimeout(timer);
  timer = window.setTimeout(choose, SETTLE_MS);
};

function listen() {
  if (listening) return;
  listening = true;
  // capture: also hears the sideways scroll of the reel row
  document.addEventListener("scroll", schedule, { capture: true, passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  io = new IntersectionObserver((list) => {
    for (const it of list) {
      // the playing video left the screen: pause now, don't wait for the scroll to settle
      if (!it.isIntersecting && current?.frame === it.target) {
        stop(current);
        current = null;
      }
    }
  });
  onLockChange((locked) => {
    if (locked) {
      stop(current);
      current = null;
    } else schedule();
  });
}

/** Register a preview <video> and the element that frames it. Returns the cleanup. */
export function registerAutoplay(video: HTMLVideoElement | null, frame: HTMLElement | null) {
  if (!video || !frame || !enabled()) return () => {};
  listen();
  const e = { video, frame };
  entries.set(frame, e);
  io?.observe(frame);
  schedule();
  return () => {
    entries.delete(frame);
    io?.unobserve(frame);
    if (current === e) {
      stop(e);
      current = null;
    }
  };
}
