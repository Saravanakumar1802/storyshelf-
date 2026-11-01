import type { Metadata } from "next";
import { Layers, ShieldCheck, Sparkles } from "lucide-react";
import { ModelStatusPanel } from "@/components/ai/ModelStatusPanel";

export const metadata: Metadata = {
  title: "AI status — the models behind the library",
  description:
    "See which AI models power the StoryShelf Library right now: free-tier models from six providers with automatic fallback, live health, response times and recent activity.",
  alternates: { canonical: "/ai" },
};

const HOW = [
  {
    I: Layers,
    t: "Six providers, one chain",
    d: "Free-tier models from Groq, Cerebras, Google Gemini, Mistral, GitHub Models and OpenRouter line up behind every task. When one reaches its quota, the next answers, usually without you noticing.",
  },
  {
    I: Sparkles,
    t: "Every answer is labelled",
    d: "AI answers carry a small chip naming the model that wrote them and how long it took. Tap it to see which models were tried first.",
  },
  {
    I: ShieldCheck,
    t: "What we record",
    d: "For each call we keep which model answered, how long it took and whether it failed, for 14 days. Never your question and never the answer.",
  },
];

export default function AiStatusPage() {
  return (
    <main className="container-x pb-28 pt-32 md:pt-40">
      <header className="max-w-3xl">
        <p className="eyebrow">Transparent AI</p>
        <h1 className="display-lg mt-4">
          The models behind <em className="gold-text italic">the library</em>.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          Recommendations, chapter summaries and Ask My Library are written by language models. This page shows, live, which ones are working right now and how they share the load.
        </p>
      </header>

      <ul className="mt-14 grid gap-4 md:grid-cols-3">
        {HOW.map(({ I, t, d }) => (
          <li key={t} className="rounded-xl border border-line p-6">
            <I className="size-5 text-accent" />
            <p className="mt-4 font-serif text-lg">{t}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
          </li>
        ))}
      </ul>

      <div className="mt-16">
        <ModelStatusPanel />
      </div>
    </main>
  );
}
