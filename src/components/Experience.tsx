"use client";

import { useRef, useState } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { experience } from "@/data/site";

export default function Experience() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(0);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".xp-row", {
        y: 80,
        opacity: 0,
        stagger: 0.15,
        duration: 1.3,
        scrollTrigger: { trigger: ".xp-list", start: "top 80%" },
      });
      gsap.from(".xp-head .wt", { yPercent: 110, stagger: 0.08, duration: 1.3, scrollTrigger: { trigger: root.current, start: "top 75%" } });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="experience" className="px-4 py-28 md:px-8 md:pt-28 md:pb-44">
      <div className="mb-14 flex items-center gap-4 font-mono text-[11px] tracking-[0.2em] text-mute uppercase">
        <span className="text-rec">●</span> Experience — Call sheet
        <span className="h-px flex-1 bg-line" />
      </div>

      <h2 className="xp-head mb-16 font-serif text-[14vw] leading-[0.85] md:text-[7vw]">
        <span className="line-mask block">
          <span className="wt block">Behind</span>
        </span>
        <span className="line-mask block">
          <span className="wt block italic">the camera</span>
        </span>
      </h2>

      <ul className="xp-list border-t border-line">
        {experience.map((x, i) => {
          const isOpen = open === i;
          return (
            <li key={x.role} className="xp-row border-b border-line">
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                aria-controls={`xp-panel-${i}`}
                data-cursor={isOpen ? "Close" : "Open"}
                className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 py-7 text-left md:grid-cols-[6rem_1fr_1fr_auto] md:gap-8 md:py-10"
              >
                <span className="font-mono text-xs text-mute">0{i + 1}</span>
                <span className="font-serif text-3xl leading-tight transition-all duration-500 group-hover:translate-x-3 group-hover:italic md:text-5xl">
                  {x.role}
                </span>
                <span className="hidden text-bone/60 md:block">{x.company}</span>
                <span
                  className={`grid size-10 place-items-center rounded-full border border-line text-lg transition-all duration-500 ${
                    isOpen ? "rotate-45 border-rec bg-rec text-ink" : ""
                  }`}
                >
                  +
                </span>
              </button>
              <div
                id={`xp-panel-${i}`}
                inert={!isOpen}
                className={`grid transition-[grid-template-rows] duration-700 ease-[var(--ease-out)] ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="grid gap-6 pb-10 md:grid-cols-[6rem_1fr_1fr_auto] md:gap-8">
                    <span className="hidden md:block" />
                    <p className="max-w-lg text-bone/65 md:text-lg">
                      <span className="mb-2 block text-sm text-mute md:hidden">{x.company}</span>
                      {x.detail}
                    </p>
                    <div className="flex flex-wrap content-start gap-2">
                      {x.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-line px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] text-bone/70 uppercase"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
