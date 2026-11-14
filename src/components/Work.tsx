"use client";

import { useCallback, useRef } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { profile, projects, type Project } from "@/data/site";
import { openWork, works } from "@/data/works";
import { scrollToTarget, useLenis } from "./SmoothScroll";

type Q = (v: number) => void;

function Card({ p, index, onFocusCard }: { p: Project; index: number; onFocusCard: (el: HTMLElement) => void }) {
  const card = useRef<HTMLAnchorElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  // one reusable tween per property (quickTo) + a rect cached on enter — no per-move tween pile-up or layout reads
  const tilt = useRef<{ rx: Q; ry: Q; sx: Q; sy: Q; so: Q; r: DOMRect } | null>(null);

  const onEnter = (e: React.PointerEvent) => {
    const el = card.current;
    if (!el || e.pointerType !== "mouse") return;
    const t = el.querySelector(".tilt"), sh = el.querySelector(".shine");
    tilt.current = {
      rx: gsap.quickTo(t, "rotateX", { duration: 0.8, ease: "power3" }),
      ry: gsap.quickTo(t, "rotateY", { duration: 0.8, ease: "power3" }),
      sx: gsap.quickTo(sh, "x", { duration: 0.8, ease: "power3" }),
      sy: gsap.quickTo(sh, "y", { duration: 0.8, ease: "power3" }),
      so: gsap.quickTo(sh, "opacity", { duration: 0.6 }),
      r: el.getBoundingClientRect(),
    };
    video.current?.play().catch(() => {});
    gsap.to(el.querySelector(".media"), { scale: 1.06, duration: 1.2, overwrite: "auto" });
  };
  // 3D tilt that follows the pointer
  const onMove = (e: React.PointerEvent) => {
    const t = tilt.current;
    if (!t || e.pointerType !== "mouse") return;
    const x = (e.clientX - t.r.left) / t.r.width - 0.5;
    const y = (e.clientY - t.r.top) / t.r.height - 0.5;
    t.ry(x * 8);
    t.rx(-y * 8);
    t.sx(x * 200);
    t.sy(y * 200);
    t.so(0.18);
  };
  const onLeave = () => {
    video.current?.pause();
    const t = tilt.current;
    if (t) {
      t.rx(0);
      t.ry(0);
      t.so(0);
    }
    tilt.current = null;
    gsap.to(card.current?.querySelector(".media") ?? null, { scale: 1, duration: 1.2, overwrite: "auto" });
  };

  return (
    <a
      ref={card}
      href={p.href ?? profile.gallery}
      target="_blank"
      rel="noreferrer"
      data-cursor={p.video ? "Play" : "View"}
      onClick={(e) => {
        if (!p.work) return;
        e.preventDefault();
        openWork(p.work);
      }}
      onPointerMove={onMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={(e) => onFocusCard(e.currentTarget)}
      className="work-card group block w-[80vw] shrink-0 snap-center [perspective:1200px] md:w-[34vw] lg:w-[26vw]"
    >
      <div className="tilt relative [transform-style:preserve-3d]">
        <div className="on-media relative aspect-[4/5] max-h-[62svh] overflow-hidden bg-ink-2">
          <div
            className="media absolute inset-0"
            style={{ background: `radial-gradient(120% 90% at 30% 20%, ${p.tone[0]}, ${p.tone[1]} 70%)` }}
          >
            {p.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt={p.title} className="size-full object-cover" loading="lazy" />
            )}
            {p.video && (
              <video
                ref={video}
                src={p.video}
                muted
                loop
                playsInline
                preload="none"
                className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
            {!p.image && !p.video && (
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-serif text-[30vw] leading-none text-bone/[0.06] italic md:text-[18vw]">{p.id}</span>
              </div>
            )}
          </div>

          {/* letterbox + film edge */}
          <div className="absolute inset-x-0 top-0 h-[7%] bg-black/70 transition-transform duration-700 ease-[var(--ease-out)] group-hover:-translate-y-full" />
          <div className="absolute inset-x-0 bottom-0 h-[7%] bg-black/70 transition-transform duration-700 ease-[var(--ease-out)] group-hover:translate-y-full" />
          <div className="sprockets absolute inset-y-0 left-0 w-4 opacity-60" />
          <div className="sprockets absolute inset-y-0 right-0 w-4 opacity-60" />
          <div className="vignette absolute inset-0" />
          <div className="shine pointer-events-none absolute top-1/2 left-1/2 size-[60%] -translate-1/2 rounded-full bg-bone opacity-0 blur-3xl" />

          <div className="absolute inset-x-6 top-[10%] flex justify-between font-mono text-[10px] tracking-[0.2em] text-bone/70 uppercase md:inset-x-8">
            <span>Roll {p.id}</span>
            <span className="flex items-center gap-1.5">
              <span className="rec-dot size-1.5 rounded-full bg-rec" /> {p.video ? "Play" : "Still"}
            </span>
          </div>

          <div className="absolute inset-x-6 bottom-[11%] [transform:translateZ(40px)] md:inset-x-8">
            <p className="font-mono text-[10px] tracking-[0.2em] text-bone/60 uppercase">{p.category}</p>
            <h3 className="mt-2 font-serif text-4xl leading-none md:text-5xl">
              {p.title.split(" ").map((w, i) => (
                <span key={i} className={i % 2 ? "italic" : ""}>
                  {w}{" "}
                </span>
              ))}
            </h3>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-6">
        <p className="max-w-sm text-sm text-bone/70">{p.blurb}</p>
        <span className="font-mono text-[11px] tracking-[0.2em] text-mute">
          {String(index + 1).padStart(2, "0")}/{String(projects.length).padStart(2, "0")}
        </span>
      </div>
    </a>
  );
}

export default function Work() {
  const root = useRef<HTMLElement>(null);
  const lenis = useLenis();
  const track = useRef<HTMLDivElement>(null);
  const pin = useRef<ScrollTrigger | null>(null);

  // keyboard focus on a card that's still off to the side of the pinned row: scroll the page to
  // the point in the pin where that card is in view
  const onFocusCard = useCallback(
    (el: HTMLElement) => {
      const st = pin.current, t = track.current;
      if (!st || !t) return;
      const distance = t.scrollWidth - window.innerWidth;
      if (distance <= 0) return;
      const progress = Math.min(Math.max((el.offsetLeft - window.innerWidth * 0.25) / distance, 0), 1);
      scrollToTarget(lenis, st.start + progress * (st.end - st.start));
    },
    [lenis],
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const el = track.current!;
        const distance = () => el.scrollWidth - window.innerWidth;
        // Hold the row still for a while after it pins, so the lead reel (card 01) is actually seen
        // before the sideways scroll starts — otherwise it slides away the moment you arrive.
        const hold = () => window.innerHeight * 0.6;
        const pinST = ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: () => `+=${hold() + distance()}`,
          pin: true,
          invalidateOnRefresh: true,
        });
        // absolute scroll positions taken from the pin (refreshed first, as it's created first) —
        // a relative "top top-=…" on the pinned section itself gets shifted by its own pin spacing
        const tween = gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            start: () => pinST.start + hold(),
            end: () => pinST.start + hold() + distance(),
            scrub: 0.8,
            invalidateOnRefresh: true,
            onUpdate: (self) => gsap.set(".work-progress", { scaleX: self.progress }),
          },
        });
        pin.current = tween.scrollTrigger ?? null;
        // cards skew slightly with scroll speed
        gsap.utils.toArray<HTMLElement>(".work-card").forEach((c) => {
          gsap.from(c, {
            yPercent: 12,
            opacity: 0.3,
            scale: 0.92,
            ease: "none",
            scrollTrigger: { trigger: c, containerAnimation: tween, start: "left right", end: "left 55%", scrub: true },
          });
        });
        return () => {
          pin.current = null;
        };
      });

      mm.add("(max-width: 767px), (prefers-reduced-motion: reduce)", () => {
        gsap.utils.toArray<HTMLElement>(".work-card").forEach((c) => {
          gsap.from(c, { y: 60, opacity: 0, duration: 1.2, scrollTrigger: { trigger: c, start: "top 85%" } });
        });
      });

      if (prefersReducedMotion()) return;
      gsap.from(".work-title .wt", {
        yPercent: 110,
        stagger: 0.08,
        duration: 1.3,
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="work" className="relative overflow-hidden py-24 md:flex md:h-[100svh] md:flex-col md:justify-center md:py-0">
      <div className="mb-10 flex items-end justify-between px-4 md:mb-12 md:px-8">
        <h2 className="work-title font-serif text-[16vw] leading-[0.85] md:text-[6.5vw]">
          <span className="line-mask block">
            <span className="wt block">Selected</span>
          </span>
          <span className="line-mask block">
            <span className="wt block pl-[8vw] italic">reels</span>
          </span>
        </h2>
        <p className="hidden max-w-[16rem] text-right text-sm text-bone/70 md:block">
          Jewellery, real estate, food, fitness and travel films. Hover a frame to preview, select it to watch in full quality.
        </p>
      </div>

      <p className="mb-4 px-4 font-mono text-[10px] tracking-[0.2em] text-mute uppercase md:hidden">Swipe to browse →</p>
      <div
        ref={track}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:gap-[4vw] md:px-8 motion-safe:md:w-max motion-safe:md:snap-none motion-safe:md:overflow-visible motion-safe:md:pb-0"
      >
        {projects.map((p, i) => (
          <Card key={p.id} p={p} index={i} onFocusCard={onFocusCard} />
        ))}

        <a
          href="#portfolio"
          onClick={(e) => {
            e.preventDefault();
            scrollToTarget(lenis, "#portfolio");
          }}
          data-cursor="Open"
          className="work-card group relative flex aspect-[4/5] w-[80vw] shrink-0 snap-center flex-col justify-between border border-line p-6 transition-colors duration-700 hover:bg-bone hover:text-ink md:aspect-auto md:w-[34vw] md:p-10"
        >
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase opacity-60">Full archive — {works.length} pieces</span>
          <span className="font-serif text-5xl leading-[0.95] md:text-7xl">
            See <em>all the work</em>
            <span className="ml-3 inline-block transition-transform duration-500 group-hover:translate-x-3 group-hover:-translate-y-3">
              ↗
            </span>
          </span>
        </a>
      </div>

      <div className="mx-4 mt-10 hidden h-px bg-line md:mx-8 md:block">
        <div className="work-progress h-full origin-left scale-x-0 bg-rec" />
      </div>
    </section>
  );
}
