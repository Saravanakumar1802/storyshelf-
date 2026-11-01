"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowRight, CalendarDays, Check, ChevronDown, List } from "lucide-react";
import type { GuideChapter } from "@/data/publish/types";
import { plans } from "@/data/plans";
import { getLenis } from "@/components/layout/SmoothScroll";
import { useScrollScene } from "@/components/motion/useScrollScene";
import { ButtonLink } from "@/components/ui/Button";
import { cn, formatINR, pad2 } from "@/lib/utils";
import { GuideBlockView } from "./GuideBlocks";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const lenis = getLenis();
  const offset = -(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) * 16 || 80) - 24;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.1 });
  else el.scrollIntoView({ behavior: "smooth" });
  history.replaceState(null, "", `#${id}`);
}

/**
 * Long-form guide: sticky contents with scrollspy (left), the article at a
 * comfortable measure (centre), a sticky call-to-action (right), and a gold
 * reading-progress bar under the header.
 */
export function GuideReader({ chapters }: { chapters: GuideChapter[] }) {
  const root = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(chapters[0]?.id);
  const [tocOpen, setTocOpen] = useState(false);
  const activeIndex = Math.max(0, chapters.findIndex((c) => c.id === active));
  const from = Math.min(...plans.map((p) => p.price));

  // scrollspy: the chapter crossing the upper third of the screen
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-30% 0px -65% 0px" },
    );
    chapters.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [chapters]);

  // reading progress through the article (DOM write, no re-render)
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = article.current;
      if (!el || !bar.current) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      bar.current.style.transform = `scaleX(${p})`;
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);

  useScrollScene(root, () => {
    gsap.utils.toArray<HTMLElement>(".gr-chapter").forEach((el) => {
      gsap.from(el.querySelectorAll(".gr-head > *"), { y: 30, autoAlpha: 0, duration: 0.9, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: el, start: "top 80%", once: true } });
      gsap.from(el.querySelectorAll(".gr-block"), { y: 22, autoAlpha: 0, duration: 0.8, ease: "power3.out", stagger: 0.05, scrollTrigger: { trigger: el, start: "top 72%", once: true } });
    });
  });

  const renderToc = (onPick?: () => void) => (
    <ol className="space-y-0.5">
      {chapters.map((c, i) => {
        const on = c.id === active;
        const read = i < activeIndex;
        return (
          <li key={c.id}>
            <a
              href={`#${c.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToId(c.id);
                onPick?.();
              }}
              aria-current={on ? "location" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-md py-2 pl-4 pr-2 text-sm transition-colors",
                on ? "bg-accent-soft text-fg" : "text-muted hover:text-fg",
              )}
            >
              <span aria-hidden className={cn("absolute inset-y-1.5 left-0 w-0.5 rounded-pill transition-colors", on ? "bg-accent" : "bg-transparent")} />
              <span className={cn("num grid size-5 shrink-0 place-items-center rounded-full text-[10px]", read ? "bg-accent text-on-accent" : on ? "text-accent" : "text-faint")}>
                {read ? <Check className="size-3" strokeWidth={3} /> : pad2(i + 1)}
              </span>
              {c.toc}
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div ref={root} className="relative">
      {/* reading progress */}
      <div className="pointer-events-none fixed inset-x-0 z-40 h-0.5 transition-[top] duration-500 ease-book" style={{ top: "var(--header-offset, 5rem)" }} aria-hidden>
        <div ref={bar} className="h-full origin-left bg-[linear-gradient(90deg,var(--c-accent),var(--c-accent-bright))]" style={{ transform: "scaleX(0)" }} />
      </div>

      <div className="container-x grid gap-10 py-16 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_260px] xl:gap-14">
        {/* contents: sticky sidebar on desktop, collapsible bar on small screens */}
        <nav aria-label="Contents" className="lg:sticky lg:top-[calc(var(--header-offset,5rem)+1.5rem)] lg:h-fit lg:self-start">
          <div className="sticky top-[calc(var(--header-offset,4rem)+0.5rem)] z-20 lg:hidden">
            <button
              type="button"
              aria-expanded={tocOpen}
              onClick={() => setTocOpen((v) => !v)}
              className="glass flex w-full items-center justify-between gap-3 rounded-lg border border-line-strong px-4 py-3 text-sm"
            >
              <span className="flex items-center gap-2 text-muted">
                <List className="size-4 text-accent" />
                <span className="num text-faint">{pad2(activeIndex + 1)}</span>
                <span className="truncate text-fg">{chapters[activeIndex]?.toc}</span>
              </span>
              <ChevronDown className={cn("size-4 transition-transform", tocOpen && "rotate-180")} />
            </button>
            {tocOpen && (
              <div className="mt-2 max-h-[60svh] overflow-y-auto rounded-lg border border-line-strong bg-surface p-2 shadow-lifted" data-lenis-prevent>
                {renderToc(() => setTocOpen(false))}
              </div>
            )}
          </div>
          <div className="hidden lg:block">
            <p className="mb-3 pl-4 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">Contents</p>
            {renderToc()}
            <p className="mt-5 pl-4 text-xs text-faint">
              <span className="num text-fg">{activeIndex + 1}</span> of <span className="num">{chapters.length}</span> chapters
            </p>
          </div>
        </nav>

        <article ref={article} className="min-w-0 max-w-[68ch] space-y-24 xl:mx-auto">
          {chapters.map((c, i) => (
            <section key={c.id} id={c.id} className="gr-chapter scroll-mt-28" aria-labelledby={`${c.id}-title`}>
              <header className="gr-head">
                <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
                  <span className="num grid size-7 place-items-center rounded-full border border-accent/50 text-[10px]">{pad2(i + 1)}</span>
                  {c.kicker}
                </p>
                <h2 id={`${c.id}-title`} className="mt-4 font-display text-[clamp(2rem,3.4vw,2.9rem)] font-light leading-[1.08]">
                  {c.title}
                </h2>
              </header>
              <div className="mt-8 space-y-6">
                {c.blocks.map((b, bi) => (
                  <div key={bi} className="gr-block">
                    <GuideBlockView block={b} chapterId={c.id} index={bi} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </article>

        {/* sticky call to action */}
        <aside className="hidden xl:block">
          <div className="sticky top-[calc(var(--header-offset,5rem)+1.5rem)] rounded-xl border border-accent/40 bg-[linear-gradient(160deg,var(--c-surface-raised),var(--c-bg-deep))] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Publish with us</p>
            <p className="mt-3 font-display text-2xl leading-tight">Let us handle the hard parts.</p>
            <p className="mt-2 text-sm text-muted">Editing, design, ISBN, distribution and marketing — with you approving every step.</p>
            <ul className="mt-5 space-y-2 text-sm">
              {plans.map((p) => (
                <li key={p.id} className="flex justify-between border-b border-line pb-2">
                  <span className="text-muted">{p.name}</span>
                  <span className="num text-fg">{formatINR(p.price)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-faint">One-time, GST extra · from {formatINR(from)}</p>
            <ButtonLink href="/publish" size="sm" className="mt-5 w-full">
              Start publishing <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/support/consultation" size="sm" variant="ghost" className="mt-2 w-full">
              <CalendarDays className="size-4" /> Free consultation
            </ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
