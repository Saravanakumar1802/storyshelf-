"use client";

import Link from "@/components/ui/SiteLink";
import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Award, BookOpen, Check, Feather, Quote } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { plans } from "@/data/plans";
import { featuredBooks as books } from "@/data/books";
import { faqs, testimonials } from "@/data/support";
import { theme } from "@/theme";
import { cn, formatINR } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Accordion } from "@/components/ui/Accordion";
import { Reveal } from "@/components/motion/Reveal";
import { BookCover } from "@/components/library/BookCover";
import { LogoMark } from "@/components/layout/Logo";
import type { PlanId } from "@/types";
import { planColor } from "@/lib/planColor";

export { planColor };

export function Marquee() {
  const items = ["Classics, free to read", "New voices, worth every page", "An AI librarian", "Publish your own", "You keep your copyright", "Better royalties", "Print, eBook & audiobook", `${BRAND.name} Awards`];
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-line bg-surface py-5" aria-label={`What ${BRAND.name} offers`}>
      <div className="flex w-max animate-marquee gap-10 motion-reduce:animate-none">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-10 whitespace-nowrap font-display text-2xl font-light text-muted md:text-3xl" aria-hidden={i >= items.length}>
            {t}
            <LogoMark className="size-5 text-accent" />
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-surface to-transparent" />
    </div>
  );
}

const doors = [
  {
    I: BookOpen,
    kicker: "For readers",
    title: (
      <>
        Open any book. Begin <em className="gold-text italic">anywhere</em>.
      </>
    ),
    body: "Wander a library of timeless classics, free to read cover to cover. Discover new books from independent authors, and keep the ones that stay with you. An AI librarian is always on hand to suggest your next read.",
    chips: ["Free classics", "Paid new releases", "AI librarian"],
    cta: { href: "/library", label: "Browse the library" },
  },
  {
    I: Feather,
    kicker: "For writers",
    title: (
      <>
        Your story, beautifully <em className="gold-text italic">bound</em>.
      </>
    ),
    body: "Bring us a manuscript and leave with a finished book: edited, designed, given an ISBN and sent out into the world. Then watch it take its place on the shelf beside the classics. Your copyright stays yours.",
    chips: ["Editing & design", "ISBN & distribution", "Better royalties"],
    cta: { href: "/publish", label: "Start publishing" },
  },
];

