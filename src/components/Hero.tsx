"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useClientCheck, wantsLensEffect } from "@/lib/useClientCheck";
import { gsap, prefersReducedMotion, SplitText, useGSAP } from "@/lib/gsap";
import { profile } from "@/data/site";
import { scrollToTarget, useLenis } from "./SmoothScroll";

const LensImage = dynamic(() => import("./LensImage"), { ssr: false });

function Timecode({ running }: { running: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let raf = 0;
    let lastFrame = -1;
    let onScreen = true;
    const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
    const loop = () => {
      const t = (performance.now() - start) / 1000;
      const frame = Math.floor(t * 25); // 25 fps timecode — only touch the DOM when the frame changes
      if (frame !== lastFrame && ref.current) {
        lastFrame = frame;
        ref.current.textContent = `${pad(t / 3600)}:${pad((t / 60) % 60)}:${pad(t % 60)}:${pad(frame % 25)}`;
      }
      raf = onScreen ? requestAnimationFrame(loop) : 0;
    };
    // stop entirely once the hero is scrolled away
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen && !raf) raf = requestAnimationFrame(loop);
    });
    if (ref.current) io.observe(ref.current);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [running]);
  return <span ref={ref}>00:00:00:00</span>;
}


export default function Hero({ ready }: { ready: boolean }) {
  const lenis = useLenis();
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const focus = useRef<HTMLDivElement>(null);
  const reveal = useRef(0);
  const gl = useClientCheck(wantsLensEffect);

  // Intro
  useGSAP(
    () => {
      if (!ready) return;
      reveal.current = 1;
      if (prefersReducedMotion()) {
        gsap.set(frame.current, { clipPath: "inset(0% 0% 0% 0%)" }); // no reveal animation, just show it
        return;
      }
      const first = SplitText.create(".hero-first", { type: "chars", mask: "chars", aria: "hidden" });
      const last = SplitText.create(".hero-last", { type: "chars", mask: "chars", aria: "hidden" });
      // give descenders (the "j") room inside each char mask
      gsap.set([...first.masks, ...last.masks], { paddingBottom: "0.22em", marginBottom: "-0.22em", paddingInline: "0.04em", marginInline: "-0.04em" });
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.fromTo(frame.current, { clipPath: "inset(50% 50% 50% 50%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.8, ease: "expo.inOut" })
        .from(first.chars, { yPercent: 110, rotate: 8, stagger: 0.05, duration: 1.4 }, "-=1.1")
        .from(last.chars, { yPercent: -110, rotate: -8, stagger: 0.05, duration: 1.4 }, "<0.1")
        .from(".hud", { opacity: 0, duration: 0.8, stagger: 0.06 }, "-=1")
        .from(".hero-sub", { y: 30, opacity: 0, stagger: 0.08, duration: 1.2 }, "-=1");
    },
    { scope: root, dependencies: [ready] },
  );

  // Scroll: name drifts apart, frame lifts and scales — like a dolly-out
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 },
        });
        tl.to(".hero-first", { xPercent: -18, ease: "none" }, 0)
          .to(".hero-last", { xPercent: 18, ease: "none" }, 0)
          .to(frame.current, { yPercent: 12, scale: 0.86, ease: "none" }, 0)
          .to(".hero-sub", { opacity: 0, y: -40, ease: "none" }, 0);
      });
    },
    { scope: root },
  );

  // Autofocus square follows the pointer inside the frame
  useEffect(() => {
    const el = frame.current;
    const f = focus.current;
    if (!el || !f) return;
    const qx = gsap.quickTo(f, "left", { duration: 0.6, ease: "power3" });
    const qy = gsap.quickTo(f, "top", { duration: 0.6, ease: "power3" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      qx(e.clientX - r.left);
      qy(e.clientY - r.top);
    };
    const enter = () => gsap.to(f, { opacity: 1, scale: 1, duration: 0.4 });
    const leave = () => {
      gsap.to(f, { opacity: 0, scale: 1.4, duration: 0.4 });
      qx(el.clientWidth / 2);
      qy(el.clientHeight / 2);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <section ref={root} id="top" className="relative h-[100svh] min-h-[640px] overflow-hidden">
      {/* portrait frame */}
      <div className="absolute inset-0 flex items-center justify-center pt-16 pb-24 md:pt-20 md:pb-20">
        <div
          ref={frame}
          data-cursor="Focus"
          className="on-media relative aspect-[9/16] h-full max-h-[78svh] max-w-[78vw] overflow-hidden bg-ink-2 [clip-path:inset(50%_50%_50%_50%)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.portrait}
            srcSet={`${profile.portraitSm} 600w, ${profile.portrait} 900w`}
            sizes="(min-width: 768px) 44svh, 78vw"
            alt="Ajmal Yaseen leaning on a car with his Sony camera"
            className="absolute inset-0 size-full object-cover"
          />
          {gl && ready && <LensImage src={profile.portrait} reveal={reveal} />}

          {/* viewfinder HUD */}
          <div className="pointer-events-none absolute inset-0 font-mono text-[9px] tracking-[0.15em] text-bone/90 uppercase md:text-[10px]">
            {(["top-3 left-3 border-t border-l", "top-3 right-3 border-t border-r", "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"] as const).map(
              (c) => (
                <span key={c} className={`hud absolute size-5 border-bone/80 ${c}`} />
              ),
            )}
            <div className="hud absolute top-5 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
              <span className="rec-dot size-1.5 rounded-full bg-rec" />
              <Timecode running={ready} />
            </div>
            <div className="hud absolute top-10 left-5 space-y-1 text-bone/70">
              <p>4K 25p</p>
              <p>S-Log3</p>
            </div>
            <div className="hud absolute top-10 right-5 text-right text-bone/70">
              <p>▮▮▮▯</p>
            </div>
            <div className="hud absolute inset-x-5 bottom-5 flex justify-between text-bone/80">
              <span>1/50</span>
              <span>F1.8</span>
              <span>ISO 800</span>
              <span>5600K</span>
            </div>
            <div
              ref={focus}
              className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 opacity-0"
            >
              <span className="absolute top-0 left-0 size-2.5 border-t border-l border-rec" />
              <span className="absolute top-0 right-0 size-2.5 border-t border-r border-rec" />
              <span className="absolute bottom-0 left-0 size-2.5 border-b border-l border-rec" />
              <span className="absolute right-0 bottom-0 size-2.5 border-r border-b border-rec" />
            </div>
          </div>
        </div>
      </div>

      {/* giant name */}
      <h1 className="on-media pointer-events-none absolute inset-0 flex flex-col justify-center px-4 font-serif leading-[0.8] text-bone mix-blend-difference md:px-8">
        <span className="sr-only">
          {profile.firstName} {profile.lastName}, {profile.role}
        </span>
        <span aria-hidden className="hero-first block text-[24vw] md:text-[19vw]">
          {profile.firstName}
        </span>
        <span aria-hidden className="hero-last block self-end text-[24vw] italic md:text-[19vw]">
          {profile.lastName}
        </span>
      </h1>

      {/* footer row */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 px-4 pb-5 text-sm md:px-8 md:pb-8">
        <p className="hero-sub max-w-[15rem] text-bone/70 md:max-w-xs">
          {profile.role}. Brand films, weddings &amp; documentaries — shot in Dubai.
        </p>
        <button
          onClick={() => scrollToTarget(lenis, "#work")}
          className="hero-sub group flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] uppercase"
          aria-label="Scroll to selected reels"
          data-cursor="Roll"
        >
          <span className="hidden sm:inline">Scroll to roll</span>
          <span className="relative grid size-11 place-items-center overflow-hidden rounded-full border border-bone/30">
            <span className="transition-transform duration-500 group-hover:translate-y-10">↓</span>
            <span className="absolute -translate-y-10 transition-transform duration-500 group-hover:translate-y-0">↓</span>
          </span>
        </button>
      </div>
    </section>
  );
}
