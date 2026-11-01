import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ButtonLink } from "@/components/ui/Button";
import { CountBand, StackedValues, StoryScroll, TeamReveal } from "@/components/sections/about/AboutMotion";
import { journey, services } from "@/data/services";
import { plans } from "@/data/plans";

export const metadata: Metadata = {
  title: "About",
  description: "StoryShelf is a publishing house built for authors — combining editorial craft with modern, transparent publishing.",
};

const values = [
  { t: "Authors first", d: "Your copyright, your voice, your earnings. Every decision we make starts there." },
  { t: "Craft over volume", d: "We would rather publish one beautiful book than ten forgettable ones." },
  { t: "Radical transparency", d: "Clear prices, clear timelines, clear royalty statements. No small print." },
  { t: "Here for the long run", d: "Publication day is the beginning. We stay with you for every edition after." },
];

const team = [
  { n: "Arjun Menon", r: "Head of Publishing Consultants" },
  { n: "Sana Qureshi", r: "Lead Publication Manager" },
  { n: "Priya Raghavan", r: "Author Support" },
  { n: "Dev Iyer", r: "Art Director" },
];

export default function AboutPage() {
  return (
    <main>
      <PageHero
        eyebrow="About StoryShelf"
        title={
          <>
            A shelf for every story, <em className="gold-text italic">including</em> yours.
          </>
        }
        intro="Our name is our promise. A shelf is where stories wait to be found: the classics we can all read free, the new books worth every page, and the one you have not finished yet. Our mark is an open book on that shelf, with a spark rising from its pages."
      />

      <StoryScroll
        eyebrow="Our story"
        title="A publishing house for the people who write."
        paragraphs={[
          "StoryShelf began with a simple frustration: talented writers were being asked to choose between giving away their rights and doing everything themselves.",
          "We built a third way — the editorial and design care of a traditional house, with the ownership and transparency of self-publishing.",
          "Today our editors, designers, marketers and publication managers help authors across India take a manuscript all the way to a beautifully made, widely available book — and earn more from every copy sold.",
        ]}
      />

      <CountBand
        items={[
          { value: services.length, label: "crafts under one roof, from editing to marketing" },
          { value: journey.length, label: "clear stages from first call to royalties" },
          { value: plans.length, label: "transparent plans, one-time fee, GST extra" },
          { value: 1, label: "dedicated manager for your whole journey" },
        ]}
      />

      <section className="container-x pt-24 md:pt-32">
        <SectionHeader eyebrow="What we believe" title="Four promises, kept." />
        <StackedValues items={values} />
      </section>

      <section className="container-x py-24">
        <SectionHeader eyebrow="The people" title="Who you'll work with." />
        <TeamReveal team={team} />
        <div className="mt-16 flex flex-wrap gap-3">
          <ButtonLink href="/publish">Publish with us</ButtonLink>
          <ButtonLink href="/contact" variant="ghost">
            Get in touch
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
