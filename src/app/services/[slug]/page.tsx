import type { Metadata } from "next";
import Link from "@/components/ui/SiteLink";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { serviceBySlug, services } from "@/data/services";
import { PageHero3D } from "@/components/ui/PageHero3D";
import { BookAssemblyVisual } from "@/components/sections/BookAssemblyVisual";
import { serviceSwatch } from "@/data/showcase";
import { Emblem } from "@/components/ui/Emblem";
import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { JsonLd, serviceLd } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = serviceBySlug(slug);
  return s ? { title: s.title, description: s.short, alternates: { canonical: `/services/${s.slug}` } } : {};
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const s = serviceBySlug(slug);
  if (!s) notFound();
  const idx = services.findIndex((x) => x.slug === s.slug);
  const next = services[(idx + 1) % services.length];

  return (
    <main>
      <JsonLd data={serviceLd(s)} />
      <PageHero3D
        eyebrow={`Service ${s.number} / 05`}
        title={s.title}
        intro={s.description}
        visual={<BookAssemblyVisual variant={{ key: s.slug, emblem: s.emblem, swatch: serviceSwatch[s.slug] ?? 0 }} />}
      >
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/publish">
            Start publishing <ArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink href="/support/consultation" variant="ghost">
            Talk to a consultant
          </ButtonLink>
        </div>
      </PageHero3D>

      <section className="container-x py-24">
        <SectionHeader eyebrow="What’s included" title="Crafted, not processed." />
        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {s.includes.map((inc, i) => (
            <Reveal key={inc.title} delay={i * 60} className="bg-bg p-8">
              <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 font-serif text-xl">{inc.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{inc.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface py-24">
        <div className="container-x">
          <SectionHeader eyebrow="How it works" title="A clear path, start to finish." />
          <ol className="mt-14 grid gap-8 md:grid-cols-4">
            {s.process.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 90} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full border border-accent font-mono text-sm text-accent">{i + 1}</span>
                  {i < s.process.length - 1 && <span className="hidden h-px flex-1 bg-line-strong md:block" />}
                </div>
                <h3 className="mt-5 font-serif text-xl">{p.title}</h3>
                <p className="mt-2 text-sm text-muted">{p.text}</p>
              </Reveal>
            ))}
          </ol>
          <Reveal className="mt-14 flex flex-col items-start gap-4 rounded-xl border border-line-strong p-6 md:flex-row md:items-center">
            <Emblem name={s.emblem} className="size-10 shrink-0 text-accent" />
            <p className="flex-1 text-sm text-muted">{s.planNote}</p>
            <Link href="/plans" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
              See plans <ArrowUpRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="container-x pt-24">
        <Link href={`/services/${next.slug}`} className="group flex items-center justify-between gap-6 border-b border-line pb-10">
          <div>
            <p className="eyebrow">Next service</p>
            <p className="display-md mt-3 transition-colors group-hover:text-accent">{next.title}</p>
          </div>
          <span className="grid size-16 shrink-0 place-items-center rounded-full border border-line-strong transition-all duration-500 group-hover:rotate-[-45deg] group-hover:border-accent group-hover:text-accent">
            <ArrowRight className="size-6" />
          </span>
        </Link>
      </section>
    </main>
  );
}
