"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Database, RotateCcw, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { theme } from "@/theme";
import { errorMessage } from "@/lib/api";
import { FAILURE_LABEL, TASK_LABEL, getAiStatus, type AiOverall, type AiStatus, type ProviderStatus } from "@/lib/api/ai";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const POLL_MS = 15_000;

const OVERALL: Record<AiOverall, { title: string; body: string; dot: string }> = {
  online: { title: "All systems reading", body: "Every task chain has a model ready to answer.", dot: "bg-success" },
  degraded: { title: "Running on fallbacks", body: "Some models are resting after hitting their free quota. Answers come from the next model in line.", dot: "bg-warning" },
  offline: { title: "The AI is resting", body: "Every model has reached its free quota for now; they reset shortly. Reading and keyword search keep working.", dot: "bg-danger" },
  not_configured: { title: "Waiting for model keys", body: "No model keys are set up yet. Reading and keyword search work today; AI features switch on as soon as keys are added.", dot: "bg-faint" },
};

const STATE: Record<ProviderStatus["state"], { label: string; cls: string }> = {
  ready: { label: "Ready", cls: "border-success/40 bg-success/10 text-success" },
  cooling: { label: "Resting", cls: "border-warning/40 bg-warning/10 text-warning" },
  missing_key: { label: "No key", cls: "border-line-strong text-faint" },
};

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{k}</p>
      <p className="num mt-2 text-3xl font-light">{v}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Chains({ status }: { status: AiStatus }) {
  const byId = Object.fromEntries(status.providers.map((p) => [p.id, p]));
  return (
    <div className="space-y-4">
      {status.chains.map((c) => {
        const answering = c.deployments.find((id) => byId[id]?.state === "ready");
        return (
          <div key={c.group} className="rounded-xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-serif text-lg">{c.label}</p>
              <p className="text-xs text-muted">{c.purpose}</p>
            </div>
            <ol className="mt-4 flex flex-wrap items-center gap-2" aria-label={`${c.label} fallback order`}>
              {c.deployments.map((id, i) => {
                const p = byId[id];
                return (
                  <li key={id} className="flex items-center gap-2">
                    {i > 0 && <ArrowRight aria-hidden className="size-3.5 text-faint" />}
                    <span
                      className={cn(
                        "rounded-pill border px-3 py-1 text-xs",
                        STATE[p.state].cls,
                        id === answering && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                      )}
                      title={`${p.provider} · ${p.model} — ${STATE[p.state].label}`}
                    >
                      {p.provider} <span className="opacity-70">· {p.model}</span>
                      {id === answering && <span className="sr-only"> (answers now)</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

function ProviderCard({ p }: { p: ProviderStatus }) {
  return (
    <li className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-lg leading-tight">{p.provider}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted" title={p.model}>
            {p.model}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-pill border px-2.5 py-0.5 text-[11px]", STATE[p.state].cls)}>
          {STATE[p.state].label}
          {p.state === "cooling" && p.cooldownS ? <span className="num"> · {p.cooldownS}s</span> : null}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-faint">Calls</dt>
          <dd className="num mt-0.5 text-fg">{p.calls}</dd>
        </div>
        <div>
          <dt className="text-faint">Failed</dt>
          <dd className="num mt-0.5 text-fg">{p.failures}</dd>
        </div>
        <div>
          <dt className="text-faint">Median</dt>
          <dd className="num mt-0.5 text-fg">{p.p50LatencyMs !== null ? `${p.p50LatencyMs} ms` : "—"}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] text-faint">
        {p.groups.join(" · ")}
        {p.lastFailure && p.state !== "missing_key" && <> · last issue: {FAILURE_LABEL[p.lastFailure] ?? p.lastFailure}</>}
      </p>
    </li>
  );
}

function UsageChart({ status }: { status: AiStatus }) {
  const data = status.providers.filter((p) => p.calls > 0).map((p) => ({ name: p.id, ok: p.calls - p.failures, failed: p.failures }));
  if (!data.length) return null;
  const tooltipStyle = { background: theme.colors.surfaceRaised, border: `1px solid ${theme.colors.borderStrong}`, borderRadius: 10, color: theme.colors.text };
  return (
    <div className="h-64 rounded-xl border border-line bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={theme.colors.border} vertical={false} />
          <XAxis dataKey="name" stroke={theme.colors.textFaint} tickLine={false} axisLine={false} fontSize={11} />
          <YAxis stroke={theme.colors.textFaint} tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme.colors.surfaceHover }} />
          <Bar dataKey="ok" name="Answered" stackId="a" fill={theme.colors.accent} radius={[0, 0, 4, 4]} />
          <Bar dataKey="failed" name="Failed / fell back" stackId="a" fill={theme.colors.warning} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Recent({ status }: { status: AiStatus }) {
  if (!status.recent.length) return <p className="rounded-xl border border-dashed border-line p-6 text-sm text-muted">No AI calls yet. They&rsquo;ll appear here live as readers use the library.</p>;
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
      {status.recent.map((r, i) => (
        <li key={`${r.at}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
          <span className={cn("grid size-5 place-items-center rounded-full", r.ok ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>
            {r.cached ? <Database className="size-3" /> : r.ok ? <Check className="size-3" /> : <X className="size-3" />}
          </span>
          <span className="min-w-36 text-fg">{TASK_LABEL[r.task] ?? r.task}</span>
          <span className="text-muted">
            {r.provider} · <span className="font-mono text-xs">{r.model}</span>
          </span>
          <span className="text-xs text-faint">{r.cached ? "from cache" : r.ok ? `${r.latencyMs} ms` : (FAILURE_LABEL[r.failure ?? ""] ?? "failed")}</span>
          {r.fallback && <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[10px] text-accent">fallback</span>}
          <span className="num ml-auto text-xs text-faint">{timeAgo(r.at)}</span>
        </li>
      ))}
    </ul>
  );
}

/** The live dashboard on /ai: every model behind the library, its state, and what it has been doing. */
export function ModelStatusPanel() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ctrl = new AbortController();
    const load = () => {
      ctrl.abort();
      ctrl = new AbortController();
      getAiStatus(ctrl.signal)
        .then((s) => {
          setStatus(s);
          setError(null);
        })
        .catch((e) => !ctrl.signal.aborted && setError(errorMessage(e)));
    };
    load();
    const id = window.setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => {
      window.clearInterval(id);
      ctrl.abort();
    };
  }, [attempt]);

  if (error && !status) {
    return (
      <div className="rounded-xl border border-line bg-surface p-10 text-center" role="alert">
        <p className="font-display text-3xl">Status is unavailable right now.</p>
        <p className="mt-3 text-muted">{error}</p>
        <Button variant="ghost" className="mt-6" onClick={() => setAttempt((a) => a + 1)}>
          <RotateCcw className="size-4" /> Try again
        </Button>
      </div>
    );
  }
  if (!status) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading AI status">
        <div className="skeleton h-28 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  const o = OVERALL[status.overall];
  const ready = status.providers.filter((p) => p.state === "ready").length;
  const t = status.totals;
  return (
    <div className="space-y-12">
      <section aria-live="polite" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className="relative mt-2 flex size-3">
            {status.overall === "online" && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", o.dot)} />}
            <span className={cn("relative inline-flex size-3 rounded-full", o.dot)} />
          </span>
          <div>
            <p className="font-display text-3xl">{o.title}</p>
            <p className="mt-1 max-w-xl text-sm text-muted">{o.body}</p>
          </div>
        </div>
        <p className="text-sm text-muted md:text-right">
          <span className="num text-2xl text-fg">{ready}</span> of <span className="num">{status.providers.length}</span> models ready
          <span className="block text-xs text-faint">Updated {timeAgo(status.generatedAt)} · refreshes every 15 s</span>
        </p>
      </section>

      <section aria-labelledby="totals">
        <h2 id="totals" className="eyebrow">
          Last {status.windowHours} hours
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
          <Stat k="AI requests" v={String(t.requests)} />
          <Stat k="Answered" v={t.successRate !== null ? `${Math.round(t.successRate * 100)}%` : "—"} />
          <Stat k="Saved by fallback" v={String(t.fallbacks)} sub="first model failed, next one answered" />
          <Stat k="From cache" v={String(t.cacheHits)} sub="no quota spent" />
          <Stat k="Avg. response" v={t.avgLatencyMs !== null ? `${(t.avgLatencyMs / 1000).toFixed(1)} s` : "—"} />
        </div>
      </section>

      <section aria-labelledby="chains">
        <h2 id="chains" className="eyebrow">
          Fallback order
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">Each kind of task tries its models left to right. The ringed model is the one answering right now.</p>
        <div className="mt-4">
          <Chains status={status} />
        </div>
      </section>

      <section aria-labelledby="models">
        <h2 id="models" className="eyebrow">
          Models
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {status.providers.map((p) => (
            <ProviderCard key={p.id} p={p} />
          ))}
        </ul>
        <div className="mt-4">
          <UsageChart status={status} />
        </div>
        <p className="mt-4 text-xs text-faint">
          Search and &ldquo;similar books&rdquo; use <span className="font-mono">{status.embeddingModel}</span>, an embedding model that runs on our own server: no quota, always available.
        </p>
      </section>

      <section aria-labelledby="recent">
        <h2 id="recent" className="eyebrow">
          Live activity
        </h2>
        <div className="mt-4">
          <Recent status={status} />
        </div>
      </section>
    </div>
  );
}
