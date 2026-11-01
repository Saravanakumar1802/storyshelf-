import { useAuth } from "@/lib/store/auth";
import { ApiError } from "./client";
import { API_URL, refreshSession, toApiError } from "./http";

/**
 * POST a JSON body and read the Server-Sent Events that stream back.
 *
 * EventSource can't send an Authorization header or a body, so this uses
 * fetch and parses the stream itself. Errors before the stream opens (a 404,
 * an empty shelf) arrive as the usual JSON envelope and throw an ApiError; an
 * expired access token is renewed once, as with every other call.
 */
export async function postStream(path: string, body: unknown, onEvent: (event: string, data: unknown) => void, signal?: AbortSignal): Promise<void> {
  const open = (token?: string) =>
    fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal,
    }).catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      throw new ApiError("We couldn't reach the library server. Check your connection and try again.", "NETWORK");
    });

  const token = useAuth.getState().tokens?.accessToken;
  let res = await open(token);
  if (res.status === 401 && token && (await refreshSession())) res = await open(useAuth.getState().tokens?.accessToken);
  if (!res.ok || !res.body) throw await toApiError(res);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    // frames end with a blank line; keep any unfinished frame for the next read
    let end: number;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (data) onEvent(event, JSON.parse(data));
    }
  }
}
