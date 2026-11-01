"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Lightbulb } from "lucide-react";
import { showcaseBooks as books } from "@/data/showcaseBooks";
import { anatomy, coverPrinciples, designProcess, finishes, fontPairings, trimSizes, type Finish } from "@/data/publish/bookDesign";
import { SceneShell } from "@/components/three/SceneShell";
import { CssBook } from "@/components/library/CssBook";
import { useScrollScene } from "@/components/motion/useScrollScene";
import { cn, pad2 } from "@/lib/utils";

const AnatomyBook = dynamic(() => import("@/components/three/scenes/AnatomyBook"), { ssr: false });
// a jacketed book: its back carries blurb, barcode and price for the "back cover" step
const ANATOMY_BOOK = books.find((b) => b.finish === "jacket") ?? books[0];

/* ─────────────────────────────────────────────────────── anatomy story ── */

/** Parts of a book: panels scroll, the 3D book (pinned) turns to each part. */
export function AnatomyStory() {
  const root = useRef<HTMLElement>(null);
  const panels = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-58% 0px -38% 0px" },
    );
    panels.current.forEach((p) => p && io.observe(p));
    return () => io.disconnect();
  }, []);

  useScrollScene(root, () => {
    gsap.utils.toArray<HTMLElement>(".an-panel").forEach((el) => {
      gsap.from(el.querySelectorAll(".an-in"), { y: 30, autoAlpha: 0, duration: 0.9, ease: "expo.out", stagger: 0.07, scrollTrigger: { trigger: el, start: "top 72%", once: true } });
    });
  });

  return (
    <section ref={root} id="anatomy" aria-labelledby="anatomy-title" className="py-24">
      <div className="container-x">
        <p className="eyebrow">Anatomy of a book</p>
        <h2 id="anatomy-title" className="display-lg mt-4 max-w-[18ch]">
          Every part has a job to do.
        </h2>
      </div>
      <div className="container-x mt-12 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-16">
        {/* phones: a pinned band above the scrolling parts; desktop: the pinned left column */}
        <div className="sticky top-[var(--header-offset,4rem)] z-10 mx-[calc(-1*clamp(1rem,4vw,2.5rem))] h-[38svh] bg-bg pb-3 lg:static lg:mx-0 lg:h-auto lg:bg-transparent lg:pb-0">
          <div className="relative h-full overflow-hidden rounded-xl border border-line bg-[radial-gradient(70%_60%_at_50%_55%,var(--c-accent-soft),transparent_70%),var(--c-bg-deep)] lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:h-[calc(100svh-var(--header-h)-3rem)]">
            <SceneShell
              className="size-full"
              fallback={
                <div className="grid size-full place-items-center [perspective:1400px]">
                  <CssBook book={ANATOMY_BOOK} width={200} style={{ transform: "rotateY(-28deg) rotateX(4deg)" }} />
                </div>
              }
            >
              {({ active: live, onReady, onFatal }) => <AnatomyBook book={ANATOMY_BOOK} focus={anatomy[active].focus} active={live} onReady={onReady} onFatal={onFatal} />}
            </SceneShell>
            <span key={active} className="animate-panel-in pointer-events-none absolute left-5 top-5 rounded-pill border border-line-strong bg-bg/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg backdrop-blur">
              <span className="num text-accent">{pad2(active + 1)}</span> · {anatomy[active].label}
            </span>
          </div>
        </div>
        <ol>
          {anatomy.map((a, i) => (
            <li
              key={a.id}
              ref={(el) => {
                panels.current[i] = el;
              }}
              data-index={i}
              className="an-panel flex items-center py-8 lg:min-h-[72svh] lg:py-10 lg:first:min-h-[55svh] lg:last:min-h-[55svh]"
            >
              <article className={cn("transition-opacity duration-700 ease-book", i === active ? "opacity-100" : "lg:opacity-35")}>
                <p className="an-in num text-sm text-accent">{pad2(i + 1)}</p>
                <h3 className="an-in mt-2 font-display text-4xl font-light md:text-5xl">{a.label}</h3>
                <p className="an-in mt-4 text-lg leading-relaxed text-fg/90">{a.short}</p>
                <p className="an-in mt-3 max-w-xl leading-relaxed text-muted">{a.detail}</p>
                <ul className="an-in mt-6 space-y-2.5">
                  {a.tips.map((t) => (
                    <li key={t} className="flex gap-3 text-sm leading-relaxed text-fg/85">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" /> {t}
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────── trim sizes ── */

const maxW = Math.max(...trimSizes.map((t) => t.mm[0]));
const maxH = Math.max(...trimSizes.map((t) => t.mm[1]));

/** Common trim sizes drawn to scale; pick one to see where it fits. */
export function TrimSizes() {
  const [sel, setSel] = useState(trimSizes.find((t) => t.popular)?.id ?? trimSizes[0].id);
  const [unit, setUnit] = useState<"in" | "mm">("in");
  const t = trimSizes.find((x) => x.id === sel) ?? trimSizes[0];
  return (
    <section id="trim-sizes" className="scroll-mt-24 border-y border-line bg-surface py-24" aria-labelledby="trim-title">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Formats & trim sizes</p>
            <h2 id="trim-title" className="display-lg mt-4 max-w-[16ch]">
              Choose a size that suits your story.
            </h2>
          </div>
          <div role="radiogroup" aria-label="Units" className="inline-grid grid-cols-2 rounded-pill border border-line-strong p-1 text-sm">
            {(["in", "mm"] as const).map((u) => (
              <button key={u} type="button" role="radio" aria-checked={unit === u} onClick={() => setUnit(u)} className={cn("rounded-pill px-4 py-1.5 transition-colors", unit === u ? "bg-accent text-on-accent" : "text-muted hover:text-fg")}>
                {u === "in" ? "Inches" : "Millimetres"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* to scale: every size outlined, the chosen one filled */}
          <div className="relative mx-auto aspect-[216/279] w-full max-w-[420px]" aria-hidden>
            {trimSizes.map((x) => {
              const on = x.id === sel;
              return (
                <span
                  key={x.id}
                  className={cn("absolute bottom-0 left-0 rounded-[2px_6px_6px_2px] border transition-all duration-700 ease-book", on ? "z-10 border-accent bg-accent/15 shadow-glow" : "border-line-strong")}
                  style={{ width: `${(x.mm[0] / maxW) * 100}%`, height: `${(x.mm[1] / maxH) * 100}%` }}
                >
                  {on && <span className="num absolute right-2 top-2 text-xs text-accent">{unit === "in" ? x.name : `${x.mm[0]} × ${x.mm[1]} mm`}</span>}
                </span>
              );
            })}
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              {trimSizes.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={x.id === sel}
                  onClick={() => setSel(x.id)}
                  className={cn("num rounded-pill border px-3.5 py-1.5 text-sm transition-colors", x.id === sel ? "border-accent bg-accent-soft text-fg" : "border-line-strong text-muted hover:text-fg")}
                >
                  {unit === "in" ? x.name : `${x.mm[0]}×${x.mm[1]}`}
                  {x.popular && <span className="ml-1.5 text-[10px] text-accent">★</span>}
                </button>
              ))}
            </div>
            <div key={t.id} className="animate-panel-in mt-8">
              <p className="num text-5xl font-light">{unit === "in" ? t.name : `${t.mm[0]} × ${t.mm[1]} mm`}</p>
              <p className="num mt-1 text-sm text-faint">{unit === "in" ? `${t.mm[0]} × ${t.mm[1]} mm` : t.name}</p>
              <p className="mt-5 leading-relaxed text-muted">{t.note}</p>
              <p className="mt-5 flex flex-wrap gap-2">
                {t.genres.map((g) => (
                  <span key={g} className="rounded-pill border border-line-strong px-3 py-1 text-xs text-fg">
                    {g}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────── cover principles ── */

export function CoverPrinciples() {
  const root = useRef<HTMLUListElement>(null);
  useScrollScene(root, () => {
    gsap.from(".cp-card", { y: 40, autoAlpha: 0, duration: 0.9, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: root.current, start: "top 80%", once: true } });
  });
  return (
    <ul ref={root} className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {coverPrinciples.map((c, i) => (
        <li key={c.title} className="cp-card bg-bg p-7">
          <span className="num text-sm text-accent">{pad2(i + 1)}</span>
          <h3 className="mt-3 font-serif text-xl">{c.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{c.text}</p>
        </li>
      ))}
    </ul>
  );
}

/* ──────────────────────────────────────────────────────── font pairings ── */

const FAMILY: Record<string, string> = {
  "Cormorant Garamond": "var(--ff-display), Georgia, serif",
  Fraunces: "var(--ff-serif), Georgia, serif",
  Manrope: "var(--ff-sans), sans-serif",
  "Inter Tight": "var(--ff-num), sans-serif",
  "JetBrains Mono": "var(--ff-mono), monospace",
  Georgia: "Georgia, serif",
};

export function FontPairings() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {fontPairings.map((f) => (
        <figure key={f.name} className="flex flex-col rounded-xl border border-line bg-surface p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{f.name}</p>
          <p className="mt-5 text-4xl leading-tight text-fg" style={{ fontFamily: FAMILY[f.display] }}>
            The Monsoon Ledger
          </p>
          <p className="mt-4 flex-1 text-[15px] leading-[1.7] text-fg/80" style={{ fontFamily: FAMILY[f.body] }}>
            The ledger had been in the house longer than anyone could remember, and every June it came out smelling of camphor and rain.
          </p>
          <figcaption className="mt-6 border-t border-line pt-4 text-xs text-muted">
            <span className="text-fg">{f.display}</span> + <span className="text-fg">{f.body}</span> — {f.mood}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────── paper & finishes ── */

/** Theme-aware swatch per finish (paper tones, sheen, binding cues). */
function FinishSwatch({ f }: { f: Finish }) {
  const base = "relative h-28 overflow-hidden rounded-md";
  if (f.group === "Paper")
    return <div className={cn(base, f.id.includes("cream") ? "bg-paper" : "bg-[color-mix(in_oklab,var(--c-paper)_30%,white)]")} style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 9px, color-mix(in oklab, var(--c-paper-ink) 14%, transparent) 9px 10px)" }} />;
  if (f.group === "Lamination") {
    const gloss = f.id.includes("gloss") ? 0.55 : f.id.includes("soft") ? 0.12 : 0.22;
    return (
      <div className={cn(base, "group/sw bg-cloth")}>
        <span
          className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 transition-transform duration-1000 ease-book group-hover/sw:translate-x-[300%]"
          style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,${gloss}), transparent)` }}
        />
      </div>
    );
  }
  return (
    <div className={cn(base, "grid place-items-center bg-[radial-gradient(70%_70%_at_50%_60%,var(--c-accent-soft),transparent_70%),var(--c-bg)] [perspective:600px]")}>
      <CssBook book={f.id.includes("jacket") ? books[2] : f.id.includes("hard") || f.id.includes("case") ? books[0] : books[4]} width={44} style={{ transform: "rotateY(-30deg)" }} />
    </div>
  );
}

export function Finishes() {
  const groups = ["Paper", "Lamination", "Binding"] as const;
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {groups.map((g) => (
        <div key={g}>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{g}</p>
          <ul className="mt-4 space-y-4">
            {finishes
              .filter((f) => f.group === g)
              .map((f) => (
                <li key={f.id} className="rounded-xl border border-line bg-surface p-4">
                  <FinishSwatch f={f} />
                  <p className="mt-4 font-serif text-lg">{f.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{f.text}</p>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────────────── design process ── */

export function DesignProcess() {
  const root = useRef<HTMLOListElement>(null);
  useScrollScene(root, () => {
    gsap.fromTo(".dp-line", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top 75%", end: "bottom 55%", scrub: 0.5 } });
    gsap.from(".dp-step", { y: 40, autoAlpha: 0, duration: 0.9, ease: "expo.out", stagger: 0.12, scrollTrigger: { trigger: root.current, start: "top 78%", once: true } });
  });
  return (
    <ol ref={root} className="relative grid gap-8 md:grid-cols-4">
      <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-5 hidden h-px bg-line md:block" />
      <span aria-hidden className="dp-line absolute left-[12.5%] right-[12.5%] top-5 hidden h-px origin-left bg-accent md:block" />
      {designProcess.map((s, i) => (
        <li key={s.title} className="dp-step relative text-center">
          <span className="num relative z-10 mx-auto grid size-10 place-items-center rounded-full border border-accent bg-bg text-sm text-accent">{i + 1}</span>
          <h3 className="mt-5 font-serif text-xl">{s.title}</h3>
          <p className="mx-auto mt-2 max-w-[28ch] text-sm leading-relaxed text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}
