import type { BookFinish } from "@/theme";
import type { BookAi, Emblem, Genre, LibraryBook, LibraryBookDetail, TocEntry } from "@/types";
import staticSlugs from "@/data/library.slugs.generated.json";

/**
 * Library books as the API sends them (GET /books, /books/{slug}) and as the
 * build snapshots store them (src/data/library.*.generated.json). The cover
 * arrives as one nested object; the site's cover painter wants it flat.
 */
export interface BookSummaryDto {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string;
  authorYears: string | null;
  genre: string;
  language: string;
  cover: { emblem: string; finish: BookFinish; swatch: number; trim: { width: number; height: number }; pages: number };
  words: number;
  readingMinutes: number;
  chapterCount: number;
  opening: string;
  featured: boolean;
  ai?: BookAi | null;
}

export interface BookDetailDto extends BookSummaryDto {
  contributors: { name: string; role: string; years: string | null }[];
  subjects: string[];
  source: { name: string; url: string };
  toc: TocEntry[];
  similar?: string[];
}

export function toLibraryBook(d: BookSummaryDto): LibraryBook {
  const { cover, ...rest } = d;
  return {
    ...rest,
    genre: d.genre as Genre,
    emblem: cover.emblem as Emblem,
    finish: cover.finish,
    swatch: cover.swatch,
    trim: cover.trim,
    pages: cover.pages,
    ai: d.ai ?? null,
    // the AI summary, once the book has been enriched; until then its real first lines
    synopsis: d.ai?.summary ?? d.opening,
  };
}

export function toLibraryBookDetail(d: BookDetailDto): LibraryBookDetail {
  return { ...toLibraryBook(d), contributors: d.contributors, subjects: d.subjects, source: d.source, toc: d.toc, similar: d.similar ?? [] };
}

/** Drops the detail-only fields, e.g. before handing a book to a client component. */
export function summaryOf(d: LibraryBookDetail): LibraryBook {
  const { toc, subjects, contributors, source, similar, ...book } = d;
  void [toc, subjects, contributors, source, similar];
  return book;
}

/** "9 h 40 min" / "45 min" */
export function formatReadingTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  // round the total first, so 12 h 58 min reads "13 h", never "12 h 60 min"
  const total = Math.round(minutes / 5) * 5;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** The reader's address for a book (and optionally a chapter, 0-based). */
const STATIC = new Set<string>(staticSlugs);

/** A book's page: the static, indexable one when it was in the build; otherwise the live view. */
export const bookHref = (slug: string) => (STATIC.has(slug) ? `/library/${slug}` : `/library/view?book=${encodeURIComponent(slug)}`);

export const readerHref = (slug: string, chapter?: number) => `/library/read?book=${encodeURIComponent(slug)}${chapter ? `&ch=${chapter + 1}` : ""}`;
