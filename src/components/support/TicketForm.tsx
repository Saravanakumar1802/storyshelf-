"use client";

import Link from "@/components/ui/SiteLink";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, X } from "lucide-react";
import type { Ticket } from "@/types";
import { ticketCategories, ticketSchema, type TicketInput } from "@/lib/schemas";
import { ApiError, createTicket, errorMessage, listTickets } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { Field, FormError, Input, Select, Spinner, Textarea } from "@/components/ui/Form";
import { Button, ButtonLink } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { TicketStatusBadge, formatWhen, ticketHref } from "./TicketBits";

const MAX_ATTACH_MB = 10;

function SignInToRaise({ subject }: { subject: string }) {
  const next = `/support/ticket${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  return (
    <div className="py-6 text-center">
      <p className="font-display text-2xl">Sign in to raise a request</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Requests are linked to your account, so only you and our support team can read them, and you can follow every reply.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href={`/login?next=${encodeURIComponent(next)}`}>Sign in</ButtonLink>
        <ButtonLink href={`/signup?next=${encodeURIComponent(next)}`} variant="ghost">
          Create an account
        </ButtonLink>
      </div>
      <p className="mt-6 text-xs text-faint">
        Just a quick question? <Link href="/contact" className="text-accent hover:underline">Send us a message</Link> instead, no account needed.
      </p>
    </div>
  );
}

export function TicketForm() {
  const hydrated = useHydrated();
  const router = useRouter();
  const subject = (useSearchParams().get("subject") ?? "").slice(0, 120);
  const user = useAuth((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TicketInput>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject, category: "Other", priority: "normal", email: user?.email ?? "", message: "", attachments: [] },
  });
  const attachments = useWatch({ control, name: "attachments" }) ?? [];

  // once the session is restored, pre-fill the email if empty
  useEffect(() => {
    if (hydrated && user?.email) setValue("email", user.email, { shouldDirty: false });
  }, [hydrated, user, setValue]);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    setFileError(null);
    const next = [...attachments];
    for (const f of Array.from(files)) {
      if (next.length >= 3) {
        setFileError("You can attach up to 3 files.");
        break;
      }
      if (f.size > MAX_ATTACH_MB * 1024 * 1024) {
        setFileError(`“${f.name}” is larger than ${MAX_ATTACH_MB} MB.`);
        continue;
      }
      if (!next.includes(f.name)) next.push(f.name);
    }
    setValue("attachments", next, { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      const t = await createTicket(v);
      toast.success("Request received", `Ticket ${t.id} — we'll reply within one working day.`);
      router.push(ticketHref(t.id));
    } catch (e) {
      if (e instanceof ApiError && e.fields) for (const [k, m] of Object.entries(e.fields)) setError(k as keyof TicketInput, { message: m });
      setServerError(errorMessage(e));
    }
  });

  if (hydrated && !user) return <SignInToRaise subject={subject} />;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field label="Subject" required error={errors.subject?.message}>
        {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} maxLength={120} {...register("subject")} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Category" required error={errors.category?.message}>
          {(a) => (
            <Select id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} {...register("category")}>
              {ticketCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Priority" required error={errors.priority?.message}>
          {(a) => (
            <Select id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} {...register("priority")}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High — blocking my launch</option>
            </Select>
          )}
        </Field>
        <Field label="Your email" required error={errors.email?.message}>
          {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="email" autoComplete="email" {...register("email")} />}
        </Field>
      </div>
      <Field label="How can we help?" required error={errors.message?.message}>
        {(a) => <Textarea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} maxLength={4000} rows={7} placeholder="Share as much detail as you can — chapter numbers, links, what you expected…" {...register("message")} />}
      </Field>
      <div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-accent hover:underline">
          <Paperclip className="size-4" /> Attach files (optional, up to 3 · {MAX_ATTACH_MB} MB each)
          <input type="file" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
        </label>
        {attachments.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {attachments.map((n) => (
              <li key={n} className="flex items-center gap-2 rounded-pill border border-line-strong px-3 py-1 text-xs">
                {n}
                <button type="button" aria-label={`Remove ${n}`} onClick={() => setValue("attachments", attachments.filter((x) => x !== n))}>
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {(fileError || errors.attachments?.message) && <p className="mt-1.5 text-xs text-danger">{fileError ?? errors.attachments?.message}</p>}
      </div>
      <FormError message={serverError} onRetry={() => onSubmit()} />
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Spinner /> Sending…
          </>
        ) : (
          "Send request"
        )}
      </Button>
    </form>
  );
}

/** The signed-in account's tickets. */
export function MyTickets() {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    let alive = true;
    if (!user) return;
    listTickets()
      .then((t) => alive && setTickets(t))
      .catch((e) => alive && setError(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [hydrated, user]);
  if (hydrated && !user) return <p className="text-sm text-muted">Sign in to see your requests and replies.</p>;
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!tickets) return <div className="skeleton h-24 rounded-xl" />;
  if (!tickets.length) return <p className="text-sm text-muted">You haven&rsquo;t raised any requests yet.</p>;
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {tickets.slice(0, 8).map((t) => (
        <li key={t.id}>
          <Link href={ticketHref(t.id)} className="block p-4 transition-colors hover:bg-surface">
            <span className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium text-fg">{t.subject}</span>
              <TicketStatusBadge status={t.status} />
            </span>
            <span className="mt-1 block text-xs text-faint">
              {t.id} · {formatWhen(t.updatedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
