import type { AiMetaInfo } from "@/types";
import { api } from "./http";
import { postStream } from "./sse";

export interface AskSource {
  n: number;
  book: { slug: string; title: string; author: string };
  chapter: number;
  chapterTitle: string;
  excerpt: string;
}

export interface AskMessage {
  id: string;
  role: "reader" | "librarian";
  content: string;
  sources: AskSource[];
  meta: AiMetaInfo | null;
  error: string | null;
  createdAt: string;
}

export interface AskThread {
  id: string;
  title: string;
  scope: "shelf" | "book";
  book: { slug: string; title: string; author: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AskThreadDetail extends AskThread {
  messages: AskMessage[];
}

export const listThreads = () => api<AskThread[]>("/ask/threads");
export const getThread = (id: string) => api<AskThreadDetail>(`/ask/threads/${id}`);
export const deleteThread = (id: string) => api<void>(`/ask/threads/${id}`, { method: "DELETE" });
export const createThread = (book?: string) => api<AskThread>("/ask/threads", { method: "POST", body: book ? { scope: "book", book } : { scope: "shelf" } });

export interface AskHandlers {
  onSources: (sources: AskSource[]) => void;
  onToken: (text: string) => void;
  onDone: (meta: AiMetaInfo) => void;
  onError: (message: string) => void;
}

/** Asks a question in a thread; the answer streams into the handlers. */
export function ask(threadId: string, question: string, h: AskHandlers, signal?: AbortSignal) {
  return postStream(
    `/ask/threads/${threadId}/messages`,
    { question },
    (event, data) => {
      if (event === "sources") h.onSources(data as AskSource[]);
      else if (event === "token") h.onToken(data as string);
      else if (event === "done") h.onDone((data as { meta: AiMetaInfo }).meta);
      else if (event === "error") h.onError((data as { message: string }).message);
    },
    signal,
  );
}
