import type { Metadata } from "next";
import { Check } from "lucide-react";
import { ConsultationBooking } from "@/components/support/ConsultationBooking";

export const metadata: Metadata = { title: "Book a free consultation", description: "30 minutes with a StoryShelf Publishing Consultant — free, with no obligation." };

export default function ConsultationPage() {
  return (
    <main className="container-x grid gap-14 pb-16 pt-32 md:pt-40 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p className="eyebrow">Free consultation</p>
        <h1 className="display-lg mt-4">
          Thirty minutes that <em className="gold-text italic">change</em> everything.
        </h1>
        <p className="mt-5 text-muted">Talk through your book with a Publishing Consultant. No pressure, no obligation — just honest advice.</p>
        <ul className="mt-8 space-y-3 text-sm">
          {["Which plan fits your goals and budget", "A realistic timeline for your book", "How editing, design and distribution work", "Your rights, royalties and the agreement"].map((t) => (
            <li key={t} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" /> {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-line bg-surface p-6 md:p-10">
        <ConsultationBooking />
      </div>
    </main>
  );
}
