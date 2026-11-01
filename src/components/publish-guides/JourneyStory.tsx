"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Check, CircleUserRound, Sparkles, Users } from "lucide-react";
import { stages } from "@/data/publish/howItWorks";
import { yourBook } from "@/data/showcase";
import { SceneShell } from "@/components/three/SceneShell";
import { CssBook } from "@/components/library/CssBook";
import { getLenis } from "@/components/layout/SmoothScroll";
import { useScrollScene } from "@/components/motion/useScrollScene";
import { cn, pad2 } from "@/lib/utils";

const JourneyBook = dynamic(() => import("@/components/three/scenes/JourneyBook"), { ssr: false });

/**
 * The journey as scrollytelling: stage panels scroll on the left while the
 * 3D book on the right (pinned) takes the shape of the current stage. The
 * active stage is whichever panel crosses the middle of the viewport.
 */
export function JourneyStory() {
  const root = useRef<HTMLElement>(null);
  const panels = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  // a jacketed edition: its back cover carries the blurb and ISBN barcode (stage 5)
  const book = useMemo(() => yourBook({ key: "journey", emblem: "quill", swatch: 0, finish: "jacket" }), []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      // the panel crossing just below the middle (on phones the band covers the top)
      { rootMargin: "-58% 0px -38% 0px" },
    );
    panels.current.forEach((p) => p && io.observe(p));
    return () => io.disconnect();
  }, []);

  useScrollScene(root, () => {
    gsap.fromTo(".js-rail", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".js-list", start: "top 50%", end: "bottom 50%", scrub: 0.4 } });
    gsap.utils.toArray<HTMLElement>(".js-panel").forEach((el) => {
      gsap.from(el.querySelectorAll(".js-in"), { y: 34, autoAlpha: 0, duration: 0.9, ease: "expo.out", stagger: 0.07, scrollTrigger: { trigger: el, start: "top 72%", once: true } });
    });
  });

  const goTo = (i: number) => {
    const el = panels.current[i];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + el.offsetHeight / 2;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <section ref={root} id="journey" aria-labelledby="journey-title" className="relative py-24">
      <div className="container-x">
        <p className="eyebrow">The journey</p>
        <h2 id="journey-title" className="display-lg mt-4 max-w-[18ch]">
          Watch your book take shape, stage by stage.
        </h2>
      </div>

      <div className="container-x mt-16 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-16">
        {/* the book, pinned */}
        {/* phones: a pinned band above the scrolling stages; desktop: the pinned right column */}
        <div className="sticky top-[var(--header-offset,4rem)] z-10 mx-[calc(-1*clamp(1rem,4vw,2.5rem))] h-[38svh] bg-bg pb-3 lg:static lg:order-2 lg:mx-0 lg:h-auto lg:bg-transparent lg:pb-0">
          <div className="relative h-full overflow-hidden rounded-xl border border-line bg-[radial-gradient(70%_60%_at_50%_55%,var(--c-accent-soft),transparent_70%),var(--c-bg-deep)] lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:h-[calc(100svh-var(--header-h)-3rem)]">
            <SceneShell
              className="size-full"
              fallback={
                <div className="grid size-full place-items-center [perspective:1400px]">
                  <CssBook book={book} width={200} style={{ transform: "rotateY(-28deg) rotateX(4deg)" }} />
                </div>
              }
            >
              {({ active: live, onReady, onFatal }) => <JourneyBook book={book} stage={active} active={live} onReady={onReady} onFatal={onFatal} />}
            </SceneShell>
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-5">
              <span key={active} className="animate-panel-in rounded-pill border border-line-strong bg-bg/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg backdrop-blur">
                <span className="num text-accent">{pad2(active + 1)}</span> / {pad2(stages.length)} · {stages[active].stage}
              </span>
              <Sparkles className="size-4 text-accent/70" />
            </div>
            {/* progress ticks */}
            <div className="absolute inset-x-5 bottom-5 flex gap-1.5" aria-hidden>
              {stages.map((s, i) => (
                <span key={s.stage} className="h-1 flex-1 overflow-hidden rounded-pill bg-line">
                  <span className="block h-full origin-left bg-accent transition-transform duration-700 ease-book" style={{ transform: `scaleX(${i <= active ? 1 : 0})` }} />
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* stages */}
        <ol className="js-list relative lg:order-1">
          <span aria-hidden className="absolute bottom-0 left-[19px] top-0 w-px bg-line" />
          <span aria-hidden className="js-rail absolute bottom-0 left-[19px] top-0 w-px origin-top bg-accent" />
          {stages.map((s, i) => {
            const on = i === active;
            return (
              <li
                key={s.stage}
                ref={(el) => {
                  panels.current[i] = el;
                }}
                id={`stage-${i + 1}`}
                data-index={i}
                className="js-panel relative flex items-center py-8 pl-14 lg:min-h-[66svh] lg:py-10 lg:pl-16 lg:first:min-h-[56svh] lg:last:min-h-[56svh]"
              >
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to stage ${i + 1}: ${s.stage}`}
                  className={cn(
                    "num absolute left-0 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border text-xs transition-all duration-500 ease-book",
                    on ? "scale-110 border-accent bg-accent text-on-accent shadow-glow" : i < active ? "border-accent bg-bg text-accent" : "border-line-strong bg-bg text-faint",
                  )}
                >
                  {pad2(i + 1)}
                </button>
                <article className={cn("w-full transition-opacity duration-700 ease-book", on ? "opacity-100" : "lg:opacity-35")} aria-current={on ? "step" : undefined}>
                  <p className="js-in flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
                    <span>Stage {pad2(i + 1)}</span>
                    <span className="rounded-pill border border-accent/40 px-2.5 py-0.5 text-[10px] text-fg">{s.weeks}</span>
                  </p>
                  <h3 className="js-in mt-3 font-display text-4xl font-light leading-tight md:text-5xl">{s.stage}</h3>
                  <p className="js-in mt-4 max-w-xl text-base leading-relaxed text-muted md:text-lg">{s.summary}</p>
                  <div className="js-in mt-7 grid gap-4 sm:grid-cols-2">
                    {[
                      { t: "You", I: CircleUserRound, items: s.you },
                      { t: "We", I: Users, items: s.us },
                    ].map(({ t, I, items }) => (
                      <div key={t} className="rounded-lg border border-line bg-surface/70 p-5">
                        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-faint">
                          <I className="size-4 text-accent" /> {t}
                        </p>
                        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-fg/90">
                          {items.map((x) => (
                            <li key={x} className="flex gap-2.5">
                              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                              {x}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <p className="js-in mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-success">
                      <Check className="size-4" /> {s.outcome}
                    </span>
                    <span className="text-faint">·</span>
                    <span className="text-muted">Led by your {s.lead}</span>
                  </p>
                </article>
              </li>
            );
          })}
        </ol>

      </div>
    </section>
  );
}
