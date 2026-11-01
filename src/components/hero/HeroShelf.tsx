"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Clock, X } from "lucide-react";
import { featuredBooks as books } from "@/data/books";
import { activeIndex, useShelf } from "@/lib/store/shelf";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { cn, pad2 } from "@/lib/utils";
import { formatReadingTime, readerHref } from "@/lib/libraryBook";
import { ButtonLink } from "@/components/ui/Button";
import { FallbackShelf } from "./FallbackShelf";
import { BookLoader } from "@/components/intro/SiteIntro";

const ShelfCanvas = dynamic(() => import("@/components/three/ShelfCanvas"), { ssr: false });

type Mode = "checking" | "webgl" | "fallback";

let webglSupport: boolean | null = null;
function supportsWebGL() {
  if (webglSupport === null) webglSupport = detectWebGL();
  return webglSupport;
}

function detectWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    const ok = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

const noopSubscribe = () => () => {};

export function HeroShelf() {
  const section = useRef<HTMLElement>(null);
  const [fatal, setFatal] = useState(false);
  const support = useSyncExternalStore<Mode>(
    noopSubscribe,
    () => (supportsWebGL() ? "webgl" : "fallback"),
    () => "checking",
  );
  const mode: Mode = fatal ? "fallback" : support;
  const [inView, setInView] = useState(true);
  const reduced = useReducedMotion();
  const s = useShelf();
  const idx = activeIndex(s);
  const book = idx !== null ? books[idx] : null;
  const isFeatured = s.featured !== null;

  // pause rendering when the hero is off-screen or the tab is hidden
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // reset shelf state when leaving the page
  useEffect(
    () => () => {
      useShelf.setState({ featured: null, hovered: null, spotlight: null, coverOpen: false, ready: false, progress: 0 });
    },
    [],
  );

  // fallback shelf is immediately interactive
  useEffect(() => {
    if (mode === "fallback") {
      useShelf.getState().setCount(books.length);
      useShelf.getState().setReady(true);
    }
  }, [mode]);

  // autoplay spotlight: gently cycles through spines while the visitor is idle
  useEffect(() => {
    if (reduced || !inView) return;
    const id = window.setInterval(() => {
      const st = useShelf.getState();
      if (!st.ready || st.featured !== null || st.hovered !== null) return;
      if (performance.now() - st.lastInteraction < 7000) return;
      st.setSpotlight(st.spotlight === null ? 0 : (st.spotlight + 1) % books.length);
    }, 3600);
    return () => window.clearInterval(id);
  }, [reduced, inView]);

  // keyboard: ← → browse, Enter take out, Esc put back, Space open cover
  useEffect(() => {
    if (!inView) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const st = useShelf.getState();
      if (!st.ready) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        st.next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        st.prev();
      } else if (e.key === "Escape" && st.featured !== null) {
        st.feature(null);
      } else if (e.key === "Enter" && st.featured === null && t?.tagName !== "BUTTON" && t?.tagName !== "A") {
        const i = st.hovered ?? st.spotlight;
        if (i !== null) st.feature(i);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inView]);

  const onFatal = useCallback(() => setFatal(true), []);

  return (
    <section
      ref={section}
      aria-label="StoryShelf — featured bookshelf"
      className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-deep"
    >
      {mode === "webgl" && <ShelfCanvas books={books} active={inView} reducedMotion={reduced} onFatal={onFatal} />}
      {mode === "fallback" && <FallbackShelf />}

      {/* loader */}
      {mode === "webgl" && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-deep transition-opacity duration-1000",
            s.progress >= 1 ? "opacity-0" : "opacity-100",
          )}
          aria-hidden={s.progress >= 1}
        >
          <BookLoader label="Arranging the shelf" />
          <div className="h-px w-40 overflow-hidden bg-line">
            <div className="h-full origin-left bg-accent transition-transform duration-300" style={{ transform: `scaleX(${s.progress})` }} />
          </div>
        </div>
      )}

      {/* edge shading for legibility */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2/5 bg-gradient-to-t from-deep via-deep/50 to-transparent" />

      {/* headline */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-20 transition-all duration-700 ease-book",
          isFeatured ? "translate-y-6 opacity-0" : "opacity-100",
        )}
      >
        <div className="container-x pb-24 md:pb-10">
          <p className="eyebrow mb-3 animate-panel-in">Free &amp; paid books · Read · Publish</p>
          <h1 className="font-display text-[clamp(2.3rem,4.2vw,4rem)] font-light leading-[1] tracking-[-0.015em] text-fg animate-panel-in [animation-delay:120ms] md:max-w-[62vw]">
            Read freely. Publish <em className="gold-text font-normal italic">proudly</em>.
          </h1>
          <div className="mt-4 flex flex-col gap-4 animate-panel-in [animation-delay:260ms] md:flex-row md:items-center md:gap-8">
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Timeless classics, free to read. New voices, worth every page. And when your own story is ready, a place on the shelf waits for it.
            </p>
            <div className="pointer-events-auto flex flex-wrap gap-3">
              <ButtonLink href="/library">
                <BookOpen className="size-4" /> Start reading
              </ButtonLink>
              <ButtonLink href="/publish" variant="ghost">
                Publish your book <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>

      {/* book info panel */}
      <div
        className={cn(
          "absolute z-20 transition-all duration-700 ease-book",
          isFeatured
            ? "inset-x-4 bottom-4 md:inset-x-auto md:bottom-auto md:right-[5vw] md:top-1/2 md:w-[min(420px,34vw)] md:-translate-y-1/2"
            : "bottom-10 right-[5vw] hidden w-[300px] md:block",
        )}
      >
        {book ? (
          <div key={`${idx}-${isFeatured}`} className={cn("animate-panel-in", isFeatured && "glass rounded-xl border border-line p-5 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none")}>
            <div className="flex items-center justify-between border-t border-line-strong pt-3 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted">
              <span>
                Nº {pad2(idx! + 1)} / {pad2(books.length)}
              </span>
              <span>{book.genre}</span>
            </div>
            <h2 className={cn("mt-2 font-display font-light leading-[1.02] text-fg", isFeatured ? "text-4xl md:text-5xl lg:text-6xl" : "text-3xl")}>{book.title}</h2>
            <p className="mt-2 text-sm text-muted">
              {book.author} · Free to read
            </p>
            {isFeatured && (
              <>
                <p className="mt-5 hidden text-sm leading-relaxed text-muted md:block">{book.synopsis}</p>
                <div className="mt-4 flex items-center gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-4 text-accent" /> <span className="num">{formatReadingTime(book.readingMinutes)}</span>
                  </span>
                  <span>
                    <span className="num">{book.chapterCount}</span> chapters
                  </span>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <ButtonLink href={readerHref(book.slug)} size="sm">
                    <BookOpen className="size-4" /> Start reading
                  </ButtonLink>
                  <ButtonLink href={`/library/${book.slug}`} size="sm" variant="ghost">
                    About this book <ArrowRight className="size-4" />
                  </ButtonLink>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <IconBtn label="Previous book" onClick={() => s.prev()}>
                    <ArrowLeft className="size-4" />
                  </IconBtn>
                  <IconBtn label="Next book" onClick={() => s.next()}>
                    <ArrowRight className="size-4" />
                  </IconBtn>
                  {mode === "webgl" && (
                    <IconBtn label={s.coverOpen ? "Close the cover" : "Open the cover"} onClick={() => s.toggleCover()} active={s.coverOpen}>
                      <BookOpen className="size-4" />
                    </IconBtn>
                  )}
                  <IconBtn label="Put the book back" onClick={() => s.feature(null)} className="ml-auto">
                    <X className="size-4" />
                  </IconBtn>
                </div>
                <p className="mt-4 hidden font-mono text-[0.65rem] uppercase tracking-[0.2em] text-faint md:block">
                  {mode === "webgl" ? "Drag to turn · click the book to open it · Esc to put back" : "← → to browse · Esc to put back"}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="animate-fade-in border-t border-line-strong pt-3 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-faint">
            Hover a spine · click to take it off the shelf
          </div>
        )}
      </div>

      {/* screen-reader & keyboard access to the shelf */}
      <nav aria-label="Books on the shelf" className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4 focus-within:top-24 focus-within:z-30 focus-within:max-w-xs focus-within:rounded-lg focus-within:bg-surface focus-within:p-3">
        <ul className="flex flex-col gap-1">
          {books.map((b, i) => (
            <li key={b.id}>
              <button
                type="button"
                className="text-left text-sm text-fg hover:text-accent"
                onFocus={() => s.ready && s.hover(i)}
                onClick={() => s.ready && s.feature(i)}
              >
                Take “{b.title}” by {b.author} off the shelf
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <p className="sr-only" aria-live="polite">
        {isFeatured && book ? `${book.title} by ${book.author} is now off the shelf.` : ""}
      </p>
    </section>
  );
}

function IconBtn({ label, onClick, children, className, active }: { label: string; onClick: () => void; children: React.ReactNode; className?: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-10 place-items-center rounded-full border border-line-strong text-fg transition-colors hover:border-accent hover:text-accent",
        active && "border-accent bg-accent-soft text-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}
