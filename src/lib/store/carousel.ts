"use client";

import { create } from "zustand";

/**
 * Library hero carousel. `target` is a continuous position measured in
 * books (it can grow past `count` so the ring always turns the short way);
 * the scene eases towards it and reports the book facing the visitor.
 */
interface CarouselState {
  count: number;
  target: number;
  /** book currently at the front (0…count-1) */
  index: number;
  lastInteraction: number;
  setCount: (n: number) => void;
  setIndex: (i: number) => void;
  step: (dir: -1 | 1) => void;
  go: (i: number) => void;
  nudge: (books: number) => void;
}

export const wrapIndex = (i: number, n: number) => (n ? ((Math.round(i) % n) + n) % n : 0);

export const useCarousel = create<CarouselState>((set, get) => ({
  count: 0,
  target: 0,
  index: 0,
  lastInteraction: 0,
  setCount: (count) => set({ count }),
  setIndex: (index) => get().index !== index && set({ index }),
  step: (dir) => set((s) => ({ target: Math.round(s.target) + dir, lastInteraction: performance.now() })),
  go: (i) => {
    const { target, count } = get();
    if (!count || i < 0 || i >= count) return;
    // nearest equivalent position, so the ring takes the short way round
    const cur = Math.round(target);
    let delta = (i - wrapIndex(cur, count)) % count;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    set({ target: cur + delta, lastInteraction: performance.now() });
  },
  nudge: (books) => set((s) => ({ target: s.target + books, lastInteraction: performance.now() })),
}));
