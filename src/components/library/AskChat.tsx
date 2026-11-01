"use client";

import Link from "@/components/ui/SiteLink";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, BookOpen, Library, MessageSquarePlus, Sparkles, Trash2 } from "lucide-react";
import { ApiError, errorMessage } from "@/lib/api";
import { ask, createThread, deleteThread, getThread, listThreads, type AskMessage, type AskSource, type AskThread } from "@/lib/api/ask";
import { readerHref } from "@/lib/libraryBook";
import { useAuth } from "@/lib/store/auth";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";
import { AiMetaChip } from "@/components/ai/AiMetaChip";

const STARTERS_SHELF = ["Which of my books has the most memorable opening?", "How do the heroines in my books deal with loss?", "Find a scene in my books set by the sea"];
const STARTERS_BOOK = ["Who are the main characters so far?", "What is the central conflict?", "Find the most suspenseful moment"];
const MAX_QUESTION = 500;

/** "[2]" in an answer becomes a link to source 2 below it. */
function withCitations(text: string, messageId: string): ReactNode[] {
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const m = /^\[(\d+)\]$/.exec(part);
    if (!m) return <Fragment key={i}>{part}</Fragment>;
    return (
      <a key={i} href={`#src-${messageId}-${m[1]}`} className="mx-0.5 inline-grid min-w-5 place-items-center rounded bg-accent-soft px-1 align-super text-[10px] font-semibold text-accent no-underline hover:bg-accent hover:text-on-accent">
        {m[1]}
      </a>
    );
  });
}

function Sources({ sources, messageId }: { sources: AskSource[]; messageId: string }) {
  if (!sources.length) return null;
  return (
    <details className="mt-4 group" open>
      <summary className="cursor-pointer list-none text-xs text-muted hover:text-fg">
        <span className="font-mono uppercase tracking-[0.18em]">Sources</span> · {sources.length} passages from your books
      </summary>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {sources.map((s) => (
          <li key={s.n} id={`src-${messageId}-${s.n}`} className="scroll-mt-32 rounded-lg border border-line bg-bg/40 p-3 target:border-accent">
            <p className="flex items-baseline gap-2 text-xs">
              <span className="num grid min-w-5 place-items-center rounded bg-accent-soft px-1 font-semibold text-accent">{s.n}</span>
              <span className="truncate text-fg">
                {s.book.title} <span className="text-faint">· {s.chapterTitle}</span>
              </span>
            </p>
            <p className="mt-2 line-clamp-3 font-serif text-[13px] italic leading-relaxed text-muted">{s.excerpt}</p>
            <Link href={readerHref(s.book.slug, s.chapter)} className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
              <BookOpen className="size-3" /> Open in the reader
            </Link>
          </li>
        ))}
      </ol>
    </details>
  );
}

function Bubble({ m, streaming }: { m: AskMessage; streaming?: boolean }) {
  if (m.role === "reader") {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-on-accent">{m.content}</p>
      </li>
    );
  }
  return (
    <li className="max-w-full">
      <div className="rounded-2xl rounded-bl-sm border border-line bg-surface p-5">
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          <Sparkles className={cn("size-3", streaming && "animate-pulse")} /> AI librarian
        </p>
        {m.content ? (
          <p className="mt-2 whitespace-pre-line leading-relaxed text-fg">
            {withCitations(m.content, m.id)}
            {streaming && <span aria-hidden className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-text-bottom" />}
          </p>
        ) : streaming ? (
          <p className="mt-2 text-sm text-muted">{m.sources.length ? "Reading the passages…" : "Searching your books…"}</p>
        ) : null}
        {m.error && <p className="mt-2 text-sm text-warning">{m.error} The passages below are where the answer most likely lives.</p>}
        <Sources sources={m.sources} messageId={m.id} />
        {m.meta && <AiMetaChip meta={m.meta} className="mt-4" />}
      </div>
    </li>
  );
}

