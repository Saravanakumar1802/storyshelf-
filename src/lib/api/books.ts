import type { Chapter, ChapterAi, LibraryBook, LibraryBookDetail } from "@/types";
import { toLibraryBook, toLibraryBookDetail, type BookDetailDto, type BookSummaryDto } from "@/lib/libraryBook";
import { api } from "./http";

export type SortKey = "featured" | "title" | "author" | "shortest" | "longest";

export interface BookQuery {
  q?: string;
  genre?: string;
  sort?: SortKey;
  page?: number;
  limit?: number;
}

export interface BookPage {
  items: LibraryBook[];
  total: number;
  page: number;
  pages: number;
}

export async function searchBooks({ q = "", genre = "", sort = "featured", page = 1, limit = 24 }: BookQuery, signal?: AbortSignal): Promise<BookPage> {
  const params = new URLSearchParams({ sort, page: String(page), limit: String(limit) });
  if (q) params.set("q", q);
  if (genre) params.set("genre", genre);
  const res = await api<Omit<BookPage, "items"> & { items: BookSummaryDto[] }>(`/books?${params}`, { signal });
  return { ...res, items: res.items.map(toLibraryBook) };
}

export async function getBook(slug: string, signal?: AbortSignal): Promise<LibraryBookDetail> {
  return toLibraryBookDetail(await api<BookDetailDto>(`/books/${encodeURIComponent(slug)}`, { signal }));
}

export function getChapter(slug: string, index: number, signal?: AbortSignal): Promise<Chapter> {
  return api<Chapter>(`/books/${encodeURIComponent(slug)}/chapters/${index}`, { signal });
}

// ── AI search & insights ──

export type MatchKind = "passage" | "meaning" | "keyword";

export interface SearchHit {
  book: LibraryBook;
  score: number;
  matchedBy: MatchKind[];
  passage: { chapter: number; chapterTitle: string; excerpt: string } | null;
}

export interface SearchResult {
  query: string;
  /** "keyword" when the meaning-based search was unavailable */
  mode: "semantic" | "keyword";
  items: SearchHit[];
}

/** Search by meaning: books whose passages or spirit match the description, plus keyword hits. */
export async function semanticSearch(q: string, genre?: string, signal?: AbortSignal): Promise<SearchResult> {
  const params = new URLSearchParams({ q });
  if (genre) params.set("genre", genre);
  const res = await api<Omit<SearchResult, "items"> & { items: (Omit<SearchHit, "book"> & { book: BookSummaryDto })[] }>(`/search?${params}`, { signal });
  return { ...res, items: res.items.map((h) => ({ ...h, book: toLibraryBook(h.book) })) };
}

/** AI summary of a chapter: generated on first request (signed-in readers), shared after that. */
export const summarizeChapter = (slug: string, index: number) => api<ChapterAi>(`/books/${encodeURIComponent(slug)}/chapters/${index}/summary`, { method: "POST" });

/** Books closest in meaning to this one (vector search; no AI quota). */
export async function getSimilar(slug: string, signal?: AbortSignal): Promise<LibraryBook[]> {
  return (await api<BookSummaryDto[]>(`/books/${encodeURIComponent(slug)}/similar`, { signal })).map(toLibraryBook);
}
