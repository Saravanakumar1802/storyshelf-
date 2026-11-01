import Link from "@/components/ui/SiteLink";
import { Clock, Sparkles } from "lucide-react";
import type { Recommendation } from "@/lib/api/library";
import { bookHref, formatReadingTime } from "@/lib/libraryBook";
import { BookCover } from "./BookCover";

function Card({ rec, index }: { rec: Recommendation; index: number }) {
  const { book } = rec;
  return (
    <li className="group w-[78vw] shrink-0 snap-start animate-panel-in sm:w-[300px]" style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}>
      <article className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-colors group-hover:border-line-strong">
        <div className="flex gap-4">
          <Link href={bookHref(book.slug)} className="w-20 shrink-0" aria-label={`${book.title} by ${book.author}`}>
            <BookCover book={book} className="w-full" height={260} />
          </Link>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{book.genre}</p>
            <h3 className="mt-1 font-serif text-lg leading-tight">
              <Link href={bookHref(book.slug)} className="hover:text-accent">
                {book.title}
              </Link>
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted">{book.author}</p>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
              <Clock className="size-3 text-accent" /> <span className="num">{formatReadingTime(book.readingMinutes)}</span>
            </p>
          </div>
        </div>
        <p className="mt-4 flex gap-2 text-sm leading-relaxed text-fg/90">
          {rec.aiWritten && <Sparkles aria-label="Written by AI" className="mt-1 size-3.5 shrink-0 text-accent" />}
          <span>{rec.reason}</span>
        </p>
      </article>
    </li>
  );
}

/** A horizontally scrolling row of recommended books, each with its reason. */
export function RecommendationRail({ items, label }: { items: Recommendation[]; label: string }) {
  return (
    <ul aria-label={label} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]">
      {items.map((rec, i) => (
        <Card key={rec.book.id} rec={rec} index={i} />
      ))}
    </ul>
  );
}
