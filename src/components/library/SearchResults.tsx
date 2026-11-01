import Link from "@/components/ui/SiteLink";
import { ArrowRight, Clock, Quote, Sparkles } from "lucide-react";
import type { SearchHit, SearchResult } from "@/lib/api/books";
import { bookHref, formatReadingTime, readerHref } from "@/lib/libraryBook";
import { cn } from "@/lib/utils";
import { BookCover } from "./BookCover";

const MATCH_LABEL: Record<SearchHit["matchedBy"][number], string> = {
  passage: "a passage",
  meaning: "its themes",
  keyword: "the words",
};

function Hit({ hit, index }: { hit: SearchHit; index: number }) {
  const { book, passage } = hit;
  return (
    <li className="animate-panel-in" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      <article className="grid gap-5 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong sm:grid-cols-[96px_1fr] sm:gap-7 sm:p-6">
        <Link href={bookHref(book.slug)} className="w-24 shrink-0" aria-label={`${book.title} by ${book.author}`}>
          <BookCover book={book} className="w-full" height={300} />
        </Link>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{book.genre}</p>
          <h3 className="mt-1 font-serif text-xl leading-tight">
            <Link href={bookHref(book.slug)} className="hover:text-accent">
              {book.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
            {book.author}
            <span className="flex items-center gap-1 text-xs">
              <Clock className="size-3 text-accent" /> <span className="num">{formatReadingTime(book.readingMinutes)}</span>
            </span>
          </p>
          {passage ? (
            <figure className="mt-4 border-l-2 border-accent/60 pl-4">
              <figcaption className="flex items-center gap-1.5 text-xs text-accent">
                <Quote className="size-3" /> Found in {passage.chapterTitle}
              </figcaption>
              <blockquote className="mt-1.5 font-serif text-[0.95rem] italic leading-relaxed text-fg/85">{passage.excerpt}</blockquote>
              <Link href={readerHref(book.slug, passage.chapter)} className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                Read from here <ArrowRight className="size-3" />
              </Link>
            </figure>
          ) : (
            <p className="mt-3 line-clamp-2 text-sm text-muted">{book.ai?.hook ?? book.synopsis}</p>
          )}
          <p className="mt-3 text-[11px] text-faint">Matched by {hit.matchedBy.map((m) => MATCH_LABEL[m]).join(" · ")}</p>
        </div>
      </article>
    </li>
  );
}

/** Results of a meaning-based search: each book with the passage that matched. */
export function SearchResults({ result }: { result: SearchResult }) {
  return (
    <div>
      <p className={cn("mb-6 flex flex-wrap items-center gap-2 text-sm", result.mode === "semantic" ? "text-accent" : "text-muted")}>
        <Sparkles className="size-4" />
        {result.mode === "semantic" ? (
          <>Searched by meaning: passages, themes and words, ranked together.</>
        ) : (
          <>Smart search is warming up, so these are keyword matches.</>
        )}
      </p>
      <ol className="grid gap-4 lg:grid-cols-2">
        {result.items.map((hit, i) => (
          <Hit key={hit.book.id} hit={hit} index={i} />
        ))}
      </ol>
    </div>
  );
}
