"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, BookOpen, Check, ChevronDown, Globe, Megaphone, Plus, ShieldCheck, Sparkles, Wallet, type LucideIcon } from "lucide-react";
import type { Plan, PlanCell, PlanId } from "@/types";
import { FORMATTING_NOTE, planComparison, plans } from "@/data/plans";
import { cn, formatINR, formatINR2, withGst } from "@/lib/utils";
import { ButtonLink, Button } from "@/components/ui/Button";
import { planColor } from "@/lib/planColor";
import { LogoMark } from "@/components/layout/Logo";
import { useScrollScene } from "@/components/motion/useScrollScene";

const order: PlanId[] = ["kickstart", "levelUp", "pro"];
const rowValue = (label: string, id: PlanId) => {
  for (const c of planComparison) {
    const r = c.rows.find((x) => x.label === label);
    if (r) return r.values[id];
  }
  return null;
};
const categoryIcon: Record<string, LucideIcon> = { legal: ShieldCheck, prepress: BookOpen, distribution: Globe, marketing: Megaphone, royalty: Wallet };

/** Price as shown on the page: excl. GST (whole rupees) or incl. 18% GST. */
function usePrice(incl: boolean) {
  return (n: number) => (incl ? formatINR2(withGst(n)) : formatINR(n));
}

