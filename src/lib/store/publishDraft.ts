"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import type { AddonId, PlanId } from "@/types";
import { validatedPersist } from "./persist";

export interface PublishDraft {
  step: number;
  maxStep: number;
  author: { name: string; email: string; phone: string; city: string; bio: string };
  manuscript: { title: string; genre: string; language: string; stage: "" | "idea" | "draft" | "final"; pages: string; fileName?: string; fileSize?: number };
  plan: PlanId | "";
  addons: AddonId[];
  consultation: { date: string; slot: string; agree: boolean };
}

const empty: PublishDraft = {
  step: 0,
  maxStep: 0,
  author: { name: "", email: "", phone: "", city: "", bio: "" },
  manuscript: { title: "", genre: "", language: "English", stage: "", pages: "" },
  plan: "",
  addons: [],
  consultation: { date: "", slot: "", agree: false },
};

const draftSchema = z.object({
  step: z.number().int().min(0).max(5),
  maxStep: z.number().int().min(0).max(5),
  author: z.object({ name: z.string(), email: z.string(), phone: z.string(), city: z.string(), bio: z.string() }),
  manuscript: z.object({
    title: z.string(),
    genre: z.string(),
    language: z.string(),
    stage: z.enum(["", "idea", "draft", "final"]),
    pages: z.string(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
  }),
  plan: z.enum(["", "kickstart", "levelUp", "pro"]),
  addons: z.array(z.string()) as unknown as z.ZodType<AddonId[]>,
  consultation: z.object({ date: z.string(), slot: z.string(), agree: z.boolean() }),
});

interface DraftState extends PublishDraft {
  patch: <K extends keyof PublishDraft>(key: K, value: PublishDraft[K]) => void;
  goTo: (step: number) => void;
  reset: () => void;
}

export const usePublishDraft = create<DraftState>()(
  persist(
    (set, get) => ({
      ...empty,
      patch: (key, value) => set({ [key]: value } as Partial<DraftState>),
      goTo: (step) => {
        const s = Math.max(0, Math.min(5, step));
        set({ step: s, maxStep: Math.max(get().maxStep, s) });
      },
      reset: () => set({ ...empty }),
    }),
    validatedPersist<DraftState, PublishDraft>("publish-draft", draftSchema as z.ZodType<PublishDraft>, ({ patch: _p, goTo: _g, reset: _r, ...d }) => {
      void _p;
      void _g;
      void _r;
      return d;
    }),
  ),
);

export const isDraftStarted = (d: PublishDraft) => !!(d.author.name || d.author.email || d.manuscript.title || d.plan);
