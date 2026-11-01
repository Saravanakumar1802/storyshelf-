"use client";

import Link from "@/components/ui/SiteLink";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import type { LibraryBook } from "@/types";
import { bookHref, formatReadingTime } from "@/lib/libraryBook";
import { BookCover } from "./BookCover";

/** A swipeable, snap-scrolling row of related books. */
export function AlsoLike({ books, eyebrow = "From the same shelf", title = "You may also like" }: { books: LibraryBook[]; eyebrow?: string; title?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const page = (dir: -1 | 1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (!books.length) return null;
  return (
    <section className="border-t border-line pt-20" aria-labelledby="also-like">
      <div className="container-x flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id="also-like" className="display-md mt-3">
            {title}
          </h2>
        </div>
        <div className="hidden gap-2 sm:flex">
          {([-1, 1] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              aria-label={dir < 0 ? "Previous suggestions" : "More suggestions"}
              disabled={dir < 0 ? edge.start : edge.end}
              onClick={() => page(dir)}
              className="grid size-11 place-items-center rounded-full border border-line-strong transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30"
            >
              {dir < 0 ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
            </button>
          ))}
        </div>
      </div>
      <ul
        ref={track}
        className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-px-[max(1rem,calc((100vw-1320px)/2+2.5rem))] px-[max(1rem,calc((100vw-1320px)/2+2.5rem))] pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {books.map((b) => {
          return (
            <li key={b.id} className="group w-[62vw] shrink-0 snap-start sm:w-[260px]">
              <Link href={bookHref(b.slug)} className="block rounded-lg bg-surface p-5 transition-colors duration-500 group-hover:bg-raised" aria-label={`${b.title} by ${b.author}`}>
                <div className="mx-auto w-[80%] transition-transform duration-700 ease-book [transform:perspective(900px)] group-hover:[transform:perspective(900px)_rotateY(-14deg)_translateY(-6px)]">
                  <BookCover book={b} className="w-full" height={520} />
                </div>
              </Link>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{b.genre}</p>
                  <Link href={bookHref(b.slug)} className="mt-1 block truncate font-serif text-lg leading-tight hover:text-accent">
                    {b.title}
                  </Link>
                  <p className="truncate text-sm text-muted">{b.author}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-accent" /> <span className="num">{formatReadingTime(b.readingMinutes)}</span>
                    </span>
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
