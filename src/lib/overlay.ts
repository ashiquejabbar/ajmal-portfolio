"use client";

import type Lenis from "lenis";

/**
 * One owner for "the page behind is locked" — used by the intro, the menu and the viewer, so
 * they can't undo each other. While any lock is held:
 *  - main / footer / quick-contact dock (and optionally the header) are `inert`, so Tab and
 *    screen readers stay inside the overlay;
 *  - smooth scrolling (Lenis) is stopped, and `overflow:hidden` covers reduced-motion mode where
 *    Lenis is off.
 */
let locks = 0;
let lenis: Lenis | null = null;
const lockListeners = new Set<(locked: boolean) => void>();

/** Notified when the page becomes locked / unlocked (e.g. to pause background previews). */
export function onLockChange(fn: (locked: boolean) => void) {
  lockListeners.add(fn);
  return () => lockListeners.delete(fn);
}

/** SmoothScroll registers its Lenis instance here (null on teardown). */
export function setLenis(l: Lenis | null) {
  lenis = l;
  if (l && locks) l.stop();
}

export function lockPage(opts: { includeHeader?: boolean } = {}) {
  const sel = ["main", "footer", "[data-quick-contact]", ...(opts.includeHeader ? ["header"] : [])].join(",");
  const els = [...document.querySelectorAll<HTMLElement>(sel)];
  els.forEach((el) => (el.inert = true));
  if (locks++ === 0) {
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    lockListeners.forEach((fn) => fn(true));
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    els.forEach((el) => (el.inert = false));
    if (--locks === 0) {
      lenis?.start();
      document.documentElement.style.overflow = "";
      lockListeners.forEach((fn) => fn(false));
    }
  };
}
