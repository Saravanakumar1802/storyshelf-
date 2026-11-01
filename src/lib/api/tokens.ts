import { api } from "./http";

export interface AccessToken {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export const listTokens = () => api<AccessToken[]>("/tokens");
/** The secret comes back once, in this response only. */
export const createToken = (name: string) => api<AccessToken & { token: string }>("/tokens", { method: "POST", body: { name } });
export const revokeToken = (id: string) => api<void>(`/tokens/${id}`, { method: "DELETE" });
