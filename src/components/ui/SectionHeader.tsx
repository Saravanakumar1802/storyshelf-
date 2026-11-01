import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { Reveal } from "@/components/motion/Reveal";

export function SectionHeader({
  eyebrow,
  title,
  intro,
  align = "left",
  className,
  as = "h2",
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <Reveal>
        <p className="eyebrow">{eyebrow}</p>
      </Reveal>
      <SplitHeading as={as} className={cn("mt-4", as === "h1" ? "display-xl" : "display-lg")}>
        {title}
      </SplitHeading>
      {intro && (
        <Reveal delay={150}>
          <p className={cn("mt-6 max-w-2xl text-base leading-relaxed text-muted md:text-lg", align === "center" && "mx-auto")}>{intro}</p>
        </Reveal>
      )}
    </div>
  );
}
