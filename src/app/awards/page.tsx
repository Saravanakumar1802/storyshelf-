import type { Metadata } from "next";
import { Award, CalendarDays, Trophy, Users } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";

export const metadata: Metadata = {
  title: "StoryShelf Awards",
  description: "An annual celebration of the finest books published with StoryShelf. Every author on every plan is eligible.",
};

const categories = ["Fiction of the Year", "Non-fiction of the Year", "Poetry Prize", "Debut Author", "Best Cover Design", "Readers’ Choice"];

export default function AwardsPage() {
  return (
    <main>
      <PageHero
        eyebrow="StoryShelf Awards"
        title={
          <>
            A night for the <em className="gold-text italic">stories</em> that stayed with us.
          </>
        }
        intro="Every book published with StoryShelf — on any plan — is automatically eligible. Juried by editors, critics and booksellers, with one prize chosen entirely by readers."
      />
      <section className="container-x py-24">
        <SectionHeader eyebrow="Categories" title="Six prizes, one gala." />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <Reveal as="li" key={c} delay={i * 60} className="flex items-center gap-4 rounded-lg border border-line p-6">
              <Trophy className="size-6 shrink-0 text-accent" />
              <span className="font-serif text-xl">{c}</span>
            </Reveal>
          ))}
        </ul>
      </section>
      <section className="border-y border-line bg-surface py-24">
        <div className="container-x grid gap-10 md:grid-cols-3">
          {[
            { I: Award, t: "Eligibility", d: "Any title published with StoryShelf between 1 Jan and 31 Dec. Entry is automatic." },
            { I: Users, t: "Judging", d: "A rotating jury of editors, critics and independent booksellers; Readers’ Choice by public vote." },
            { I: CalendarDays, t: "Timeline", d: "Longlist in February, shortlist in March, winners announced at the April gala in Bengaluru." },
          ].map(({ I, t, d }, i) => (
            <Reveal key={t} delay={i * 80}>
              <I className="size-8 text-accent" />
              <h3 className="mt-5 font-display text-3xl">{t}</h3>
              <p className="mt-3 text-muted">{d}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="container-x grid gap-12 py-24 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeader eyebrow="Questions" title="Good to know." />
        <Accordion
          items={[
            { id: "a1", title: "Do I need to apply?", body: "No. Every eligible book is entered automatically. You'll receive an email if your book is longlisted." },
            { id: "a2", title: "Is there an entry fee?", body: "None. The awards are free for all StoryShelf authors on every plan." },
            { id: "a3", title: "What do winners receive?", body: "A trophy, a feature across our channels and the StoryShelf Library, a winner's seal on future printings, and a marketing package for the winning title." },
          ]}
        />
      </section>
      <section className="container-x text-center">
        <ButtonLink href="/publish" size="lg">
          Publish your book — you&rsquo;re automatically eligible
        </ButtonLink>
      </section>
    </main>
  );
}
