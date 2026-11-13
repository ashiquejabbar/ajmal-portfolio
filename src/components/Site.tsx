"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { lockPage } from "@/lib/overlay";
import SmoothScroll from "./SmoothScroll";
import Preloader from "./Preloader";
import Cursor from "./Cursor";
import Nav from "./Nav";
import Hero from "./Hero";
import Marquee from "./Marquee";
import Work from "./Work";
import Gallery from "./Gallery";
import About from "./About";
import Experience from "./Experience";
import Toolkit from "./Toolkit";
import Contact from "./Contact";
import FloatingContact from "./FloatingContact";

export default function Site() {
  const [ready, setReady] = useState(false);
  const onDone = useCallback(() => setReady(true), []);
  const [intro, setIntro] = useState(true);
  const onFinished = useCallback(() => setIntro(false), []);

  // no scrolling behind the intro — otherwise the reveal can land mid-page
  useEffect(() => (ready ? undefined : lockPage()), [ready]);

  // ScrollTrigger only re-measures on load/resize; the page height also changes with fonts,
  // the gallery's filters / "Load more", and the Experience accordion. One debounced refresh
  // for all of them keeps pinned sections and reveal points accurate.
  useEffect(() => {
    let t = 0;
    let lastH = document.body.scrollHeight;
    const ro = new ResizeObserver(() => {
      const h = document.body.scrollHeight;
      if (Math.abs(h - lastH) < 2) return;
      lastH = h;
      clearTimeout(t);
      t = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    ro.observe(document.body);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, []);

  return (
    <SmoothScroll>
      {intro && <Preloader onDone={onDone} onFinished={onFinished} />}
      <Cursor />
      <div className="grain" aria-hidden />
      <Nav ready={ready} />
      <main>
        <Hero ready={ready} />
        {/* the marquee is tilted — clip its corners so phones can't scroll sideways */}
        <div className="overflow-x-clip">
          <Marquee />
        </div>
        <Work />
        <Gallery />
        <About />
        <Experience />
        <Toolkit />
      </main>
      <Contact />
      <FloatingContact />
    </SmoothScroll>
  );
}
