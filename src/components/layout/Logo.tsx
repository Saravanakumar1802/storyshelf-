import Link from "@/components/ui/SiteLink";
import { cn } from "@/lib/utils";
import { BRAND, MARK } from "@/lib/brand";

/** The StoryShelf mark: an open book on a shelf, drawn as line art (inherits currentColor). */
export function LogoMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", className)} aria-hidden>
      {MARK.strokes.map((d, i) => (
        <path key={d} d={d} pathLength={1} className={animated ? "logo-trace" : undefined} style={animated ? { animationDelay: `${i * 70}ms` } : undefined} />
      ))}
      {MARK.sparks.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.5} fill="currentColor" stroke="none" className={animated ? "logo-pad" : undefined} style={animated ? { animationDelay: `${700 + i * 80}ms` } : undefined} />
      ))}
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label={`${BRAND.name} — home`} className={cn("group flex items-center gap-2.5 text-fg", className)}>
      <LogoMark className="h-8 w-8 text-accent transition-transform duration-500 ease-book group-hover:scale-110" />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-[1.2rem] font-semibold tracking-tight">
          Story<span className="text-accent">Shelf</span>
        </span>
        <span className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.32em] text-muted">{BRAND.descriptor}</span>
      </span>
    </Link>
  );
}
