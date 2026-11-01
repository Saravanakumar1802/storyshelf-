import { useAuth, type SessionDto } from "@/lib/store/auth";
import { ApiError, type ApiErrorCode } from "./client";

/**
 * The one door to the FastAPI backend.
 *
 * - Sends the access token when there is a session.
 * - On a 401, refreshes the session once and retries. Concurrent calls share
 *   one refresh, because the server rotates refresh tokens and a second use
 *   of the old one would be treated as theft.
 * - Turns the backend's `{ error: { code, message, fields } }` envelope into
 *   an ApiError, so forms can highlight fields.
 */

// The prototype kept its data (orders, tickets, a cart) in localStorage; the API holds it now.
if (typeof window !== "undefined") {
  try {
    for (const k of Object.keys(window.localStorage)) if (k.startsWith("8085:db:") || k === "8085:cart") window.localStorage.removeItem(k);
  } catch {
    // storage blocked: nothing to tidy
  }
}

export const API_URL =`${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "")}/api/v1`;

interface Options {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

const OFFLINE = "We couldn't reach the library server. Check your connection and try again.";

export async function toApiError(res: Response): Promise<ApiError> {
  try {
    const { error } = (await res.json()) as { error?: { code?: ApiErrorCode; message?: string; fields?: Record<string, string> } };
    if (error?.message) return new ApiError(error.message, error.code ?? "INTERNAL", error.fields);
  } catch {
    // not our envelope (proxy page, empty body…)
  }
  return new ApiError(res.status >= 500 ? "The server hit a problem. Please try again shortly." : `Request failed (${res.status}).`, res.status >= 500 ? "INTERNAL" : "NETWORK");
}

async function send(path: string, { method = "GET", body, signal }: Options, accessToken?: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  try {
    return await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(OFFLINE, "NETWORK");
  }
}

let refreshing: Promise<boolean> | null = null;

/** Rotates the session; resolves false (and signs out) when it can't be renewed. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const tokens = useAuth.getState().tokens;
    if (!tokens) return false;
    const res = await send("/auth/refresh", { method: "POST", body: { refreshToken: tokens.refreshToken } }).catch(() => null);
    if (!res?.ok) {
      // only a definite rejection ends the session; a network blip keeps it for the next try
      if (res && res.status === 401) useAuth.getState().signOut();
      return false;
    }
    useAuth.getState().setSession((await res.json()) as SessionDto);
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const token = useAuth.getState().tokens?.accessToken;
  let res = await send(path, options, token);
  if (res.status === 401 && token) {
    if (await refreshSession()) res = await send(path, options, useAuth.getState().tokens?.accessToken);
    // the session ended: public endpoints (search, the help bubble) still answer a signed-out visitor
    else if (!useAuth.getState().tokens) res = await send(path, options);
  }
  if (!res.ok) throw await toApiError(res);
  return (res.status === 204 ? undefined : await res.json()) as T;
}
