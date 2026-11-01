import type { Metadata } from "next";
import { ArrowDown } from "lucide-react";
import { PageHero3D } from "@/components/ui/PageHero3D";
import { PlansClient } from "@/components/plans/PlansClient";
import { PlanVolumesVisual } from "@/components/plans/PlanVolumesVisual";
import { plans } from "@/data/plans";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Plans & pricing",
  description: "Kickstart ₹19,999, Level-Up ₹49,999 and Pro ₹99,999 (GST extra). Compare every service — editing, design, distribution, marketing and royalties.",
};

export default function PlansPage() {
  const from = Math.min(...plans.map((p) => p.price));
  return (
    <main>
      <PageHero3D
        eyebrow="Plans & pricing"
        title={
          <>
            Three plans. <em className="gold-text italic">Your</em> copyright, always.
          </>
        }
        intro="Every plan includes ISBN, barcode, a non-exclusive digital agreement, a Publishing Consultant and Publication Manager, national & global distribution — and a better share of the profit from every sale."
        visual={<PlanVolumesVisual />}
      >
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <a href="#plan-levelUp" className="inline-flex items-center gap-2 rounded-pill bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-bright">
            See the plans <ArrowDown className="size-4" />
          </a>
          <p className="text-sm text-muted">
            From <span className="num text-lg text-fg">{formatINR(from)}</span> · one-time, GST extra
          </p>
        </div>
      </PageHero3D>
      <PlansClient />
    </main>
  );
}
