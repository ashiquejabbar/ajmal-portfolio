"use client";

import { useSyncExternalStore } from "react";
import { ScrollTrigger } from "@/lib/gsap";

type Theme = "noir" | "paper";
const EVENT = "themechange";

const read = (): Theme => (document.documentElement.getAttribute("data-theme") === "paper" ? "paper" : "noir");
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

export function useTheme() {
  return useSyncExternalStore(subscribe, read, () => "noir" as Theme);
}

export function setTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "paper") root.setAttribute("data-theme", "paper");
  else root.removeAttribute("data-theme");
  try {
    localStorage.setItem("theme", t);
  } catch {
    /* private mode — the choice just won't be remembered */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "paper" ? "#f1ede6" : "#0a0a09");
  window.dispatchEvent(new Event(EVENT));
  ScrollTrigger.refresh();
}

/** Dark (Noir, default) / light (Paper) switch. */
export default function ThemeToggle({ className = "", withLabel = false }: { className?: string; withLabel?: boolean }) {
  const theme = useTheme();
  const next: Theme = theme === "noir" ? "paper" : "noir";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next === "paper" ? "light" : "dark"} theme`}
      title={next === "paper" ? "Light theme" : "Dark theme"}
      data-cursor={next === "paper" ? "Light" : "Dark"}
      className={`group flex min-h-11 min-w-11 items-center gap-2 ${withLabel ? "" : "justify-center"} ${className}`}
    >
      <span className="relative block size-5 overflow-hidden rounded-full border border-current">
        {/* half-filled disc: the filled half slides across when the theme flips */}
        <span
          className={`absolute inset-y-0 left-0 w-1/2 bg-current transition-transform duration-500 ease-[var(--ease-out)] ${
            theme === "paper" ? "translate-x-full" : ""
          }`}
        />
      </span>
      {withLabel && (
        <span className="font-mono text-[11px] tracking-[0.2em] uppercase">{theme === "noir" ? "Light mode" : "Dark mode"}</span>
      )}
    </button>
  );
}
