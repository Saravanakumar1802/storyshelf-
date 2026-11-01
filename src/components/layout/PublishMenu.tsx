"use client";

import Link from "@/components/ui/SiteLink";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { publishGuides, publishPlanLinks, publishServiceLinks } from "@/data/site";
import { showcaseBooks as books } from "@/data/showcaseBooks";
import { plans } from "@/data/plans";
import { cn, formatINR } from "@/lib/utils";
import { isRouteEnabled } from "@/config/features";

const wizardOn = isRouteEnabled("/publish");
import { CssBook } from "@/components/library/CssBook";

const OPEN_DELAY = 80;
const CLOSE_DELAY = 180;
/** A different catalogue book stands in for each guide. */
const GUIDE_BOOKS = [books[1], books[3], books[8]];

/**
 * "Publish" mega-menu. Opens on hover (with intent delays), click or
 * keyboard; Esc closes and returns focus; it closes on navigation.
 * The CSS-3D books are only rendered after the first open (their covers are
 * painted on demand), so the menu costs nothing on pages where it's unused.
 */
export function PublishMenu({ active }: { active: boolean }) {
  const pathname = usePathname();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const timer = useRef<number | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const from = Math.min(...plans.map((p) => p.price));

  const schedule = (next: boolean, delay: number) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setOpen(next);
      if (next) setEverOpened(true);
    }, delay);
  };

  // close on navigation
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), []);

  const hoverProps = {
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && schedule(true, OPEN_DELAY),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && schedule(false, CLOSE_DELAY),
  };

  return (
    <div {...hoverProps}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => {
          if (timer.current) window.clearTimeout(timer.current);
          setOpen((v) => !v);
          setEverOpened(true);
        }}
        className={cn(
          "relative flex items-center gap-1 rounded-pill px-4 py-2 text-sm text-muted transition-colors hover:text-fg",
          (active || open) && "text-fg",
          active && "after:absolute after:inset-x-4 after:-bottom-0.5 after:h-px after:bg-accent",
        )}
      >
        Publish
        <ChevronDown className={cn("size-3.5 transition-transform duration-300", open && "rotate-180")} />
      </button>

      {/* the panel hangs from the header (its positioned ancestor) */}
      <div
        ref={panel}
        id={`${id}-panel`}
        role="region"
        aria-label="Publish"
        inert={!open}
        {...hoverProps}
        className={cn(
          "absolute inset-x-0 top-full border-b border-line bg-surface/95 shadow-lifted backdrop-blur-xl transition-[opacity,transform,visibility] duration-500 ease-book",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
        )}
      >
        <div className="container-x grid gap-8 py-8 lg:grid-cols-[1.25fr_0.9fr_0.9fr_300px] xl:gap-10">
          {/* learn the process: the three guides */}
          <div>
            <p className="eyebrow">Learn the process</p>
            <ul className="mt-4 space-y-2">
              {publishGuides.map((g, i) => (
                <li
                  key={g.href}
                  className={cn("transition-[opacity,transform] duration-700 ease-book", open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")}
                  style={{ transitionDelay: open ? `${60 + i * 60}ms` : "0ms" }}
                >
                  <Link href={g.href} className="group flex items-center gap-4 rounded-lg p-2.5 transition-colors duration-300 hover:bg-hover">
                    <span className="grid h-[72px] w-[60px] shrink-0 place-items-center rounded-md bg-[radial-gradient(80%_80%_at_50%_60%,var(--c-accent-soft),transparent_70%),var(--c-bg)] [perspective:700px]">
                      {everOpened && (
                        <CssBook
                          book={GUIDE_BOOKS[i]}
                          width={34}
                          className="transition-transform duration-700 ease-book [transform:rotateY(-22deg)_rotateX(6deg)] group-hover:[transform:rotateY(-62deg)_rotateX(10deg)_translateY(-3px)]"
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-serif text-[1.05rem] text-fg">
                        {g.label}
                        <ArrowUpRight className="size-3.5 shrink-0 text-faint transition-[color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-muted">{g.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {[
            { title: "Plan your book", links: publishPlanLinks, delay: 140 },
            { title: "Services", links: publishServiceLinks, delay: 200 },
          ].map((col) => (
            <div
              key={col.title}
              className={cn("transition-[opacity,transform] duration-700 ease-book", open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")}
              style={{ transitionDelay: open ? `${col.delay}ms` : "0ms" }}
            >
              <p className="eyebrow">{col.title}</p>
              <ul className="mt-4 space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="group block rounded-lg px-3 py-2.5 transition-colors duration-300 hover:bg-hover">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
                        {l.label}
                        <ArrowRight className="size-3.5 -translate-x-1 text-accent opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-muted">{l.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <FeaturedCard open={open} everOpened={everOpened} from={from} />
        </div>
      </div>
    </div>
  );
}

/** Featured "start publishing" card; shown as "coming soon" while the wizard is switched off. */
function FeaturedCard({ open, everOpened, from }: Readonly<{ open: boolean; everOpened: boolean; from: number }>) {
  const card = cn(
    "group relative flex flex-col justify-between overflow-hidden rounded-xl border border-accent/40 bg-[linear-gradient(160deg,var(--c-surface-raised),var(--c-bg-deep))] p-6 transition-[opacity,transform,border-color] duration-700 ease-book",
    wizardOn && "hover:border-accent",
    open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
  );
  const style = { transitionDelay: open ? "260ms" : "0ms" };
  const body = (
    <>
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(circle,var(--c-accent-soft),transparent_70%)]" />
      <div className="relative">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Ready when you are</span>
        <p className="mt-2 font-display text-3xl leading-tight text-fg">Start publishing your book</p>
        <p className="mt-2 text-sm text-muted">
          Plans from <span className="num text-fg">{formatINR(from)}</span> · free consultation
        </p>
      </div>
      <div className="relative mt-6 flex items-end justify-between [perspective:1000px]">
        {wizardOn ? (
          <span className="inline-flex items-center gap-2 rounded-pill bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors group-hover:bg-accent-bright">
            Get started <ArrowRight className="size-4" />
          </span>
        ) : (
          <span className="inline-flex items-center rounded-pill border border-line-strong px-4 py-2 text-sm font-medium text-muted">Coming soon</span>
        )}
        {everOpened && (
          <CssBook
            book={books[0]}
            width={74}
            className="transition-transform duration-1000 ease-book [transform:rotateY(-30deg)_rotateZ(4deg)] group-hover:[transform:rotateY(-160deg)_rotateZ(0deg)]"
          />
        )}
      </div>
    </>
  );
  return wizardOn ? (
    <Link href="/publish" className={card} style={style}>
      {body}
    </Link>
  ) : (
    <div className={card} style={style}>
      {body}
    </div>
  );
}
