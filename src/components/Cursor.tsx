"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { hasFinePointer, useClientCheck } from "@/lib/useClientCheck";

/**
 * Two-part cursor: a precise dot plus a lagging ring that grows into a labelled
 * disc over anything marked with data-cursor="Label".
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const [label, setLabel] = useState("");
  const enabled = useClientCheck(hasFinePointer);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-cursor");

    const xDot = gsap.quickTo(dot.current, "x", { duration: 0.08, ease: "power3" });
    const yDot = gsap.quickTo(dot.current, "y", { duration: 0.08, ease: "power3" });
    const xRing = gsap.quickTo(ring.current, "x", { duration: 0.55, ease: "power3" });
    const yRing = gsap.quickTo(ring.current, "y", { duration: 0.55, ease: "power3" });

    const move = (e: PointerEvent) => {
      xDot(e.clientX);
      yDot(e.clientY);
      xRing(e.clientX);
      yRing(e.clientY);
    };

    let base = 1; // target ring scale for what's under the pointer (absolute — never compounds)
    const over = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-cursor], a, button");
      const text = t?.dataset.cursor ?? "";
      setLabel(text);
      base = t ? (text ? 2.6 : 1.6) : 1;
      gsap.to(ring.current, { scale: base, duration: 0.5, ease: "expo.out", overwrite: "auto" });
      gsap.to(fill.current, { opacity: text ? 1 : 0, duration: 0.5, ease: "expo.out" });
      gsap.to(dot.current, { scale: t ? 0 : 1, duration: 0.3 });
    };

    const leave = () => gsap.to([dot.current, ring.current], { opacity: 0, duration: 0.3 });
    const enter = () => gsap.to([dot.current, ring.current], { opacity: 1, duration: 0.3 });
    const down = () => gsap.to(ring.current, { scale: base * 0.8, duration: 0.2, overwrite: "auto" });
    const up = () => gsap.to(ring.current, { scale: base, duration: 0.4, overwrite: "auto" });

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    document.addEventListener("pointerleave", leave);
    document.addEventListener("pointerenter", enter);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("pointerenter", enter);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [enabled]);

  return (
    <div aria-hidden className={enabled ? "on-media" : "hidden"}>
      <div
        ref={ring}
        className="pointer-events-none fixed top-0 left-0 z-[100] -mt-5 -ml-5 grid size-10 place-items-center rounded-full border border-bone/60 mix-blend-difference"
      >
        <span ref={fill} className="absolute inset-0 rounded-full bg-bone opacity-0" />
        <span
          className={`relative font-mono text-[4px] font-medium tracking-[0.2em] text-[#0a0a09] uppercase transition-opacity duration-300 ${
            label ? "opacity-100" : "opacity-0"
          }`}
        >
          {label}
        </span>
      </div>
      <div
        ref={dot}
        className="pointer-events-none fixed top-0 left-0 z-[100] -mt-[3px] -ml-[3px] size-1.5 rounded-full bg-rec"
      />
    </div>
  );
}
