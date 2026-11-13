"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { services } from "@/data/site";

/** Infinite ticker whose speed and direction follow scroll velocity. */
export default function Marquee() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const loop = gsap.to(track.current, { xPercent: -50, ease: "none", duration: 28, repeat: -1 });
      // only run while on screen
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive && !prefersReducedMotion() ? loop.play() : loop.pause()),
      });
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // speed follows scroll velocity: `boost` is set by scroll and decays back to 1 each tick
        let dir = 1, boost = 1, speed = 1;
        const st = ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            dir = self.direction === 1 ? 1 : -1;
            boost = Math.max(boost, Math.min(Math.abs(self.getVelocity()) / 300, 6));
          },
        });
        const tick = () => {
          if (!st.isActive) return;
          boost += (1 - boost) * 0.06;
          speed += (dir * boost - speed) * 0.15;
          loop.timeScale(speed);
        };
        gsap.ticker.add(tick);
        gsap.fromTo(root.current, { rotate: -3 }, {
          rotate: 0,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom center", scrub: true },
        });
        return () => gsap.ticker.remove(tick);
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        loop.pause();
      });
    },
    { scope: root },
  );

  const row = (
    <div className="flex shrink-0 items-center">
      {services.map((s, i) => (
        <span key={s} className="flex items-center">
          <span className={`px-6 font-serif text-6xl md:px-10 md:text-8xl ${i % 2 ? "text-outline italic" : ""}`}>{s}</span>
          <span className="text-2xl text-rec md:text-4xl">✦</span>
        </span>
      ))}
    </div>
  );

  return (
    <div ref={root} className="relative z-10 overflow-hidden border-y border-line bg-ink py-6 md:py-8">
      <p className="sr-only">Services: {services.join(", ")}</p>
      <div ref={track} className="flex w-max" aria-hidden>
        {row}
        {row}
      </div>
    </div>
  );
}
