"use client";

import dynamic from "next/dynamic";
import Link from "@/components/ui/SiteLink";
import { useState, useSyncExternalStore } from "react";
import { BookOpen, Clock, MessageCircleQuestion, Rotate3d, Sparkles } from "lucide-react";
import type { LibraryBook } from "@/types";
import { cn } from "@/lib/utils";
import { formatReadingTime, readerHref } from "@/lib/libraryBook";
import { useReading } from "@/lib/store/reading";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { ButtonLink } from "@/components/ui/Button";
import { BookCover } from "./BookCover";
import { BookInsights } from "./BookInsights";
import { ShelfButton } from "./ShelfButton";
import { supportsWebGL } from "@/lib/webgl";

const BookViewer = dynamic(() => import("@/components/three/BookViewer"), { ssr: false });

const noop = () => () => {};

export function BookDetail({ book }: { book: LibraryBook }) {
  const [open, setOpen] = useState(false);
  const webgl = useSyncExternalStore(noop, supportsWebGL, () => false);
  const hydrated = useHydrated();
  const position = useReading((s) => s.positions[book.slug]);
  const resume = hydrated && position && position.chapter > 0 ? position.chapter : null;

  const fallback = <BookCover book={book} className="w-[min(320px,70%)]" priority />;

  return (
    <>
      <section className="container-x grid gap-12 pb-24 pt-28 md:pt-32 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div className="relative">
          <div className="sticky top-24 aspect-square overflow-hidden rounded-xl border border-line bg-[radial-gradient(70%_60%_at_50%_45%,var(--c-accent-soft),transparent_70%),var(--c-bg-deep)]">
            {webgl ? <BookViewer book={book} open={open} fallback={fallback} /> : <div className="grid size-full place-items-center">{fallback}</div>}
            {webgl && (
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
                <span className="hidden items-center gap-2 rounded-pill bg-bg/70 px-3 py-2 text-xs text-muted backdrop-blur sm:flex">
                  <Rotate3d className="size-4" /> Drag to turn
                </span>
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  aria-pressed={open}
                  className={cn("flex items-center gap-2 rounded-pill border px-4 py-2 text-xs backdrop-blur transition-colors", open ? "border-accent bg-accent-soft text-accent" : "border-line-strong bg-bg/70 text-fg hover:border-accent")}
                >
                  <BookOpen className="size-4" /> {open ? "Close the cover" : "Look inside"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <nav aria-label="Breadcrumb" className="text-xs text-faint">
            <Link href="/library" className="hover:text-accent">
              Library
            </Link>{" "}
            /{" "}
            <Link href={`/library?genre=${encodeURIComponent(book.genre)}`} className="hover:text-accent">
              {book.genre}
            </Link>
          </nav>
          <h1 className="display-lg mt-4">{book.title}</h1>
          {book.subtitle && <p className="mt-2 font-serif text-xl italic text-muted">{book.subtitle}</p>}
          <p className="mt-3 text-lg text-muted">
            by {book.author}
            {book.authorYears && <span className="num text-faint"> · {book.authorYears}</span>}
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-accent" /> <span className="num">{formatReadingTime(book.readingMinutes)}</span> read
            </span>
            <span>
              <span className="num">{book.chapterCount}</span> chapters
            </span>
            <span>
              <span className="num">{book.words.toLocaleString("en-IN")}</span> words
            </span>
          </p>
          {book.ai ? (
            <BookInsights ai={book.ai} />
          ) : (
            <blockquote className="mt-8 border-l-2 border-accent pl-4 font-display text-xl italic leading-relaxed text-fg">{book.opening}</blockquote>
          )}

          <div className="mt-10 flex flex-wrap gap-3">
            {resume !== null ? (
              <ButtonLink href={readerHref(book.slug, resume)} size="lg">
                <BookOpen className="size-4" /> Continue · Chapter {resume + 1}
              </ButtonLink>
            ) : (
              <ButtonLink href={readerHref(book.slug)} size="lg">
                <BookOpen className="size-4" /> Start reading
              </ButtonLink>
            )}
            <ShelfButton slug={book.slug} title={book.title} />
            <ButtonLink href={`/library/ask?book=${encodeURIComponent(book.slug)}`} size="lg" variant="ghost">
              <MessageCircleQuestion className="size-4" /> Ask about this book
            </ButtonLink>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <Sparkles className="size-4 text-accent" /> Free to read · public-domain edition
          </p>

          <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-xs text-muted">
            <span>
              <span className="num text-fg">{book.pages}</span> pages in print
            </span>
            <span>{book.language}</span>
            <span>Public domain</span>
          </p>
        </div>
      </section>
    </>
  );
}
