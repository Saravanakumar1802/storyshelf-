"use client";

import { create } from "zustand";

/**
 * Single source of truth for the 3D shelf. Only one book can be featured at a
 * time; every interaction goes through these actions, so rapid clicks/hover
 * can never leave two books "out" at once.
 */
interface ShelfState {
  count: number;
  hovered: number | null;
  featured: number | null;
  spotlight: number | null;
  /** timestamp (ms) of the last user interaction; pauses the autoplay */
  lastInteraction: number;
  ready: boolean;
  progress: number;
  coverOpen: boolean;
  setCount: (n: number) => void;
  hover: (i: number | null) => void;
  feature: (i: number | null) => void;
  toggleCover: () => void;
  next: () => void;
  prev: () => void;
  setSpotlight: (i: number | null) => void;
  setReady: (v: boolean) => void;
  setProgress: (v: number) => void;
  touch: () => void;
}

const wrap = (i: number, n: number) => ((i % n) + n) % n;

export const useShelf = create<ShelfState>((set, get) => ({
  count: 0,
  hovered: null,
  featured: null,
  spotlight: null,
  lastInteraction: 0,
  ready: false,
  progress: 0,
  coverOpen: false,
  setCount: (count) => set({ count }),
  hover: (i) => {
    if (get().hovered === i) return;
    set({ hovered: i, lastInteraction: performance.now(), spotlight: null });
  },
  feature: (i) => {
    const s = get();
    if (i !== null && (i < 0 || i >= s.count)) return;
    if (s.featured === i) return;
    set({ featured: i, coverOpen: false, spotlight: null, lastInteraction: performance.now() });
  },
  toggleCover: () => set((s) => ({ coverOpen: s.featured === null ? false : !s.coverOpen, lastInteraction: performance.now() })),
  next: () => {
    const { featured, hovered, spotlight, count } = get();
    if (!count) return;
    if (featured !== null) get().feature(wrap(featured + 1, count));
    else set({ spotlight: wrap((hovered ?? spotlight ?? -1) + 1, count), hovered: null, lastInteraction: performance.now() });
  },
  prev: () => {
    const { featured, hovered, spotlight, count } = get();
    if (!count) return;
    if (featured !== null) get().feature(wrap(featured - 1, count));
    else set({ spotlight: wrap((hovered ?? spotlight ?? 0) - 1, count), hovered: null, lastInteraction: performance.now() });
  },
  setSpotlight: (spotlight) => set({ spotlight }),
  setReady: (ready) => set({ ready }),
  setProgress: (progress) => set({ progress }),
  touch: () => set({ lastInteraction: performance.now() }),
}));

/** The book the UI should currently describe. */
export const activeIndex = (s: Pick<ShelfState, "featured" | "hovered" | "spotlight">) => s.featured ?? s.hovered ?? s.spotlight;
