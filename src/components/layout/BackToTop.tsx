"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLenis } from "./SmoothScroll";

const SHOW_AFTER = 600;
const R = 21;
const CIRC = 2 * Math.PI * R;

/**
 * Back-to-top button, stacked above the chat bubble. Appears after scrolling
 * down; its gold ring shows how far through the page you are. Scroll position
 * is read in a rAF-throttled listener and the ring is updated directly on the
 * DOM, so scrolling never re-renders React (only the show/hide flips state).
 */
export function BackToTop() {
  const pathname = usePathname();
  const ring = useRef<SVGCircleElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      setShown(y > SHOW_AFTER);
      if (ring.current) ring.current.style.strokeDashoffset = String(CIRC * (1 - (max > 0 ? Math.min(1, y / max) : 0)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  const toTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = getLenis();
    if (lenis && !reduced) lenis.scrollTo(0, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    // keep keyboard users oriented: move focus back to the top of the page
    document.querySelector<HTMLElement>("#main")?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      title="Back to top"
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
      className={cn(
        "group fixed bottom-[5.5rem] right-6 z-[64] grid size-12 place-items-center rounded-full border border-line-strong bg-surface/85 text-fg shadow-soft backdrop-blur transition-[opacity,transform,border-color,color] duration-500 ease-book hover:border-accent hover:text-accent",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
        <circle cx="24" cy="24" r={R} fill="none" stroke="var(--c-border)" strokeWidth="1.5" />
        <circle ref={ring} cx="24" cy="24" r={R} fill="none" stroke="var(--c-accent)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC} />
      </svg>
      <ArrowUp className="relative size-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
    </button>
  );
}
