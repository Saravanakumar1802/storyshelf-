"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import type { User } from "@/types";
import { validatedPersist } from "./persist";

/**
 * The signed-in session. The short-lived access token and the rotating refresh
 * token live in localStorage: the site is a static export calling an API on
 * another origin, where cross-site cookies are unreliable. The trade-off
 * (XSS could read them) is limited by the 30-minute access token and by
 * refresh-token reuse detection on the server.
 */

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullish(),
  role: z.enum(["reader", "author", "admin"]),
  plan: z.enum(["kickstart", "levelUp", "pro"]).nullable(),
  joinedAt: z.string(),
});

const tokensSchema = z.object({ accessToken: z.string(), refreshToken: z.string(), expiresAt: z.number() });
export type Tokens = z.infer<typeof tokensSchema>;

/** The shape the API returns from sign-in, sign-up and refresh. */
export interface SessionDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  setSession: (s: SessionDto) => void;
  signOut: () => void;
}

const persisted = z.object({ user: userSchema.nullable(), tokens: tokensSchema.nullable() });

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      setSession: (s) => set({ user: s.user, tokens: { accessToken: s.accessToken, refreshToken: s.refreshToken, expiresAt: Date.now() + s.expiresIn * 1000 } }),
      signOut: () => set({ user: null, tokens: null }),
    }),
    // v2: sessions now carry tokens; v1 (mock) sessions are dropped
    validatedPersist<AuthState, z.infer<typeof persisted>>("session", persisted, (s) => ({ user: s.user, tokens: s.tokens }), 2),
  ),
);

/** Where an account lands after signing in, when no `next` page was asked for. */
export function homeFor(user: User): string {
  return user.role === "author" ? "/dashboard" : user.role === "admin" ? "/admin" : "/library/shelf";
}
