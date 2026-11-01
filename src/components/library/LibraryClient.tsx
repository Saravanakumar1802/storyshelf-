"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import type { LibraryBook } from "@/types";
import { errorMessage, searchBooks, semanticSearch, type SearchResult, type SortKey } from "@/lib/api";
import { Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { BookGrid } from "./BookCard";
import { SearchResults } from "./SearchResults";

const SORTS: { v: SortKey; l: string }[] = [
  { v: "featured", l: "Featured" },
  { v: "title", l: "Title A–Z" },
  { v: "author", l: "Author A–Z" },
  { v: "shortest", l: "Shortest read" },
  { v: "longest", l: "Longest read" },
];
const PAGE_SIZE = 24;
const MAX_QUERY = 160;

export interface LibrarySnapshot {
  /** First page in featured order, from the build snapshot */
  books: LibraryBook[];
  total: number;
  genres: { genre: string; count: number }[];
}

interface Results {
  key: string;
  books: LibraryBook[];
  total: number;
  pages: number;
  page: number;
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading books">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <div className="skeleton aspect-[3/4] rounded-lg" />
          <div className="skeleton mt-4 h-4 w-2/3 rounded" />
          <div className="skeleton mt-2 h-3 w-1/3 rounded" />
        </div>
      ))}
    </div>
  );
}

export function LibraryClient({ snapshot }: { snapshot: LibrarySnapshot }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  // read & sanitise URL state (unknown values are ignored)
  const genreParam = params.get("genre") ?? "";
  const genre = snapshot.genres.some((g) => g.genre === genreParam) ? genreParam : "";
  const sortParam = params.get("sort") as SortKey | null;
  const sort = SORTS.some((s) => s.v === sortParam) ? (sortParam as SortKey) : "featured";
  const qParam = (params.get("q") ?? "").slice(0, MAX_QUERY);
  const key = `${qParam}|${genre}|${sort}`;
  const pristine = key === "||featured";

  const [q, setQ] = useState(qParam);
  const [syncedQ, setSyncedQ] = useState(qParam);
  if (qParam !== syncedQ) {
    setSyncedQ(qParam);
    setQ(qParam);
  }

  const initial: Results = { key: "||featured", books: snapshot.books, total: snapshot.total, pages: Math.ceil(snapshot.total / PAGE_SIZE), page: 1 };
  const [results, setResults] = useState<Results>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // debounce search → URL
  useEffect(() => {
    if (q === qParam) return;
    const id = window.setTimeout(() => update({ q: q.trim() }), 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- update is recreated per render; q drives this effect
  }, [q]);

  // a typed query searches by meaning (one ranked page with matched passages);
  // browsing by genre and sort pages through the catalogue
  const [found, setFound] = useState<{ key: string; result: SearchResult } | null>(null);
  const searching = qParam.length >= 2;

  // fetch whenever the query changes (the untouched view is already in the snapshot)
  useEffect(() => {
    if (pristine) return;
    const ctrl = new AbortController();
    const request = searching
      ? semanticSearch(qParam, genre || undefined, ctrl.signal).then((result) => setFound({ key, result }))
      : searchBooks({ genre, sort, limit: PAGE_SIZE }, ctrl.signal).then((r) => setResults({ key, books: r.items, total: r.total, pages: r.pages, page: 1 }));
    request
      .then(() => setError(null))
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(errorMessage(e));
      });
    return () => ctrl.abort();
  }, [key, pristine, searching, qParam, genre, sort, attempt]);

  const shown: Results = pristine && results.key !== key ? initial : results;
  const result = searching && found?.key === key ? found.result : null;
  const loading = !pristine && !error && (searching ? !result : shown.key !== key);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const r = await searchBooks({ genre, sort, page: shown.page + 1, limit: PAGE_SIZE });
      setResults({ key, books: [...shown.books, ...r.items], total: r.total, pages: r.pages, page: r.page });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  };

  const clear = () => {
    setQ("");
    router.replace(pathname, { scroll: false });
  };

  return (
    <section id="catalogue" className="container-x scroll-mt-16 py-16" aria-label="All books">
      <div className="sticky top-16 z-20 -mx-4 mb-10 border-b border-line bg-bg/90 px-4 py-4 backdrop-blur md:top-20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search books by title, author, or by describing what you want to read</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={q}
              maxLength={MAX_QUERY}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try “a lonely voyage that ends in madness” — or a title or author"
              className="w-full rounded-pill border border-line-strong bg-raised py-3 pl-11 pr-4 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <Select aria-label="Genre" value={genre} onChange={(e) => update({ genre: e.target.value })} className="rounded-pill py-2.5">
              <option value="">All genres</option>
              {snapshot.genres.map((g) => (
                <option key={g.genre} value={g.genre}>
                  {g.genre} ({g.count})
                </option>
              ))}
            </Select>
            <Select aria-label="Sort by" value={sort} disabled={searching} title={searching ? "Search results are ranked by relevance" : undefined} onChange={(e) => update({ sort: e.target.value === "featured" ? "" : e.target.value })} className="rounded-pill py-2.5">
              {SORTS.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.l}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted" aria-live="polite">
          <span>
            {loading
              ? searching
                ? "Reading the shelves for meaning…"
                : "Searching the shelves…"
              : result
                ? `${result.items.length} best ${result.items.length === 1 ? "match" : "matches"}`
                : `${shown.total} ${shown.total === 1 ? "book" : "books"}`}
          </span>
          {!pristine && (
            <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-pill border border-line-strong px-3 py-1 text-xs hover:border-accent hover:text-accent">
              <X className="size-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="py-24 text-center" role="alert">
          <p className="font-display text-3xl">The shelves didn&rsquo;t load.</p>
          <p className="mt-3 text-muted">{error}</p>
          <Button
            variant="ghost"
            className="mt-8"
            onClick={() => {
              setError(null);
              setAttempt((a) => a + 1);
            }}
          >
            <RotateCcw className="size-4" /> Try again
          </Button>
        </div>
      ) : loading ? (
        <GridSkeleton />
      ) : result ? (
        result.items.length ? (
          <SearchResults result={result} />
        ) : (
          <div className="py-24 text-center">
            <p className="font-display text-4xl">Nothing on the shelves matches that yet.</p>
            <p className="mt-3 text-muted">Try describing it differently: a feeling, a setting, a kind of story.</p>
            <Button variant="ghost" className="mt-8" onClick={clear}>
              Clear search
            </Button>
          </div>
        )
      ) : shown.books.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-display text-4xl">No books match that search.</p>
          <p className="mt-3 text-muted">Try a different title, author or subject — or clear the filters.</p>
          <Button variant="ghost" className="mt-8" onClick={clear}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <BookGrid books={shown.books} />
          {shown.page < shown.pages && (
            <div className="mt-16 text-center">
              <Button variant="ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : `Show more (${shown.total - shown.books.length} left)`}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
