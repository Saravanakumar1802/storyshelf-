"use client";

import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { afterIntro } from "@/lib/intro";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Builds scroll-driven GSAP animations for a section:
 *  - selectors in `build` are scoped to `scope`
 *  - nothing runs for visitors who prefer reduced motion (content stays static)
 *  - it waits for the opening intro, so entrances aren't spent behind it
 *  - everything (incl. a cleanup returned by `build`) is reverted on unmount
 */
export function useScrollScene(scope: RefObject<HTMLElement | null>, build: () => void | (() => void)) {
  useGSAP(
    (context) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      return afterIntro(() => context.add(build));
    },
    { scope },
  );
}
