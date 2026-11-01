"use client";

import { useEffect, useState } from "react";
import type { Book } from "@/types";
import { theme } from "@/theme";
import { frontCoverUrl, loadCanvasFonts } from "@/lib/cover/paint";
import { bookDims } from "@/lib/cover/dims";
import { cn } from "@/lib/utils";
import { bookSwatch } from "@/lib/cover/swatch";

// paint covers one at a time in idle time so grids never jank
let queue: Promise<unknown> = Promise.resolve();
const idle = () =>
  new Promise<void>((r) => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(() => r(), { timeout: 400 });
    else setTimeout(r, 16);
  });

function useCoverUrl(book: Book, height: number) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    queue = queue.then(async () => {
      if (!alive) return;
      await idle();
      const fonts = await loadCanvasFonts();
      if (!alive) return;
      try {
        const u = frontCoverUrl(book, theme, fonts, height);
        if (alive) setUrl(u);
      } catch {
        /* keep the typographic fallback */
      }
    });
    return () => {
      alive = false;
    };
  }, [book, height]);
  return url;
}

/** Flat front cover that matches the 3D book exactly (same painter). */
export function BookCover({ book, className, height = 720, priority }: { book: Book; className?: string; height?: number; priority?: boolean }) {
  const url = useCoverUrl(book, height);
  const d = bookDims(book);
  const sw = bookSwatch(theme, book);
  return (
    <div
      className={cn("relative overflow-hidden rounded-[2px_5px_5px_2px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.75)]", className)}
      style={{ aspectRatio: `${d.lenFront} / ${d.H}`, background: sw.base }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated data URL
        <img src={url} alt={`Cover of ${book.title} by ${book.author}`} className="absolute inset-0 size-full animate-fade-in object-cover" loading={priority ? "eager" : "lazy"} draggable={false} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-[12%] text-center" style={{ color: book.finish === "cloth" ? sw.foil : sw.ink }}>
          <span className="font-serif text-[clamp(0.6rem,1.4vw,1rem)] font-semibold uppercase leading-tight">{book.title}</span>
          <span className="font-sans text-[0.55rem] uppercase tracking-[0.2em] opacity-80">{book.author}</span>
        </div>
      )}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_40%)]" />
    </div>
  );
}
