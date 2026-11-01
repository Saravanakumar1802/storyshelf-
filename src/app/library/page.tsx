import type { Metadata } from "next";
import { Suspense } from "react";
import { LibraryHero } from "@/components/library/LibraryHero";
import { LibraryClient, type LibrarySnapshot } from "@/components/library/LibraryClient";
import { BookGrid } from "@/components/library/BookCard";
import { MoodPicker } from "@/components/library/MoodPicker";
import { catalog, catalogGenres } from "@/data/catalog";
import { summaryOf } from "@/lib/libraryBook";

export const metadata: Metadata = {
  title: "Library — classic books, free to read",
  description:
    "The StoryShelf Library: real public-domain classics you can read free in the app, with an AI librarian that recommends by mood, summarises chapters and answers questions about your shelf.",
  alternates: { canonical: "/library" },
};

const snapshot: LibrarySnapshot = {
  books: catalog.slice(0, 24).map(summaryOf),
  total: catalog.length,
  genres: catalogGenres,
};

export default function LibraryPage() {
  return (
    <main>
      <LibraryHero />
      <MoodPicker />
      {/* the static grid doubles as the prerendered HTML, so crawlers and first paint see real books */}
      <Suspense
        fallback={
          <section className="container-x py-16" aria-label="All books">
            <BookGrid books={snapshot.books} />
          </section>
        }
      >
        <LibraryClient snapshot={snapshot} />
      </Suspense>
    </main>
  );
}
