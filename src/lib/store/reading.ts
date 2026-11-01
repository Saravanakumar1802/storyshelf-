"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { validatedPersist } from "./persist";

/**
 * Reading position and reader preferences on this device. Signed-in readers
 * also sync their position to the server (their shelf), but this keeps
 * "Continue reading" instant and working for guests too.
 */

export const READER_FONT_SIZES = [16, 18, 20, 22, 24] as const;
export type ReaderTone = "night" | "sepia" | "paper";

const positionSchema = z.object({ chapter: z.number().int().min(0), at: z.number() });
type Position = z.infer<typeof positionSchema>;

interface ReadingState {
  positions: Record<string, Position>;
  fontSize: (typeof READER_FONT_SIZES)[number];
  tone: ReaderTone;
  setPosition: (slug: string, chapter: number) => void;
  setFontSize: (size: ReadingState["fontSize"]) => void;
  setTone: (tone: ReaderTone) => void;
}

const MAX_BOOKS = 60;

const persisted = z.object({
  positions: z.record(z.string(), positionSchema),
  fontSize: z.union(READER_FONT_SIZES.map((n) => z.literal(n)) as [z.ZodLiteral<16>, ...z.ZodLiteral<(typeof READER_FONT_SIZES)[number]>[]]),
  tone: z.enum(["night", "sepia", "paper"]),
});

export const useReading = create<ReadingState>()(
  persist(
    (set) => ({
      positions: {},
      fontSize: 20,
      tone: "night",
      setPosition: (slug, chapter) =>
        set((s) => {
          // keep the most recent books only
          const entries = Object.entries({ ...s.positions, [slug]: { chapter, at: Date.now() } })
            .sort((a, b) => b[1].at - a[1].at)
            .slice(0, MAX_BOOKS);
          return { positions: Object.fromEntries(entries) };
        }),
      setFontSize: (fontSize) => set({ fontSize }),
      setTone: (tone) => set({ tone }),
    }),
    validatedPersist<ReadingState, z.infer<typeof persisted>>("reading", persisted, (s) => ({ positions: s.positions, fontSize: s.fontSize, tone: s.tone })),
  ),
);
