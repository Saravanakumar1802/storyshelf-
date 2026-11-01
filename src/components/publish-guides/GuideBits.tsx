import Link from "@/components/ui/SiteLink";
import { ArrowRight, CalendarDays } from "lucide-react";
import type { FaqItem } from "@/data/publish/types";
import { publishGuides } from "@/data/site";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

/** Questions and answers, as an accordion (first one open). */
export function FaqSection({ items, title = "Questions authors ask", id = "faq" }: { items: FaqItem[]; title?: string; id?: string }) {
  return (
    <section id={id} className="container-x grid gap-12 py-24 lg:grid-cols-[0.8fr_1.2fr]" aria-label="Frequently asked questions">
      <SectionHeader eyebrow="FAQ" title={title} intro="Still unsure? A Publishing Consultant will answer anything else — free, with no obligation." />
      <Reveal>
        <Accordion items={items.map((f, i) => ({ id: `q${i}`, title: f.q, body: <p className="max-w-2xl leading-relaxed text-muted">{f.a}</p> }))} defaultOpen={["q0"]} />
      </Reveal>
    </section>
  );
}

/** Closing call to action, plus links to the other Publish guides. */
export function GuideCta({ current, title = "Ready to see your book on the shelf?" }: { current: string; title?: string }) {
  const others = publishGuides.filter((g) => g.href !== current);
  return (
    <section className="container-x pb-8 pt-12" aria-label="Next steps">
      <Reveal className="relative overflow-hidden rounded-xl border border-accent/40 bg-[linear-gradient(150deg,var(--c-surface-raised),var(--c-bg-deep))] p-8 md:p-14">
        <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-[radial-gradient(circle,var(--c-accent-soft),transparent_70%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="eyebrow">Your next step</p>
            <h2 className="display-md mt-4 max-w-[18ch]">{title}</h2>
            <p className="mt-5 max-w-xl text-muted">Start online in minutes, or talk it through with a Publishing Consultant first. Either way, you approve every step.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/publish" size="lg">
                Start publishing <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/support/consultation" variant="ghost" size="lg">
                <CalendarDays className="size-4" /> Free consultation
              </ButtonLink>
            </div>
          </div>
          <ul className="space-y-3">
            {others.map((g) => (
              <li key={g.href}>
                <Link href={g.href} className={cn("group flex items-center justify-between gap-4 rounded-lg border border-line bg-bg/60 p-4 transition-colors hover:border-accent/60")}>
                  <span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{g.kicker}</span>
                    <span className="mt-0.5 block font-serif text-lg text-fg">{g.label}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-faint transition-[color,transform] group-hover:translate-x-1 group-hover:text-accent" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
