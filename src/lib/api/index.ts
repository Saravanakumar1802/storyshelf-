/**
 * The site's API, one import away: `import { … } from "@/lib/api"`.
 * Every call goes to the FastAPI backend (see ./http.ts); each area lives in its own file.
 */
export { ApiError, errorMessage } from "./client";
export { DEMO_ACCOUNT, login, logout, me, signup } from "./auth";
export {
  getBook,
  getChapter,
  searchBooks,
  semanticSearch,
  summarizeChapter,
  type BookPage,
  type BookQuery,
  type SearchHit,
  type SearchResult,
  type SortKey,
} from "./books";
export { getAiStatus, type AiMeta, type AiStatus } from "./ai";
export { bookConsultation, createTicket, getConsultationSlots, getTicket, listTickets, replyTicket, searchFaqs, sendContactMessage, setTicketStatus } from "./support";
export { getDashboard, getPublishRequest, submitPublishRequest, type DashboardData, type PublishPayload } from "./publishing";
export { askAssistant, type AssistantReply, type AssistantTurn } from "./assistant";
export type { Ticket } from "@/types";
