"use client";

import { useRef, useState } from "react";
import { gsap, prefersReducedMotion, SplitText, useGSAP } from "@/lib/gsap";
import { profile } from "@/data/site";
import { scrollToTarget, useLenis } from "./SmoothScroll";

function Magnetic({ children, className = "", ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const el = useRef<HTMLAnchorElement>(null);
  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !el.current) return;
    const r = el.current.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    gsap.to(el.current, { x: x * 0.35, y: y * 0.35, duration: 0.6, ease: "power3", overwrite: "auto" });
    gsap.to(el.current.querySelector(".mag-in"), { x: x * 0.15, y: y * 0.15, duration: 0.6, ease: "power3", overwrite: "auto" });
  };
  const leave = () => {
    gsap.to(el.current, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.35)", overwrite: "auto" });
    gsap.to(el.current?.querySelector(".mag-in") ?? null, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.35)", overwrite: "auto" });
  };
  return (
    <a ref={el} onPointerMove={move} onPointerLeave={leave} className={className} {...rest}>
      <span className="mag-in block">{children}</span>
    </a>
  );
}

export default function Contact() {
  const root = useRef<HTMLElement>(null);
  const lenis = useLenis();
  const [copied, setCopied] = useState(false);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const split = SplitText.create(".cta-line", { type: "chars", mask: "chars", aria: "hidden" });
      gsap.set(split.masks, { paddingBottom: "0.18em", marginBottom: "-0.18em", paddingInline: "0.05em", marginInline: "-0.05em" });
      gsap.from(split.chars, {
        yPercent: 120,
        rotate: 6,
        stagger: 0.025,
        duration: 1.3,
        scrollTrigger: { trigger: ".cta", start: "top 75%" },
      });
      gsap.from(".contact-item", { y: 40, opacity: 0, stagger: 0.08, duration: 1.2, scrollTrigger: { trigger: ".contact-grid", start: "top 90%" } });
    },
    { scope: root },
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  return (
    <footer ref={root} id="contact" className="relative overflow-hidden px-4 pt-28 pb-6 md:px-8 md:pt-44">
      <div className="mb-14 flex items-center gap-4 font-mono text-[11px] tracking-[0.2em] text-mute uppercase">
        <span className="rec-dot text-rec">●</span> Now booking — Dubai &amp; UAE
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="cta relative">
        <h2 className="font-serif text-[17vw] leading-[0.82] md:text-[11vw]">
          <span className="sr-only">Let’s make it cinematic.</span>
          <span className="cta-line block">Let’s make</span>
          <span className="cta-line block pl-[10vw] italic">
            it <span className="text-rec">cinematic.</span>
          </span>
        </h2>

        <Magnetic
          href={`mailto:${profile.email}?subject=Project%20enquiry`}
          data-cursor="Write"
          className="mt-12 grid size-40 place-items-center rounded-full bg-rec text-center text-[#0a0a09] md:absolute md:top-1/2 md:right-[6vw] md:mt-0 md:size-52 md:-translate-y-1/2"
        >
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase">
            Start a<br />
            project ↗
          </span>
        </Magnetic>
      </div>

      <div className="contact-grid mt-24 grid gap-px border-y border-line bg-line sm:grid-cols-2 lg:grid-cols-4 md:mt-36">
        <div className="contact-item group relative bg-ink p-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-mute uppercase">Email</p>
          <a
            href={`mailto:${profile.email}?subject=Project%20enquiry`}
            className="mt-3 block break-all transition-colors group-hover:text-rec after:absolute after:inset-0"
          >
            {profile.email}
          </a>
          <button
            onClick={copy}
            className="absolute top-3 right-3 z-10 flex min-h-11 items-center px-3 font-mono text-[10px] tracking-[0.2em] text-mute uppercase transition-colors hover:text-bone"
            aria-label="Copy email address"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? "Email address copied" : ""}
          </span>
        </div>
        <a href={profile.phoneHref} className="contact-item group bg-ink p-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-mute uppercase">Phone</p>
          <p className="mt-3 transition-colors group-hover:text-rec">{profile.phone}</p>
        </a>
        <a href={profile.whatsapp} target="_blank" rel="noreferrer" className="contact-item group bg-ink p-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-mute uppercase">WhatsApp</p>
          <p className="mt-3 transition-colors group-hover:text-rec">Message directly ↗</p>
        </a>
        <a href={profile.resume} target="_blank" rel="noreferrer" className="contact-item group bg-ink p-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-mute uppercase">Résumé</p>
          <p className="mt-3 transition-colors group-hover:text-rec">Download CV (PDF) ↓</p>
        </a>
      </div>

      <div className="mt-6 flex flex-col gap-4 font-mono text-[10px] tracking-[0.2em] text-mute uppercase sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 Ajmal Yaseen — {profile.location}</span>
        <a href={profile.gallery} target="_blank" rel="noreferrer" className="hover:text-bone">
          Photo gallery ↗
        </a>
        <button onClick={() => scrollToTarget(lenis, 0)} className="text-left uppercase hover:text-bone sm:text-right">
          Back to top ↑
        </button>
      </div>

      <p
        aria-hidden
        className="pointer-events-none mt-10 font-serif text-[19.5vw] leading-[0.8] whitespace-nowrap text-bone/[0.04] select-none"
      >
        Ajmal Yaseen
      </p>
    </footer>
  );
}
