import type { AiMetaInfo } from "@/types";
import { api } from "./http";

/** Which model produced an AI answer, and every model skipped or failed before it. Sent with every AI response. */
export type AiMeta = AiMetaInfo;

export type ProviderState = "ready" | "cooling" | "missing_key";
export type AiOverall = "online" | "degraded" | "offline" | "not_configured";

export interface ProviderStatus {
  id: string;
  provider: string;
  model: string;
  groups: string[];
  state: ProviderState;
  cooldownS: number | null;
  lastFailure: string | null;
  calls: number;
  failures: number;
  p50LatencyMs: number | null;
  lastUsedAt: string | null;
}

export interface AiStatus {
  overall: AiOverall;
  providers: ProviderStatus[];
  chains: { group: string; label: string; purpose: string; deployments: string[]; ready: number }[];
  windowHours: number;
  totals: { requests: number; answered: number; fallbacks: number; cacheHits: number; avgLatencyMs: number | null; successRate: number | null };
  recent: { at: string; task: string; provider: string; model: string; ok: boolean; failure: string | null; latencyMs: number; fallback: boolean; cached: boolean }[];
  embeddingModel: string;
  generatedAt: string;
}

export const getAiStatus = (signal?: AbortSignal) => api<AiStatus>("/ai/status", { signal });

/** Human wording for failure reasons reported by the API. */
export const FAILURE_LABEL: Record<string, string> = {
  rate_limited: "quota reached",
  cooling_down: "resting",
  auth: "key problem",
  unavailable: "provider down",
  timeout: "too slow",
  bad_request: "rejected request",
  bad_output: "unusable answer",
  unknown: "error",
};

/** What each task is called on screen. */
export const TASK_LABEL: Record<string, string> = {
  ask: "Ask My Library",
  mood: "Mood search",
  query_rewrite: "Smart search",
  recommend: "Recommendations",
  summary: "Book summary",
  chapter_summary: "Chapter summary",
  tags: "Tagging",
  support: "Help assistant",
};
