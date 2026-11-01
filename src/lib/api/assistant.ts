import type { AiMetaInfo } from "@/types";
import { api } from "./http";

export interface AssistantReply {
  answer: string;
  links: { href: string; label: string }[];
  sources: { id: string; q: string }[];
  needsPerson: boolean;
  /** null when the answer is the help centre's own words (no model was needed or available) */
  meta: AiMetaInfo | null;
}

export type AssistantTurn = { role: "user" | "assistant"; content: string };

/** The help bubble: answers from the help centre's FAQs and price sheet. */
export const askAssistant = (messages: AssistantTurn[], signal?: AbortSignal) =>
  api<AssistantReply>("/assistant/chat", { method: "POST", body: { messages: messages.slice(-8) }, signal });
