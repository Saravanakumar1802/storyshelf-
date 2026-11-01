import Link from "@/components/ui/SiteLink";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { isRouteEnabled } from "@/config/features";

type Variant = "primary" | "ghost" | "subtle" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-medium tracking-wide transition-[background,color,border-color,box-shadow,transform] duration-300 ease-book focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";
const variants: Record<Variant, string> = {
  primary: "rounded-pill bg-accent text-on-accent hover:bg-accent-bright hover:shadow-glow",
  ghost: "rounded-pill border border-line-strong text-fg hover:border-accent hover:text-accent",
  subtle: "rounded-pill bg-raised text-fg hover:bg-hover",
  link: "text-accent underline-offset-4 hover:underline",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

interface Common {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

function Shine({ variant }: { variant: Variant }) {
  if (variant !== "primary") return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25 opacity-0 transition-all duration-700 ease-out group-hover/btn:left-[120%] group-hover/btn:opacity-100"
    />
  );
}

export function Button({ variant = "primary", size = "md", className, children, ...rest }: Common & ComponentProps<"button">) {
  return (
    <button className={cn(base, variant !== "link" && sizes[size], variants[variant], className)} {...rest}>
      <Shine variant={variant} />
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "primary", size = "md", className, children, ...rest }: Common & ComponentProps<typeof Link>) {
  // a call to action whose screen is switched off renders as a disabled button
  if (typeof rest.href === "string" && !isRouteEnabled(rest.href)) {
    return (
      <button type="button" disabled className={cn(base, variant !== "link" && sizes[size], variants[variant], "disabled:opacity-45", className)}>
        {children}
        <span className="sr-only"> (coming soon)</span>
      </button>
    );
  }
  return (
    <Link className={cn(base, variant !== "link" && sizes[size], variants[variant], className)} {...rest}>
      <Shine variant={variant} />
      {children}
    </Link>
  );
}
