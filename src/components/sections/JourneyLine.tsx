"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { PublishingStage } from "@/types";
import { cn, pad2 } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Vertical journey whose gold line draws itself as you scroll. */
export function JourneyLine({ steps }: { steps: { stage: PublishingStage; weeks: string; text: string }[] }) {
  const root = useRef<HTMLOListElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".jl-fill",
          { scaleY: 0 },
          { scaleY: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top 70%", end: "bottom 60%", scrub: 0.6 } },
        );
        gsap.utils.toArray<HTMLElement>(".jl-step").forEach((el) => {
          gsap.from(el, { autoAlpha: 0, x: 30, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 82%", once: true } });
          ScrollTrigger.create({ trigger: el, start: "top 60%", onEnter: () => el.classList.add("is-on"), onLeaveBack: () => el.classList.remove("is-on") });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );
  return (
    <ol ref={root} className="relative ml-4 border-l border-line md:ml-[30%]">
      <span aria-hidden className="jl-fill absolute -left-px top-0 h-full w-px origin-top bg-accent" />
      {steps.map((s, i) => (
        <li key={s.stage} className="jl-step group relative pb-16 pl-10 last:pb-0 md:pl-16">
          <span
            className={cn(
              "absolute -left-[9px] top-1 size-[17px] rounded-full border border-line-strong bg-bg transition-colors duration-500 group-[.is-on]:border-accent group-[.is-on]:bg-accent",
            )}
          />
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent md:absolute md:-left-[45%] md:top-1 md:w-[36%] md:text-right">
            {pad2(i + 1)} · {s.weeks}
          </p>
          <h3 className="mt-2 font-display text-4xl font-light md:mt-0 md:text-5xl">{s.stage}</h3>
          <p className="mt-3 max-w-xl text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}
