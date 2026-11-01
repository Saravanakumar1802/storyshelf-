import { HeroShelf } from "@/components/hero/HeroShelf";
import { ManuscriptStory } from "@/components/sections/home/ManuscriptStory";
import { AwardsTeaser, FaqPreview, Marquee, NewOnShelf, PlansPreview, PromiseBand, ReadAndPublish, Testimonials } from "@/components/sections/home/HomeSections";

export default function HomePage() {
  return (
    <main>
      <HeroShelf />
      <Marquee />
      <ReadAndPublish />
      <NewOnShelf />
      <ManuscriptStory />
      <PromiseBand />
      <PlansPreview />
      <Testimonials />
      <AwardsTeaser />
      <FaqPreview />
    </main>
  );
}
