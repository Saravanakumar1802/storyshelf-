import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Inner-page hero with a 3D visual beside the copy (stacked on phones).
 * `visual` is usually a <SceneShell/>-hosted scene with a static fallback.
 */
export function PageHero3D({
  eyebrow,
  title,
  intro,
  children,
  visual,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  visual: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("relative overflow-hidden border-b border-line pt-28 md:pt-32", className)}>
      <div aria-hidden className="pointer-events-none absolute -left-40 top-0 size-[620px] rounded-full bg-[radial-gradient(circle,var(--c-accent-soft),transparent_65%)]" />
      <div className="container-x relative grid items-center gap-6 lg:min-h-[640px] lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
        <div className="relative z-10 pb-4 lg:pb-20">
          <Reveal>
            <p className="eyebrow">{eyebrow}</p>
          </Reveal>
          <SplitHeading as="h1" className="display-lg mt-5 max-w-[15ch] lg:text-[clamp(2.6rem,4.6vw,4.6rem)]">
            {title}
          </SplitHeading>
          {intro && (
            <Reveal delay={150}>
              <p className="mt-8 max-w-xl text-base leading-relaxed text-muted md:text-lg">{intro}</p>
            </Reveal>
          )}
          {children && <Reveal delay={250}>{children}</Reveal>}
        </div>
        <div className="relative -mx-4 h-[380px] sm:h-[460px] lg:mx-0 lg:h-[640px]">{visual}</div>
      </div>
    </header>
  );
}
