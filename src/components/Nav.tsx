"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { profile } from "@/data/site";
import { scrollToTarget, useLenis } from "./SmoothScroll";
import ThemeToggle from "./ThemeToggle";
import { lockPage } from "@/lib/overlay";

const links = [
  { label: "Work", href: "#work" },
  { label: "Portfolio", href: "#portfolio" },
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Toolkit", href: "#toolkit" },
  { label: "Contact", href: "#contact" },
];

function DubaiClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dubai",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const id = setInterval(() => setTime(fmt.format(new Date())), 1000);
    const first = setTimeout(() => setTime(fmt.format(new Date())), 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, []);
  return <span suppressHydrationWarning>{time || "--:--:--"}</span>;
}

export default function Nav({ ready }: { ready: boolean }) {
  const lenis = useLenis();
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline>(null);

  // hide on scroll down, show on scroll up
  useEffect(() => {
    let last = window.scrollY;
    let hidden: boolean | null = null;
    const pinnedEls = [...document.querySelectorAll<HTMLElement>("[data-hide-nav]")];
    const onScroll = () => {
      const y = window.scrollY;
      // stay out of the way while a section's own sticky bar is pinned (e.g. gallery filters)
      const pinned = pinnedEls.some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= 0 && r.bottom > 160;
      });
      const hide = !open && (pinned || (y > last && y > 200));
      if (hide !== hidden) {
        hidden = hide;
        gsap.to(bar.current, { yPercent: hide ? -120 : 0, duration: 0.6, ease: "expo.out", overwrite: true });
      }
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  useGSAP(() => {
    if (!ready) return;
    gsap.from(".nav-item", { yPercent: -150, opacity: 0, stagger: 0.08, duration: 1.2, delay: 0.6 });
  }, [ready]);

  useGSAP(
    () => {
      tl.current = gsap
        .timeline({ paused: true })
        .set(menu.current, { visibility: "visible" })
        .fromTo(menu.current, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.9, ease: "expo.inOut" })
        .from(".menu-link", { yPercent: 110, stagger: 0.05, duration: 0.9 }, "-=0.35")
        .from(".menu-meta", { opacity: 0, y: 20, stagger: 0.05, duration: 0.8 }, "-=0.7");
    },
    { scope: menu },
  );

  // Esc closes the menu; focus moves into it on open and back to the toggle on close
  const toggle = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) toggle.current?.focus({ preventScroll: true });
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const unlock = lockPage();
    const first = menu.current?.querySelector<HTMLElement>("a, button");
    let tries = 0;
    const t = setInterval(() => {
      if (menu.current && getComputedStyle(menu.current).visibility === "visible") first?.focus({ preventScroll: true });
      if (document.activeElement === first || ++tries > 40) clearInterval(t);
    }, 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(t);
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      tl.current?.timeScale(1).play();
    } else {
      tl.current?.timeScale(1.6).reverse();
    }
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    setTimeout(() => scrollToTarget(lenis, href), open ? 500 : 0);
  };

  return (
    <>
      <header
        ref={bar}
        className="on-media fixed inset-x-0 top-0 z-[80] flex items-center justify-between px-4 py-4 text-bone mix-blend-difference md:px-8 md:py-6"
      >
        <button
          onClick={() => go("#top")}
          className="nav-item font-serif text-2xl leading-none italic"
          aria-label="AY. Back to top"
        >
          AY<span className="text-rec">.</span>
        </button>

        <div className="nav-item hidden items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-bone/70 uppercase md:flex">
          <span>Dubai, UAE</span>
          <span className="h-px w-6 bg-bone/40" />
          <DubaiClock />
        </div>

        <nav className="hidden items-center gap-7 text-sm lg:flex" aria-label="Primary">
          {links.slice(0, 4).map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                go(l.href);
              }}
              className="nav-item group relative overflow-hidden"
            >
              <span className="block transition-transform duration-500 ease-[var(--ease-out)] group-hover:-translate-y-full">
                {l.label}
              </span>
              <span className="absolute inset-0 block translate-y-full font-serif italic transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-y-0">
                {l.label}
              </span>
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
        <ThemeToggle className="nav-item" />
        <a
          href="#contact"
          onClick={(e) => {
            e.preventDefault();
            go("#contact");
          }}
          className="nav-item inline-flex min-h-11 items-center rounded-full border border-bone/40 px-3 font-mono text-[10px] tracking-[0.2em] whitespace-nowrap uppercase transition-colors duration-500 hover:bg-bone hover:text-black md:min-h-0 md:px-4 md:py-2 md:text-[11px]"
        >
          Let’s talk
        </a>
        <button
          ref={toggle}
          onClick={() => setOpen((o) => !o)}
          className="nav-item flex min-h-11 min-w-11 items-center justify-center gap-3 text-sm"
          aria-expanded={open}
          aria-controls="menu"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <span className="hidden sm:inline">{open ? "Close" : "Menu"}</span>
          <span className="relative block h-3 w-7">
            <span
              className={`absolute left-0 h-px w-full bg-bone transition-transform duration-500 ${
                open ? "top-1/2 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 h-px w-full bg-bone transition-transform duration-500 ${
                open ? "top-1/2 -rotate-45" : "top-full"
              }`}
            />
          </span>
        </button>
        </div>
      </header>

      <div
        ref={menu}
        id="menu"
        data-lenis-prevent
        className="invisible fixed inset-0 z-[70] flex flex-col justify-between gap-8 overflow-y-auto bg-ink-2 px-4 pt-24 pb-8 md:px-8 md:pt-28"
      >
        <ul className="flex flex-col">
          {links.map((l, i) => (
            <li key={l.href} className="line-mask border-b border-line">
              <a
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  go(l.href);
                }}
                className="menu-link group flex items-baseline justify-between py-2 md:py-3"
              >
                <span className="font-serif text-[min(13vw,9svh)] leading-[0.95] transition-all duration-500 group-hover:pl-6 group-hover:italic md:text-[min(7vw,11svh)]">
                  {l.label}
                </span>
                <span className="font-mono text-xs text-mute">0{i + 1}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="grid gap-4 font-mono text-[11px] tracking-[0.15em] text-mute uppercase sm:grid-cols-3">
          <a className="menu-meta hover:text-bone" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
          <a className="menu-meta hover:text-bone" href={profile.phoneHref}>
            {profile.phone}
          </a>
          <ThemeToggle withLabel className="menu-meta hover:text-bone sm:justify-end" />
        </div>
      </div>
    </>
  );
}
