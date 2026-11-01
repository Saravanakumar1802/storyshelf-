import type { Book, PublishRequest, PublishingStage } from "@/types";
import { showcaseBySlug } from "@/data/showcaseBooks";
import { publishAuthorSchema, publishConsultSchema, publishManuscriptSchema, publishPlanSchema } from "@/lib/schemas";
import { validate } from "./client";
import { api } from "./http";

export interface PublishPayload {
  author: unknown;
  manuscript: unknown;
  plan: unknown;
  consultation: unknown;
}

/** Sends the request and books the first call; the server works out the quote. */
export function submitPublishRequest(payload: PublishPayload) {
  const body = {
    author: validate(publishAuthorSchema, payload.author),
    manuscript: validate(publishManuscriptSchema, payload.manuscript),
    plan: validate(publishPlanSchema, payload.plan),
    consultation: validate(publishConsultSchema, payload.consultation),
  };
  return api<PublishRequest>("/publish/requests", { method: "POST", body });
}

export const getPublishRequest = (id: string) => api<PublishRequest>(`/publish/requests/${encodeURIComponent(id)}`);

// ── the author dashboard ──

interface DashboardDto {
  inProduction: { id: string; title: string; stage: PublishingStage; stageIndex: number; nextStep: string; due: string } | null;
  requests: PublishRequest[];
  published: { slug: string; channels: string[]; copiesSold: number; status: "Live" | "Reprinting" }[];
  royalties: { month: string; sales: number; royalty: number }[];
  totals: { lifetimeRoyalty: number; copies: number; nextPayout: string; payoutFrequency: string; balance: number };
  campaigns: { name: string; status: "Live" | "Scheduled" | "Completed" | "Available as add-on"; metric: string }[];
  team: { role: string; name: string; email: string }[];
}

export interface DashboardData extends Omit<DashboardDto, "published"> {
  published: { book: Book; channels: string[]; copiesSold: number; status: "Live" | "Reprinting" }[];
}

export async function getDashboard(): Promise<DashboardData> {
  const d = await api<DashboardDto>("/dashboard");
  // published titles are the site's showcase catalogue, referenced by slug
  const published = d.published.flatMap(({ slug, ...rest }) => {
    const book = showcaseBySlug(slug);
    return book ? [{ book, ...rest }] : [];
  });
  return { ...d, published };
}
