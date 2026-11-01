"use client";

import Link from "@/components/ui/SiteLink";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Paperclip, RotateCcw } from "lucide-react";
import type { Ticket } from "@/types";
import { errorMessage, getTicket, replyTicket, setTicketStatus } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { features } from "@/config/features";
import { cn } from "@/lib/utils";
import { FormError, Spinner, Textarea } from "@/components/ui/Form";
import { Button, ButtonLink } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { TicketStatusBadge, formatWhen } from "./TicketBits";

/** The ticket named by `?id=` in the URL. */
export function TicketView() {
  const id = (useSearchParams().get("id") ?? "").slice(0, 40);
  return <TicketThread key={id} id={id} />;
}

export function TicketThread({ id }: { id: string }) {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // tickets are private to their account: sign in first
  useEffect(() => {
    if (hydrated && !user) router.replace(`/login?next=${encodeURIComponent(`${pathname}?id=${id}`)}`);
  }, [hydrated, user, router, pathname, id]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    getTicket(id)
      .then((t) => alive && setTicket(t))
      .catch((e) => {
        if (!alive) return;
        if (e?.code === "NOT_FOUND") setNotFound(true);
        else setLoadError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [id, attempt, user]);

  if (notFound)
    return (
      <div className="py-24 text-center">
        <h1 className="display-md">Ticket not found</h1>
        <p className="mt-3 text-muted">It may belong to another account, or the link may be incomplete.</p>
        <ButtonLink href="/support/ticket" className="mt-8">
          Raise a new request
        </ButtonLink>
      </div>
    );
  if (loadError)
    return (
      <FormError
        message={loadError}
        onRetry={() => {
          setLoadError(null);
          setAttempt((a) => a + 1);
        }}
      />
    );
  if (!ticket) return <div className="skeleton h-80 rounded-xl" />;

  const send = async () => {
    if (reply.trim().length < 2) {
      setError("Write a reply first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setTicket(await replyTicket(ticket.id, reply));
      setReply("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (s: Ticket["status"]) => {
    setBusy(true);
    try {
      setTicket(await setTicketStatus(ticket.id, s));
      toast.success(s === "resolved" ? "Marked as resolved" : "Ticket reopened");
    } catch (e) {
      toast.error("Couldn't update the ticket", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Link href={user && features.accounts ? "/dashboard/support" : "/support/ticket"} className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent">
        <ArrowLeft className="size-4" /> All requests
      </Link>
      <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-faint">
            {ticket.id} · {ticket.category} · {ticket.priority} priority
          </p>
          <h1 className="display-md mt-2">{ticket.subject}</h1>
        </div>
        <div className="flex items-center gap-3">
          <TicketStatusBadge status={ticket.status} />
          {ticket.status === "resolved" ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStatus("open")}>
              <RotateCcw className="size-4" /> Reopen
            </Button>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStatus("resolved")}>
              <CheckCircle2 className="size-4" /> Mark resolved
            </Button>
          )}
        </div>
      </div>
      {ticket.attachments.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Paperclip className="size-3.5" /> {ticket.attachments.join(", ")}
        </p>
      )}
      <ol className="mt-10 space-y-4" aria-label="Conversation">
        {ticket.messages.map((m) => (
          <li
            key={m.id}
            className={cn("max-w-[85%] rounded-2xl border p-5", m.from === "author" ? "ml-auto rounded-br-sm border-accent/40 bg-accent-soft" : "rounded-bl-sm border-line bg-surface")}
          >
            <p className="flex items-center justify-between gap-4 text-xs">
              <span className={cn("font-semibold", m.from === "support" ? "text-accent" : "text-fg")}>{m.name}</span>
              <span className="text-faint">{formatWhen(m.at)}</span>
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg">{m.body}</p>
          </li>
        ))}
      </ol>
      {ticket.status === "resolved" ? (
        <p className="mt-8 rounded-lg border border-line p-4 text-sm text-muted">This request is resolved. Reopen it if you need anything else.</p>
      ) : (
        <div className="mt-8 space-y-3">
          <label htmlFor="reply" className="text-sm font-medium">
            Reply
          </label>
          <Textarea id="reply" value={reply} maxLength={4000} onChange={(e) => setReply(e.target.value)} rows={4} aria-invalid={!!error} />
          <FormError message={error} />
          <Button onClick={send} disabled={busy}>
            {busy ? (
              <>
                <Spinner /> Sending…
              </>
            ) : (
              "Send reply"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
