"use client";

import type { CSSProperties, ReactNode } from "react";
import { BadgeCheck, CalendarDays, Check, MessageSquareText, Star, TrendingUp } from "lucide-react";
import type { Service } from "@/types";
import { serviceSwatch, yourBook } from "@/data/showcase";
import { CssBook } from "@/components/library/CssBook";
import { BookCover } from "@/components/library/BookCover";
import { cn } from "@/lib/utils";
import s from "./Services.module.css";

/**
 * One floating UI card, in three layers so their transforms never fight:
 * the outer box is placed and drifts with scroll parallax (`data-depth` =
 * how far it floats from the book), the middle one pops in on entrance, and
 * the inner one bobs gently while its card is on screen. `phone` (an inset
 * shorthand) re-places it on narrow screens, where the scene is crowded.
 */
function Float({ at, phone, depth, tilt = 0, className, children }: Readonly<{ at: CSSProperties; phone?: string; depth: number; tilt?: number; className?: string; children: ReactNode }>) {
  const style = phone ? ({ ...at, "--phone-inset": phone } as CSSProperties) : at;
  return (
    <div className={cn(s.float, phone && s.phoneAt, "svc-float", className)} data-depth={depth} style={style}>
      <div className="svc-pop">
        <div className={s.bob} style={{ "--tilt": `${tilt}deg` } as CSSProperties}>
          {children}
        </div>
      </div>
    </div>
  );
}

const chip = cn(s.chip, "rounded-xl");

function Avatar({ label }: Readonly<{ label: string }>) {
  return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft font-serif text-[11px] font-semibold text-accent">{label}</span>;
}

/* ── 01 Writing & Editing: a marked-up manuscript and an editor's note ── */
function Editing() {
  return (
    <>
      <Float at={{ left: "6%", top: "10%" }} depth={0.5} tilt={-5}>
        <div className="w-40 rounded-md bg-paper p-4 text-paper-ink shadow-lifted sm:w-44">
          <p className="font-serif text-[13px] italic">Chapter One</p>
          <div className="mt-3 space-y-[7px]">
            <span className="block h-[3px] w-full rounded bg-paper-ink/25" />
            <span className="relative block h-[3px] w-[86%] rounded bg-paper-ink/25">
              <span className="absolute -inset-x-1 top-1/2 h-[2px] -translate-y-1/2 -rotate-2 rounded bg-edit-mark" />
            </span>
            <span className="block h-[3px] w-[92%] rounded bg-paper-ink/25" />
            <span className="block h-[3px] w-[70%] rounded bg-paper-ink/25" />
            <span className="relative block h-[3px] w-[95%] rounded bg-paper-ink/25">
              <span className="absolute -top-3 left-[38%] font-serif text-[11px] italic leading-none text-edit-mark">⁁ quietly</span>
            </span>
            <span className="block h-[3px] w-[80%] rounded bg-paper-ink/25" />
          </div>
        </div>
      </Float>
      <Float at={{ right: "5%", top: "16%" }} phone="auto 3% 6% auto" depth={1} tilt={3}>
        <div className={cn(chip, "w-52 p-3")}>
          <div className="flex items-center gap-2">
            <Avatar label="E" />
            <div className="leading-tight">
              <p className="text-[12px] font-medium text-fg">Your editor</p>
              <p className="text-[10px] text-faint">Comment · page 1</p>
            </div>
          </div>
          <p className="mt-2 text-[12px] leading-snug text-muted">Open on the storm — it&rsquo;s your strongest image.</p>
        </div>
      </Float>
      <Float at={{ right: "9%", bottom: "12%" }} depth={0.7} className="hidden sm:block">
        <div className={cn(chip, "flex items-center gap-2 px-3 py-2 text-[12px] text-fg")}>
          <span className="grid size-5 place-items-center rounded-full bg-success/15 text-success">
            <Check className="size-3" strokeWidth={3} />
          </span>
          Tracked changes accepted
        </div>
      </Float>
    </>
  );
}

/* ── 02 Book Production: cover concepts, specs and the ISBN barcode ── */
const CONCEPTS = [
  { key: "a", emblem: "lamp", swatch: 2 },
  { key: "b", emblem: "compass", swatch: 6 },
  { key: "c", emblem: "waves", swatch: 3 },
] as const;