/** /library/ask: conversations with the reader's own books, answered from their passages with citations. */
export function AskChat() {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const threadParam = params.get("t");
  const bookParam = params.get("book");

  const [threads, setThreads] = useState<AskThread[]>([]);
  // the open conversation; replaced only by user actions or a finished fetch
  const [session, setSession] = useState<{ thread: AskThread | null; messages: AskMessage[] }>({ thread: null, messages: [] });
  const active = session.thread;
  const messages = session.messages;
  const setMessages = (fn: (ms: AskMessage[]) => AskMessage[]) => setSession((s) => ({ ...s, messages: fn(s.messages) }));
  const seq = useRef(0);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (hydrated && !user) router.replace(`/login?next=${encodeURIComponent(pathname + (params.size ? `?${params}` : ""))}`);
  }, [hydrated, user, router, pathname, params]);

  useEffect(() => {
    if (user) void listThreads().then(setThreads).catch(() => undefined);
  }, [user]);

  // open the thread named in the URL (unless it is the one already open)
  const openId = active?.id;
  useEffect(() => {
    if (!user || !threadParam || threadParam === openId) return;
    getThread(threadParam)
      .then((t) => setSession({ thread: t, messages: t.messages }))
      .catch((e) => setNotice(errorMessage(e)));
  }, [user, threadParam, openId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);
  useEffect(() => () => abort.current?.abort(), []);

  const open = (id: string | null) => {
    if (!id) setSession({ thread: null, messages: [] });
    setNotice(null);
    router.replace(id ? `${pathname}?t=${id}` : pathname, { scroll: false });
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (q.length < 3 || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      let thread = active;
      if (!thread) {
        const created = await createThread(bookParam ?? undefined);
        thread = created;
        setSession((s) => ({ ...s, thread: created }));
        setThreads((ts) => [created, ...ts]);
        window.history.replaceState(null, "", `${pathname}?t=${created.id}`);
      }
      const now = new Date().toISOString();
      const n = ++seq.current;
      const answerId = `pending-${n}`;
      const patch = (fn: (m: AskMessage) => AskMessage) => setMessages((ms) => ms.map((m) => (m.id === answerId ? fn(m) : m)));
      setMessages((ms) => [
        ...ms,
        { id: `q-${n}`, role: "reader", content: q, sources: [], meta: null, error: null, createdAt: now },
        { id: answerId, role: "librarian", content: "", sources: [], meta: null, error: null, createdAt: now },
      ]);
      setQuestion("");
      abort.current = new AbortController();
      await ask(
        thread.id,
        q,
        {
          onSources: (sources) => patch((m) => ({ ...m, sources })),
          onToken: (t) => patch((m) => ({ ...m, content: m.content + t })),
          onDone: (meta) => patch((m) => ({ ...m, meta })),
          onError: (message) => patch((m) => ({ ...m, error: message })),
        },
        abort.current.signal,
      );
      const id = thread.id;
      setThreads((ts) => ts.map((t) => (t.id === id && t.title === "New conversation" ? { ...t, title: q.slice(0, 60) } : t)));
    } catch (e) {
      // the question never reached the librarian (e.g. empty shelves): take it back out
      setMessages((ms) => ms.filter((m) => !m.id.startsWith("pending-") && !(m.role === "reader" && m.content === q && m.id.startsWith("q-"))));
      setQuestion(q);
      setNotice(e instanceof ApiError ? e.message : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await deleteThread(id).catch(() => undefined);
    setThreads((ts) => ts.filter((t) => t.id !== id));
    if (active?.id === id) open(null);
  };

  if (!hydrated || !user) return <div className="container-x min-h-[60vh] pt-40" />;

  const scopeLabel = active?.book ? `About ${active.book.title}` : bookParam ? "About this book" : "Across your shelves";
  const starters = active?.book || bookParam ? STARTERS_BOOK : STARTERS_SHELF;
  const streamingId = busy ? messages.at(-1)?.id : undefined;

  return (
    <main className="container-x grid gap-8 pb-16 pt-28 md:pt-32 lg:grid-cols-[260px_1fr]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <button type="button" onClick={() => open(null)} className="flex w-full items-center gap-2 rounded-lg border border-line-strong px-4 py-3 text-sm hover:border-accent hover:text-accent">
          <MessageSquarePlus className="size-4" /> New conversation
        </button>
        <nav aria-label="Conversations" className="mt-4 max-h-[60vh] overflow-y-auto">
          <ul className="space-y-1">
            {threads.map((t) => (
              <li key={t.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => open(t.id)}
                  aria-current={active?.id === t.id ? "page" : undefined}
                  className={cn("min-w-0 flex-1 truncate rounded-md px-3 py-2 text-left text-sm", active?.id === t.id ? "bg-accent-soft text-accent" : "text-muted hover:bg-hover hover:text-fg")}
                >
                  {t.title}
                </button>
                <button type="button" onClick={() => remove(t.id)} aria-label={`Delete "${t.title}"`} className="grid size-8 place-items-center rounded-md text-faint opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <section aria-label="Conversation" className="flex min-h-[70vh] min-w-0 flex-col">
        <header className="border-b border-line pb-5">
          <p className="eyebrow flex items-center gap-2">
            <Sparkles className="size-3.5" /> Ask My Library
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl">{active?.title && active.title !== "New conversation" ? active.title : scopeLabel}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <Library className="size-3.5" /> {scopeLabel} · answers come only from the books&rsquo; own text, with sources
          </p>
        </header>

        <div className="flex-1 py-6">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-xl py-10 text-center">
              <p className="font-display text-2xl">Ask anything about {active?.book || bookParam ? "this book" : "the books on your shelves"}.</p>
              <p className="mt-2 text-sm text-muted">The AI librarian finds the passages that answer you and cites them, so you can read the original for yourself.</p>
              <div className="mt-6 flex flex-col gap-2">
                {starters.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} disabled={busy} className="rounded-lg border border-line px-4 py-3 text-left text-sm text-muted hover:border-accent hover:text-fg">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ol className="space-y-5" aria-live="polite">
              {messages.map((m) => (
                <Bubble key={m.id} m={m} streaming={m.id === streamingId} />
              ))}
            </ol>
          )}
          <div ref={endRef} />
        </div>

        {notice && (
          <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            {notice}
            {/shel/.test(notice) && (
              <ButtonLink href="/library" size="sm" variant="ghost">
                Browse the library
              </ButtonLink>
            )}
          </div>
        )}
        {/* the right margin keeps the send button clear of the floating help bubble */}
        <form
          className="sticky bottom-4 mr-20 flex items-end gap-2 rounded-2xl border border-line-strong bg-raised p-2 shadow-lifted"
          onSubmit={(e) => {
            e.preventDefault();
            void send(question);
          }}
        >
          <label className="flex-1">
            <span className="sr-only">Your question</span>
            <textarea
              value={question}
              maxLength={MAX_QUESTION}
              rows={1}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(question);
                }
              }}
              placeholder="Ask about characters, scenes, themes…"
              className="max-h-40 min-h-11 w-full resize-y bg-transparent px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none"
            />
          </label>
          <button type="submit" disabled={busy || question.trim().length < 3} aria-label="Ask" className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-on-accent transition-opacity disabled:opacity-40">
            <ArrowUp className="size-4" />
          </button>
        </form>
      </section>
    </main>
  );
}
