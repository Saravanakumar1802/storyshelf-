import type { Metadata } from "next";
import { ArrowDown, Clock } from "lucide-react";
import { designFaq, designMeta, designProcess, fileChecklist } from "@/data/publish/bookDesign";
import { PageHero3D } from "@/components/ui/PageHero3D";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CoverCompare, CoverFold, InteriorSpread, WrapCalculator } from "@/components/publish-guides/DesignVisuals";
import { AnatomyStory, CoverPrinciples, DesignProcess, Finishes, FontPairings, TrimSizes } from "@/components/publish-guides/DesignSections";
import { GuideBlockView } from "@/components/publish-guides/GuideBlocks";
import { FaqSection, GuideCta } from "@/components/publish-guides/GuideBits";
import { requireRoute } from "@/config/gate";

export const metadata: Metadata = {
  title: "How to design a book",
  description: designMeta.intro,
};

export default function BookDesignPage() {
  // switched off for now — see src/config/features.ts
  requireRoute("/publish/book-design");
  return (
    <main>
      <PageHero3D
        eyebrow="Publish · Design"
        title={
          <>
            How to <em className="gold-text italic">design</em> a book.
          </>
        }
        intro={designMeta.intro}
        visual={<CoverFold />}
      >
        <p className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            <Clock className="size-4 text-accent" /> <span className="num text-fg">{designMeta.readMinutes}</span> min read
          </span>
          <a href="#anatomy" className="inline-flex items-center gap-2 text-accent hover:underline">
            Start with the anatomy <ArrowDown className="size-4" />
          </a>
        </p>
      </PageHero3D>

      <AnatomyStory />
      <TrimSizes />

      <section className="container-x py-24" aria-labelledby="wrap-title">
        <SectionHeader eyebrow="The cover wrap" title={<span id="wrap-title">Front, spine and back are one sheet.</span>} intro="A printed cover is a single flat wrap. Its width depends on your trim size and on the spine — which grows with your page count and paper. Try it." />
        <div className="mt-12">
          <WrapCalculator />
        </div>
      </section>

      <section className="border-y border-line bg-surface py-24" aria-labelledby="cover-title">
        <div className="container-x grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <CoverCompare />
          <div>
            <SectionHeader eyebrow="Cover design" title={<span id="cover-title">What makes a cover work.</span>} />
            <div className="mt-10">
              <CoverPrinciples />
            </div>
          </div>
        </div>
      </section>

      <section className="container-x py-24" aria-labelledby="interior-title">
        <SectionHeader eyebrow="Interior design" title={<span id="interior-title">Pages that are a pleasure to read.</span>} intro="Good typesetting is invisible: the reader simply keeps turning pages. Tap an element to see where it lives on the spread." />
        <div className="mt-12">
          <InteriorSpread />
        </div>
        <div className="mt-20">
          <p className="eyebrow">Type pairings</p>
          <h3 className="display-md mt-3">Fonts that suit the story.</h3>
          <div className="mt-10">
            <FontPairings />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface py-24" aria-labelledby="finish-title">
        <div className="container-x">
          <SectionHeader eyebrow="Paper & finishes" title={<span id="finish-title">How it feels in the hand.</span>} intro="Paper tone, lamination and binding change how a book looks, feels and lasts. Hover a lamination to see its sheen." />
          <div className="mt-12">
            <Finishes />
          </div>
        </div>
      </section>

      <section className="container-x grid gap-14 py-24 lg:grid-cols-[0.9fr_1.1fr]" aria-labelledby="files-title">
        <div>
          <SectionHeader eyebrow="Print-ready files" title={<span id="files-title">The printer’s checklist.</span>} intro="Whether you design it yourself or with us, these are the specifications your files must meet." />
        </div>
        <GuideBlockView block={{ type: "checklist", title: "Print-ready files", items: fileChecklist }} chapterId="book-design-files" index={0} />
      </section>

      <section className="border-t border-line py-24" aria-labelledby="process-title">
        <div className="container-x">
          <SectionHeader align="center" eyebrow="Designing with StoryShelf" title={<span id="process-title">From brief to beautiful, in {designProcess.length} steps.</span>} className="mx-auto" />
          <div className="mt-14">
            <DesignProcess />
          </div>
        </div>
      </section>

      <FaqSection items={designFaq} />
      <GuideCta current="/publish/book-design" title="Want a cover readers can’t scroll past?" />
    </main>
  );
}
