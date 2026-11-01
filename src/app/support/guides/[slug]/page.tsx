import type { Metadata } from "next";
import Link from "@/components/ui/SiteLink";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, Lightbulb } from "lucide-react";
import { guideBySlug, guides } from "@/data/support";
import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";

export const dynamicParams = false;

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/support/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug(slug);
  return g ? { title: g.title, description: g.summary } : {};
}

export default async function GuidePage({ params }: PageProps<"/support/guides/[slug]">) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) notFound();
  const i = guides.findIndex((x) => x.slug === g.slug);
  const next = guides[(i + 1) % guides.length];
  return (
    <main className="container-x max-w-3xl pb-16 pt-32 md:pt-40">
      <Link href="/support" className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent">
        <ArrowLeft className="size-4" /> Help centre
      </Link>
      <Reveal>
        <p className="eyebrow mt-10">Guide · {g.stage}</p>
        <h1 className="display-lg mt-4">{g.title}</h1>
        <p className="mt-5 text-lg text-muted">{g.summary}</p>
        <p className="mt-4 flex items-center gap-2 text-xs text-faint">
          <Clock className="size-3.5" /> {g.readMinutes} min read
        </p>
      </Reveal>
      <article className="mt-14 space-y-12">
        {g.sections.map((s, k) => (
          <Reveal as="section" key={s.heading} delay={k * 40}>
            <h2 className="font-display text-3xl">
              <span className="mr-3 font-mono text-sm text-accent">0{k + 1}</span>
              {s.heading}
            </h2>
            <p className="mt-4 leading-relaxed text-muted">{s.body}</p>
            {s.tips && (
              <ul className="mt-5 space-y-2 rounded-lg border border-accent/30 bg-accent-soft p-5 text-sm">
                {s.tips.map((t) => (
                  <li key={t} className="flex gap-2 text-fg">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" /> {t}
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        ))}
      </article>
      <div className="mt-16 rounded-xl border border-line bg-surface p-8">
        <p className="font-serif text-xl">Still have a question?</p>
        <p className="mt-2 text-sm text-muted">Our team answers within one working day.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href={`/support/ticket?subject=${encodeURIComponent(`Question about: ${g.title}`)}`}>Ask our team</ButtonLink>
          <ButtonLink href="/support/consultation" variant="ghost">
            Book a call
          </ButtonLink>
        </div>
      </div>
      <Link href={`/support/guides/${next.slug}`} className="group mt-10 flex items-center justify-between border-t border-line pt-8">
        <span>
          <span className="eyebrow">Next guide</span>
          <span className="mt-2 block font-display text-3xl group-hover:text-accent">{next.title}</span>
        </span>
        <ArrowRight className="size-6 text-faint group-hover:text-accent" />
      </Link>
    </main>
  );
}
