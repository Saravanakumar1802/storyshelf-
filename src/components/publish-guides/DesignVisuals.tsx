"use client";

import { useId, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { MoveHorizontal } from "lucide-react";
import type { Book } from "@/types";
import { showcaseBooks as books } from "@/data/showcaseBooks";
import { interiorElements, spineWidthMm, trimSizes, type InteriorElement } from "@/data/publish/bookDesign";
import { theme } from "@/theme";
import { bookSwatch } from "@/lib/cover/swatch";
import { useScrollScene } from "@/components/motion/useScrollScene";
import { BookCover } from "@/components/library/BookCover";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────── hero: the cover wrap folds ── */

function Barcode() {
  const bars = [2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2, 1, 1, 2, 1, 3, 1, 1, 2];
  return (
    <span className="flex h-7 items-stretch gap-[1px] bg-paper p-1" aria-hidden>
      {bars.map((w, i) => (
        <span key={i} className={i % 2 ? "bg-transparent" : "bg-paper-ink"} style={{ width: w }} />
      ))}
    </span>
  );
}

/**
 * A printed cover wrap (back · spine · front) that folds itself into a
 * standing book — the relationship every cover designer works with.
 */
export function CoverFold({ book = books[2] }: { book?: Book }) {
  const root = useRef<HTMLDivElement>(null);
  const sw = bookSwatch(theme, book);
  useScrollScene(root, () => {
    const tl = gsap.timeline({ delay: 0.4 });
    tl.from(".cf-guides", { autoAlpha: 0, duration: 0.6 })
      .to(".cf-guides", { autoAlpha: 0, duration: 0.5 }, "+=0.9")
      .to(".cf-back", { rotateY: -90, duration: 1.4, ease: "power3.inOut" }, "<")
      .to(".cf-front", { rotateY: 90, duration: 1.4, ease: "power3.inOut" }, "<")
      .to(".cf-rig", { rotateY: 52, rotateX: -6, duration: 1.6, ease: "power3.inOut" }, "<0.2")
      .to(".cf-rig", { rotateY: 38, duration: 3.5, ease: "sine.inOut", repeat: -1, yoyo: true });
  });
  // physical proportions: 152 × 229 mm faces, spine from the page count
  const spine = spineWidthMm(book.pages, "cream", "hardcover");
  const W = 210;
  const S = (W * spine) / 152;
  const H = (W * 229) / 152;
  const face: CSSProperties = { width: W, height: H, background: sw.base, backfaceVisibility: "hidden" };
  return (
    <div ref={root} className="grid size-full scale-[0.72] place-items-center [perspective:1600px] sm:scale-90 lg:scale-100">
      <div className="cf-rig relative [transform-style:preserve-3d]" style={{ width: S, height: H }}>
        {/* back panel hinges on the spine's left edge */}
        <div className="cf-back absolute right-full top-0 origin-right [transform-style:preserve-3d]" style={{ width: W, height: H }}>
          <div className="absolute inset-0 flex flex-col justify-between rounded-l-[3px] p-5" style={face}>
            <div className="space-y-1.5">
              {[92, 100, 86, 97, 70].map((w, i) => (
                <span key={i} className="block h-[3px] rounded" style={{ width: `${w}%`, background: sw.ink, opacity: 0.45 }} />
              ))}
            </div>
            <div className="flex items-end justify-between">
              <span className="font-mono text-[7px] tracking-[0.2em]" style={{ color: sw.ink, opacity: 0.7 }}>
                STORYSHELF
              </span>
              <Barcode />
            </div>
          </div>
        </div>
        {/* spine */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(90deg, rgba(0,0,0,0.3), rgba(255,255,255,0.08) 45%, rgba(0,0,0,0.25)), ${sw.base}` }}>
          <span className="whitespace-nowrap font-serif text-[9px] font-semibold [writing-mode:vertical-rl]" style={{ color: book.finish === "cloth" ? sw.foil : sw.ink }}>
            {book.title}
          </span>
        </div>
        {/* front panel hinges on the spine's right edge */}
        <div className="cf-front absolute left-full top-0 origin-left" style={{ width: W, height: H }}>
          <BookCover book={book} className="!rounded-[1px_4px_4px_1px]" height={640} priority />
        </div>
        {/* print guides, visible while flat */}
        <div className="cf-guides pointer-events-none absolute -inset-y-3" style={{ left: -W - 12, right: -W - 12 }} aria-hidden>
          <span className="absolute inset-0 rounded border border-dashed border-ember/80" />
          <span className="absolute inset-3 border border-dashed border-info/60" style={{ left: 12, right: 12 }} />
          <span className="absolute -bottom-6 left-0 font-mono text-[9px] uppercase tracking-[0.18em] text-ember">bleed</span>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.18em] text-accent">spine</span>
          <span className="absolute -bottom-6 right-0 font-mono text-[9px] uppercase tracking-[0.18em] text-info">safe zone</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────── cover wrap & spine width calculator ── */

const BLEED = 3;
const SAFE = 6;

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-faint">{label}</legend>
      <div className="grid rounded-pill border border-line-strong bg-bg p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <label
            key={o.v}
            className={cn(
              "cursor-pointer rounded-pill px-3 py-1.5 text-center text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
              value === o.v ? "bg-accent text-on-accent" : "text-muted hover:text-fg",
            )}
          >
            <input type="radio" className="sr-only" checked={value === o.v} onChange={() => onChange(o.v)} />
            {o.l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Live cover-wrap template: trim, pages, paper and binding set the spine and full wrap size. */
export function WrapCalculator() {
  const id = useId();
  const [trimId, setTrimId] = useState(trimSizes.find((t) => t.popular)?.id ?? trimSizes[0].id);
  const [pages, setPages] = useState(280);
  const [paper, setPaper] = useState<"cream" | "white">("cream");
  const [binding, setBinding] = useState<"paperback" | "hardcover">("paperback");
  const trim = trimSizes.find((t) => t.id === trimId) ?? trimSizes[0];
  const [tw, th] = trim.mm;
  const spine = spineWidthMm(pages, paper, binding);
  const totalW = Math.round((2 * tw + spine + 2 * BLEED) * 10) / 10;
  const totalH = th + 2 * BLEED;
  const pct = (mm: number) => `${(mm / totalW) * 100}%`;
  const pctH = (mm: number) => `${(mm / totalH) * 100}%`;
  const pagesPct = ((pages - 24) / (800 - 24)) * 100;

  return (
    <div className="grid gap-8 rounded-xl border border-line bg-surface p-6 md:p-8 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-6">
        <div>
          <label htmlFor={`${id}-trim`} className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-faint">
            Trim size
          </label>
          <select
            id={`${id}-trim`}
            value={trimId}
            onChange={(e) => setTrimId(e.target.value)}
            className="w-full rounded-pill border border-line-strong bg-bg px-4 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
          >
            {trimSizes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.mm[0]} × {t.mm[1]} mm)
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor={`${id}-pages`} className="text-xs font-medium uppercase tracking-[0.14em] text-faint">
              Page count
            </label>
            <span className="num text-lg text-fg">{pages}</span>
          </div>
          <input
            id={`${id}-pages`}
            type="range"
            min={24}
            max={800}
            step={8}
            value={pages}
            onChange={(e) => setPages(Number(e.target.value))}
            className="range h-2 w-full cursor-pointer appearance-none rounded-pill"
            style={{ background: `linear-gradient(90deg, var(--c-accent) ${pagesPct}%, var(--c-surface-hover) ${pagesPct}%)` }}
          />
        </div>
        <Seg label="Paper" value={paper} onChange={setPaper} options={[{ v: "cream", l: "Cream" }, { v: "white", l: "White" }]} />
        <Seg label="Binding" value={binding} onChange={setBinding} options={[{ v: "paperback", l: "Paperback" }, { v: "hardcover", l: "Hardcover" }]} />
        <dl className="grid grid-cols-2 gap-4 border-t border-line pt-6" aria-live="polite">
          <div>
            <dt className="text-xs text-faint">Spine width</dt>
            <dd className="num mt-1 text-3xl font-light text-accent">{spine} mm</dd>
          </div>
          <div>
            <dt className="text-xs text-faint">Full wrap (with bleed)</dt>
            <dd className="num mt-1 text-lg text-fg">
              {totalW} × {totalH} mm
            </dd>
          </div>
        </dl>
        <p className="text-[11px] leading-relaxed text-faint">Indicative. Your designer confirms exact measurements with the printer once the interior is typeset.</p>
      </div>

      {/* the template */}
      <div className="flex flex-col justify-center">
        <div className="relative w-full overflow-hidden rounded-sm shadow-lifted transition-[aspect-ratio] duration-500 ease-book" style={{ aspectRatio: `${totalW} / ${totalH}` }}>
          <div className="absolute inset-0 flex">
            <div className="relative bg-[linear-gradient(160deg,var(--c-surface-raised),var(--c-bg-deep))] transition-[flex-basis] duration-500 ease-book" style={{ flexBasis: pct(tw + BLEED) }}>
              <span className="absolute inset-0 grid place-items-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Back cover</span>
            </div>
            <div className="relative bg-accent/25 transition-[flex-basis] duration-500 ease-book" style={{ flexBasis: pct(spine) }}>
              <span className="absolute inset-0 grid place-items-center font-mono text-[9px] uppercase tracking-[0.2em] text-accent [writing-mode:vertical-rl]">Spine</span>
            </div>
            <div className="relative bg-[linear-gradient(200deg,var(--c-surface-raised),var(--c-bg-deep))] transition-[flex-basis] duration-500 ease-book" style={{ flexBasis: pct(tw + BLEED) }}>
              <span className="absolute inset-0 grid place-items-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Front cover</span>
            </div>
          </div>
          {/* trim line (inside the bleed) and safe zones */}
          <span aria-hidden className="pointer-events-none absolute border border-ember/90 transition-all duration-500" style={{ left: pct(BLEED), right: pct(BLEED), top: pctH(BLEED), bottom: pctH(BLEED) }} />
          <span aria-hidden className="pointer-events-none absolute border border-dashed border-info/70 transition-all duration-500" style={{ left: pct(BLEED + SAFE), width: pct(tw - 2 * SAFE), top: pctH(BLEED + SAFE), bottom: pctH(BLEED + SAFE) }} />
          <span aria-hidden className="pointer-events-none absolute border border-dashed border-info/70 transition-all duration-500" style={{ right: pct(BLEED + SAFE), width: pct(tw - 2 * SAFE), top: pctH(BLEED + SAFE), bottom: pctH(BLEED + SAFE) }} />
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
          <li className="flex items-center gap-2">
            <span className="h-0.5 w-5 bg-ember" /> Trim line ({BLEED} mm bleed beyond)
          </li>
          <li className="flex items-center gap-2">
            <span className="h-0 w-5 border-t border-dashed border-info" /> Safe zone ({SAFE} mm in) — keep text inside
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-accent/40" /> Spine
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────── before / after a cover ── */

/** Drag (or use the arrow keys) to compare a DIY cover with a designed one. */
export function CoverCompare({ book = books[0] }: { book?: Book }) {
  const id = useId();
  const [pos, setPos] = useState(50);
  const sw = bookSwatch(theme, book);
  return (
    <figure className="mx-auto w-full max-w-[380px]">
      <div className="relative overflow-hidden rounded-[3px_6px_6px_3px] shadow-lifted" style={{ aspectRatio: "152 / 229" }}>
        {/* after: the designed cover */}
        <BookCover book={book} className="absolute inset-0 size-full !rounded-none" height={640} />
        {/* before: a typical DIY cover */}
        <div className="absolute inset-0 flex flex-col items-center px-6 pt-10 text-center" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)`, background: "linear-gradient(180deg, var(--c-info), var(--c-paper))" }}>
          <p className="font-[Georgia,serif] text-[15px] text-paper [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{book.title}</p>
          <p className="mt-1 text-[9px] text-paper/90">A Novel · A Story of Love, Family, Secrets and Rain</p>
          <span className="mt-6 grid size-24 place-items-center rounded-full border-4 border-paper/70 text-[9px] text-paper/80">photo</span>
          <p className="mt-auto pb-6 text-[11px] text-paper-ink/80">by {book.author}</p>
        </div>
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }} aria-hidden>
          <span className="absolute inset-y-0 -left-px w-0.5 bg-paper/90" />
          <span className="absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-paper text-paper-ink shadow-lifted">
            <MoveHorizontal className="size-4" />
          </span>
        </div>
        <span className="pointer-events-none absolute left-3 top-3 rounded-pill bg-deep/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-fg">DIY</span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-pill px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]" style={{ background: sw.foil, color: sw.base }}>
          Designed
        </span>
        <label htmlFor={id} className="sr-only">
          Compare a DIY cover with a professionally designed one
        </label>
        <input id={id} type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="absolute inset-0 size-full cursor-ew-resize opacity-0" />
      </div>
      <figcaption className="mt-4 text-center text-sm text-muted">Same book, same idea. Hierarchy, restraint and genre cues make the difference.</figcaption>
    </figure>
  );
}

