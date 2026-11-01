"use client";

import Link from "@/components/ui/SiteLink";
import { useDeferredValue, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { searchFaqs } from "@/lib/api";
import { guides } from "@/data/support";

/** Instant search across FAQs and guides. */
export function HelpSearch() {
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q.trim());
  const faqHits = dq ? searchFaqs(dq).slice(0, 5) : [];
  const guideHits = dq ? guides.filter((g) => `${g.title} ${g.summary}`.toLowerCase().includes(dq.toLowerCase())).slice(0, 3) : [];
  const none = dq && faqHits.length === 0 && guideHits.length === 0;
  return (
    <div className="relative mt-10 max-w-2xl">
      <label className="relative block">
        <span className="sr-only">Search help</span>
        <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-faint" />
        <input
          type="search"
          value={q}
          maxLength={120}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: royalties, ISBN, cover changes, timelines…"
          className="w-full rounded-pill border border-line-strong bg-raised py-4 pl-14 pr-5 text-base text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </label>
      {dq && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-line-strong bg-surface p-2 shadow-lifted" data-lenis-prevent role="region" aria-live="polite" aria-label="Search results">
          {none && (
            <div className="p-4 text-sm text-muted">
              No answers for “{dq}”.{" "}
              <Link href={`/support/ticket?subject=${encodeURIComponent(dq.slice(0, 100))}`} className="text-accent hover:underline">
                Ask our team
              </Link>
              .
            </div>
          )}
          {guideHits.map((g) => (
            <Link key={g.slug} href={`/support/guides/${g.slug}`} className="flex items-center justify-between gap-3 rounded-md p-3 hover:bg-hover">
              <span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Guide</span>
                <span className="text-sm text-fg">{g.title}</span>
              </span>
              <ArrowRight className="size-4 text-faint" />
            </Link>
          ))}
          {faqHits.map((f) => (
            <Link key={f.id} href={`/support/faq?q=${encodeURIComponent(dq)}#${f.id}`} className="block rounded-md p-3 hover:bg-hover">
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{f.category}</span>
              <span className="text-sm text-fg">{f.q}</span>
              <span className="mt-1 line-clamp-2 block text-xs text-muted">{f.a}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