/** The two halves of StoryShelf: a library to read in, and a press to publish with. */
export function ReadAndPublish() {
  return (
    <section className="container-x py-28 md:py-36" aria-labelledby="read-and-publish">
      <SectionHeader
        align="center"
        eyebrow="One shelf, two doors"
        title={
          <span id="read-and-publish">
            Come to <em className="gold-text italic">read.</em> Stay to <em className="gold-text italic">write.</em>
          </span>
        }
        intro="Some books here are free, gifts from writers long gone. Some are new, from authors worth paying for. And one shelf is still empty, waiting for yours."
      />
      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        {doors.map((d, i) => (
          <Reveal key={d.kicker} delay={i * 120}>
            <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface p-8 transition-colors duration-500 hover:border-accent/50 md:p-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_100%_0%,var(--c-accent-soft),transparent_65%)] opacity-60 transition-opacity duration-500 group-hover:opacity-100" />
              <d.I className="relative size-9 text-accent" strokeWidth={1.4} />
              <p className="eyebrow relative mt-8">{d.kicker}</p>
              <h3 className="display-md relative mt-3 max-w-[16ch]">{d.title}</h3>
              <p className="relative mt-5 max-w-[52ch] leading-relaxed text-muted">{d.body}</p>
              <ul className="relative mt-8 flex flex-wrap gap-2" aria-label={`${d.kicker}: highlights`}>
                {d.chips.map((c) => (
                  <li key={c} className="rounded-pill border border-line-strong px-3.5 py-1.5 text-xs text-fg">
                    {c}
                  </li>
                ))}
              </ul>
              <div className="relative mt-auto pt-10">
                <ButtonLink href={d.cta.href} variant={i === 0 ? "primary" : "ghost"}>
                  {d.cta.label} <ArrowRight className="size-4" />
                </ButtonLink>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** A plan presented as a cloth-bound book whose cover swings open on hover/tap. */
function PlanBook({ id, delay }: { id: PlanId; delay: number }) {
  const plan = plans.find((p) => p.id === id)!;
  const [open, setOpen] = useState(false);
  return (
    <Reveal delay={delay} className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        aria-label={`${plan.name} plan, ${formatINR(plan.price)} plus GST. Show highlights.`}
        className="group relative aspect-[3/4.3] w-full max-w-[300px] text-left [perspective:1800px]"
      >
        {/* inside page with highlights */}
        <div className="absolute inset-0 rounded-[3px_8px_8px_3px] bg-paper p-6 text-paper-ink shadow-lifted">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">Inside the {plan.name} plan</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {plan.highlights.map((h) => (
              <li key={h} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0" style={{ color: planColor[id] }} />
                <span>{h}</span>
              </li>
            ))}
          </ul>
          <p className="absolute bottom-6 left-6 right-6 text-xs opacity-60">{plan.bestFor}</p>
        </div>
        {/* cover */}
        <div
          className={cn(
            "absolute inset-0 origin-left rounded-[3px_8px_8px_3px] p-7 shadow-lifted transition-transform duration-[900ms] ease-book [backface-visibility:hidden] [transform-style:preserve-3d]",
            open ? "[transform:rotateY(-118deg)]" : "[transform:rotateY(0deg)]",
          )}
          style={{
            background: `linear-gradient(90deg, rgba(0,0,0,0.35) 0, rgba(255,255,255,0.10) 3%, rgba(0,0,0,0) 7%), radial-gradient(120% 80% at 70% 20%, rgba(255,255,255,0.10), transparent), ${planColor[id]}`,
          }}
        >
          <div className="pointer-events-none absolute inset-3 rounded-sm border border-[color:var(--c-accent)]/60" />
          <div className="relative flex h-full flex-col items-center justify-between py-6 text-center text-accent-bright">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em]">{BRAND.name}</span>
            <div>
              <LogoMark className="mx-auto size-14 opacity-90" />
              <p className="mt-5 font-serif text-4xl font-semibold uppercase tracking-wide">{plan.name}</p>
              {plan.popular && <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-paper/80">Most chosen</p>}
            </div>
            <div>
              <p className="num text-4xl font-light text-paper">{formatINR(plan.price)}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-paper/70">+ GST</p>
            </div>
          </div>
        </div>
      </button>
      <p className="mt-6 max-w-[300px] text-center text-sm text-muted">{plan.tagline}</p>
    </Reveal>
  );
}

export function PlansPreview() {
  return (
    <section className="container-x py-28 md:py-36" aria-labelledby="plans-preview">
      <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
        <SectionHeader eyebrow="Publishing plans" title={<>Choose the book you want <em className="gold-text italic">to become</em>.</>} intro="Three plans, one promise: your copyright, your profit, and a book you're proud of. Hover a cover to look inside." />
        <ButtonLink href="/plans" variant="ghost" className="shrink-0">
          Compare every detail <ArrowRight className="size-4" />
        </ButtonLink>
      </div>
      <div className="mt-16 grid gap-14 sm:grid-cols-2 lg:grid-cols-3">
        <PlanBook id="kickstart" delay={0} />
        <PlanBook id="levelUp" delay={120} />
        <PlanBook id="pro" delay={240} />
      </div>
    </section>
  );
}

