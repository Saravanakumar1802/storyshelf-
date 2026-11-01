"use client";

import { useState } from "react";
import { CornerDownRight, Database, Sparkles } from "lucide-react";
import { FAILURE_LABEL, type AiMeta } from "@/lib/api/ai";
import { cn } from "@/lib/utils";

/**
 * "✨ Groq · gpt-oss-120b · 640 ms": shown beside every AI answer, so readers
 * always know a model wrote it and which one. Click to see the fallback trail
 * (models that were resting or failed first).
 */
export function AiMetaChip({ meta, className }: { meta: AiMeta; className?: string }) {
  const [open, setOpen] = useState(false);
  const hops = meta.fallbacks.length;
  return (
    <div className={cn("inline-flex flex-col items-start gap-1.5", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={hops ? open : undefined}
        disabled={!hops}
        title={hops ? "Show which models were tried first" : `Answered by ${meta.model} on ${meta.provider}`}
        className="inline-flex items-center gap-1.5 rounded-pill border border-accent/30 bg-accent-soft px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-accent enabled:hover:border-accent"
      >
        {meta.cached ? <Database className="size-3" /> : <Sparkles className="size-3" />}
        <span>{meta.provider}</span>
        <span className="text-accent/60">·</span>
        <span className="normal-case tracking-normal">{meta.model}</span>
        <span className="text-accent/60">·</span>
        <span className="num normal-case tracking-normal">{meta.cached ? "from cache" : `${meta.latencyMs.toLocaleString("en-IN")} ms`}</span>
        {hops > 0 && (
          <span className="ml-0.5 rounded-pill bg-accent/15 px-1.5 normal-case tracking-normal">
            fallback ×{hops}
          </span>
        )}
      </button>
      {open && hops > 0 && (
        <ol className="space-y-0.5 pl-2 text-[11px] text-muted">
          {meta.fallbacks.map((h, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <CornerDownRight className="size-3 text-faint" />
              {h.provider} · {h.model} <span className="text-faint">— {FAILURE_LABEL[h.reason] ?? h.reason}</span>
            </li>
          ))}
          <li className="flex items-center gap-1.5 text-accent">
            <CornerDownRight className="size-3" /> answered by {meta.provider}
          </li>
        </ol>
      )}
    </div>
  );
}
