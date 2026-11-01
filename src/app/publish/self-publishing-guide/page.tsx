import type { Metadata } from "next";
import { BookOpen, Check, Clock, RefreshCw } from "lucide-react";
import { guideMeta, selfPublishingFaq, selfPublishingGuide } from "@/data/publish/selfPublishingGuide";
import { PageHero3D } from "@/components/ui/PageHero3D";
import { GuideReader } from "@/components/publish-guides/GuideReader";
import { OpenBookVisual } from "@/components/publish-guides/OpenBookVisual";
import { FaqSection, GuideCta } from "@/components/publish-guides/GuideBits";
import { requireRoute } from "@/config/gate";

export const metadata: Metadata = {
  title: "How to self-publish a book",
  description: guideMeta.intro,
};

export default function SelfPublishingGuidePage() {
  // switched off for now — see src/config/features.ts
  requireRoute("/publish/self-publishing-guide");
  return (
    <main>
      <PageHero3D
        eyebrow="Publish · The guide"
        title={
          <>
            How to <em className="gold-text italic">self-publish</em> a book.
          </>
        }
        intro={guideMeta.intro}
        visual={<OpenBookVisual />}
      >
        <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            <Clock className="size-4 text-accent" /> <span className="num text-fg">{guideMeta.readMinutes}</span> min read
          </span>
          <span className="inline-flex items-center gap-2">
            <BookOpen className="size-4 text-accent" /> <span className="num text-fg">{selfPublishingGuide.length}</span> chapters
          </span>
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="size-4 text-accent" /> Updated {guideMeta.updated}
          </span>
        </p>
        <div className="mt-8 rounded-xl border border-line bg-surface/80 p-6 backdrop-blur">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">What you’ll learn</p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {guideMeta.learn.map((l) => (
              <li key={l} className="flex gap-2.5 text-sm leading-relaxed text-fg/90">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" /> {l}
              </li>
            ))}
          </ul>
        </div>
      </PageHero3D>
      <GuideReader chapters={selfPublishingGuide} />
      <FaqSection items={selfPublishingFaq} />
      <GuideCta current="/publish/self-publishing-guide" />
    </main>
  );
}
