import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/layout/Logo";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { Reveal } from "@/components/motion/Reveal";

/** Editorial page header used by inner pages. */
export function PageHero({ eyebrow, title, intro, children, className }: { eyebrow: string; title: ReactNode; intro?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={cn("relative overflow-hidden border-b border-line pb-16 pt-36 md:pb-24 md:pt-44", className)}>
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[520px] rounded-full bg-[radial-gradient(circle,var(--c-accent-soft),transparent_65%)]" />
      <LogoMark animated className="pointer-events-none absolute right-[6%] top-32 hidden size-56 text-accent/15 lg:block" />
      <div className="container-x relative">
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
        </Reveal>
        <SplitHeading as="h1" className="display-xl mt-5 max-w-[16ch]">
          {title}
        </SplitHeading>
        {intro && (
          <Reveal delay={150}>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted md:text-lg">{intro}</p>
          </Reveal>
        )}
        {children && <Reveal delay={250}>{children}</Reveal>}
      </div>
    </header>
  );
}
