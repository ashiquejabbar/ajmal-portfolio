"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { profile, process } from "@/data/site";

export default function About() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // words light up as you read — like exposure coming up
        const split = SplitText.create(".about-lead", { type: "words", aria: "none" });
        gsap.fromTo(
          split.words,
          { opacity: 0.12 },
          {
            opacity: 1,
            stagger: 0.1,
            ease: "none",
            scrollTrigger: { trigger: ".about-lead", start: "top 80%", end: "bottom 45%", scrub: true },
          },
        );

        // each photo opens like a shutter, then drifts at its own depth
        gsap.utils.toArray<HTMLElement>(".about-photo").forEach((ph, i) => {
          gsap.fromTo(
            ph,
            { clipPath: "inset(100% 0% 0% 0%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 1.6,
              delay: i * 0.25,
              ease: "expo.inOut",
              scrollTrigger: { trigger: ph, start: "top 85%" },
            },
          );
          gsap.fromTo(ph.querySelector("img"), { scale: 1.35, yPercent: -8 }, {
            scale: 1.05,
            yPercent: 8,
            ease: "none",
            scrollTrigger: { trigger: ph, start: "top bottom", end: "bottom top", scrub: true },
          });
        });
        // the inset still floats a little faster than the main one
        gsap.to(".about-photo-2", {
          yPercent: -14,
          ease: "none",
          scrollTrigger: { trigger: ".about-photos", start: "top bottom", end: "bottom top", scrub: true },
        });

        gsap.from(".step", {
          y: 60,
          opacity: 0,
          stagger: 0.12,
          duration: 1.2,
          scrollTrigger: { trigger: ".steps", start: "top 80%" },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="about" className="relative px-4 py-28 md:px-8 md:pt-24 md:pb-28">
      <div className="mb-14 flex items-center gap-4 font-mono text-[11px] tracking-[0.2em] text-mute uppercase">
        <span className="text-rec">●</span> About — Director’s note
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="grid gap-12 md:grid-cols-12 md:gap-8">
        <div className="about-photos relative w-full max-w-sm pb-4 md:col-span-4 md:max-w-none">
          <div className="about-photo on-media relative aspect-[4/5] w-[80%] overflow-hidden bg-ink-2 grayscale">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.portrait}
              alt="Ajmal Yaseen leaning on a car with his Sony camera"
              className="size-full object-cover object-[50%_30%]"
              loading="lazy"
            />
            <span className="absolute top-3 left-3 font-mono text-[10px] tracking-[0.2em] text-bone/80 uppercase">
              Fig. 01 — On location
            </span>
          </div>

          <div className="about-photo about-photo-2 on-media relative -mt-[38%] ml-auto aspect-[4/5] w-[56%] overflow-hidden bg-ink-2 shadow-2xl ring-[6px] ring-ink grayscale">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.aboutPhoto}
              alt="Ajmal Yaseen with his camera on a gimbal"
              className="size-full object-cover object-[50%_35%]"
              loading="lazy"
            />
            <span className="absolute bottom-3 left-3 font-mono text-[10px] tracking-[0.2em] text-bone/80 uppercase">
              Fig. 02 — Behind the lens
            </span>
          </div>
        </div>

        <div className="md:col-span-8">
          <p className="about-lead font-serif text-[9vw] leading-[1.02] md:text-[4.4vw]">
            I’m Ajmal — a videographer &amp; photographer who treats every brief like a{" "}
            <em className="text-rec">short film</em>. I direct, shoot and edit narrative-driven work for brands,
            couples and creators, from the first frame to the final grade.
          </p>
          <p className="mt-10 max-w-xl text-base leading-relaxed text-bone/60 md:text-lg">{profile.intro}</p>
        </div>
      </div>

      <div className="steps mt-24 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4 md:mt-36">
        {process.map((s) => (
          <div key={s.n} className="step group relative bg-ink p-6 transition-colors duration-700 hover:bg-ink-2 md:p-8">
            <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.2em] text-mute uppercase">
              <span>{s.n}</span>
              <span className="size-1.5 rounded-full bg-line transition-colors duration-500 group-hover:bg-rec" />
            </div>
            <h3 className="mt-16 font-serif text-5xl transition-all duration-500 group-hover:italic md:mt-24">{s.t}</h3>
            <p className="mt-4 text-sm leading-relaxed text-bone/70">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
