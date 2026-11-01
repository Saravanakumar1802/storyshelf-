"use client";

import Link from "@/components/ui/SiteLink";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { ChapterAi } from "@/types";
import { ApiError, errorMessage, summarizeChapter } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { readerHref } from "@/lib/libraryBook";
import { AiMetaChip } from "@/components/ai/AiMetaChip";

/**
 * "✨ Summarize this chapter". A chapter is summarised once (by the first
 * signed-in reader who asks); after that the summary arrives with the chapter for everyone.
 */
export function ChapterSummary({ slug, index, initial }: { slug: string; index: number; initial: ChapterAi | null }) {
  const hydrated = useHydrated();
  const signedIn = useAuth((s) => !!s.user);
  const [ai, setAi] = useState<ChapterAi | null>(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async () => {
    setOpen(true);
    if (ai) return;
    setBusy(true);
    setError(null);
    try {
      setAi(await summarizeChapter(slug, index));
    } catch (e) {
      setError(e instanceof ApiError && e.code === "AI_UNAVAILABLE" ? e.message : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const needsSignIn = hydrated && !signedIn && !ai;
  return (
    <aside aria-label="AI chapter summary" className="mb-10 rounded-xl border border-(--rd-rule) p-4">
      {!open ? (
        <button type="button" onClick={request} className="flex w-full items-center justify-center gap-2 text-sm text-(--rd-accent) hover:underline">
          <Sparkles className="size-4" /> {ai ? "Show the AI summary of this chapter" : "Summarize this chapter with AI"}
        </button>
      ) : busy ? (
        <div aria-busy="true" className="space-y-2">
          <p className="flex items-center gap-2 text-xs text-(--rd-accent)">
            <Sparkles className="size-3.5 animate-pulse" /> The AI librarian is reading this chapter…
          </p>
          <div className="skeleton h-3 rounded" />
          <div className="skeleton h-3 w-11/12 rounded" />
          <div className="skeleton h-3 w-4/5 rounded" />
        </div>
      ) : ai ? (
        <div className="font-sans">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-(--rd-accent)">
              <Sparkles className="size-3.5" /> Chapter in brief
            </p>
            <AiMetaChip meta={ai.meta} />
          </div>
          <p className="mt-3 text-[0.95rem] leading-relaxed">{ai.summary}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-(--rd-muted)">
            {ai.keyMoments.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          {ai.characters.length > 0 && <p className="mt-3 text-xs text-(--rd-muted)">In this chapter: {ai.characters.join(", ")}</p>}
        </div>
      ) : needsSignIn ? (
        <p className="text-center text-sm">
          <Link href={`/login?next=${encodeURIComponent(readerHref(slug, index))}`} className="text-(--rd-accent) underline">
            Sign in
          </Link>{" "}
          (free) to ask the AI for a summary of this chapter.
        </p>
      ) : error ? (
        <p role="alert" className="text-center text-sm text-(--rd-muted)">
          {error}{" "}
          <button type="button" onClick={request} className="text-(--rd-accent) underline">
            Try again
          </button>
        </p>
      ) : null}
    </aside>
  );
}
