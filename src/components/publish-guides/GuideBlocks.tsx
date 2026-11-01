"use client";

import Link from "@/components/ui/SiteLink";
import { useMemo, useRef, useSyncExternalStore } from "react";
import gsap from "gsap";
import { AlertTriangle, ArrowRight, BookMarked, Check, Info, Lightbulb, Sparkles, type LucideIcon } from "lucide-react";
import type { CalloutTone, GuideBlock } from "@/data/publish/types";
import { cn } from "@/lib/utils";
import { useScrollScene } from "@/components/motion/useScrollScene";

const TONES: Record<CalloutTone, { I: LucideIcon; label: string; cls: string; icon: string }> = {
  tip: { I: Lightbulb, label: "Tip", cls: "border-accent/40 bg-accent-soft", icon: "text-accent" },
  note: { I: Info, label: "Note", cls: "border-info/40 bg-info/10", icon: "text-info" },
  india: { I: BookMarked, label: "In India", cls: "border-ember/40 bg-ember/10", icon: "text-ember" },
  with8085: { I: Sparkles, label: "With StoryShelf", cls: "border-accent/50 bg-[linear-gradient(135deg,var(--c-accent-soft),transparent)]", icon: "text-accent" },
  warning: { I: AlertTriangle, label: "Watch out", cls: "border-warning/40 bg-warning/10", icon: "text-warning" },
};

const CHECKLIST_EVENT = "8085:checklist";
const subscribeChecklist = (cb: () => void) => {
  window.addEventListener(CHECKLIST_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHECKLIST_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
/** in-memory fallback when localStorage is unavailable (ticks still work for this visit) */
const memory = new Map<string, string>();
const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
};
const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
  window.dispatchEvent(new Event(CHECKLIST_EVENT));
};

