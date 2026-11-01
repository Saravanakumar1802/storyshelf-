import { Sparkles } from "lucide-react";
import type { BookAi } from "@/types";
import { AiMetaChip } from "@/components/ai/AiMetaChip";

const LEVEL: Record<string, string> = { easy: "Easy read", moderate: "Moderate read", challenging: "Challenging read" };

/** The librarian's notes on a book: written by AI, labelled as such, with the model that wrote them. */
export function BookInsights({ ai }: { ai: BookAi }) {
  return (
    <section aria-labelledby="ai-insights" className="mt-8 rounded-xl border border-accent/25 bg-accent-soft/40 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ai-insights" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          <Sparkles className="size-3.5" /> AI librarian&rsquo;s notes
        </h2>
        <AiMetaChip meta={ai.meta} />
      </div>
      <p className="mt-4 font-display text-xl italic leading-snug text-fg">{ai.hook}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">{ai.summary}</p>
      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Moods">
        {ai.moods.map((m) => (
          <li key={m} className="rounded-pill bg-accent/15 px-3 py-1 text-xs capitalize text-accent">
            {m}
          </li>
        ))}
        {ai.themes.map((t) => (
          <li key={t} className="rounded-pill border border-line-strong px-3 py-1 text-xs text-muted">
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-faint">
        {ai.tone} · {LEVEL[ai.readingLevel] ?? ai.readingLevel}
        {ai.contentNotes.length > 0 && <> · Note: {ai.contentNotes.join(", ")}</>}
      </p>
    </section>
  );
}
