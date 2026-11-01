"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { LogoMark } from "@/components/layout/Logo";
import { useScrollScene } from "@/components/motion/useScrollScene";
import { cn } from "@/lib/utils";

/**
 * Our story: the circuit-tree mark draws itself while the paragraphs light up
 * word by word, both scrubbed to the scroll position. Words are plain spans
 * in the server HTML, so the text is readable with or without motion.
 */
export function StoryScroll({ eyebrow, title, paragraphs }: { eyebrow: string; title: ReactNode; paragraphs: string[] }) {
  const root = useRef<HTMLElement>(null);
  useScrollScene(root, () => {
    const words = gsap.utils.toArray<HTMLElement>(".sw");
    gsap.set(words, { opacity: 0.16 });
    gsap.to(words, { opacity: 1, ease: "none", stagger: 0.05, scrollTrigger: { trigger: ".sw-body", start: "top 78%", end: "bottom 50%", scrub: 0.6 } });
    const st = { trigger: root.current, start: "top 75%", end: "center 45%", scrub: 0.6 };
    gsap.fromTo(".story-mark path", { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none", stagger: 0.04, scrollTrigger: st });
    gsap.fromTo(".story-mark circle", { opacity: 0, scale: 0.2, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, ease: "none", stagger: 0.03, scrollTrigger: { ...st, start: "top 55%" } });
    gsap.fromTo(".story-ring", { rotate: -40, scale: 0.85 }, { rotate: 0, scale: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "center center", scrub: true } });
  });

  return (
    <section ref={root} className="container-x grid items-center gap-16 py-24 md:py-32 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="story-ring relative mx-auto grid aspect-square w-full max-w-[460px] place-items-center rounded-full border border-line bg-[radial-gradient(circle,var(--c-accent-soft),transparent_70%)]">
        <span aria-hidden className="absolute inset-6 rounded-full border border-dashed border-line" />
        <LogoMark className="story-mark size-2/3 text-accent [&_path]:[stroke-dasharray:1]" />
      </div>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display-lg mt-4">{title}</h2>
        <div className="sw-body mt-10 space-y-6 font-display text-[clamp(1.35rem,2.2vw,1.85rem)] font-light leading-[1.45] text-fg">
          {paragraphs.map((p, i) => (
            <p key={i}>
              {p.split(" ").map((w, j) => (
                <span key={j} className="sw">
                  {w}{" "}
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Figures that count up once they scroll into view. */
export function CountBand({ items }: { items: { value: number; suffix?: string; label: string }[] }) {
  const root = useRef<HTMLElement>(null);
  useScrollScene(root, () => {
    gsap.utils.toArray<HTMLElement>(".cb-num").forEach((el) => {
      const end = Number(el.dataset.value);
      const counter = { v: 0 };
      el.textContent = "0";
      gsap.to(counter, {
        v: end,
        duration: 1.6,
        ease: "power3.out",
        snap: { v: 1 },
        onUpdate: () => {
          el.textContent = String(counter.v);
        },
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });
    gsap.from(".cb-item", { y: 30, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: root.current, start: "top 85%", once: true } });
  });
  return (
    <section ref={root} className="border-y border-line bg-surface" aria-label="StoryShelf in numbers">
      <div className="container-x grid grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-line">
        {items.map((it) => (
          <div key={it.label} className="cb-item px-4 py-12 md:px-8">
            <p className="num text-6xl font-extralight text-accent md:text-7xl">
              <span className="cb-num" data-value={it.value}>
                {it.value}
              </span>
              {it.suffix}
            </p>
            <p className="mt-3 max-w-[22ch] text-sm text-muted">{it.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Values as cards that stack like pages: each sticks below the header and the
 * ones underneath sink back as the next arrives.
 */
export function StackedValues({ items }: { items: { t: string; d: string }[] }) {
  const root = useRef<HTMLDivElement>(null);
  useScrollScene(root, () => {
    const cards = gsap.utils.toArray<HTMLElement>(".sv-card");
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      const st = { trigger: next, start: "top bottom", end: "top 30%", scrub: true };
      // transform + opacity only: stays on the compositor while scrolling
      gsap.to(card.querySelector(".sv-inner"), { scale: 0.92, ease: "none", scrollTrigger: st });
      gsap.to(card.querySelector(".sv-shade"), { opacity: 0.55, ease: "none", scrollTrigger: st });
    });
  });
  return (
    <div ref={root} className="mt-14 space-y-6 pb-[6vh]">
      {items.map((v, i) => (
        <div key={v.t} className="sv-card sticky" style={{ top: `calc(var(--header-h) + 1.5rem + ${i * 1.25}rem)` }}>
          <div
            className={cn(
              "sv-inner relative flex min-h-[260px] origin-top flex-col justify-between gap-10 rounded-xl border border-line-strong p-8 shadow-lifted md:min-h-[300px] md:flex-row md:items-end md:p-12",
              "bg-[linear-gradient(150deg,var(--c-surface-raised),var(--c-surface)_60%)]",
            )}
          >
            <span aria-hidden className="sv-shade pointer-events-none absolute inset-0 rounded-xl bg-deep opacity-0" />
            <span className="num text-7xl font-extralight text-accent/60 md:text-8xl">0{i + 1}</span>
            <div className="max-w-xl">
              <h3 className="font-display text-4xl md:text-5xl">{v.t}</h3>
              <p className="mt-4 text-muted md:text-lg">{v.d}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Team portraits revealed bottom-up as a clip, staggered. */
export function TeamReveal({ team }: { team: { n: string; r: string }[] }) {
  const root = useRef<HTMLDivElement>(null);
  useScrollScene(root, () => {
    gsap.from(".tm-card", {
      clipPath: "inset(100% 0% 0% 0% round 18px)",
      y: 40,
      duration: 1.3,
      ease: "expo.out",
      stagger: 0.12,
      scrollTrigger: { trigger: root.current, start: "top 80%", once: true },
    });
    gsap.from(".tm-initials", { yPercent: 60, autoAlpha: 0, duration: 1.2, ease: "expo.out", stagger: 0.12, delay: 0.25, scrollTrigger: { trigger: root.current, start: "top 80%", once: true } });
  });
  return (
    <div ref={root} className="mt-14 grid grid-cols-2 gap-6 lg:grid-cols-4">
      {team.map((m) => (
        <div key={m.n} className="group">
          <div className="tm-card relative grid aspect-[3/4] place-items-center overflow-hidden rounded-xl border border-line bg-[linear-gradient(160deg,var(--c-surface-raised),var(--c-bg-deep))]">
            <span aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_30%,var(--c-accent-soft),transparent)] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
            <span className="tm-initials font-display text-6xl text-accent/70 transition-transform duration-700 ease-book group-hover:scale-110">
              {m.n
                .split(" ")
                .map((x) => x[0])
                .join("")}
            </span>
          </div>
          <p className="mt-4 font-serif text-lg">{m.n}</p>
          <p className="text-sm text-muted">{m.r}</p>
        </div>
      ))}
    </div>
  );
}
