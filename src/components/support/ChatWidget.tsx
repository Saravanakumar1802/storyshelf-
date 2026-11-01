"use client";

import Link from "@/components/ui/SiteLink";
import { useEffect, useRef, useState } from "react";
import { BookOpenText, MessageCircle, Send, X } from "lucide-react";
import { askAssistant, searchFaqs, type AssistantTurn } from "@/lib/api";
import type { AiMeta } from "@/lib/api/ai";
import { AiMetaChip } from "@/components/ai/AiMetaChip";
import { supportChannels } from "@/data/support";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/layout/Logo";

interface Msg {
  id: number;
  from: "bot" | "me";
  text: string;
  links?: { href: string; label: string }[];
  /** which model wrote it; absent for scripted replies and the help centre's own words */
  meta?: AiMeta | null;
  fromFaq?: boolean;
}

const quick: { label: string; reply: Omit<Msg, "id" | "from"> }[] = [
  {
    label: "Plans & pricing",
    reply: {
      text: "We have three plans (GST extra): Kickstart ₹19,999, Level-Up ₹49,999 and Pro ₹99,999. All include ISBN, distribution and transparent royalties.",
      links: [{ href: "/plans", label: "Compare plans" }],
    },
  },
  {
    label: "How long does it take?",
    reply: { text: "Most books go live 6–8 weeks after signing, depending on editing and how quickly you approve designs and proofs.", links: [{ href: "/publish/how-it-works", label: "See the journey" }] },
  },
  {
    label: "Royalties",
    reply: { text: "You earn a better share of the profit on every sale, reported transparently in your dashboard. Payouts are annual on Kickstart & Level-Up, quarterly on Pro.", links: [{ href: "/support/guides/understanding-royalties", label: "Read the royalty guide" }] },
  },
  {
    label: "Talk to a person",
    reply: {
      text: `Of course. Raise a ticket and a specialist will reply within one working day, or call us on ${supportChannels.phone} (${supportChannels.hours}).`,
      links: [
        { href: "/support/ticket", label: "Raise a ticket" },
        { href: "/support/consultation", label: "Book a call" },
      ],
    },
  },
];

let mid = 0;

/** Floating "Author Support" assistant. Quick answers for the common questions;
 *  anything typed goes to the AI help assistant, which answers from the help
 *  centre's FAQs and price sheet and hands off to a person (ticket / call) when
 *  it isn't sure. If the API can't be reached, the local FAQ search answers. */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: ++mid, from: "bot", text: "Hi! I'm the StoryShelf assistant. We work with you every step of the way — what can I help you with?" },
  ]);
  const list = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const reply = (r: Omit<Msg, "id" | "from">) => {
    setTyping(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { id: ++mid, from: "bot", ...r }]);
    }, 700);
  };

  const ask = async (text: string) => {
    const t = text.trim().slice(0, 500);
    if (!t || typing) return;
    const history: AssistantTurn[] = [...msgs.slice(1), { id: 0, from: "me" as const, text: t }].map((m) => ({ role: m.from === "me" ? "user" : "assistant", content: m.text.slice(0, 500) }));
    setMsgs((m) => [...m, { id: ++mid, from: "me", text: t }]);
    setInput("");
    setTyping(true);
    try {
      const r = await askAssistant(history);
      setMsgs((m) => [...m, { id: ++mid, from: "bot", text: r.answer, links: r.links, meta: r.meta, fromFaq: !r.meta && r.sources.length > 0 }]);
    } catch {
      // offline or the API is down: the help centre still ships with the site
      const hit = searchFaqs(t)[0];
      setMsgs((m) => [
        ...m,
        hit
          ? { id: ++mid, from: "bot", text: hit.a, links: [{ href: "/support/faq", label: "More answers" }], fromFaq: true }
          : { id: ++mid, from: "bot", text: "I'm not sure about that one — let me get a person to help.", links: [{ href: `/support/ticket?subject=${encodeURIComponent(t.slice(0, 100))}`, label: "Raise a ticket" }] },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[65] flex flex-col items-end gap-3">
      <div
        role="dialog"
        aria-label="Author support chat"
        aria-hidden={!open}
        inert={!open}
        data-lenis-prevent
        className={cn(
          "flex h-[min(560px,calc(100svh-120px))] bg-surface w-[min(380px,calc(100vw-40px))] origin-bottom-right flex-col overflow-hidden rounded-xl border border-line-strong shadow-lifted transition-all duration-500 ease-book",
          open ? "pointer-events-auto scale-100 opacity-100" : "scale-90 opacity-0",
        )}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="grid size-9 place-items-center rounded-full bg-accent-soft">
            <LogoMark className="size-5 text-accent" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Author Support</p>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span className="size-1.5 rounded-full bg-success" /> AI answers from our help centre · people on tickets
            </p>
          </div>
          <button type="button" aria-label="Close chat" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full hover:bg-hover">
            <X className="size-4" />
          </button>
        </div>
        <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {msgs.map((m) => (
            <div key={m.id} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", m.from === "me" ? "rounded-br-sm bg-accent text-on-accent" : "rounded-bl-sm bg-raised text-fg")}>
                <p>{m.text}</p>
                {m.meta && <AiMetaChip meta={m.meta} className="mt-2" />}
                {m.fromFaq && (
                  <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                    <BookOpenText className="size-3" /> From the help centre
                  </p>
                )}
                {m.links && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.links.map((l) => (
                      <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-pill border border-accent/50 px-3 py-1 text-xs text-accent hover:bg-accent-soft">
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex gap-1 px-2" aria-label="Assistant is typing">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-faint" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => {
                setMsgs((m) => [...m, { id: ++mid, from: "me", text: q.label }]);
                reply(q.reply);
              }}
              className="shrink-0 rounded-pill border border-line-strong px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent"
            >
              {q.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2 border-t border-line p-3"
        >
          <label htmlFor="chat-input" className="sr-only">
            Ask a question
          </label>
          <input
            id="chat-input"
            value={input}
            maxLength={500}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about plans, royalties, ISBN…"
            className="min-w-0 flex-1 rounded-pill bg-raised px-4 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button type="submit" aria-label="Send" disabled={!input.trim() || typing} className="grid size-10 place-items-center rounded-full bg-accent text-on-accent disabled:opacity-40">
            <Send className="size-4" />
          </button>
        </form>
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close support chat" : "Open support chat"}
        aria-expanded={open}
        className="group pointer-events-auto grid size-14 place-items-center rounded-full bg-accent text-on-accent shadow-glow transition-transform duration-300 hover:scale-105"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6 transition-transform group-hover:-rotate-12" />}
      </button>
    </div>
  );
}
