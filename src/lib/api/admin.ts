import type { PublishRequest, Role } from "@/types";
import { api } from "./http";

export interface AdminStats {
  books: number;
  hiddenBooks: number;
  passages: number;
  readers: number;
  authors: number;
  admins: number;
  storageMb: number;
  storageBudgetMb: number;
  aiCalls: number;
  aiFailures: number;
  ticketsOpen: number;
  publishRequests: number;
}

export type JobStatus = "queued" | "importing" | "embedding" | "enriching" | "done" | "failed";

export interface ImportJob {
  id: string;
  gutenbergId: number;
  status: JobStatus;
  detail: string;
  title: string | null;
  slug: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface ImportPreview {
  gutenbergId: number;
  title: string;
  author: string;
  language: string;
  words: number;
  chapters: number;
  estimatedMb: number;
  allowed: boolean;
  reason: string;
  inLibrary: boolean;
}

export interface AdminBook {
  id: string;
  slug: string;
  title: string;
  author: string;
  genre: string;
  status: "published" | "hidden";
  words: number;
  passages: number;
  hasAi: boolean;
  gutenbergId: number;
  addedAt: string;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  topic: string;
  message: string;
  at: string;
}

export const getAdminStats = () => api<AdminStats>("/admin/stats");
export const previewImport = (gutenbergId: number) => api<ImportPreview>(`/admin/imports/preview/${gutenbergId}`);
export const startImport = (gutenbergId: number) => api<ImportJob>("/admin/imports", { method: "POST", body: { gutenbergId } });
export const listImports = () => api<ImportJob[]>("/admin/imports");
export const getImport = (id: string) => api<ImportJob>(`/admin/imports/${id}`);
export const listAdminBooks = () => api<AdminBook[]>("/admin/books");
export const setBookStatus = (id: string, status: AdminBook["status"]) => api<void>(`/admin/books/${id}/status`, { method: "PUT", body: { status } });
export const listAccounts = () => api<AdminAccount[]>("/admin/users");
export const setAccountRole = (id: string, role: Role) => api<void>(`/admin/users/${id}/role`, { method: "PUT", body: { role } });
export const listContactMessages = () => api<ContactMessage[]>("/admin/messages");
export const listPublishRequests = () => api<PublishRequest[]>("/admin/publish-requests");
export const setPublishStage = (ref: string, stageIndex: number) =>
  api<PublishRequest>(`/admin/publish-requests/${ref}/stage`, { method: "PUT", body: { stageIndex } });
