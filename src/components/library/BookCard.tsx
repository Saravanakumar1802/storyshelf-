import Link from "@/components/ui/SiteLink";
import { Clock } from "lucide-react";
import type { LibraryBook } from "@/types";
import { bookHref, formatReadingTime } from "@/lib/libraryBook";
import { BookCover } from "./BookCover";

/** One book in the library grid (renders on the server for the static first paint, and in the client grid). */
export function BookCard({ book, index = 0 }: { book: LibraryBook; index?: number }) {
  return (
    <article className="group animate-panel-in" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      <Link href={bookHref(book.slug)} className="block" aria-label={`${book.title} by ${book.author}`}>
        <div className="relative rounded-lg bg-surface p-6 transition-colors duration-500 group-hover:bg-raised">
          <div className="mx-auto w-[78%] transition-transform duration-700 ease-book [transform:perspective(1000px)_rotateY(0deg)] group-hover:[transform:perspective(1000px)_rotateY(-16deg)_rotateX(3deg)_translateY(-6px)]">
            <BookCover book={book} className="w-full" height={600} />
          </div>
        </div>
      </Link>
      <div className="mt-4 min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{book.genre}</p>
        <Link href={bookHref(book.slug)} className="mt-1 block font-serif text-lg leading-tight hover:text-accent">
          {book.title}
        </Link>
        <p className="mt-0.5 text-sm text-muted">{book.author}</p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
          <Clock className="size-3.5 text-accent" /> <span className="num">{formatReadingTime(book.readingMinutes)}</span>
        </p>
      </div>
    </article>
  );
}

export function BookGrid({ books }: { books: LibraryBook[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {books.map((b, i) => (
        <BookCard key={b.id} book={b} index={i} />
      ))}
    </div>
  );
}
