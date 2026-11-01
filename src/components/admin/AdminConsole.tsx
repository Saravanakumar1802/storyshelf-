"use client";

import Link from "@/components/ui/SiteLink";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BookPlus, Eye, EyeOff, RotateCcw, Search, Sparkles } from "lucide-react";
import type { PublishRequest, Role, Ticket } from "@/types";
import { errorMessage, listTickets } from "@/lib/api";
import {
  getAdminStats,
  listAccounts,
  listAdminBooks,
  listContactMessages,
  listImports,
  listPublishRequests,
  previewImport,
  setAccountRole,
  setBookStatus,
  setPublishStage,
  startImport,
  type AdminAccount,
  type AdminBook,
  type AdminStats,
  type ContactMessage,
  type ImportJob,
  type ImportPreview,
} from "@/lib/api/admin";
import { journey } from "@/data/services";
import { bookHref } from "@/lib/libraryBook";
import { useAuth } from "@/lib/store/auth";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn, formatINR2 } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError, Input, Select, Spinner } from "@/components/ui/Form";
import { toast } from "@/components/ui/Toast";
import { TicketStatusBadge, formatWhen, ticketHref } from "@/components/support/TicketBits";

/** Loads once per mount; `reload` refetches. Errors become a message with a retry. */
function useLoad<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    load()
      .then((data) => alive && setState({ data, error: null }))
      .catch((e) => alive && setState({ data: null, error: errorMessage(e) }));
    return () => {
      alive = false;
    };
  }, [load, attempt]);
  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...state, reload, setData: (data: T) => setState({ data, error: null }) };
}

function Loaded<T>({ s, children }: { s: { data: T | null; error: string | null; reload: () => void }; children: (d: T) => ReactNode }) {
  if (s.error) return <FormError message={s.error} onRetry={s.reload} />;
  if (s.data === null) return <div className="skeleton h-40 rounded-xl" aria-busy="true" />;
  return <>{children(s.data)}</>;
}

