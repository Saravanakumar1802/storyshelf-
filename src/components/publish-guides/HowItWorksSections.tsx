"use client";

import Link from "@/components/ui/SiteLink";
import { useRef } from "react";
import gsap from "gsap";
import { ArrowDown, ArrowRight, Check, Clock, FileText, Palette, UserRound, Wallet } from "lucide-react";
import { stages, TIMELINE_WEEKS, whatYouNeed } from "@/data/publish/howItWorks";
import { showcaseBooks as books } from "@/data/showcaseBooks";
import { CHANNELS, estimateEarnings } from "@/lib/royalty";
import { useScrollScene } from "@/components/motion/useScrollScene";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { CssBook } from "@/components/library/CssBook";
import { RouteLine } from "./RouteLine";
import { formatINR, pad2 } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────── hero ── */

export function HowItWorksHero() {
  const root = useRef<HTMLElement>(null);
  useScrollScene(root, () => {
    gsap.from(".hw-fact", {
      y: 24,
      autoAlpha: 0,
      duration: 0.9,
      ease: "expo.out",
      stagger: 0.1,
      delay: 0.4,
    });
  });
  const facts = [
    { k: String(stages.length), v: "clear stages" },
    { k: "6–8", v: "weeks to a live book" },
    { k: "1", v: "dedicated manager" },
  ];
  return (
    <header ref={root} className="relative overflow-hidden border-b border-line pb-14 pt-32 md:pt-36">
      <div aria-hidden className="pointer-events-none absolute -left-40 top-0 size-[640px] rounded-full bg-[radial-gradient(circle,var(--c-accent-soft),transparent_65%)]" />
      <div className="container-x relative">
        <p className="eyebrow">Publish · How it works</p>
        <div className="mt-5 grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <SplitHeading as="h1" className="max-w-[19ch] font-display text-[clamp(2.6rem,5.6vw,5.2rem)] font-light leading-[1] tracking-[-0.015em]">
            From manuscript to <em className="gold-text italic">bookshelf</em>, in eight clear stages.
          </SplitHeading>
          <div>
            <p className="max-w-xl text-base leading-relaxed text-muted md:text-lg">
              Publishing is a journey, not a transaction. Here is exactly what happens, when it happens — and who is with you at every step.
            </p>
            <dl className="mt-8 flex gap-10">
              {facts.map((f) => (
                <div key={f.v} className="hw-fact">
                  <dt className="sr-only">{f.v}</dt>
                  <dd className="num text-5xl font-extralight text-accent">{f.k}</dd>
                  <dd className="mt-1 max-w-[12ch] text-sm text-muted">{f.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="mt-12 lg:mt-10">
          <RouteLine />
        </div>
        <a href="#journey" className="mt-6 inline-flex items-center gap-2 text-sm text-accent hover:underline">
          See each stage in depth <ArrowDown className="size-4" />
        </a>
      </div>
    </header>
  );
}

/* ───────────────────────────────────────────────────── what you need ── */

const NEED_ICONS = [FileText, UserRound, Palette, Wallet];

export function WhatYouNeed() {
  const root = useRef<HTMLElement>(null);
  useScrollScene(root, () => {
    gsap.from(".wyn-card", {
      y: 50,
      rotateX: -18,
      transformPerspective: 1000,
      transformOrigin: "50% 0%",
      autoAlpha: 0,
      duration: 1,
      ease: "expo.out",
      stagger: 0.1,
      scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
    });
    gsap.from(".wyn-tick", {
      scale: 0,
      duration: 0.5,
      ease: "back.out(3)",
      stagger: 0.1,
      delay: 0.5,
      scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
    });
  });
  return (
    <section ref={root} className="border-y border-line bg-surface py-24" aria-labelledby="need-title">
      <div className="container-x">
        <p className="eyebrow">Before you begin</p>
        <h2 id="need-title" className="display-lg mt-4 max-w-[16ch]">
          What you need to get started.
        </h2>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {whatYouNeed.map((n, i) => {
            const I = NEED_ICONS[i % NEED_ICONS.length];
            return (
              <li key={n.title} className="wyn-card relative rounded-xl border border-line bg-bg p-6">
                <span className="wyn-tick absolute right-5 top-5 grid size-6 place-items-center rounded-full bg-success/15 text-success">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
                  <I className="size-5" />
                </span>
                <h3 className="mt-5 font-serif text-xl">{n.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{n.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── timeline ── */

/** When each stage happens, as a week-by-week chart whose bars grow in. */
export function JourneyTimeline() {
  const root = useRef<HTMLElement>(null);
  useScrollScene(root, () => {
    gsap.from(".tl-bar", {
      scaleX: 0,
      transformOrigin: "0% 50%",
      duration: 1.1,
      ease: "expo.out",
      stagger: 0.09,
      scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
    });
    gsap.from(".tl-row", {
      autoAlpha: 0,
      x: -16,
      duration: 0.7,
      ease: "power2.out",
      stagger: 0.06,
      scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
    });
  });
  const weeks = Array.from({ length: TIMELINE_WEEKS + 1 }, (_, i) => i);
  return (
    <section ref={root} className="container-x py-24" aria-labelledby="timeline-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Timeline</p>
          <h2 id="timeline-title" className="display-lg mt-4 max-w-[18ch]">
            When everything happens.
          </h2>
        </div>
        <p className="flex max-w-sm items-start gap-2 text-sm text-muted">
          <Clock className="mt-0.5 size-4 shrink-0 text-accent" /> Typical for a finished manuscript of about 350 pages. Marketing and royalties continue long after launch.
        </p>
      </div>
      <div className="mt-12 overflow-x-auto rounded-xl border border-line bg-surface p-5 md:p-8" data-lenis-prevent-wheel>
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[150px_1fr] gap-4 pb-3 text-[11px] text-faint md:grid-cols-[190px_1fr]">
            <span className="font-mono uppercase tracking-[0.16em]">Stage</span>
            <div className="relative h-4">
              {weeks.map((w) => (
                <span key={w} className="num absolute -translate-x-1/2" style={{ left: `${(w / TIMELINE_WEEKS) * 100}%` }}>
                  {w === 0 ? "Start" : `W${w}`}
                </span>
              ))}
            </div>
          </div>
          <ol className="space-y-2.5">
            {stages.map((s, i) => (
              <li key={s.stage} className="tl-row grid grid-cols-[150px_1fr] items-center gap-4 md:grid-cols-[190px_1fr]">
                <span className="flex items-center gap-2.5 text-sm text-fg">
                  <span className="num text-xs text-faint">{pad2(i + 1)}</span>
                  {s.stage}
                </span>
                <div className="relative h-8 rounded-md bg-[repeating-linear-gradient(90deg,var(--c-border)_0_1px,transparent_1px_10%)]">
                  <span
                    className="tl-bar absolute inset-y-1 flex items-center overflow-hidden whitespace-nowrap rounded-[5px] bg-[linear-gradient(90deg,var(--c-accent),var(--c-accent-bright))] px-2.5 text-[11px] font-medium text-on-accent"
                    style={{
                      left: `${(s.span[0] / TIMELINE_WEEKS) * 100}%`,
                      width: `${Math.max(2.5, ((s.span[1] - s.span[0]) / TIMELINE_WEEKS) * 100)}%`,
                    }}
                  >
                    {s.span[1] - s.span[0] >= 1.5 ? s.weeks : ""}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────── earnings example ── */

const EXAMPLE = {
  format: "paperback" as const,
  pages: 240,
  interior: "bw" as const,
  price: 349,
  channel: "amazon" as const,
};
const TAGS = [
  { k: "Trim size", v: "6 × 9 in", side: "left", y: 18 },
  { k: "Binding", v: "Paperback", side: "left", y: 50 },
  { k: "Lamination", v: "Matte", side: "left", y: 80 },
  { k: "Interior", v: "Black & white", side: "right", y: 26 },
  { k: "Page count", v: "240", side: "right", y: 62 },
] as const;

/** An annotated book with its specs and what each copy earns. */
export function EarningsExample() {
  const root = useRef<HTMLElement>(null);
  const e = estimateEarnings(EXAMPLE);
  useScrollScene(root, () => {
    const st = { trigger: root.current, start: "top 70%", once: true };
    gsap.from(".ee-book", {
      rotateY: -70,
      autoAlpha: 0,
      duration: 1.4,
      ease: "expo.out",
      scrollTrigger: st,
    });
    gsap.from(".ee-line", {
      scaleX: 0,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.08,
      delay: 0.5,
      scrollTrigger: st,
    });
    gsap.from(".ee-tag", {
      autoAlpha: 0,
      y: 10,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.08,
      delay: 0.7,
      scrollTrigger: st,
    });
    gsap.from(".ee-row", {
      autoAlpha: 0,
      x: 20,
      duration: 0.7,
      ease: "power2.out",
      stagger: 0.1,
      delay: 0.4,
      scrollTrigger: st,
    });
  });
  const rows = [
    { k: "List price", v: formatINR(e.price) },
    {
      k: `${CHANNELS.amazon.label} share (${Math.round(CHANNELS.amazon.share * 100)}%)`,
      v: `− ${formatINR(e.retailer)}`,
    },
    { k: "Print cost", v: `− ${formatINR(e.print)}` },
  ];
  return (
    <section ref={root} className="border-y border-line bg-surface py-24" aria-labelledby="earn-title">
      <div className="container-x grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative mx-auto h-[420px] w-full max-w-[560px] [perspective:1400px]">
          <div className="ee-book absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <CssBook book={books[6]} width={190} style={{ transform: "rotateY(-24deg) rotateX(4deg)" }} />
          </div>
          {TAGS.map((t) => (
            <div key={t.k} className={`absolute flex items-center ${t.side === "left" ? "left-0 flex-row" : "right-0 flex-row-reverse"}`} style={{ top: `${t.y}%` }}>
              <span className="ee-tag rounded-md border border-line-strong bg-bg/90 px-3 py-1.5 text-center shadow-soft backdrop-blur">
                <span className="block text-[10px] uppercase tracking-[0.14em] text-faint">{t.k}</span>
                <span className="num block text-sm text-fg">{t.v}</span>
              </span>
              <span className={`ee-line h-px w-10 bg-accent/70 sm:w-16 ${t.side === "left" ? "origin-left" : "origin-right"}`} />
              <span className="ee-tag size-2 rounded-full bg-accent" />
            </div>
          ))}
        </div>
        <div>
          <p className="eyebrow">What a copy earns</p>
          <h2 id="earn-title" className="display-md mt-4">
            A worked example.
          </h2>
          <p className="mt-4 max-w-md text-muted">A 240-page paperback novel, priced at {formatINR(e.price)} and sold on Amazon.in.</p>
          <dl className="mt-8 space-y-3 text-base">
            {rows.map((r) => (
              <div key={r.k} className="ee-row flex justify-between border-b border-line pb-3">
                <dt className="text-muted">{r.k}</dt>
                <dd className="num text-fg">{r.v}</dd>
              </div>
            ))}
            <div className="ee-row flex items-baseline justify-between pt-2">
              <dt className="font-serif text-xl">You earn</dt>
              <dd className="num text-4xl font-light text-accent">{formatINR(e.earnings)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-faint">Indicative. Sell direct on the StoryShelf Store and you keep more of every copy.</p>
          <Link href="/plans" className="mt-8 inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
            Compare plans <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── promises ── */

export function Promises() {
  const root = useRef<HTMLElement>(null);
  useScrollScene(root, () => {
    gsap.from(".pr-item", {
      y: 40,
      autoAlpha: 0,
      duration: 1,
      ease: "expo.out",
      stagger: 0.12,
      scrollTrigger: { trigger: root.current, start: "top 80%", once: true },
    });
  });
  const items = [
    {
      k: "You approve",
      v: "Every edit, cover and proof needs your sign-off. Nothing is published without it.",
    },
    {
      k: "You own it",
      v: "A non-exclusive agreement. Your copyright stays with you, always.",
    },
    {
      k: "You earn from it",
      v: "A better share of the profit from every sale, reported transparently in your dashboard.",
    },
  ];
  return (
    <section ref={root} className="container-x py-24" aria-label="Our promises">
      <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
        {items.map((x, i) => (
          <div key={x.k} className="pr-item bg-bg p-8 md:p-10">
            <span className="num text-sm text-accent">{pad2(i + 1)}</span>
            <p className="mt-4 font-display text-3xl">{x.k}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{x.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
