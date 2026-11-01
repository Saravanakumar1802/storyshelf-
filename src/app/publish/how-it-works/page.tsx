import type { Metadata } from "next";
import { howItWorksFaq } from "@/data/publish/howItWorks";
import { EarningsExample, HowItWorksHero, JourneyTimeline, Promises, WhatYouNeed } from "@/components/publish-guides/HowItWorksSections";
import { JourneyStory } from "@/components/publish-guides/JourneyStory";
import { FaqSection, GuideCta } from "@/components/publish-guides/GuideBits";
import { requireRoute } from "@/config/gate";

export const metadata: Metadata = {
  title: "How it works",
  description: "From your first consultation to royalties: the StoryShelf publishing journey in eight clear stages — who does what, and when. Typically 6–8 weeks to a live book.",
};

export default function HowItWorksPage() {
  // switched off for now — see src/config/features.ts
  requireRoute("/publish/how-it-works");
  return (
    <main>
      <HowItWorksHero />
      <JourneyStory />
      <WhatYouNeed />
      <JourneyTimeline />
      <EarningsExample />
      <Promises />
      <FaqSection items={howItWorksFaq} />
      <GuideCta current="/publish/how-it-works" />
    </main>
  );
}