function Stat({ k, v, sub }: { k: string; v: ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{k}</p>
      <p className="num mt-2 font-serif text-3xl">{v}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

const table = "w-full min-w-[640px] text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:pb-2 [&_th]:font-mono [&_th]:text-[10px] [&_th]:font-normal [&_th]:uppercase [&_th]:tracking-[0.16em] [&_th]:text-faint";

// ── overview ──

function Overview() {
  const s = useLoad(getAdminStats);
  return (
    <Loaded s={s}>
      {(d: AdminStats) => {
        const pct = Math.min(100, Math.round((d.storageMb / d.storageBudgetMb) * 100));
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat k="Books" v={d.books} sub={d.hiddenBooks ? `${d.hiddenBooks} hidden` : "all published"} />
              <Stat k="Passages indexed" v={d.passages.toLocaleString("en-IN")} sub="for search and Ask My Library" />
              <Stat k="Accounts" v={d.readers + d.authors + d.admins} sub={`${d.readers} readers · ${d.authors} authors · ${d.admins} admins`} />
              <Stat k="AI calls · 24 h" v={d.aiCalls} sub={d.aiFailures ? `${d.aiFailures} failed over to another model` : "no failures"} />
            </div>
            <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
              <div className="rounded-xl border border-line bg-surface p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Storage</p>
                <p className="num mt-2 font-serif text-3xl">
                  {d.storageMb} <span className="text-base text-muted">of {d.storageBudgetMb} MB</span>
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-label={`${pct}% of the storage budget used`}>
                  <div className={cn("h-full rounded-full", pct > 85 ? "bg-danger" : "bg-accent")} style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
              </div>
              <Stat k="Open tickets" v={d.ticketsOpen} />
              <Stat k="Publish requests" v={d.publishRequests} />
            </div>
            <p className="text-sm text-muted">
              Model health, fallbacks and the live AI log are on the{" "}
              <Link href="/ai" className="text-accent hover:underline">
                AI status page
              </Link>
              .
            </p>
          </div>
        );
      }}
    </Loaded>
  );
}

// ── imports ──

const JOB_LABEL: Record<ImportJob["status"], string> = {
  queued: "Queued",
  importing: "Downloading & parsing",
  embedding: "Indexing passages",
  enriching: "Writing AI insights",
  done: "Ready",
  failed: "Failed",
};

function Imports() {
  const [id, setId] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const jobs = useLoad(listImports);
  const running = jobs.data?.some((j) => j.status !== "done" && j.status !== "failed");
  const { reload } = jobs;

  // follow running jobs until they finish
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(reload, 2500);
    return () => window.clearInterval(t);
  }, [running, reload]);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1) return setError("Enter the book's number from its gutenberg.org address (e.g. 1342).");
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      setPreview(await previewImport(n));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await startImport(preview.gutenbergId);
      toast.success("Import started", `${preview.title} will be ready to read in a minute or two.`);
      setPreview(null);
      setId("");
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-serif text-2xl">Add a book</h2>
        <p className="mt-2 text-sm text-muted">
          Find it on{" "}
          <a href="https://www.gutenberg.org/ebooks/" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            gutenberg.org
          </a>{" "}
          and enter its number. The licence is checked before anything is stored: public domain in the USA, and authors who died more than 60 years ago (India).
        </p>
        <form onSubmit={check} className="mt-5 flex items-end gap-3">
          <Field label="Gutenberg book number" className="min-w-0 flex-1">
            {(a) => <Input id={a.id} aria-describedby={a.describedBy} inputMode="numeric" value={id} onChange={(e) => setId(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="1342" />}
          </Field>
          <Button type="submit" variant="ghost" disabled={busy}>
            {busy && !preview ? <Spinner /> : <Search className="size-4" />} Check
          </Button>
        </form>
        <div className="mt-4">
          <FormError message={error} />
        </div>
        {preview && (
          <div className={cn("mt-5 rounded-lg border p-5", preview.allowed ? "border-accent/40 bg-accent-soft" : "border-line-strong")}>
            <p className="font-serif text-xl">{preview.title}</p>
            <p className="text-sm text-muted">
              {preview.author} · {preview.language.toUpperCase()} · {preview.words.toLocaleString("en-IN")} words · {preview.chapters} chapters · ~{preview.estimatedMb} MB
            </p>
            <p className={cn("mt-3 text-sm", preview.allowed ? "text-fg" : "text-danger")}>{preview.reason}</p>
            {preview.allowed && (
              <Button className="mt-4" onClick={start} disabled={busy}>
                <BookPlus className="size-4" /> Import into the library
              </Button>
            )}
          </div>
        )}
      </div>
      <div>
        <h2 className="font-serif text-2xl">Recent imports</h2>
        <div className="mt-4">
          <Loaded s={jobs}>
            {(list: ImportJob[]) =>
              list.length === 0 ? (
                <p className="text-sm text-muted">Nothing imported from the console yet.</p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {list.map((j) => (
                    <li key={j.id} className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{j.slug ? <Link href={bookHref(j.slug)} className="hover:text-accent">{j.title}</Link> : (j.title ?? `Book #${j.gutenbergId}`)}</p>
                        <p className="text-xs text-muted">{j.detail}</p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs",
                          j.status === "done" ? "bg-success/15 text-success" : j.status === "failed" ? "bg-danger/15 text-danger" : "bg-accent-soft text-accent",
                        )}
                      >
                        {j.status !== "done" && j.status !== "failed" && <Spinner className="size-3" />}
                        {JOB_LABEL[j.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            }
          </Loaded>
        </div>
      </div>
    </div>
  );
}

// ── books ──

function Books() {
  const s = useLoad(listAdminBooks);
  const [q, setQ] = useState("");
  const toggle = async (b: AdminBook) => {
    const status = b.status === "published" ? "hidden" : "published";
    try {
      await setBookStatus(b.id, status);
      s.setData((s.data ?? []).map((x) => (x.id === b.id ? { ...x, status } : x)));
      toast.success(status === "hidden" ? "Hidden from the library" : "Back in the library", b.title);
    } catch (e) {
      toast.error("Couldn't update the book", errorMessage(e));
    }
  };
  return (
    <Loaded s={s}>
      {(list: AdminBook[]) => {
        const shown = list.filter((b) => `${b.title} ${b.author}`.toLowerCase().includes(q.toLowerCase()));
        return (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {list.length} books · {list.filter((b) => b.hasAi).length} with AI insights
              </p>
              <Input aria-label="Filter books" placeholder="Filter by title or author" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            </div>
            <div className="overflow-x-auto">
              <table className={table}>
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Genre</th>
                    <th>Words</th>
                    <th>Passages</th>
                    <th>AI</th>
                    <th className="text-right">In library</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((b) => (
                    <tr key={b.id} className={cn(b.status === "hidden" && "opacity-60")}>
                      <td>
                        <Link href={bookHref(b.slug)} className="font-medium hover:text-accent">
                          {b.title}
                        </Link>
                        <p className="text-xs text-muted">
                          {b.author} · #{b.gutenbergId}
                        </p>
                      </td>
                      <td className="text-muted">{b.genre}</td>
                      <td className="num">{b.words.toLocaleString("en-IN")}</td>
                      <td className="num">{b.passages}</td>
                      <td>{b.hasAi ? <Sparkles className="size-4 text-accent" aria-label="Has AI insights" /> : <span className="text-faint">—</span>}</td>
                      <td className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => toggle(b)}>
                          {b.status === "published" ? <Eye className="size-4" /> : <EyeOff className="size-4" />} {b.status === "published" ? "Published" : "Hidden"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }}
    </Loaded>
  );
}

// ── publishing ──

function Publishing() {
  const s = useLoad(listPublishRequests);
  const move = async (r: PublishRequest, stageIndex: number) => {
    try {
      const updated = await setPublishStage(r.id, stageIndex);
      s.setData((s.data ?? []).map((x) => (x.id === r.id ? updated : x)));
      toast.success(`${r.manuscript.title}: ${updated.stage}`, "The author's dashboard shows the new stage.");
    } catch (e) {
      toast.error("Couldn't move the request", errorMessage(e));
    }
  };
  return (
    <Loaded s={s}>
      {(list: PublishRequest[]) =>
        list.length === 0 ? (
          <p className="text-sm text-muted">No publish requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={table}>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Author</th>
                  <th>Plan · quote</th>
                  <th>First call</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <p className="font-medium">{r.manuscript.title}</p>
                      <p className="font-mono text-[11px] text-faint">
                        {r.id} · {formatWhen(r.createdAt)}
                      </p>
                    </td>
                    <td>
                      <p>{r.author.name}</p>
                      <p className="text-xs text-muted">{r.author.email}</p>
                    </td>
                    <td>
                      <p className="capitalize">{r.plan.replace("levelUp", "Level-Up")}</p>
                      <p className="num text-xs text-muted">{formatINR2(r.quote.total)}</p>
                    </td>
                    <td className="text-muted">
                      {r.consultation.date} · {r.consultation.slot}
                    </td>
                    <td>
                      <Select aria-label={`Stage of ${r.manuscript.title}`} value={r.stageIndex} onChange={(e) => move(r, Number(e.target.value))} className="min-w-44">
                        {journey.map((j, i) => (
                          <option key={j.stage} value={i}>
                            {i + 1}. {j.stage}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </Loaded>
  );
}

// ── support ──

const allTickets = () => listTickets(true);

function Support() {
  const tickets = useLoad(allTickets);
  const messages = useLoad(listContactMessages);
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section>
        <h2 className="font-serif text-2xl">Tickets</h2>
        <p className="mt-1 text-sm text-muted">Replies you post from a ticket go to the author as the support team.</p>
        <div className="mt-4">
          <Loaded s={tickets}>
            {(list: Ticket[]) =>
              list.length === 0 ? (
                <p className="text-sm text-muted">No tickets.</p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {list.map((t) => (
                    <li key={t.id}>
                      <Link href={ticketHref(t.id)} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-surface">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{t.subject}</span>
                          <span className="block text-xs text-faint">
                            {t.email} · {t.category} · {formatWhen(t.updatedAt)}
                          </span>
                        </span>
                        <TicketStatusBadge status={t.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )
            }
          </Loaded>
        </div>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Contact messages</h2>
        <div className="mt-4">
          <Loaded s={messages}>
            {(list: ContactMessage[]) =>
              list.length === 0 ? (
                <p className="text-sm text-muted">No messages.</p>
              ) : (
                <ul className="space-y-3">
                  {list.map((m) => (
                    <li key={m.id} className="rounded-xl border border-line p-4">
                      <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
                        <span>
                          <a href={`mailto:${m.email}`} className="font-medium text-fg hover:text-accent">
                            {m.name}
                          </a>{" "}
                          · {m.topic}
                        </span>
                        <span>{formatWhen(m.at)}</span>
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm text-muted">{m.message}</p>
                    </li>
                  ))}
                </ul>
              )
            }
          </Loaded>
        </div>
      </section>
    </div>
  );
}

// ── accounts ──

function Accounts({ me }: { me: string }) {
  const s = useLoad(listAccounts);
  const change = async (a: AdminAccount, role: Role) => {
    try {
      await setAccountRole(a.id, role);
      s.setData((s.data ?? []).map((x) => (x.id === a.id ? { ...x, role } : x)));
      toast.success(`${a.name} is now ${role === "admin" ? "an admin" : `a ${role}`}`);
    } catch (e) {
      toast.error("Couldn't change the role", errorMessage(e));
    }
  };
  return (
    <Loaded s={s}>
      {(list: AdminAccount[]) => (
        <div className="overflow-x-auto">
          <table className={table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{a.name}</td>
                  <td className="text-muted">{a.email}</td>
                  <td className="text-muted">{new Date(a.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td>
                    <Select aria-label={`Role of ${a.name}`} value={a.role} disabled={a.id === me} onChange={(e) => change(a, e.target.value as Role)} className="min-w-32">
                      <option value="reader">Reader</option>
                      <option value="author">Author</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Loaded>
  );
}

const TABS = ["Overview", "Import books", "Books", "Publishing", "Support", "Accounts"] as const;
type Tab = (typeof TABS)[number];

/** /admin: the library and publishing back office (admins only). */
export function AdminConsole() {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>("Overview");
  const [nonce, setNonce] = useState(0); // remounts the panel, which refetches it

  useEffect(() => {
    if (hydrated && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, user, router, pathname]);

  if (!hydrated || !user) return <div className="container-x min-h-[60vh] pt-40" />;
  if (user.role !== "admin")
    return (
      <main className="container-x py-40 text-center">
        <h1 className="display-md">Admins only</h1>
        <p className="mt-3 text-muted">This is the library&rsquo;s back office. Ask an admin if you need access.</p>
        <ButtonLink href="/library" className="mt-8">
          Back to the library
        </ButtonLink>
      </main>
    );

  return (
    <main className="container-x pb-28 pt-32 md:pt-40">
      <p className="eyebrow">Admin console</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display-lg mt-4">
          The <em className="gold-text italic">back office</em>.
        </h1>
        <Button variant="ghost" onClick={() => setNonce((n) => n + 1)}>
          <RotateCcw className="size-4" /> Refresh
        </Button>
      </div>
      <div role="tablist" aria-label="Admin sections" className="mt-10 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("relative shrink-0 px-4 py-3 text-sm transition-colors", tab === t ? "text-fg after:absolute after:inset-x-4 after:-bottom-px after:h-0.5 after:bg-accent" : "text-muted hover:text-fg")}
          >
            {t}
          </button>
        ))}
      </div>
      <div key={nonce} role="tabpanel" aria-label={tab} className="mt-10">
        {tab === "Overview" && <Overview />}
        {tab === "Import books" && <Imports />}
        {tab === "Books" && <Books />}
        {tab === "Publishing" && <Publishing />}
        {tab === "Support" && <Support />}
        {tab === "Accounts" && <Accounts me={user.id} />}
      </div>
    </main>
  );
}
