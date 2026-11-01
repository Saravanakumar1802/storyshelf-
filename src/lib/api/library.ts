import type { AiMetaInfo, LibraryBook } from "@/types";
import { toLibraryBook, type BookSummaryDto } from "@/lib/libraryBook";
import { api } from "./http";

export type ShelfStatus = "want" | "reading" | "finished";

export interface ShelfItem {
  book: LibraryBook;
  status: ShelfStatus;
  chapter: number;
  progress: number;
  addedAt: string;
  updatedAt: string;
}

type ShelfItemDto = Omit<ShelfItem, "book"> & { book: BookSummaryDto };
const toItem = (d: ShelfItemDto): ShelfItem => ({ ...d, book: toLibraryBook(d.book) });

export const getShelf = async () => (await api<ShelfItemDto[]>("/library/shelf")).map(toItem);

export const setShelfStatus = async (slug: string, status: ShelfStatus) =>
  toItem(await api<ShelfItemDto>(`/library/shelf/${encodeURIComponent(slug)}`, { method: "PUT", body: { status } }));

export const removeFromShelf = (slug: string) => api<void>(`/library/shelf/${encodeURIComponent(slug)}`, { method: "DELETE" });

export const saveProgress = async (slug: string, chapter: number) =>
  toItem(await api<ShelfItemDto>(`/library/progress/${encodeURIComponent(slug)}`, { method: "PUT", body: { chapter } }));

// ── recommendations ──

/** The mood vocabulary (mirrors MOODS in backend/app/ai/prompts.py). */
export const MOODS = ["cozy", "dark", "adventurous", "hopeful", "romantic", "mind-bending", "melancholic", "funny", "suspenseful", "reflective", "whimsical", "epic"] as const;
export type Mood = (typeof MOODS)[number];

export interface Recommendation {
  book: LibraryBook;
  reason: string;
  because: string | null;
  aiWritten: boolean;
}

type RecommendationDto = Omit<Recommendation, "book"> & { book: BookSummaryDto };
const toRec = (d: RecommendationDto): Recommendation => ({ ...d, book: toLibraryBook(d.book) });

export interface ReaderRecommendations {
  items: Recommendation[];
  basis: string[];
  meta: AiMetaInfo | null;
  note: string | null;
}

export async function getRecommendationsForMe(): Promise<ReaderRecommendations> {
  const r = await api<Omit<ReaderRecommendations, "items"> & { items: RecommendationDto[] }>("/recommendations/for-me");
  return { ...r, items: r.items.map(toRec) };
}

export interface MoodRequest {
  moods: Mood[];
  text?: string;
  maxMinutes?: number | null;
}

export interface MoodRecommendations {
  items: Recommendation[];
  interpreted: { moods: string[]; themes: string[]; maxMinutes: number | null; searchText: string };
  parseMeta: AiMetaInfo | null;
  meta: AiMetaInfo | null;
}

export async function getMoodPicks(req: MoodRequest, signal?: AbortSignal): Promise<MoodRecommendations> {
  const body = { moods: req.moods, text: req.text?.trim() || null, maxMinutes: req.maxMinutes ?? null };
  const r = await api<Omit<MoodRecommendations, "items"> & { items: RecommendationDto[] }>("/recommendations/mood", { method: "POST", body, signal });
  return { ...r, items: r.items.map(toRec) };
}
