"use client";

import { featuredBooks as books } from "@/data/books";
import { theme } from "@/theme";
import { useShelf } from "@/lib/store/shelf";
import { cn } from "@/lib/utils";
import { bookSwatch } from "@/lib/cover/swatch";
import { LogoMark } from "@/components/layout/Logo";

/**
 * DOM/CSS shelf shown when WebGL is unavailable or the 3D scene fails.
 * Spines are styled from the same theme swatches as the 3D covers, and it
 * drives the same store, so the info panel and keyboard controls still work.
 */
export function FallbackShelf() {
  const featured = useShelf((s) => s.featured);
  const hovered = useShelf((s) => s.hovered);
  const spotlight = useShelf((s) => s.spotlight);
  const feature = useShelf((s) => s.feature);
  const hover = useShelf((s) => s.hover);

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pb-[24vh] pt-20">
      <p aria-hidden className="pointer-events-none absolute top-[9%] select-none whitespace-nowrap font-display text-[17vw] font-light leading-none text-fg/[0.14]">
        StoryShelf
      </p>
      {/* the row slides left when a book is out, making room for the info panel */}
      <div className={cn("relative transition-transform duration-700 ease-book", featured !== null && "md:-translate-x-[18vw]")}>
        <div className="relative flex items-end gap-[3px] [perspective:1400px]">
          {books.map((b, i) => {
            const sw = bookSwatch(theme, b);
            const h = Math.round((b.trim.height / 234) * 40);
            const w = Math.max(24, Math.round(b.pages / 10));
            const out = featured === i ? 2 : hovered === i || spotlight === i ? 1 : 0;
            return (
              <button
                key={b.id}
                type="button"
                aria-label={`${b.title} by ${b.author}`}
                aria-pressed={featured === i}
                onMouseEnter={() => hover(i)}
                onMouseLeave={() => hover(null)}
                onClick={() => feature(featured === i ? null : i)}
                className="relative flex flex-col items-center justify-between rounded-[3px] py-3 shadow-lifted transition-transform duration-500 ease-book"
                style={{
                  height: `${h}vh`,
                  width: `${w}px`,
                  background: `linear-gradient(90deg, rgba(0,0,0,0.35), rgba(255,255,255,0.08) 18%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.25)), ${sw.base}`,
                  color: b.finish === "cloth" ? sw.foil : sw.ink,
                  transform: `translateY(${out * -14}px) translateZ(${out * 40}px) rotateX(${out ? -4 : 0}deg)`,
                }}
              >
                <span className="h-px w-3/4 bg-current opacity-70" />
                <span className="truncate font-serif text-[12px] font-semibold tracking-wide [writing-mode:vertical-rl]">{b.title}</span>
                <LogoMark className="size-3.5 opacity-80" />
              </button>
            );
          })}
        </div>
        <div aria-hidden className="-mx-10 h-3 rounded-sm bg-linear-to-b from-hover to-deep shadow-lifted" />
      </div>
    </div>
  );
}
