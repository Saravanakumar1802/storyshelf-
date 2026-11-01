import type { Metadata } from "next";
import { supportChannels } from "@/data/support";
import { PageHero } from "@/components/ui/PageHero";
import { HelpSearch } from "@/components/support/HelpSearch";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChannelGrid, GuidesTrack, TeamRelay } from "@/components/sections/support/SupportMotion";

export const metadata: Metadata = {
  title: "Author Support",
  description: "We work with you every step of the way. Guides, FAQs, tickets, consultations and a team that's a message away.",
};

export default function SupportPage() {
  return (
    <main>
      <PageHero
        eyebrow="Author Support"
        title={
          <>
            With you <em className="gold-text italic">every step</em> of the way.
          </>
        }
        intro="We work with you every step of the way to make the process easy while creating great results — before you sign, while your book is made, and long after it's on the shelf."
      >
        <HelpSearch />
      </PageHero>

      <section className="container-x py-24">
        <SectionHeader eyebrow="Reach us" title="Real people, real answers." intro={`${supportChannels.hours}. Tickets raised outside these hours are answered the next working day.`} />
        <ChannelGrid />
      </section>

      <GuidesTrack />

      <section className="container-x py-24">
        <SectionHeader eyebrow="Who supports you" title="A team for every stage." intro="Your book is handed from one specialist to the next — and you always know who to talk to." />
        <TeamRelay />
      </section>
    </main>
  );
}