/* ──────────────────────────────────────────── interior spread anatomy ── */

const PROSE =
  "The ledger had been in the house longer than anyone could remember. It lived beneath the stairs, wrapped in an old mundu, and every June it came out smelling of camphor and rain. Ammachi wrote in it with a fountain pen she trusted to no one else, and when she died the pen was found inside it, marking a page nobody had been allowed to read.";

/** A typeset spread; pick an element to see where (and how big) it is. */
export function InteriorSpread() {
  const [active, setActive] = useState<InteriorElement["id"]>("margins");
  const el = interiorElements.find((e) => e.id === active)!;
  const on = (id: InteriorElement["id"]) => active === id;
  const guide = "pointer-events-none absolute transition-opacity duration-500";
  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
      <div className="relative mx-auto grid w-full max-w-[760px] grid-cols-2 overflow-hidden rounded-md shadow-lifted" style={{ aspectRatio: "304 / 229" }} aria-hidden>
        {[0, 1].map((side) => (
          <div key={side} className="relative bg-paper text-paper-ink" style={{ aspectRatio: "152 / 229" }}>
            {/* gutter shadow */}
            <span className={cn("absolute inset-y-0 w-[12%]", side === 0 ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r", "from-paper-ink/20 to-transparent")} />
            <div className="absolute flex flex-col" style={{ top: "9%", bottom: "11%", left: side === 0 ? "9%" : "14%", right: side === 0 ? "14%" : "9%" }}>
              <p className="text-center font-mono text-[clamp(5px,0.8vw,8px)] uppercase tracking-[0.25em] opacity-60">{side === 0 ? "Meera Varghese" : "The Monsoon Ledger"}</p>
              <div className="mt-[8%] flex-1 overflow-hidden font-serif text-[clamp(6px,1.05vw,10.5px)] leading-[1.6] [text-align:justify]">
                {side === 1 && (
                  <span className="float-left mr-1 font-display text-[3.6em] leading-[0.8]" style={{ color: theme.colors.editMark }}>
                    T
                  </span>
                )}
                {side === 1 ? PROSE.slice(1) : PROSE + " " + PROSE}
              </div>
              <p className={cn("font-serif text-[clamp(5px,0.8vw,8px)] opacity-60", side === 0 ? "text-left" : "text-right")}>{side === 0 ? "14" : "15"}</p>
            </div>
          </div>
        ))}
        {/* guides */}
        <span className={cn(guide, "inset-0 bg-[linear-gradient(var(--c-accent),var(--c-accent))_0_0/100%_9%_no-repeat,linear-gradient(var(--c-accent),var(--c-accent))_0_100%/100%_11%_no-repeat,linear-gradient(var(--c-accent),var(--c-accent))_0_0/4.5%_100%_no-repeat,linear-gradient(var(--c-accent),var(--c-accent))_100%_0/4.5%_100%_no-repeat]", on("margins") ? "opacity-25" : "opacity-0")} />
        <span className={cn(guide, "inset-y-0 left-[43%] right-[43%] bg-info/30", on("gutter") ? "opacity-100" : "opacity-0")} />
        <span className={cn(guide, "left-[4.5%] right-[4.5%] top-[8%] h-[3.5%] rounded-sm ring-2 ring-accent", on("runningHeads") ? "opacity-100" : "opacity-0")} />
        <span className={cn(guide, "left-[56.5%] top-[17%] h-[10%] w-[6%] rounded-sm ring-2 ring-accent", on("dropCap") ? "opacity-100" : "opacity-0")} />
        <span className={cn(guide, "inset-x-[4.5%] bottom-[14%] top-[17%] bg-[repeating-linear-gradient(180deg,var(--c-accent)_0_1px,transparent_1px_calc(1.6*1.05vw))]", on("leading") ? "opacity-50" : "opacity-0")} />
        <span className={cn(guide, "bottom-[7%] left-[4%] h-[4%] w-[5%] rounded-sm ring-2 ring-accent", on("pageNumbers") ? "opacity-100" : "opacity-0")} />
        <span className={cn(guide, "bottom-[7%] right-[4%] h-[4%] w-[5%] rounded-sm ring-2 ring-accent", on("pageNumbers") ? "opacity-100" : "opacity-0")} />
      </div>

      <div>
        <div role="tablist" aria-label="Interior elements" className="flex flex-wrap gap-2">
          {interiorElements.map((e) => (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={on(e.id)}
              onClick={() => setActive(e.id)}
              className={cn("rounded-pill border px-3.5 py-1.5 text-sm transition-colors", on(e.id) ? "border-accent bg-accent-soft text-fg" : "border-line-strong text-muted hover:text-fg")}
            >
              {e.label}
            </button>
          ))}
        </div>
        <div key={el.id} role="tabpanel" className="animate-panel-in mt-6">
          <p className="font-display text-3xl">{el.label}</p>
          <p className="mt-3 leading-relaxed text-muted">{el.text}</p>
          <p className="num mt-4 inline-flex rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm text-accent">{el.spec}</p>
        </div>
      </div>
    </div>
  );
}
