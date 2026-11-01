import type { Metadata } from "next";
import { PageHero3D } from "@/components/ui/PageHero3D";
import { ButtonLink } from "@/components/ui/Button";
import { ServicesStack } from "@/components/sections/services/ServicesStack";
import { BookAssemblyVisual } from "@/components/sections/BookAssemblyVisual";
import { services } from "@/data/services";
import { JsonLd, serviceListLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Services",
  description: "Writing & editing, book production, marketing & publicity, publishing management and author support — everything an author needs, under one roof.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <main>
      <JsonLd data={serviceListLd(services)} />
      <PageHero3D
        eyebrow="What we do"
        title={
          <>
            Everything between <em className="gold-text italic">your idea</em> and a reader&rsquo;s hands.
          </>
        }
        intro="We help authors from the beginning to the end of publishing. Five crafts, one team, and a single promise: a book you're proud of, on a shelf where readers will find it."
        visual={<BookAssemblyVisual variant={{ key: "services", emblem: "quill", swatch: 0 }} />}
      >
        <p className="mt-8 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-faint">Scroll — and watch your book come together</p>
      </PageHero3D>
      <ServicesStack />
      <section className="container-x pt-10 text-center">
        <p className="eyebrow">Not sure where to start?</p>
        <h2 className="display-md mx-auto mt-4 max-w-[20ch]">Talk to a Publishing Consultant — it&rsquo;s free.</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/support/consultation">Book a consultation</ButtonLink>
          <ButtonLink href="/plans" variant="ghost">
            Compare plans
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
