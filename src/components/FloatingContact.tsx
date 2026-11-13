"use client";

import { useEffect, useState } from "react";
import { profile } from "@/data/site";

const waLink = `${profile.whatsapp}?text=${encodeURIComponent("Hi Ajmal, I saw your portfolio and I'd like to talk about a project.")}`;
const mailLink = `mailto:${profile.email}?subject=${encodeURIComponent("Project enquiry")}`;

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="currentColor" aria-hidden>
      {/* speech bubble with a handset */}
      <path d="M12 2.2A9.8 9.8 0 0 0 3.6 17l-1.3 4.8 4.9-1.3A9.8 9.8 0 1 0 12 2.2Zm0 17.8a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20Z" />
      <path d="M16.4 14.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5.1.2 1.7 2.7 4.2 3.8 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.5Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

/** WhatsApp + email shortcuts, bottom-right — appear once the visitor scrolls past the hero. */
export default function FloatingContact() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // hidden on the hero and once the contact footer (which has the same links) is on screen
      const footer = document.getElementById("contact")?.getBoundingClientRect().top ?? Infinity;
      setShow(window.scrollY > window.innerHeight * 0.85 && footer > window.innerHeight * 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className={`fixed right-4 bottom-4 z-[60] transition-all duration-700 ease-[var(--ease-out)] md:right-8 md:bottom-8 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
      }`}
      aria-hidden={!show}
      data-quick-contact
    >
      <nav
        aria-label="Quick contact"
        className="flex items-center gap-1.5 rounded-full border border-line bg-ink-2/90 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
      >
        <span className="hidden items-center gap-2 pr-2 pl-3 font-mono text-[10px] tracking-[0.2em] text-bone/70 uppercase md:flex">
          <span className="rec-dot size-1.5 rounded-full bg-[#25D366]" /> Let’s talk
        </span>
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          tabIndex={show ? 0 : -1}
          data-cursor=""
          aria-label="Chat with Ajmal on WhatsApp"
          title="WhatsApp"
          className="flex h-12 items-center gap-2 rounded-full bg-[#25D366] px-3.5 text-white hover:bg-[#25D366] transition-transform duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 active:scale-95 md:h-11 md:px-4"
        >
          <WhatsAppIcon />
          <span className="hidden text-sm font-medium md:inline">WhatsApp</span>
        </a>
        <a
          href={mailLink}
          tabIndex={show ? 0 : -1}
          data-cursor=""
          aria-label="Email Ajmal"
          title={profile.email}
          className="grid size-12 place-items-center rounded-full bg-bone text-ink transition-transform duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 active:scale-95 md:size-11"
        >
          <MailIcon />
        </a>
      </nav>
    </div>
  );
}