function GstToggle({ incl, onChange }: { incl: boolean; onChange: (v: boolean) => void }) {
  return (
    <div role="radiogroup" aria-label="Show prices" className="relative inline-grid grid-cols-2 rounded-pill border border-line-strong bg-surface p-1 text-sm">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-pill bg-accent transition-transform duration-500 ease-book"
        style={{ transform: incl ? "translateX(100%)" : "none" }}
      />
      {[
        { v: false, l: "Excl. GST" },
        { v: true, l: "Incl. 18% GST" },
      ].map((o) => (
        <button
          key={o.l}
          type="button"
          role="radio"
          aria-checked={incl === o.v}
          onClick={() => onChange(o.v)}
          className={cn("relative z-10 rounded-pill px-4 py-1.5 transition-colors duration-300", incl === o.v ? "text-on-accent" : "text-muted hover:text-fg")}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── plan cards ── */

/** Pointer-follow spotlight + gentle 3D tilt, written straight to CSS vars. */
function onCardPointer(e: ReactPointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--mx", `${x * 100}%`);
  el.style.setProperty("--my", `${y * 100}%`);
  el.style.setProperty("--rx", `${(0.5 - y) * 5}deg`);
  el.style.setProperty("--ry", `${(x - 0.5) * 6}deg`);
}
function onCardLeave(e: ReactPointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.style.setProperty("--rx", "0deg");
  el.style.setProperty("--ry", "0deg");
}

function PlanCard({ plan, index, price, incl }: { plan: Plan; index: number; price: (n: number) => string; incl: boolean }) {
  const color = planColor[plan.id];
  const facts = [
    { k: "Cover concepts", v: rowValue("Cover Design", plan.id) },
    { k: "Author copies", v: rowValue("Author Copies", plan.id) },
    { k: "Royalty payout", v: rowValue("Payout Frequency", plan.id) },
  ];
  const includesLabel = index === 0 ? "What’s included" : `Everything in ${plans[index - 1].name}, plus`;
  return (
    <div className={cn("plan-card relative", plan.popular && "lg:-mt-6")} id={`plan-${plan.id}`} style={{ scrollMarginTop: "7rem" }}>
      <article
        onPointerMove={onCardPointer}
        onPointerLeave={onCardLeave}
        className={cn(
          "group relative flex h-full flex-col rounded-[calc(var(--r-xl)+1px)] p-px transition-transform duration-500 ease-book [transform:perspective(1400px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]",
          plan.popular ? "bg-[linear-gradient(160deg,var(--c-accent-bright),var(--c-border)_45%,var(--c-accent))] shadow-glow" : "bg-line",
        )}
        aria-labelledby={`plan-${plan.id}-name`}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-xl bg-surface">
          {/* spotlight */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: `radial-gradient(420px circle at var(--mx,50%) var(--my,0%), color-mix(in oklab, ${color} 22%, transparent), transparent 70%)` }}
          />
          {/* plan colour wash */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40" style={{ background: `linear-gradient(180deg, color-mix(in oklab, ${color} 26%, transparent), transparent)` }} />

          <div className="relative p-7 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <h3 id={`plan-${plan.id}-name`} className="flex items-center gap-3 font-serif text-2xl">
                <span aria-hidden className="size-2.5 rounded-full ring-4" style={{ background: color, ["--tw-ring-color" as string]: `color-mix(in oklab, ${color} 30%, transparent)` }} />
                {plan.name}
              </h3>
              {plan.popular && (
                <span className="inline-flex items-center gap-1 rounded-pill bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-on-accent">
                  <Sparkles className="size-3" /> Most chosen
                </span>
              )}
            </div>
            <p className="mt-3 min-h-[3rem] text-sm leading-relaxed text-muted">{plan.tagline}</p>

            <div className="mt-7 flex items-end gap-2">
              <p className="num text-[clamp(2.6rem,4vw,3.4rem)] font-light leading-none text-fg" aria-live="polite">
                {price(plan.price)}
              </p>
            </div>
            <p className="mt-2 text-xs text-faint">{incl ? `One-time · includes ${formatINR2(withGst(plan.price) - plan.price)} GST` : "One-time fee · + 18% GST"}</p>

            <ButtonLink href={`/publish?plan=${plan.id}`} variant={plan.popular ? "primary" : "ghost"} className="mt-7 w-full">
              Choose {plan.name} <ArrowRight className="size-4" />
            </ButtonLink>
          </div>

          <div className="relative flex flex-1 flex-col border-t border-line p-7 md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{includesLabel}</p>
            <ul className="mt-5 flex-1 space-y-3.5 text-sm">
              {plan.highlights.map((h) => (
                <li key={h} className="flex gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in oklab, ${color} 22%, transparent)`, color }}>
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span className="text-fg/90">{h}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-8 grid grid-cols-3 gap-2 border-t border-line pt-6">
              {facts.map((f) => (
                <div key={f.k}>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-faint">{f.k}</dt>
                  <dd className="num mt-1.5 text-sm font-medium text-fg">{typeof f.v === "string" ? f.v.replace(" Suggestions", "").replace(" Suggestion", "") : "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </article>
    </div>
  );
}

/* ───────────────────────────────────────────────────── comparison table ── */

function Cell({ v, id }: { v: PlanCell; id: PlanId }) {
  if (v === true)
    return (
      <span className="inline-grid size-7 place-items-center rounded-full" style={{ background: `color-mix(in oklab, ${planColor[id]} 24%, transparent)`, color: planColor[id] }}>
        <Check className="size-3.5" strokeWidth={3} />
        <span className="sr-only">Included</span>
      </span>
    );
  if (v === "addon")
    return (
      <span className="inline-flex items-center gap-1 rounded-pill border border-dashed border-line-strong px-2.5 py-0.5 text-[11px] text-faint">
        <Plus className="size-3" /> Add-on
      </span>
    );
  return <span className="text-[13px] font-medium leading-snug text-fg md:text-sm">{v}</span>;
}

function Comparison({ incl }: { incl: boolean }) {
  const [diffOnly, setDiffOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const price = usePrice(incl);
  const popular = plans.find((p) => p.popular)?.id;

  const categories = useMemo(
    () =>
      planComparison
        .map((c) => ({ ...c, rows: diffOnly ? c.rows.filter((r) => new Set(order.map((k) => JSON.stringify(r.values[k]))).size > 1) : c.rows }))
        .filter((c) => c.rows.length),
    [diffOnly],
  );

  // row heights change: let ScrollTrigger re-measure
  useEffect(() => {
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 60);
    return () => window.clearTimeout(id);
  }, [diffOnly, collapsed]);

  const toggle = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allCollapsed = collapsed.size === planComparison.length;
  const colTint = (k: PlanId) => (k === popular ? "bg-accent/[0.05]" : "");

  return (
    <section className="container-x pb-28" aria-labelledby="compare-title">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Side by side</p>
          <h2 id="compare-title" className="display-lg mt-3">
            Every detail, compared.
          </h2>
          <p className="mt-4 max-w-xl text-sm text-muted">{FORMATTING_NOTE} Everything below comes from the official StoryShelf plan sheet.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={diffOnly}
            onClick={() => setDiffOnly((v) => !v)}
            className="flex items-center gap-3 rounded-pill border border-line-strong px-4 py-2 text-sm text-muted transition-colors hover:text-fg"
          >
            <span className={cn("relative h-5 w-9 rounded-pill transition-colors", diffOnly ? "bg-accent" : "bg-hover")}>
              <span className={cn("absolute top-0.5 size-4 rounded-full bg-fg transition-all duration-300", diffOnly ? "left-[18px]" : "left-0.5")} />
            </span>
            Only show differences
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(planComparison.map((c) => c.id)))}
            className="rounded-pill border border-line-strong px-4 py-2 text-sm text-muted transition-colors hover:text-fg"
          >
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
        </div>
      </div>

      {/* overflow: clip (not hidden/auto) keeps the sticky header working */}
      <div className="cmp rounded-xl border border-line bg-surface [overflow:clip]">
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">Comparison of the Kickstart, Level-Up and Pro publishing plans</caption>
          <colgroup>
            <col className="w-[34%] md:w-[31%]" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead className="sticky z-20 transition-[top] duration-500 ease-book" style={{ top: "var(--header-offset, 5rem)" }}>
            <tr className="border-b border-line-strong">
              <th scope="col" className="cmp-head p-3 align-bottom md:p-5">
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-faint md:block">Services</span>
              </th>
              {plans.map((p) => (
                <th key={p.id} scope="col" className={cn("cmp-head p-2 text-center align-bottom md:p-5", p.id === popular && "is-popular")}>
                  <span aria-hidden className="mx-auto mb-2 block h-1 w-8 rounded-pill md:mb-3 md:w-10" style={{ background: planColor[p.id] }} />
                  <span className="block font-serif text-sm md:text-xl">{p.name}</span>
                  <span className="num mt-0.5 block text-[11px] text-muted md:text-sm">{price(p.price)}</span>
                </th>
              ))}
            </tr>
          </thead>
          {categories.map((c) => {
            const Icon = categoryIcon[c.id] ?? ShieldCheck;
            const open = !collapsed.has(c.id);
            return (
              <tbody key={c.id}>
                <tr className="border-t border-line bg-deep/60">
                  <th colSpan={4} scope="colgroup" className="p-0">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => toggle(c.id)}
                      className="flex w-full items-center gap-3 px-3 py-3.5 text-left transition-colors hover:bg-hover md:px-5"
                    >
                      <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent">
                        <Icon className="size-4" />
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{c.title}</span>
                      <span className="num ml-1 text-xs text-faint">{c.rows.length}</span>
                      <ChevronDown className={cn("ml-auto size-4 text-muted transition-transform duration-300", !open && "-rotate-90")} />
                    </button>
                  </th>
                </tr>
                {open &&
                  c.rows.map((r) => (
                    <tr key={r.label} className="cmp-row border-t border-line transition-colors hover:bg-hover/60">
                      <th scope="row" className="px-3 py-3.5 text-[13px] font-normal leading-snug text-muted md:px-5 md:py-4 md:text-sm">
                        {r.label}
                        {r.hint && <span className="block text-[11px] text-faint md:ml-2 md:inline">({r.hint})</span>}
                      </th>
                      {order.map((k) => (
                        <td key={k} className={cn("px-1.5 py-3.5 text-center md:px-4 md:py-4", colTint(k))}>
                          <Cell v={r.values[k]} id={k} />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            );
          })}
          <tfoot>
            <tr className="border-t border-line-strong bg-raised">
              <th scope="row" className="px-3 py-5 font-serif text-base md:px-5 md:text-lg">
                Price
                <span className="block font-sans text-xs text-faint">{incl ? "incl. 18% GST" : "GST extra"}</span>
              </th>
              {plans.map((p) => (
                <td key={p.id} className={cn("px-1.5 py-5 text-center md:px-4", colTint(p.id))}>
                  <span className="num block text-sm font-light md:text-2xl">{price(p.price)}</span>
                  <ButtonLink href={`/publish?plan=${p.id}`} size="sm" variant={p.popular ? "primary" : "ghost"} className="mt-3 hidden md:inline-flex">
                    Choose
                  </ButtonLink>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-faint">
        <Plus className="size-3" /> Add-on: available on that plan for an additional fee.
      </p>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── plan quiz ── */

const quiz = [
  {
    q: "Where is your manuscript today?",
    options: [
      { l: "Professionally edited and ready", w: { kickstart: 2, levelUp: 0, pro: 0 } },
      { l: "Finished, but needs polishing", w: { kickstart: 0, levelUp: 2, pro: 1 } },
      { l: "A draft that needs real editorial work", w: { kickstart: 0, levelUp: 1, pro: 3 } },
    ],
  },
  {
    q: "How do you want readers to find it?",
    options: [
      { l: "Print copies for friends, family & stores", w: { kickstart: 2, levelUp: 0, pro: 0 } },
      { l: "Print and eBook everywhere", w: { kickstart: 0, levelUp: 2, pro: 1 } },
      { l: "Print, eBook, audiobook — the works", w: { kickstart: 0, levelUp: 0, pro: 3 } },
    ],
  },
  {
    q: "How big a launch are you planning?",
    options: [
      { l: "A quiet, personal release", w: { kickstart: 2, levelUp: 1, pro: 0 } },
      { l: "Steady promotion on social & YouTube", w: { kickstart: 0, levelUp: 2, pro: 0 } },
      { l: "Ads, Amazon A+ and a big splash", w: { kickstart: 0, levelUp: 0, pro: 3 } },
    ],
  },
] as const;

function PlanQuiz() {
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const answered = answers.filter((a) => a !== null).length;
  const done = answered === quiz.length;
  const result = useMemo(() => {
    if (!done) return null;
    const score: Record<PlanId, number> = { kickstart: 0, levelUp: 0, pro: 0 };
    answers.forEach((a, i) => {
      const w = quiz[i].options[a!].w;
      for (const k of order) score[k] += w[k];
    });
    // ties resolve towards the more complete plan
    return order.reduce((best, k) => (score[k] >= score[best] ? k : best), "kickstart" as PlanId);
  }, [answers, done]);
  const plan = result ? plans.find((p) => p.id === result)! : null;

  return (
    <div className="grid gap-10 rounded-xl border border-line bg-surface p-6 md:p-10 lg:grid-cols-[1fr_0.8fr]">
      <div className="space-y-8">
        <div className="h-1 overflow-hidden rounded-pill bg-hover" aria-hidden>
          <div className="h-full origin-left bg-accent transition-transform duration-500 ease-book" style={{ transform: `scaleX(${answered / quiz.length})` }} />
        </div>
        {quiz.map((item, qi) => (
          <fieldset key={item.q}>
            <legend className="font-serif text-lg">
              <span className="num mr-2 text-xs text-accent">0{qi + 1}</span>
              {item.q}
            </legend>
            <div className="mt-3 flex flex-col gap-2">
              {item.options.map((o, oi) => {
                const sel = answers[qi] === oi;
                return (
                  <label
                    key={o.l}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                      sel ? "border-accent bg-accent-soft text-fg" : "border-line-strong text-muted hover:border-accent/60",
                    )}
                  >
                    <input
                      type="radio"
                      name={`q${qi}`}
                      checked={sel}
                      onChange={() => setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)))}
                      className="accent-[var(--c-accent)]"
                    />
                    {o.l}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="relative flex flex-col justify-center overflow-hidden rounded-lg border border-line-strong p-8 text-center" aria-live="polite">
        {plan ? (
          <div key={plan.id} className="animate-panel-in">
            <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: planColor[plan.id] }} />
            <Sparkles className="mx-auto size-6 text-accent" />
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-muted">We recommend</p>
            <p className="mt-2 font-serif text-5xl" style={{ color: planColor[plan.id] }}>
              {plan.name}
            </p>
            <p className="mt-4 text-sm text-muted">{plan.bestFor}.</p>
            <p className="num mt-3 text-3xl font-light">
              {formatINR(plan.price)} <span className="font-sans text-sm text-faint">+ GST</span>
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <ButtonLink href={`/publish?plan=${plan.id}`}>
                Start with {plan.name} <ArrowRight className="size-4" />
              </ButtonLink>
              <Button variant="link" type="button" onClick={() => setAnswers([null, null, null])} className="mx-auto">
                Start over
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <LogoMark className="mx-auto size-12 text-accent/60" />
            <p className="mt-4 font-display text-2xl">Answer three questions</p>
            <p className="mt-2 text-sm text-muted">
              and we&rsquo;ll suggest the plan that fits your book. <span className="num">{answered}/3</span> answered.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────── page ── */

export function PlansClient() {
  const root = useRef<HTMLDivElement>(null);
  const [incl, setIncl] = useState(false);
  const price = usePrice(incl);

  useScrollScene(root, () => {
    // cards rise and tip forward into place, like volumes stood up on a shelf
    gsap.from(".plan-card", {
      y: 90,
      rotateX: -14,
      autoAlpha: 0,
      transformPerspective: 1400,
      transformOrigin: "50% 100%",
      duration: 1.2,
      ease: "expo.out",
      stagger: 0.12,
      scrollTrigger: { trigger: ".plan-grid", start: "top 85%", once: true },
    });
    // comparison rows fade up as they arrive
    gsap.set(".cmp-row", { autoAlpha: 0, y: 14 });
    ScrollTrigger.batch(".cmp-row", {
      start: "top 94%",
      once: true,
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.035, overwrite: true }),
    });
    gsap.from(".addon-card", {
      y: 40,
      autoAlpha: 0,
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.06,
      scrollTrigger: { trigger: ".addon-grid", start: "top 85%", once: true },
    });
  });

  return (
    <div ref={root}>
      <section className="container-x py-20 md:py-28" aria-label="Plans">
        <div className="mb-12 flex flex-wrap items-center justify-between gap-4 md:mb-16">
          <p className="max-w-md text-sm text-muted">
            One-time fees in Indian Rupees. {FORMATTING_NOTE}
          </p>
          <GstToggle incl={incl} onChange={setIncl} />
        </div>
        <div className="plan-grid grid gap-6 lg:grid-cols-3 lg:items-stretch lg:gap-7">
          {plans.map((p, i) => (
            <PlanCard key={p.id} plan={p} index={i} price={price} incl={incl} />
          ))}
        </div>
      </section>

      <Comparison incl={incl} />

      <section className="container-x pb-28" aria-labelledby="quiz-title">
        <p className="eyebrow">30-second plan finder</p>
        <h2 id="quiz-title" className="display-lg mb-10 mt-3">
          Which plan fits your book?
        </h2>
        <PlanQuiz />
      </section>

      {/* <section className="container-x" aria-labelledby="addons-title">
        <p className="eyebrow">Add-ons</p>
        <h2 id="addons-title" className="display-lg mt-3">
          Tailor any plan.
        </h2>
        <p className="mt-4 max-w-2xl text-sm text-muted">Indicative prices, GST extra. Add-ons already included in a plan are applied automatically when you publish.</p>
        <ul className="addon-grid mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addons.map((a) => (
            <li key={a.id} className="addon-card group flex flex-col rounded-lg border border-line bg-surface p-6 transition-colors duration-300 hover:border-accent/60">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-serif text-lg">{a.name}</h3>
                <span className="num shrink-0 text-lg text-accent">{price(a.price)}</span>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted">{a.description}</p>
              {a.includedIn.length > 0 && (
                <p className="mt-4 flex flex-wrap gap-1.5">
                  {a.includedIn.map((id) => (
                    <span key={id} className="rounded-pill px-2.5 py-0.5 text-[11px]" style={{ background: `color-mix(in oklab, ${planColor[id]} 20%, transparent)`, color: planColor[id] }}>
                      Included in {planName(id)}
                    </span>
                  ))}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section> */}
    </div>
  );
}