export function PromiseBand() {
  const items = [
    { k: "100%", v: "of your copyright stays with you" },
    { k: "6–8", v: "weeks from signing to a live book" },
    { k: "5", v: "crafts under one roof, from editing to marketing" },
    { k: "1", v: "dedicated manager for your whole journey" },
  ];
  return (
    <section className="border-y border-line bg-surface" aria-label="Our promise">
      <div className="container-x grid divide-line py-4 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
        {items.map((it, i) => (
          <Reveal key={i} delay={i * 80} className="px-6 py-10">
            <p className="num text-6xl font-light text-accent md:text-7xl">{it.k}</p>
            <p className="mt-3 max-w-[22ch] text-sm text-muted">{it.v}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function NewOnShelf() {
  const list = books.slice(0, 6);
  return (
    <section className="container-x py-28 md:py-36" aria-labelledby="new-on-shelf">
      <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
        <SectionHeader eyebrow="Free in the library" title={<>Classics, <em className="gold-text italic">free</em> to read.</>} intro="Stories that have outlived their authors, waiting for you cover to cover. No fee, no catch, just turn the page." />
        <ButtonLink href="/library" variant="ghost" className="shrink-0">
          Visit the library <ArrowRight className="size-4" />
        </ButtonLink>
      </div>
      <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-6">
        {list.map((b, i) => (
          <Reveal key={b.id} delay={i * 70}>
            <Link href={`/library/${b.slug}`} className="group block">
              <div className="transition-transform duration-500 ease-book [transform:perspective(900px)_rotateY(0deg)] group-hover:[transform:perspective(900px)_rotateY(-14deg)_translateY(-8px)]">
                <BookCover book={b} className="w-full" height={560} />
              </div>
              <p className="mt-4 font-serif text-base leading-tight text-fg group-hover:text-accent">{b.title}</p>
              <p className="mt-1 text-xs text-muted">{b.author}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Testimonials() {
  const track = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) => track.current?.scrollBy({ left: dir * Math.min(520, track.current.clientWidth * 0.8), behavior: "smooth" });
  return (
    <section className="py-28 md:py-36" aria-labelledby="testimonials">
      <div className="container-x flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
        <SectionHeader eyebrow={`Authors on ${BRAND.name}`} title={<>Stories about <em className="gold-text italic">our</em> stories.</>} />
        <div className="flex gap-2">
          <button type="button" aria-label="Previous testimonials" onClick={() => scrollBy(-1)} className="grid size-11 place-items-center rounded-full border border-line-strong hover:border-accent hover:text-accent">
            <ArrowRight className="size-4 rotate-180" />
          </button>
          <button type="button" aria-label="Next testimonials" onClick={() => scrollBy(1)} className="grid size-11 place-items-center rounded-full border border-line-strong hover:border-accent hover:text-accent">
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
      <div ref={track} data-lenis-prevent-wheel className="mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto px-[max(1rem,calc((100vw-1320px)/2+2.5rem))] pb-6 [scrollbar-width:none]">
        {testimonials.map((t) => {
          const sw = theme.scene.books[t.swatch];
          return (
            <figure key={t.id} className="relative flex w-[min(460px,85vw)] shrink-0 snap-start flex-col justify-between rounded-xl border border-line bg-surface p-8">
              <Quote className="size-8 text-accent" />
              <blockquote className="mt-6 font-display text-2xl font-light leading-snug text-fg">“{t.quote}”</blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-full font-serif text-lg" style={{ background: sw.base, color: sw.foil }}>
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-fg">{t.name}</span>
                  <span className="block text-xs text-muted">
                    {t.role} · <em>{t.book}</em>
                  </span>
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

export function AwardsTeaser() {
  return (
    <section className="container-x" aria-labelledby="awards-teaser">
      <Reveal className="relative overflow-hidden rounded-xl border border-line bg-[radial-gradient(120%_120%_at_80%_0%,var(--c-accent-soft),transparent_60%)] p-10 md:p-16">
        <Award className="size-10 text-accent" />
        <h2 id="awards-teaser" className="display-md mt-6 max-w-[18ch]">
          Every book we publish is eligible for the <em className="gold-text italic">{BRAND.name} Awards</em>.
        </h2>
        <p className="mt-5 max-w-xl text-muted">An annual celebration of the year’s finest independent books — with juried categories, reader’s choice, and a gala night for our authors.</p>
        <Link href="/awards" className="mt-8 inline-flex items-center gap-2 text-accent hover:underline">
          Discover the awards <ArrowUpRight className="size-4" />
        </Link>
        <LogoMark className="pointer-events-none absolute -bottom-10 -right-6 size-64 text-accent opacity-[0.07]" />
      </Reveal>
    </section>
  );
}

export function FaqPreview() {
  const items = faqs.filter((f) => ["f1", "f5", "f7", "f12", "f18"].includes(f.id)).map((f) => ({ id: f.id, title: f.q, body: f.a }));
  return (
    <section className="container-x grid gap-12 py-28 md:py-36 lg:grid-cols-[0.8fr_1.2fr]" aria-labelledby="faq-preview">
      <div>
        <SectionHeader eyebrow="Questions, answered" title={<>Before you <em className="gold-text italic">begin</em>.</>} intro="Everything authors ask us most. Can't find yours? Our team is a message away." />
        <ButtonLink href="/support/faq" variant="ghost" className="mt-8">
          All FAQs <ArrowRight className="size-4" />
        </ButtonLink>
      </div>
      <Reveal>
        <Accordion items={items} />
      </Reveal>
    </section>
  );
}
