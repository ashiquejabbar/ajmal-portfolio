"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { gear, skills } from "@/data/site";

/** Skills as a clean numbered list, plus the kit grid. */
export default function Toolkit() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".skill", { y: 30, opacity: 0, stagger: 0.07, duration: 1, scrollTrigger: { trigger: ".skills", start: "top 85%" } });
      gsap.from(".gear", { y: 50, opacity: 0, stagger: 0.1, duration: 1.2, scrollTrigger: { trigger: ".gear-grid", start: "top 85%" } });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="toolkit" className="bg-ink-2 px-4 py-28 md:px-8 md:py-44">
      <div className="mb-14 flex items-center gap-4 font-mono text-[11px] tracking-[0.2em] text-mute uppercase">
        <span className="text-rec">●</span> Toolkit — Craft
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="grid gap-16 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <h2 className="font-serif text-[14vw] leading-[0.85] lg:text-[6vw]">
            Craft, <em>measured</em>
          </h2>
          <p className="mt-8 max-w-sm text-bone/70">
            The skills behind every frame — camera, light, colour and sound, kept in balance like a well-mixed track.
          </p>
        </div>

        <ul className="skills grid content-start border-t border-line sm:grid-cols-2 sm:gap-x-8 lg:col-span-7">
          {skills.map((s, i) => (
            <li key={s} className="skill group flex items-baseline gap-5 border-b border-line py-5 md:py-6">
              <span className="font-mono text-[11px] text-mute transition-colors duration-500 group-hover:text-rec">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-serif text-2xl leading-tight transition-all duration-500 group-hover:translate-x-2 group-hover:italic md:text-3xl">
                {s}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="gear-grid mt-24 grid grid-cols-2 gap-px border border-line bg-line md:mt-32 lg:grid-cols-4">
        {gear.map((g, i) => (
          <div key={g.name} className="gear group relative overflow-hidden bg-ink-2 p-6 md:p-8">
            <span className="absolute inset-0 origin-bottom scale-y-0 bg-bone transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-y-100" />
            <div className="relative transition-colors duration-500 group-hover:text-ink">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-60">
                0{i + 1} — {g.kind}
              </p>
              <p className="mt-12 font-serif text-3xl leading-none md:mt-20 md:text-4xl">{g.name}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
