"use client";

import { create } from "zustand";
import { getShelf, removeFromShelf, saveProgress, setShelfStatus, type ShelfStatus } from "@/lib/api/library";

/**
 * Which books are on the signed-in reader's shelves, loaded once per session
 * and kept in step as they change. Book pages and the reader read it, so they
 * don't each ask the API.
 */
interface ShelfState {
  loaded: boolean;
  status: Record<string, ShelfStatus>;
  load: () => Promise<void>;
  set: (slug: string, status: ShelfStatus) => Promise<void>;
  remove: (slug: string) => Promise<void>;
  progress: (slug: string, chapter: number) => Promise<void>;
  reset: () => void;
}

let loading: Promise<void> | null = null;

export const useShelfStatus = create<ShelfState>()((set, get) => ({
  loaded: false,
  status: {},
  load: () => {
    if (get().loaded) return Promise.resolve();
    loading ??= getShelf()
      .then((items) => set({ loaded: true, status: Object.fromEntries(items.map((i) => [i.book.slug, i.status])) }))
      .finally(() => {
        loading = null;
      });
    return loading;
  },
  set: async (slug, status) => {
    const item = await setShelfStatus(slug, status);
    set((s) => ({ status: { ...s.status, [slug]: item.status } }));
  },
  remove: async (slug) => {
    await removeFromShelf(slug);
    set((s) => {
      const next = { ...s.status };
      delete next[slug];
      return { status: next };
    });
  },
  progress: async (slug, chapter) => {
    const item = await saveProgress(slug, chapter);
    set((s) => ({ status: { ...s.status, [slug]: item.status } }));
  },
  reset: () => set({ loaded: false, status: {} }),
}));
