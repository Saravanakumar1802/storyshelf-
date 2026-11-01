import type { z } from "zod";

/**
 * Shared API plumbing: the error type every call throws and client-side
 * validation. The transport itself is ./http.ts.
 */

export type ApiErrorCode = "NETWORK" | "VALIDATION" | "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED" | "AI_UNAVAILABLE" | "INTERNAL";

export class ApiError extends Error {
  constructor(
    message: string,
    public code: ApiErrorCode = "NETWORK",
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.join(".")] = i.message;
  return out;
}

/** Validate before sending, so bad input never costs a round trip (the server validates again). */
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new ApiError("Please check the highlighted fields.", "VALIDATION", fieldErrors(r.error));
  return r.data;
}

export function errorMessage(e: unknown) {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong. Please try again.";
}
