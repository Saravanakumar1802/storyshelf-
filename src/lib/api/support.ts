import type { Ticket } from "@/types";
import { faqs } from "@/data/support";
import { contactSchema, ticketSchema, type ContactInput, type TicketInput } from "@/lib/schemas";
import { ApiError, validate } from "./client";
import { api } from "./http";

/** Help-centre search: the FAQs ship with the site, so this runs instantly in the browser. */
export function searchFaqs(q: string) {
  const n = q.trim().toLowerCase();
  if (!n) return faqs;
  const words = n.split(/\s+/);
  return faqs
    .map((f) => {
      const hay = `${f.q} ${f.a} ${f.category}`.toLowerCase();
      const score = words.reduce((a, w) => a + (hay.includes(w) ? (f.q.toLowerCase().includes(w) ? 2 : 1) : 0), 0);
      return { f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.f);
}

// ── tickets (signed in: each account sees its own; admins answer as the support team) ──

export const listTickets = (all = false) => api<Ticket[]>(`/support/tickets${all ? "?all=true" : ""}`);
export const getTicket = (id: string) => api<Ticket>(`/support/tickets/${encodeURIComponent(id)}`);

export function createTicket(input: TicketInput) {
  return api<Ticket>("/support/tickets", { method: "POST", body: validate(ticketSchema, input) });
}

export function replyTicket(id: string, body: string) {
  const text = body.trim();
  if (text.length < 2) throw new ApiError("Write a reply first.", "VALIDATION", { body: "Write a reply" });
  return api<Ticket>(`/support/tickets/${encodeURIComponent(id)}/replies`, { method: "POST", body: { body: text } });
}

export const setTicketStatus = (id: string, status: Ticket["status"]) =>
  api<Ticket>(`/support/tickets/${encodeURIComponent(id)}/status`, { method: "PUT", body: { status } });

// ── contact & consultations (no account needed) ──

export const sendContactMessage = (input: ContactInput) =>
  api<{ id: string }>("/support/contact", { method: "POST", body: validate(contactSchema, input) });

/** Free call slots (IST) on a date, from the real diary. */
export const getConsultationSlots = (date: string, signal?: AbortSignal) =>
  api<{ date: string; slots: string[] }>(`/support/consultations/slots?date=${encodeURIComponent(date)}`, { signal }).then((r) => r.slots);

export const bookConsultation = (input: { name: string; email: string; phone: string; date: string; slot: string; topic: string }) =>
  api<{ id: string }>("/support/consultations", { method: "POST", body: input });