function Production() {
  return (
    <>
      <Float at={{ left: "5%", top: "9%" }} depth={0.9} tilt={-3}>
        <div className={cn(chip, "p-3")}>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">Cover concepts</p>
          <div className="mt-2 flex gap-2">
            {CONCEPTS.map((c, i) => (
              <div key={c.key} className={cn("relative w-12 rounded-[3px]", i === 1 && "ring-2 ring-accent ring-offset-2 ring-offset-raised")}>
                <BookCover book={yourBook({ key: `concept-${c.key}`, emblem: c.emblem, swatch: c.swatch })} className="w-full !rounded-[3px]" />
                {i === 1 && (
                  <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-accent text-on-accent">
                    <Check className="size-2.5" strokeWidth={3.5} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </Float>
      <Float at={{ right: "5%", top: "20%" }} phone="auto 3% 6% auto" depth={0.6} tilt={4}>
        <div className={cn(chip, "w-44 p-3 text-[12px]")}>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">Print spec</p>
          <dl className="mt-1.5 space-y-1">
            {[
              ["Trim", "6 × 9 in"],
              ["Pages", "360"],
              ["Binding", "Hardback"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-muted">{k}</dt>
                <dd className="num text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Float>
      <Float at={{ left: "12%", bottom: "11%" }} depth={1.1} tilt={-2} className="hidden sm:block">
        <div className="rounded-md bg-paper px-3 pb-2 pt-3 shadow-lifted">
          <div className={cn(s.barcode, "h-9 w-32")} />
          <p className="num mt-1 text-center text-[10px] tracking-[0.12em] text-paper-ink">ISBN 978-93-48201-99-4</p>
        </div>
      </Float>
    </>
  );
}

/* ── 03 Marketing & Publicity: a review, launch reach and a live listing ── */
const REACH = [28, 36, 34, 52, 64, 82, 100];

function Marketing() {
  return (
    <>
      <Float at={{ left: "5%", top: "12%" }} depth={1} tilt={-4}>
        <div className={cn(chip, "w-52 p-3")}>
          <div className="flex gap-0.5 text-accent">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className="size-3.5 fill-current" />
            ))}
          </div>
          <p className="mt-2 font-serif text-[14px] italic leading-snug text-fg">&ldquo;Impossible to put down.&rdquo;</p>
          <p className="mt-1 text-[10px] text-faint">Reader review</p>
        </div>
      </Float>
      <Float at={{ right: "5%", top: "10%" }} phone="auto 3% 6% auto" depth={0.6} tilt={3}>
        <div className={cn(chip, "w-44 p-3")}>
          <p className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
            Launch reach <TrendingUp className="size-3.5 text-success" />
          </p>
          <div className="mt-3 flex h-16 items-end gap-1.5">
            {REACH.map((h, i) => (
              <span key={i} className="svc-bar flex-1 origin-bottom rounded-t-[3px] bg-[linear-gradient(180deg,var(--c-accent-bright),var(--c-accent))]" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </Float>
      <Float at={{ right: "11%", bottom: "11%" }} depth={0.8} className="hidden sm:block">
        <div className={cn(chip, "flex items-center gap-2 px-3 py-2 text-[12px] text-fg")}>
          <span className={cn(s.pulse, "size-2 rounded-full bg-success")} />
          Now available · launch week
        </div>
      </Float>
    </>
  );
}

/* ── 04 Publishing Management: one timeline, every store ── */
const MILESTONES = [
  { k: "Agreement signed", done: true },
  { k: "Proofs approved", done: true },
  { k: "Live in stores", done: false },
];
const STORES = ["Amazon.in", "Flipkart", "Google Play", "StoryShelf Store"];

function Management() {
  return (
    <>
      <Float at={{ left: "5%", top: "11%" }} depth={0.8} tilt={-3}>
        <div className={cn(chip, "w-48 p-3")}>
          <div className="flex items-center gap-2">
            <Avatar label="PM" />
            <p className="text-[12px] font-medium leading-tight text-fg">
              Your Publication
              <br />
              Manager
            </p>
          </div>
          <ol className="relative mt-3 space-y-2 border-l border-line-strong pl-4">
            {MILESTONES.map((m) => (
              <li key={m.k} className="relative text-[12px] text-muted">
                <span className={cn("absolute -left-[21px] top-1 size-2.5 rounded-full border", m.done ? "border-accent bg-accent" : cn(s.pulse, "border-success bg-success"))} />
                {m.k}
              </li>
            ))}
          </ol>
        </div>
      </Float>
      <Float at={{ right: "5%", top: "14%" }} phone="auto 3% 5% auto" depth={1.1} tilt={2}>
        <ul className="flex w-40 flex-col gap-1.5">
          {STORES.map((st) => (
            <li key={st} className={cn(chip, "flex items-center justify-between gap-2 !rounded-pill px-3 py-1.5 text-[11px] text-fg")}>
              {st}
              <span className="size-1.5 rounded-full bg-success" />
            </li>
          ))}
        </ul>
      </Float>
      <Float at={{ left: "14%", bottom: "11%" }} depth={0.6} className="hidden sm:block">
        <div className={cn(chip, "flex items-center gap-2 px-3 py-2 text-[12px] text-fg")}>
          <BadgeCheck className="size-4 text-accent" /> Your rights stay yours
        </div>
      </Float>
    </>
  );
}

/* ── 05 Author Support: a conversation, a booked call, a resolved request ── */
function Support() {
  return (
    <>
      <Float at={{ right: "5%", top: "9%" }} depth={0.7} tilt={2}>
        <div className="w-52 rounded-2xl rounded-br-sm bg-accent px-3.5 py-2.5 text-[12px] leading-snug text-on-accent shadow-soft">When will my proofs be ready?</div>
      </Float>
      <Float at={{ left: "5%", top: "26%" }} phone="auto auto 6% 3%" depth={1} tilt={-2}>
        <div className={cn(chip, "w-56 !rounded-2xl !rounded-bl-sm p-3")}>
          <div className="flex items-center gap-2">
            <Avatar label="S" />
            <p className="text-[11px] text-faint">Publication Manager</p>
          </div>
          <p className="mt-2 text-[12px] leading-snug text-fg">Friday morning — I&rsquo;ll walk you through every page.</p>
        </div>
      </Float>
      <Float at={{ right: "12%", top: "44%" }} depth={0.5} className="hidden sm:block">
        <div className={cn(chip, s.typing, "flex gap-1 !rounded-pill px-3 py-2.5")} aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </Float>
      <Float at={{ left: "10%", bottom: "10%" }} depth={0.8} tilt={-2} className="hidden sm:block">
        <div className={cn(chip, "flex items-center gap-2.5 px-3 py-2")}>
          <CalendarDays className="size-4 text-accent" />
          <div className="leading-tight">
            <p className="text-[12px] text-fg">Free consultation</p>
            <p className="text-[10px] text-faint">30 minutes · booked</p>
          </div>
        </div>
      </Float>
      <Float at={{ right: "6%", bottom: "12%" }} depth={1.1} className="hidden sm:block">
        <div className={cn(chip, "flex items-center gap-2 px-3 py-2 text-[12px] text-fg")}>
          <MessageSquareText className="size-4 text-success" /> Request resolved
        </div>
      </Float>
    </>
  );
}

const SCENES: Record<string, () => ReactNode> = {
  "writing-and-editing": Editing,
  "book-production": Production,
  "marketing-and-publicity": Marketing,
  "publishing-management": Management,
  "author-support": Support,
};

/** The visual half of a service card: your book, in this service's cloth, with the work happening around it. */
export function ServiceScene({ service }: Readonly<{ service: Service }>) {
  const Scene = SCENES[service.slug];
  const book = yourBook({ key: service.slug, emblem: service.emblem, swatch: serviceSwatch[service.slug] ?? 0 });
  return (
    <div className={cn(s.stage, "svc-stage")} aria-hidden>
      <span className={s.bigNum}>{service.number}</span>
      <div className={cn(s.rig, "svc-rig")}>
        <span className={s.bookShadow} />
        <div className={s.book}>
          <div className="svc-book" style={{ transform: "rotateY(-26deg) rotateX(6deg)", transformStyle: "preserve-3d" }}>
            <CssBook book={book} width={150} />
          </div>
        </div>
        {Scene && <Scene />}
      </div>
    </div>
  );
}
