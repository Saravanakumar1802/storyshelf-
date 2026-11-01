import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { features } from "@/config/features";
import { Suspense } from "react";
import { PublishWizard } from "@/components/publish/PublishWizard";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Start publishing",
  description: "Tell us about your book, choose a plan, see your quote and book a free consultation — in about five minutes.",
};

export default function PublishPage() {
  // switched off for now — see src/config/features.ts
  if (!features.publishWizard) notFound();
  return (
    <main className="container-x max-w-5xl pb-16 pt-32 md:pt-40">
      <Reveal>
        <p className="eyebrow">Start publishing</p>
        <h1 className="display-lg mt-4">
          Let&rsquo;s make <em className="gold-text italic">your</em> book.
        </h1>
        <p className="mt-5 max-w-2xl text-muted">Five minutes, six short steps. You&rsquo;ll see your full quote before anything is booked — and nothing is charged today.</p>
      </Reveal>
      <div className="mt-12">
        <Suspense fallback={<div className="py-32 text-center text-muted">Preparing your publishing desk…</div>}>
          <PublishWizard />
        </Suspense>
      </div>
    </main>
  );
}
