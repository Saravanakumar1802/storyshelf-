"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import { afterIntro } from "@/lib/intro";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/** Editorial heading: words rise out of masked lines as it scrolls into view. */
export function SplitHeading({ children, as: Tag = "h2", className }: { children: ReactNode; as?: ElementType; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(el, { type: "lines,words", mask: "lines", linesClass: "pb-[0.08em]" });
        gsap.set(split.words, { yPercent: 110 });
        // created after the opening intro (if any), so it is cleaned up by hand
        let tween: gsap.core.Tween | undefined;
        const cancel = afterIntro(() => {
          tween = gsap.to(split.words, {
            yPercent: 0,
            duration: 1.1,
            ease: "expo.out",
            stagger: 0.035,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });
        return () => {
          cancel();
          tween?.scrollTrigger?.kill();
          tween?.kill();
          split.revert();
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <Tag ref={ref} className={cn(className)}>
      {children}
    </Tag>
  );
}
