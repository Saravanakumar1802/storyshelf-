"use client";

import Link from "@/components/ui/SiteLink";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CalendarClock, Check, Copy, Mail, PlusCircle, Ticket as TicketIcon } from "lucide-react";
import type { Ticket } from "@/types";
import { journey } from "@/data/services";
import { theme } from "@/theme";
import { errorMessage, listTickets, type DashboardData } from "@/lib/api";
import { cn, formatINR } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Form";
import { BookCover } from "@/components/library/BookCover";
import { toast } from "@/components/ui/Toast";
import { WithData, useDashboard } from "./DashboardShell";
import { TicketStatusBadge, ticketHref } from "@/components/support/TicketBits";

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{k}</p>
      <p className="mt-3 num text-3xl font-light">{v}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Title({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display-md mt-2">{children}</h1>
    </div>
  );
}

function InProductionCard({ p }: { p: NonNullable<DashboardData["inProduction"]> }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">In production</p>
          <h2 className="mt-2 font-serif text-2xl">{p.title}</h2>
        </div>
        <span className="rounded-pill bg-accent-soft px-3 py-1 text-xs text-accent">
          Stage {p.stageIndex + 1} of 8 · {p.stage}
        </span>
      </div>
      <ol className="mt-8 grid grid-cols-4 gap-y-6 md:grid-cols-8" aria-label="Publishing journey">
        {journey.map((j, i) => {
          const done = i < p.stageIndex;
          const now = i === p.stageIndex;
          return (
            <li key={j.stage} className="relative flex flex-col items-center text-center" aria-current={now ? "step" : undefined}>
              {i > 0 && <span aria-hidden className={cn("absolute right-1/2 top-4 h-px w-full", done || now ? "bg-accent" : "bg-line-strong")} />}
              <span
                className={cn(
                  "relative grid size-8 place-items-center rounded-full border text-xs",
                  done && "border-accent bg-accent text-on-accent",
                  now && "border-accent bg-bg text-accent ring-4 ring-accent/20",
                  !done && !now && "border-line-strong bg-bg text-faint",
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
                {now && <span className="absolute inset-0 animate-ping rounded-full border border-accent opacity-40 motion-reduce:hidden" />}
              </span>
              <span className={cn("mt-2 text-[11px] leading-tight", now ? "text-fg" : "text-muted")}>{j.stage}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-lg border border-accent/40 bg-accent-soft p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <CalendarClock className="size-5 text-accent" />
          <p className="text-sm">
            <span className="font-semibold text-fg">Next: {p.nextStep}</span> <span className="text-muted">· due {p.due}</span>
          </p>
        </div>
        <ButtonLink href="/dashboard/support" size="sm">
          Message your manager
        </ButtonLink>
      </div>
    </div>
  );
}

function NothingInProduction() {
  return (
    <div className="rounded-xl border border-dashed border-line-strong p-8 text-center md:p-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">In production</p>
      <p className="mt-3 font-display text-3xl">Nothing in production right now</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">Send us your next manuscript and it will appear here, stage by stage, from the first call to your first royalty statement.</p>
      <ButtonLink href="/publish" className="mt-6">
        Start a new book
      </ButtonLink>
    </div>
  );
}

export function OverviewView() {
  return (
    <WithData>
      {(d, user) => (
        <div className="animate-panel-in space-y-10">
          <Title eyebrow="Overview">Good to see you, {user.name.split(" ")[0]}.</Title>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat k="Lifetime royalty" v={formatINR(d.totals.lifetimeRoyalty)} sub="Your earnings from every sale" />
            <Stat k="Copies sold" v={d.totals.copies.toLocaleString("en-IN")} sub="All formats · 12 months" />
            <Stat k="Next payout" v={d.totals.nextPayout} sub={`${d.totals.payoutFrequency} payouts`} />
            <Stat k="Balance due" v={formatINR(d.totals.balance)} sub="Since last statement" />
          </div>

          {d.inProduction ? <InProductionCard p={d.inProduction} /> : <NothingInProduction />}

          <div className="grid gap-4 md:grid-cols-2">
            {d.team.map((t) => (
              <div key={t.role} className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-raised font-serif text-lg text-accent">
                  {t.name
                    .split(" ")
                    .map((x) => x[0])
                    .join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{t.role}</p>
                  <p className="font-serif text-lg">{t.name}</p>
                </div>
                <a href={`mailto:${t.email}`} aria-label={`Email ${t.name}`} className="grid size-10 place-items-center rounded-full border border-line-strong hover:border-accent hover:text-accent">
                  <Mail className="size-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </WithData>
  );
}

export function BooksView() {
  return (
    <WithData>
      {(d) => (
        <div className="animate-panel-in">
          <Title eyebrow="My books">Your shelf.</Title>
          {d.published.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line-strong p-12 text-center">
              <p className="font-display text-3xl">No published books yet</p>
              <p className="mt-2 text-muted">Your first book will appear here the day it goes live.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {d.published.map(({ book, channels, copiesSold, status }) => (
                <li key={book.id} className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-5 sm:flex-row">
                  <BookCover book={book} className="w-24 shrink-0" height={420} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-serif text-2xl">{book.title}</h2>
                      <span className={cn("rounded-pill px-2.5 py-0.5 text-xs", status === "Live" ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>{status}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      ISBN {book.isbn} · {book.pages} pages · {book.language}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {channels.map((c) => (
                        <span key={c} className="rounded-pill border border-line-strong px-3 py-1 text-xs text-muted">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start justify-between gap-3 sm:items-end">
                    <div className="sm:text-right">
                      <p className="num text-3xl font-light">{copiesSold.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-faint">copies · 12 months</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8 rounded-xl border border-line p-6 text-sm text-muted">
            Need a correction, reprint or new edition? Post-publication assistance is included in your plan —{" "}
            <Link href="/support/ticket" className="text-accent hover:underline">
              raise a request
            </Link>
            .
          </div>
        </div>
      )}
    </WithData>
  );
}

const tooltipStyle = {
  background: theme.colors.surfaceRaised,
  border: `1px solid ${theme.colors.borderStrong}`,
  borderRadius: 10,
  color: theme.colors.text,
  fontSize: 12,
};

function EmptyPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong p-12 text-center">
      <p className="font-display text-3xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-muted">{children}</p>
    </div>
  );
}

export function RoyaltiesView() {
  return (
    <WithData>
      {(d) => (
        <div className="animate-panel-in space-y-8">
          <Title eyebrow="Royalties">Your earnings. Every sale.</Title>
          {d.royalties.length === 0 ? (
            <EmptyPanel title="No statements yet">Your first monthly statement arrives the month after your book goes live, with every sale itemised.</EmptyPanel>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat k="Lifetime royalty" v={formatINR(d.totals.lifetimeRoyalty)} />
                <Stat k="Balance due" v={formatINR(d.totals.balance)} sub={`Paid ${d.totals.payoutFrequency.toLowerCase()}`} />
                <Stat k="Next payout" v={d.totals.nextPayout} />
              </div>
              <figure className="rounded-xl border border-line bg-surface p-6">
                <figcaption className="mb-6 flex items-center justify-between">
                  <span className="font-serif text-xl">Royalty earned</span>
                  <span className="text-xs text-faint">Last 12 months · ₹</span>
                </figcaption>
                <div className="h-72" role="img" aria-label="Area chart of monthly royalty for the last 12 months">
                  <ResponsiveContainer>
                    <AreaChart data={d.royalties} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="roy" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.colors.accent} stopOpacity={0.45} />
                          <stop offset="100%" stopColor={theme.colors.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={theme.colors.border} vertical={false} />
                      <XAxis dataKey="month" stroke={theme.colors.textFaint} tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis stroke={theme.colors.textFaint} tickLine={false} axisLine={false} fontSize={12} width={60} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatINR(Number(v)), "Royalty"]} />
                      <Area type="monotone" dataKey="royalty" stroke={theme.colors.accent} strokeWidth={2} fill="url(#roy)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </figure>
              <figure className="rounded-xl border border-line bg-surface p-6">
                <figcaption className="mb-6 font-serif text-xl">Copies sold</figcaption>
                <div className="h-56" role="img" aria-label="Bar chart of copies sold per month">
                  <ResponsiveContainer>
                    <BarChart data={d.royalties}>
                      <CartesianGrid stroke={theme.colors.border} vertical={false} />
                      <XAxis dataKey="month" stroke={theme.colors.textFaint} tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis stroke={theme.colors.textFaint} tickLine={false} axisLine={false} fontSize={12} width={40} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme.colors.accentSoft }} formatter={(v) => [Number(v).toLocaleString("en-IN"), "Copies"]} />
                      <Bar dataKey="sales" fill={theme.colors.accent} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </figure>
              <div className="relative overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <caption className="sr-only">Monthly royalty statement</caption>
                  <thead className="bg-raised text-xs text-muted">
                    <tr>
                      <th scope="col" className="p-4 font-medium">
                        Month
                      </th>
                      <th scope="col" className="p-4 text-right font-medium">
                        Copies
                      </th>
                      <th scope="col" className="p-4 text-right font-medium">
                        Royalty
                      </th>
                      <th scope="col" className="p-4 text-right font-medium">
                        Statement
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...d.royalties].reverse().map((r) => (
                      <tr key={r.month} className="border-t border-line">
                        <td className="p-4">{r.month}</td>
                        <td className="p-4 text-right num">{r.sales}</td>
                        <td className="p-4 text-right num">{formatINR(r.royalty)}</td>
                        <td className="p-4 text-right">
                          <button type="button" className="text-accent hover:underline" onClick={() => toast.info("Statement requested", `Your ${r.month} statement will be emailed to you.`)}>
                            Request PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </WithData>
  );
}

export function MarketingView() {
  return (
    <WithData>
      {(d) => (
        <div className="animate-panel-in">
          <Title eyebrow="Marketing">Getting your book seen.</Title>
          {d.campaigns.length === 0 && <EmptyPanel title="No campaigns yet">Launch campaigns start in the Marketing stage, once your book is live.</EmptyPanel>}
          <ul className="grid gap-4 md:grid-cols-2">
            {d.campaigns.map((c) => (
              <li key={c.name} className="rounded-xl border border-line bg-surface p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-serif text-xl">{c.name}</h2>
                  <span
                    className={cn(
                      "shrink-0 rounded-pill px-2.5 py-0.5 text-xs",
                      c.status === "Live" && "bg-success/15 text-success",
                      c.status === "Scheduled" && "bg-info/15 text-info",
                      c.status === "Completed" && "bg-hover text-muted",
                      c.status === "Available as add-on" && "bg-accent-soft text-accent",
                    )}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="num mt-4 text-3xl font-light">{c.metric}</p>
                {c.status === "Available as add-on" && (
                  <Link href="/plans#addons-title" className="mt-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">
                    Add to my plan <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </WithData>
  );
}

export function SupportView() {
  const { user } = useDashboard();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    listTickets()
      .then((t) => alive && setTickets(t))
      .catch((e) => alive && setError(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [attempt]);

  return (
    <div className="animate-panel-in">
      <Title eyebrow="Support">We&rsquo;re with you every step.</Title>
      <div className="mb-8 flex flex-wrap gap-3">
        <ButtonLink href="/support/ticket">
          <PlusCircle className="size-4" /> New request
        </ButtonLink>
        <ButtonLink href="/support/consultation" variant="ghost">
          Book a call
        </ButtonLink>
      </div>
      {error ? (
        <FormError
          message={error}
          onRetry={() => {
            setError(null);
            setTickets(null);
            setAttempt((a) => a + 1);
          }}
        />
      ) : !tickets ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-12 text-center">
          <TicketIcon className="mx-auto size-8 text-faint" />
          <p className="mt-4 font-display text-3xl">No requests yet</p>
          <p className="mt-2 text-sm text-muted">Questions about editing, royalties or anything else? Raise a request and we&rsquo;ll get back within one working day.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={ticketHref(t.id)} className="flex flex-wrap items-center gap-4 p-5 transition-colors hover:bg-surface">
                <span className="font-mono text-xs text-faint">{t.id}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{t.subject}</span>
                <span className="text-xs text-muted">{t.category}</span>
                <TicketStatusBadge status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(user.email).then(
            () => toast.success("Email copied"),
            () => toast.error("Couldn't copy"),
          );
        }}
        className="mt-6 inline-flex items-center gap-2 text-xs text-faint hover:text-fg"
      >
        <Copy className="size-3.5" /> Requests are linked to your account · {user.email}
      </button>
    </div>
  );
}
