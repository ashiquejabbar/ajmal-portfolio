"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Reads a browser-only boolean without a hydration mismatch (false on the server). */
export function useClientCheck(check: () => boolean) {
  return useSyncExternalStore(noop, check, () => false);
}

let webgl: boolean | undefined;
export function supportsWebGL() {
  if (webgl === undefined) {
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

export const hasFinePointer = () => window.matchMedia("(pointer: fine)").matches;

/** The WebGL lens only pays off with a mouse on a large screen — phones skip the three.js download. */
export const wantsLensEffect = () =>
  window.matchMedia("(pointer: fine) and (min-width: 768px) and (prefers-reduced-motion: no-preference)").matches &&
  !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData &&
  supportsWebGL();
