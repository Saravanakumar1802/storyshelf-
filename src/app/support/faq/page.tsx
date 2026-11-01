import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/ui/PageHero";
import { FaqBrowser } from "@/components/support/FaqBrowser";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Answers about plans, royalties, ISBN & rights, distribution, editing, payments and support at StoryShelf.",
};

export default function FaqPage() {
  return (
    <main>
      <PageHero
        eyebrow="Help centre · FAQs"
        title={
          <>
            Questions, <em className="gold-text italic">answered</em>.
          </>
        }
      />
      <section className="container-x max-w-4xl py-16">
        <Suspense>
          <FaqBrowser />
        </Suspense>
      </section>
    </main>
  );
}