/** A checklist the reader can tick off; remembered in this browser. */
function Checklist({ id, title, items }: { id: string; title?: string; items: string[] }) {
  const key = `8085:checklist:${id}`;
  const raw = useSyncExternalStore(subscribeChecklist, () => readStorage(key), () => null);
  const done = useMemo(() => {
    try {
      const saved = JSON.parse(raw ?? "null");
      if (Array.isArray(saved) && saved.length === items.length) return saved.map(Boolean);
    } catch {
      /* corrupted entry: start fresh */
    }
    return items.map(() => false);
  }, [raw, items]);
  const toggle = (i: number) => writeStorage(key, JSON.stringify(done.map((v, j) => (j === i ? !v : v))));
  const count = done.filter(Boolean).length;
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="font-serif text-lg">{title ?? "Checklist"}</p>
        <p className="num text-sm text-muted">
          {count}/{items.length}
        </p>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-pill bg-hover" aria-hidden>
        <div className="h-full origin-left bg-accent transition-transform duration-500 ease-book" style={{ transform: `scaleX(${count / items.length})` }} />
      </div>
      <ul className="mt-5 space-y-1">
        {items.map((it, i) => (
          <li key={it}>
            <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 transition-colors hover:bg-hover has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
              <input type="checkbox" className="peer sr-only" checked={done[i]} onChange={() => toggle(i)} />
              <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded border transition-colors", done[i] ? "border-accent bg-accent text-on-accent" : "border-line-strong")}>
                {done[i] && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className={cn("text-[15px] leading-relaxed transition-colors", done[i] ? "text-faint line-through" : "text-fg/90")}>{it}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

const LAUNCH = [
  { when: "8 weeks before", what: "Finalise metadata — title, description, categories and keywords." },
  { when: "6 weeks before", what: "Share early copies with trusted readers and reviewers." },
  { when: "4 weeks before", what: "Reveal the cover; start posting regularly where your readers are." },
  { when: "2 weeks before", what: "Line up launch posts, a reading or event, and your author page." },
  { when: "Launch day", what: "Announce everywhere, thank your readers, share the store links." },
  { when: "2–4 weeks after", what: "Ask for reviews, run promotions, and watch what’s working." },
];

/** Launch plan as a vertical timeline that draws itself in. */
function LaunchTimeline() {
  const root = useRef<HTMLOListElement>(null);
  useScrollScene(root, () => {
    gsap.fromTo(".lt-line", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top 75%", end: "bottom 60%", scrub: 0.5 } });
    gsap.from(".lt-item", { x: 24, autoAlpha: 0, duration: 0.8, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: root.current, start: "top 78%", once: true } });
  });
  return (
    <ol ref={root} className="relative space-y-5 pl-8">
      <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-line" />
      <span aria-hidden className="lt-line absolute bottom-2 left-[7px] top-2 w-px origin-top bg-accent" />
      {LAUNCH.map((s, i) => (
        <li key={s.when} className="lt-item relative">
          <span aria-hidden className={cn("absolute -left-8 top-1 size-[15px] rounded-full border-2 bg-bg", i === 4 ? "border-accent bg-accent" : "border-accent")} />
          <p className={cn("font-mono text-[11px] uppercase tracking-[0.18em]", i === 4 ? "text-accent" : "text-faint")}>{s.when}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-fg/90">{s.what}</p>
        </li>
      ))}
    </ol>
  );
}

/** Renders one content block of a guide chapter. */
export function GuideBlockView({ block, chapterId, index }: { block: GuideBlock; chapterId: string; index: number }) {
  switch (block.type) {
    case "p":
      return <p className="text-[1.0625rem] leading-[1.8] text-fg/85">{block.text}</p>;
    case "h3":
      return <h3 className="pt-2 font-serif text-2xl">{block.text}</h3>;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className="space-y-2.5">
          {block.items.map((it, i) => (
            <li key={it} className="flex gap-3 text-[1.0625rem] leading-[1.7] text-fg/85">
              {block.ordered ? (
                <span className="num mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs text-accent">{i + 1}</span>
              ) : (
                <span aria-hidden className="mt-3 size-1.5 shrink-0 rotate-45 bg-accent" />
              )}
              <span>{it}</span>
            </li>
          ))}
        </Tag>
      );
    }
    case "callout": {
      const t = TONES[block.tone];
      return (
        <aside className={cn("flex gap-4 rounded-xl border p-5", t.cls)}>
          <t.I className={cn("mt-0.5 size-5 shrink-0", t.icon)} />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-faint">{t.label}</p>
            <p className="mt-1 font-serif text-lg text-fg">{block.title}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-fg/80">{block.text}</p>
          </div>
        </aside>
      );
    }
    case "table":
      return (
        <figure className="relative overflow-x-auto rounded-xl border border-line" data-lenis-prevent-wheel>
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <caption className="caption-bottom bg-surface px-4 py-3 text-left text-xs text-faint">{block.caption}</caption>
            <thead>
              <tr className="bg-raised">
                {block.columns.map((c, i) => (
                  <th key={i} scope="col" className={cn("px-4 py-3 font-medium text-muted", i === block.highlight && "bg-accent-soft text-accent")}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, ri) => (
                <tr key={ri} className="border-t border-line">
                  {r.map((cell, ci) =>
                    ci === 0 ? (
                      <th key={ci} scope="row" className="px-4 py-3 align-top font-medium text-fg">
                        {cell}
                      </th>
                    ) : (
                      <td key={ci} className={cn("px-4 py-3 align-top leading-relaxed text-fg/80", ci === block.highlight && "bg-accent/[0.06] text-fg")}>
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      );
    case "checklist":
      return <Checklist id={`${chapterId}-${index}`} title={block.title} items={block.items} />;
    case "takeaways":
      return (
        <div className="rounded-xl border-l-2 border-accent bg-surface px-6 py-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Key takeaways</p>
          <ul className="mt-3 space-y-2">
            {block.items.map((it) => (
              <li key={it} className="flex gap-2.5 text-[15px] leading-relaxed text-fg/90">
                <Check className="mt-1 size-4 shrink-0 text-accent" /> {it}
              </li>
            ))}
          </ul>
        </div>
      );
    case "widget":
      return <LaunchTimeline />;
    case "next":
      return (
        <Link href={block.href} className="group flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent/60">
          <span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Next step</span>
            <span className="mt-1 block font-serif text-lg text-fg">{block.label}</span>
            <span className="mt-0.5 block text-sm text-muted">{block.text}</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-faint transition-[color,transform] group-hover:translate-x-1 group-hover:text-accent" />
        </Link>
      );
  }
}
