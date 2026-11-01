"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { LibraryBook, LibraryBookDetail } from "@/types";
import { errorMessage, getBook } from "@/lib/api";
import { getSimilar } from "@/lib/api/books";
import { summaryOf } from "@/lib/libraryBook";
import { ButtonLink } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Form";
import { BookDetail } from "./BookDetail";
import { BookTabs } from "./BookTabs";
import { AlsoLike } from "./AlsoLike";

/**
 * /library/view?book=slug: the book page for a title added after the last
 * build (static pages exist for everything in the build snapshot). Same
 * layout, loaded from the API.
 */
export function LiveBook() {
  const slug = (useSearchParams().get("book") ?? "").slice(0, 120);
  const [book, setBook] = useState<LibraryBookDetail | null>(null);
  const [similar, setSimilar] = useState<LibraryBook[]>([]);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const ctrl = new AbortController();
    getBook(slug, ctrl.signal)
      .then((b) => {
        setBook(b);
        setError(null);
        document.title = `${b.title} by ${b.author} · StoryShelf`;
      })
      .catch((e) => !ctrl.signal.aborted && setError({ notFound: e?.code === "NOT_FOUND", message: errorMessage(e) }));
    getSimilar(slug, ctrl.signal)
      .then(setSimilar)
      .catch(() => {}); // a bonus row: the page is complete without it
    return () => ctrl.abort();
  }, [slug, attempt]);

  if (!slug || error?.notFound)
    return (
      <main className="container-x py-40 text-center">
        <h1 className="display-md">We couldn&rsquo;t find that book</h1>
        <p className="mt-3 text-muted">It may have been taken out of the library, or the link is incomplete.</p>
        <ButtonLink href="/library" className="mt-8">
          Browse the library
        </ButtonLink>
      </main>
    );
  if (error)
    return (
      <main className="container-x py-40">
        <FormError message={error.message} onRetry={() => setAttempt((a) => a + 1)} />
      </main>
    );
  if (!book)
    return (
      <main className="container-x grid gap-12 pb-24 pt-36 md:grid-cols-2" aria-busy="true">
        <div className="skeleton mx-auto aspect-[3/4] w-[min(320px,70%)] rounded-lg" />
        <div className="space-y-4">
          <div className="skeleton h-12 w-3/4 rounded-md" />
          <div className="skeleton h-6 w-1/2 rounded-md" />
          <div className="skeleton h-32 rounded-md" />
        </div>
      </main>
    );
  return (
    <main>
      <BookDetail key={book.id} book={summaryOf(book)} />
      <BookTabs key={`tabs-${book.id}`} book={book} />
      {similar.length > 0 && <AlsoLike key={`also-${book.id}`} books={similar} eyebrow="✨ Similar in spirit" title="Matched by meaning, not keywords" />}
    </main>
  );
}
