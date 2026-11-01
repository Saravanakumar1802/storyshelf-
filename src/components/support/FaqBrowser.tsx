"use client";

import Link from "@/components/ui/SiteLink";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { faqCategories, faqs } from "@/data/support";
import { searchFaqs } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Accordion } from "@/components/ui/Accordion";
import type { FaqCategory } from "@/types";

export function FaqBrowser() {
  const initial = (useSearchParams().get("q") ?? "").slice(0, 120);
  const [q, setQ] = useState(initial);
  const [cat, setCat] = useState<FaqCategory | "All">("All");
  const [deepLink, setDeepLink] = useState<string | null>(null);

  // deep link (#f12) → open and scroll to that question
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id || !faqs.some((f) => f.id === id)) return;
    const t = window.setTimeout(() => {
      setDeepLink(id);
      window.setTimeout(() => document.getElementById(`faq-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
    }, 50);
    return () => window.clearTimeout(t);
  }, []);

  const list = (q.trim() ? searchFaqs(q) : faqs).filter((f) => cat === "All" || f.category === cat);
  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search FAQs</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={q}
            maxLength={120}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search questions…"
            className="w-full rounded-pill border border-line-strong bg-raised py-3 pl-11 pr-4 text-sm focus:border-accent focus:outline-none"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="FAQ categories">
        {(["All", ...faqCategories] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={cat === c}
            onClick={() => setCat(c)}
            className={cn("rounded-pill border px-4 py-1.5 text-sm transition-colors", cat === c ? "border-accent bg-accent text-on-accent" : "border-line-strong text-muted hover:border-accent hover:text-fg")}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-10" aria-live="polite">
        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong p-10 text-center">
            <p className="font-display text-2xl">No questions match.</p>
            <p className="mt-2 text-sm text-muted">
              Try another word, or{" "}
              <Link href={`/support/ticket?subject=${encodeURIComponent(q.slice(0, 100))}`} className="text-accent hover:underline">
                ask our team directly
              </Link>
              .
            </p>
          </div>
        ) : (
          <Accordion
            key={deepLink ?? "none"}
            defaultOpen={deepLink ? [deepLink] : []}
            items={list.map((f) => ({
              id: f.id,
              title: f.q,
              body: (
                <span id={`faq-${f.id}`}>
                  <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{f.category}</span>
                  {f.a}
                </span>
              ),
            }))}
          />
        )}
      </div>
    </div>
  );
}
