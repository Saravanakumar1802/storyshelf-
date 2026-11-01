"use client";

import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { MOODS, getMoodPicks, type Mood, type MoodRecommendations } from "@/lib/api/library";
import { formatReadingTime } from "@/lib/libraryBook";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { AiMetaChip } from "@/components/ai/AiMetaChip";
import { RecommendationRail } from "./RecommendationRail";

const MAX_MOODS = 4;
const LENGTHS = [
  { v: null, l: "Any length" },
  { v: 180, l: "One evening" },
  { v: 600, l: "A weekend" },
] as const;
const EXAMPLES = ["something short and hopeful for a rainy evening", "a dark tale that keeps me up at night", "an adventure on the open sea"];

/** "What are you in the mood for?": pick moods or describe a feeling, and the AI librarian finds the books. */
export function MoodPicker() {
  const [moods, setMoods] = useState<Mood[]>([]);
  const [text, setText] = useState("");
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MoodRecommendations | null>(null);

  const toggle = (m: Mood) => setMoods((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : cur.length < MAX_MOODS ? [...cur, m] : cur));
  const ready = moods.length > 0 || text.trim().length >= 3;

  const find = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await getMoodPicks({ moods, text, maxMinutes }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const reading = result?.interpreted;
  return (
    <section aria-labelledby="mood-title" className="container-x pt-20">
      <div className="rounded-2xl border border-line bg-[radial-gradient(80%_120%_at_0%_0%,var(--c-accent-soft),transparent_60%),var(--c-surface)] p-6 md:p-10">
        <p className="eyebrow flex items-center gap-2">
          <Sparkles className="size-3.5" /> AI librarian
        </p>
        <h2 id="mood-title" className="display-md mt-3">
          What are you in the <em className="gold-text italic">mood</em> for?
        </h2>
        <p className="mt-3 max-w-2xl text-muted">Pick a feeling or two, or just describe it. The AI reads your request, searches the shelves by meaning, and tells you why each book fits.</p>

        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Moods (choose up to four)">
          {MOODS.map((m) => {
            const on = moods.includes(m);
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(m)}
                className={cn("rounded-pill border px-4 py-2 text-sm capitalize transition-colors", on ? "border-accent bg-accent text-on-accent" : "border-line-strong text-muted hover:border-accent hover:text-fg")}
              >
                {m}
              </button>
            );
          })}
        </div>

        <form
          className="mt-6 flex flex-col gap-3 lg:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !busy) void find();
          }}
        >
          <label className="flex-1">
            <span className="sr-only">Describe what you feel like reading</span>
            <input
              value={text}
              maxLength={200}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Or describe it: “${EXAMPLES[0]}”`}
              className="w-full rounded-pill border border-line-strong bg-raised px-5 py-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </label>
          <div className="flex gap-2" role="group" aria-label="How long">
            {LENGTHS.map((o) => (
              <button
                key={o.l}
                type="button"
                aria-pressed={maxMinutes === o.v}
                onClick={() => setMaxMinutes(o.v)}
                className={cn("rounded-pill border px-4 py-2 text-xs", maxMinutes === o.v ? "border-accent text-accent" : "border-line-strong text-muted hover:text-fg")}
              >
                {o.l}
              </button>
            ))}
          </div>
          <Button type="submit" disabled={!ready || busy}>
            <Wand2 className="size-4" /> {busy ? "Searching the shelves…" : "Find my book"}
          </Button>
        </form>
        {!text && !moods.length && (
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-faint">
            Try:
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setText(ex)} className="underline-offset-2 hover:text-accent hover:underline">
                {ex}
              </button>
            ))}
          </p>
        )}

        <div aria-live="polite">
          {error && (
            <p role="alert" className="mt-6 text-sm text-danger">
              {error}
            </p>
          )}
          {busy && !result && (
            <div className="mt-8 flex gap-4 overflow-hidden" aria-busy="true">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="skeleton h-44 w-[300px] shrink-0 rounded-xl" />
              ))}
            </div>
          )}
          {result && reading && (
            <div className={cn("mt-8 transition-opacity", busy && "opacity-50")}>
              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                <span>
                  Reading this as:{" "}
                  <span className="text-fg">
                    {[...reading.moods, ...reading.themes].join(" · ") || "a great read"}
                    {reading.maxMinutes ? ` · under ${formatReadingTime(reading.maxMinutes)}` : ""}
                  </span>
                </span>
                {result.parseMeta && <AiMetaChip meta={result.parseMeta} />}
                {result.meta && <AiMetaChip meta={result.meta} />}
              </div>
              {result.items.length ? (
                <RecommendationRail items={result.items} label="Books for your mood" />
              ) : (
                <p className="text-sm text-muted">Nothing fits all of that yet. Try fewer moods or a longer reading time.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
