"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

// Real frames from the portfolio (small 4:5 crops in /public/img/loader, ~35 KB each)
const FRAMES = Array.from({ length: 10 }, (_, i) => `/img/loader/${String(i + 1).padStart(2, "0")}.webp`);
// the montage always lands on Ajmal — focus finds his face, locks, and the shutter fires
const PORTRAIT = "/img/loader/me.webp";
const FACE = { left: "46%", top: "26%" }; // where the face sits in me.webp
const WORK_END = 86; // counter value at which the montage hands over to the portrait
const METER = [-3, -2, -1, 0, 1, 2, 3];

/**
 * Camera "rolling" intro: a viewfinder flicks through real frames from the work, pulling focus on
 * each cut, while timecode, exposure meter and counter run. Focus locks, the shutter fires, and the
 * panels lift to reveal the site.
 */
export default function Preloader({ onDone, onFinished }: { onDone: () => void; onFinished?: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const tc = useRef<HTMLSpanElement>(null);
  const frameNo = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set(root.current, { autoAlpha: 0 });
        onDone();
        onFinished?.();
        return;
      }
      const imgs = gsap.utils.toArray<HTMLElement>(".pl-img");
      const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
      const state = { v: 0 };
      let shown = -1;

      const cut = (i: number) => {
        if (i === shown) return;
        if (shown >= 0) gsap.set(imgs[shown], { autoAlpha: 0 });
        shown = i;
        // every cut lands soft, then the lens pulls focus
        gsap.fromTo(imgs[i], { autoAlpha: 1, filter: "blur(10px)", scale: 1.08 }, { filter: "blur(0px)", scale: 1, duration: 0.32, ease: "power3.out" });
        if (i === imgs.length - 1) {
          // last frame is the portrait: hold it a touch longer and let AF track onto the face
          gsap.fromTo(imgs[i], { filter: "blur(14px)", scale: 1.12 }, { filter: "blur(0px)", scale: 1, duration: 0.6, ease: "power3.out", overwrite: true });
          gsap.to(".pl-focus", { ...FACE, scale: 1, opacity: 1, duration: 0.45, ease: "power3.inOut" });
        } else {
          gsap.fromTo(".pl-focus", { scale: 1.35, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
        }
        if (frameNo.current) frameNo.current.textContent = `${pad(i + 1)}/${pad(imgs.length)}`;
      };

      const tl = gsap.timeline();
      tl.from(".pl-line", { yPercent: 110, stagger: 0.05, duration: 1, ease: "expo.out" })
        .from(".pl-vf", { clipPath: "inset(50% 50% 50% 50%)", duration: 1, ease: "expo.inOut" }, 0)
        .from(".pl-strip", { opacity: 0, duration: 1 }, 0.3)
        .to(
          state,
          {
            v: 100,
            duration: 2.4,
            ease: "power1.inOut",
            onUpdate: () => {
              const v = state.v;
              if (count.current) count.current.textContent = String(Math.round(v)).padStart(3, "0");
              if (tc.current) {
                const f = v * 2.6;
                tc.current.textContent = `00:00:${pad(f / 25)}:${pad(f % 25)}`;
              }
              const nWork = imgs.length - 1;
              cut(v >= WORK_END ? nWork : Math.min(nWork - 1, Math.floor((v / WORK_END) * nWork)));
              // exposure needle hunts, then settles on 0 as the counter finishes
              const settle = 1 - v / 100;
              gsap.set(".pl-needle", { xPercent: Math.sin(v * 0.35) * 260 * settle });
            },
          },
          0.3,
        )
        .to(".pl-bar", { scaleX: 1, duration: 2.4, ease: "power1.inOut" }, 0.3)
        // focus lock + record
        .to(".pl-focus > span:not(.pl-lock)", { borderColor: "var(--rec)", duration: 0.15 }, "-=0.1")
        .to(".pl-lock", { opacity: 1, duration: 0.15 }, "<")
        .set(".pl-stby", { display: "none" }, "<")
        .set(".pl-rec", { display: "flex" }, "<")
        // shutter fires
        .to(".pl-flash", { opacity: 0.85, duration: 0.05, ease: "none" }, "+=0.15")
        .to(".pl-flash", { opacity: 0, duration: 0.45, ease: "power2.out" })
        .to(".pl-vf", { scale: 1.12, opacity: 0, duration: 0.7, ease: "expo.in" }, "<")
        .to(".pl-line", { yPercent: -110, stagger: 0.02, duration: 0.6, ease: "expo.in" }, "<")
        .to(".pl-strip", { opacity: 0, duration: 0.4 }, "<")
        .to(".pl-panel", { scaleY: 0, duration: 1.1, ease: "expo.inOut", stagger: 0.07 }, "-=0.2")
        .add(onDone, "-=0.8")
        .set(root.current, { autoAlpha: 0 })
        .add(() => onFinished?.());

      // film strips roll continuously on the sides
      gsap.to(".pl-strip-a", { yPercent: -50, duration: 6, ease: "none", repeat: -1 });
      gsap.fromTo(".pl-strip-b", { yPercent: -50 }, { yPercent: 0, duration: 6, ease: "none", repeat: -1 });

      // ?intro=0.6 freezes the intro at that point — for previewing/tweaking the design
      const hold = new URLSearchParams(location.search).get("intro");
      if (hold !== null) {
        tl.progress(Math.min(Math.max(Number(hold) || 0, 0), 0.99)).pause();
        return;
      }

      // full intro once per visit; when they come back (reload, back from a gallery) keep it snappy
      try {
        if (sessionStorage.getItem("intro-seen")) tl.timeScale(3);
        sessionStorage.setItem("intro-seen", "1");
      } catch {
        /* storage blocked — just play the normal intro */
      }
    },
    { scope: root },
  );

  const strip = (cls: string) => (
    <div
      className={`pl-strip absolute inset-y-0 hidden w-[8vw] max-w-32 overflow-hidden opacity-45 lg:block ${cls}`}
      style={{ maskImage: "linear-gradient(transparent, #000 22%, #000 78%, transparent)", WebkitMaskImage: "linear-gradient(transparent, #000 22%, #000 78%, transparent)" }}
    >
      <div className={`${cls.startsWith("left") ? "pl-strip-a" : "pl-strip-b"} flex flex-col`}>
        {[...FRAMES, ...FRAMES].map((src, i) => (
          <div key={i} className="relative border-x-[10px] border-black bg-black py-1.5">
            <div className="sprockets absolute inset-y-0 -left-[10px] w-[10px]" />
            <div className="sprockets absolute inset-y-0 -right-[10px] w-[10px]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="aspect-[4/5] w-full object-cover grayscale" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div ref={root} className="media-dark fixed inset-0 z-[95] overflow-hidden text-bone" aria-hidden>
      {/* panels that lift away at the end */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="pl-panel h-full flex-1 origin-top bg-ink-2" />
        ))}
      </div>

      {strip("left-[20vw]")}
      {strip("right-[20vw]")}

      <div className="relative flex h-full flex-col justify-between p-5 font-mono text-[10px] tracking-[0.2em] uppercase md:p-8 md:text-[11px]">
        {/* top HUD */}
        <div className="flex items-start justify-between gap-4">
          <div className="line-mask">
            <span className="pl-line flex items-center gap-2">
              <span className="pl-stby flex items-center gap-2 text-mute">
                <span className="size-2 rounded-full border border-mute" /> STBY
              </span>
              <span className="pl-rec hidden items-center gap-2 text-rec">
                <span className="rec-dot size-2 rounded-full bg-rec" /> REC
              </span>
            </span>
          </div>
          <div className="line-mask hidden md:block">
            <span className="pl-line block text-mute">4K · 25P · S-Log3 · 5600K</span>
          </div>
          <div className="line-mask">
            <span className="pl-line flex items-center gap-3">
              <span ref={tc}>00:00:00:00</span>
              <span className="flex h-2.5 items-center gap-px border border-bone/60 p-px pr-0.5" aria-hidden>
                <span className="h-full w-1 bg-bone" />
                <span className="h-full w-1 bg-bone" />
                <span className="h-full w-1 bg-bone" />
                <span className="h-full w-1 bg-bone/25" />
              </span>
            </span>
          </div>
        </div>

        {/* viewfinder */}
        <div className="flex flex-col items-center gap-5">
          <div className="pl-vf relative aspect-[4/5] h-[48svh] max-h-[500px] max-w-[70vw] overflow-hidden bg-black">
            {[...FRAMES, PORTRAIT].map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" decoding="async" fetchPriority={i < 2 ? "high" : "auto"} className="pl-img invisible absolute inset-0 size-full object-cover" style={{ zIndex: i }} />
            ))}
            <div className="vignette absolute inset-0 z-20" />
            {/* rule-of-thirds */}
            <div className="pointer-events-none absolute inset-0 z-20">
              <span className="absolute inset-y-0 left-1/3 w-px bg-white/15" />
              <span className="absolute inset-y-0 left-2/3 w-px bg-white/15" />
              <span className="absolute inset-x-0 top-1/3 h-px bg-white/15" />
              <span className="absolute inset-x-0 top-2/3 h-px bg-white/15" />
            </div>
            {/* corner brackets */}
            {(["top-2 left-2 border-t border-l", "top-2 right-2 border-t border-r", "bottom-2 left-2 border-b border-l", "bottom-2 right-2 border-b border-r"] as const).map((c) => (
              <span key={c} className={`absolute z-30 size-4 border-white/80 ${c}`} />
            ))}
            {/* autofocus box */}
            <div className="pl-focus absolute top-1/2 left-1/2 z-30 size-14 -translate-x-1/2 -translate-y-1/2">
              <span className="pl-lock absolute bottom-full left-1/2 mb-2 -translate-x-1/2 border-0 bg-rec px-1.5 py-0.5 text-[9px] whitespace-nowrap text-black opacity-0">
                AF Lock
              </span>
              <span className="absolute top-0 left-0 size-2.5 border-t-2 border-l-2 border-white" />
              <span className="absolute top-0 right-0 size-2.5 border-t-2 border-r-2 border-white" />
              <span className="absolute bottom-0 left-0 size-2.5 border-b-2 border-l-2 border-white" />
              <span className="absolute right-0 bottom-0 size-2.5 border-r-2 border-b-2 border-white" />
            </div>
            <div className="absolute inset-x-3 top-3 z-30 flex justify-between text-[9px] text-white/85">
              <span>
                Frame <span ref={frameNo}>01/11</span>
              </span>
              <span>Sony α7 IV</span>
            </div>
            <div className="absolute inset-x-3 bottom-3 z-30 flex justify-between text-[9px] text-white/85">
              <span>1/50</span>
              <span>F1.8</span>
              <span>ISO 800</span>
            </div>
            <div className="pl-flash pointer-events-none absolute inset-0 z-40 bg-white opacity-0" />
          </div>

          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="line-mask">
              <span className="pl-line block font-serif text-4xl tracking-normal normal-case md:text-6xl">
                Ajmal <em>Yaseen</em>
              </span>
            </div>
            <div className="line-mask">
              <span className="pl-line block text-mute">Videographer · Photographer — Dubai</span>
            </div>
          </div>
        </div>

        {/* bottom: exposure meter + counter */}
        <div>
          <div className="mb-4 flex items-end justify-between gap-6">
            <div className="line-mask">
              <div className="pl-line">
                <p className="mb-2 text-mute">Exposure</p>
                <div className="relative flex gap-2 md:gap-3">
                  {METER.map((m) => (
                    <span key={m} className="flex w-5 flex-col items-center gap-1">
                      <span className={`w-px bg-bone/60 ${m === 0 ? "h-3" : "h-2"}`} />
                      <span className="text-[8px] text-mute">{m > 0 ? `+${m}` : m}</span>
                    </span>
                  ))}
                  <span className="pl-needle absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] text-rec">▼</span>
                </div>
              </div>
            </div>
            <div className="line-mask">
              <span ref={count} className="pl-line block font-serif text-6xl leading-none tracking-normal md:text-8xl">
                000
              </span>
            </div>
          </div>
          <div className="h-px w-full bg-line">
            <div className="pl-bar h-full origin-left scale-x-0 bg-rec" />
          </div>
        </div>
      </div>
    </div>
  );
}
