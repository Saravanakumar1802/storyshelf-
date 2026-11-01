"use client";

import Link from "@/components/ui/SiteLink";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, List, RotateCcw, Type, X } from "lucide-react";
import type { Chapter, LibraryBookDetail } from "@/types";
import { theme } from "@/theme";
import { errorMessage, getBook, getChapter } from "@/lib/api";
import { bookHref, formatReadingTime, readerHref } from "@/lib/libraryBook";
import { READER_FONT_SIZES, useReading } from "@/lib/store/reading";
import { useAuth } from "@/lib/store/auth";
import { useShelfStatus } from "@/lib/store/shelf-status";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ChapterSummary } from "./ChapterSummary";

const WPM = 238;
const SYNC_DELAY_MS = 1500;

// chapters already fetched (or in flight) this session: page turns after the first are instant
const chapterCache = new Map<string, Promise<Chapter>>();
function loadChapter(slug: string, index: number): Promise<Chapter> {
  const key = `${slug}#${index}`;
  let p = chapterCache.get(key);
  if (!p) {
    p = getChapter(slug, index);
    chapterCache.set(key, p);
    p.catch(() => chapterCache.delete(key)); // let a failed load be retried
  }
  return p;
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return progress;
}

function Contents({ book, current, onClose }: { book: LibraryBookDetail; current: number; onClose: () => void }) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  // braces matter: scroll methods return a Promise in newer browsers, and an effect must not return one
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center" });
  }, []);
  return (
    <div className="fixed inset-0 z-60 flex justify-end bg-overlay" role="dialog" aria-modal="true" aria-label="Contents" onClick={onClose}>
      <nav className="h-full w-[min(380px,90vw)] overflow-y-auto border-l border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="eyebrow">Contents</p>
          <button type="button" onClick={onClose} aria-label="Close contents" className="grid size-9 place-items-center rounded-full hover:bg-hover">
            <X className="size-4" />
          </button>
        </div>
        <ol className="mt-4 divide-y divide-line">
          {book.toc.map((e) => (
            <li key={e.index}>
              <Link
                ref={e.index === current ? activeRef : undefined}
                href={readerHref(book.slug, e.index)}
                onClick={onClose}
                aria-current={e.index === current ? "page" : undefined}
                className={cn("flex items-baseline gap-3 py-3 text-sm transition-colors hover:text-accent", e.index === current ? "text-accent" : "text-fg")}
              >
                <span className="num w-7 shrink-0 text-xs text-faint">{e.index + 1}</span>
                <span className="flex-1 font-serif">{e.title}</span>
                <span className="num shrink-0 text-xs text-faint">{formatReadingTime(Math.max(1, Math.round(e.words / WPM)))}</span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

export function Reader() {
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useHydrated();
  const slug = params.get("book") ?? "";
  const index = Math.max(0, (Number.parseInt(params.get("ch") ?? "1", 10) || 1) - 1);

  const [book, setBook] = useState<LibraryBookDetail | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const fontSize = useReading((s) => s.fontSize);
  const tone = useReading((s) => s.tone);
  const setFontSize = useReading((s) => s.setFontSize);
  const setTone = useReading((s) => s.setTone);
  const setPosition = useReading((s) => s.setPosition);
  const progress = useScrollProgress();

  // the book (for its contents) loads once per book
  useEffect(() => {
    if (!slug) return;
    const ctrl = new AbortController();
    getBook(slug, ctrl.signal)
      .then(setBook)
      .catch((e) => !ctrl.signal.aborted && setError(errorMessage(e)));
    return () => ctrl.abort();
  }, [slug, attempt]);

  // the chapter loads on every turn; the next one is fetched ahead
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    loadChapter(slug, index)
      .then((c) => {
        if (!alive) return;
        setChapter(c);
        setError(null);
        setPosition(slug, c.index);
        window.scrollTo({ top: 0 });
        if (c.next !== null) void loadChapter(slug, c.next).catch(() => undefined);
      })
      .catch((e) => alive && setError(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [slug, index, attempt, setPosition]);

  // signed-in readers: the place syncs to My Library once they settle on a chapter
  const signedIn = useAuth((s) => !!s.user);
  const settled = chapter && chapter.book.slug === slug ? chapter.index : null;
  useEffect(() => {
    if (!signedIn || settled === null) return;
    const id = window.setTimeout(() => void useShelfStatus.getState().progress(slug, settled).catch(() => undefined), SYNC_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [signedIn, slug, settled]);

  const go = (i: number | null) => {
    if (i !== null) router.push(readerHref(slug, i), { scroll: false });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" && chapter?.next != null) go(chapter.next);
      if (e.key === "ArrowLeft" && chapter?.prev != null) go(chapter.prev);
      if (e.key === "Escape") {
        setTocOpen(false);
        setPrefsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go only depends on slug/router, which chapter changes already track
  }, [chapter]);

  if (!slug) {
    return (
      <main className="container-x pb-24 pt-40 text-center">
        <p className="font-display text-4xl">Pick a book to start reading.</p>
        <ButtonLink href="/library" className="mt-8">
          Browse the library
        </ButtonLink>
      </main>
    );
  }

  const palette = theme.reader[hydrated ? tone : "night"];
  const vars = { "--rd-bg": palette.bg, "--rd-text": palette.text, "--rd-muted": palette.muted, "--rd-accent": palette.accent, "--rd-rule": palette.rule } as CSSProperties;
  const showing = chapter && chapter.book.slug === slug && chapter.index === index ? chapter : null;

  return (
    <div style={vars} className="min-h-screen bg-(--rd-bg) text-(--rd-text) transition-colors duration-500">
      {/* the site header stays on the site background; the page tone starts below it */}
      <div aria-hidden className="h-16 bg-bg md:h-20" />
      {/* reading progress through this chapter */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-55 h-0.5 origin-left bg-(--rd-accent)" style={{ transform: `scaleX(${progress})` }} />

      <div className="sticky top-(--header-offset) z-40 border-b border-(--rd-rule) bg-(--rd-bg)/90 backdrop-blur transition-[top] duration-500 ease-book">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link href={bookHref(slug)} aria-label="Back to the book" className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-(--rd-rule)">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-sm">{book?.title ?? showing?.book.title ?? "…"}</p>
            <p className="truncate text-xs text-(--rd-muted)">{showing ? `Chapter ${showing.index + 1} of ${showing.total}` : (book?.author ?? "")}</p>
          </div>
          <button type="button" onClick={() => setPrefsOpen((v) => !v)} aria-expanded={prefsOpen} aria-label="Text settings" className="grid size-9 place-items-center rounded-full hover:bg-(--rd-rule)">
            <Type className="size-4" />
          </button>
          <button type="button" onClick={() => setTocOpen(true)} disabled={!book} aria-label="Contents" className="grid size-9 place-items-center rounded-full hover:bg-(--rd-rule) disabled:opacity-40">
            <List className="size-4" />
          </button>
        </div>
        {prefsOpen && (
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-6 px-4 pb-4 text-sm">
            <div className="flex items-center gap-2" role="group" aria-label="Text size">
              {READER_FONT_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFontSize(s)}
                  aria-pressed={fontSize === s}
                  className={cn("grid size-9 place-items-center rounded-full border font-serif", fontSize === s ? "border-(--rd-accent) text-(--rd-accent)" : "border-(--rd-rule)")}
                  style={{ fontSize: 10 + (s - 16) / 2 + 4 }}
                >
                  A
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2" role="group" aria-label="Page tone">
              {(Object.keys(theme.reader) as (keyof typeof theme.reader)[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  aria-pressed={tone === t}
                  className={cn("rounded-pill border px-3 py-1.5 text-xs", tone === t ? "border-(--rd-accent)" : "border-(--rd-rule)")}
                  style={{ background: theme.reader[t].bg, color: theme.reader[t].text }}
                >
                  {theme.reader[t].label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <main className="mx-auto max-w-[68ch] px-5 pb-24 pt-10">
        {error ? (
          <div className="py-24 text-center" role="alert">
            <p className="font-display text-3xl">This page wouldn&rsquo;t turn.</p>
            <p className="mt-3 text-(--rd-muted)">{error}</p>
            <div className="mt-8 flex justify-center gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setError(null);
                  setAttempt((a) => a + 1);
                }}
              >
                <RotateCcw className="size-4" /> Try again
              </Button>
              <ButtonLink href="/library" variant="ghost">
                Back to the library
              </ButtonLink>
            </div>
          </div>
        ) : !showing ? (
          <div aria-busy="true" aria-label="Loading chapter" className="space-y-4">
            <div className="skeleton mx-auto h-8 w-1/2 rounded" />
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="skeleton h-4 rounded" style={{ width: `${88 + ((i * 7) % 12)}%` }} />
            ))}
          </div>
        ) : (
          <article lang="en">
            <header className="mb-10 text-center">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-(--rd-muted)">
                Chapter <span className="num">{showing.index + 1}</span> · <span className="num">{formatReadingTime(Math.max(1, Math.round(showing.words / WPM)))}</span>
              </p>
              <h1 className="mt-3 font-display text-3xl leading-tight md:text-4xl">{showing.title}</h1>
            </header>
            <ChapterSummary key={`${slug}#${showing.index}`} slug={slug} index={showing.index} initial={showing.ai} />
            <div className="font-serif leading-[1.75] [&>p+p]:mt-[0.9em] [&>p:first-child]:first-letter:float-left [&>p:first-child]:first-letter:mr-2 [&>p:first-child]:first-letter:font-display [&>p:first-child]:first-letter:text-[3.4em] [&>p:first-child]:first-letter:leading-[0.8] [&>p:first-child]:first-letter:text-(--rd-accent)" style={{ fontSize: hydrated ? fontSize : 20 }}>
              {showing.paragraphs.map((p, i) => (
                <p key={i} className={cn(p.includes("\n") && "whitespace-pre-line pl-[2ch] italic")}>
                  {p}
                </p>
              ))}
            </div>
            <nav aria-label="Chapters" className="mt-16 flex items-center justify-between gap-4 border-t border-(--rd-rule) pt-8">
              <Button variant="ghost" disabled={showing.prev === null} onClick={() => go(showing.prev)}>
                <ArrowLeft className="size-4" /> Previous
              </Button>
              <span className="num text-xs text-(--rd-muted)">
                {showing.index + 1} / {showing.total}
              </span>
              {showing.next !== null ? (
                <Button onClick={() => go(showing.next)}>
                  Next chapter <ArrowRight className="size-4" />
                </Button>
              ) : (
                <ButtonLink href={bookHref(slug)}>The end · back to the book</ButtonLink>
              )}
            </nav>
          </article>
        )}
      </main>

      {tocOpen && book && <Contents book={book} current={index} onClose={() => setTocOpen(false)} />}
    </div>
  );
}
