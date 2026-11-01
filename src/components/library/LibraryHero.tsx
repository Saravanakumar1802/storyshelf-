"use client";

import dynamic from "next/dynamic";
import { ArrowDown, ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { featuredBooks as books } from "@/data/books";
import { theme } from "@/theme";
import { useCarousel } from "@/lib/store/carousel";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { cn, pad2 } from "@/lib/utils";
import { bookHref, formatReadingTime } from "@/lib/libraryBook";
import { ButtonLink } from "@/components/ui/Button";
import { SceneShell } from "@/components/three/SceneShell";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { BookCover } from "./BookCover";

const BookCarousel = dynamic(() => import("@/components/three/scenes/BookCarousel"), { ssr: false });

/** Static stand-in (and no-WebGL fallback): three covers fanned in CSS 3D. */
function Fallback() {
  const picks = [1, 0, 2];
  return (
    <div className="grid size-full place-items-center [perspective:1400px] lg:pl-[38%]">
      <div className="relative h-[52%] w-[min(560px,80%)] [transform-style:preserve-3d]">
        {picks.map((bi, i) => (
          <div
            key={books[bi].id}
            className="absolute top-0 w-[34%]"
            style={{ left: `${33 * i}%`, transform: `translateZ(${i === 1 ? 60 : 0}px) rotateY(${(1 - i) * 18}deg)` }}
          >
            <BookCover book={books[bi]} className="w-full" height={560} priority={i === 1} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Caption() {
  const index = useCarousel((s) => s.index);
  const count = useCarousel((s) => s.count);
  const step = useCarousel((s) => s.step);
  const book = books[index] ?? books[0];
  return (
    <div className="glass pointer-events-auto w-full max-w-[380px] rounded-xl border border-line p-5">
      <div key={book.id} className="animate-panel-in">
        <div className="flex items-center justify-between border-t border-line-strong pt-3 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted">
          <span className="num">
            Nº {pad2(index + 1)} / {pad2(count || books.length)}
          </span>
          <span>{book.genre}</span>
        </div>
        <p className="mt-2 font-display text-3xl font-light leading-tight text-fg md:text-4xl">{book.title}</p>
        <p className="mt-1 text-sm text-muted">{book.author}</p>
        <p className="mt-3 flex items-center gap-3 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-accent" /> <span className="num">{formatReadingTime(book.readingMinutes)}</span>
          </span>
          <span className="text-fg">Free to read</span>
        </p>
      </div>
      <div className="mt-5 flex items-center gap-2">
        <button type="button" aria-label="Previous book" onClick={() => step(-1)} className="grid size-10 place-items-center rounded-full border border-line-strong text-fg transition-colors hover:border-accent hover:text-accent">
          <ArrowLeft className="size-4" />
        </button>
        <button type="button" aria-label="Next book" onClick={() => step(1)} className="grid size-10 place-items-center rounded-full border border-line-strong text-fg transition-colors hover:border-accent hover:text-accent">
          <ArrowRight className="size-4" />
        </button>
        <ButtonLink href={bookHref(book.slug)} size="sm" className="ml-auto">
          View book <ArrowRight className="size-4" />
        </ButtonLink>
      </div>
    </div>
  );
}

/** Library hero: the catalogue as a turning ring of real 3D books. */
export function LibraryHero() {
  const reduced = useReducedMotion();
  return (
    <section aria-label="The StoryShelf Library" className="relative h-[100svh] max-h-[960px] min-h-[640px] overflow-hidden" style={{ background: theme.scene.background }}>
      <div className="absolute inset-0">
        <SceneShell className="size-full" fallback={<Fallback />}>
          {({ active, onReady, onFatal }) => <BookCarousel books={books} active={active} reducedMotion={reduced} onReady={onReady} onFatal={onFatal} />}
        </SceneShell>
      </div>

      {/* legibility */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/2 bg-gradient-to-r from-bg/80 to-transparent lg:block" />

      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-end pb-24 pt-28 md:pb-14">
        <div className="container-x flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="pointer-events-auto max-w-xl">
            <p className="eyebrow animate-panel-in">The StoryShelf Library</p>
            <SplitHeading as="h1" className="display-lg mt-4">
              The classics, <em className="gold-text italic">free</em> to read.
            </SplitHeading>
            <p className="mt-5 hidden max-w-md text-sm leading-relaxed text-muted animate-panel-in [animation-delay:200ms] sm:block md:text-base">
              Real public-domain books, read right here in the app — with an AI librarian that recommends by mood, summarises chapters and answers questions about your shelf.
            </p>
            <a href="#catalogue" className="mt-6 inline-flex items-center gap-2 text-sm text-accent hover:underline">
              Browse all books <ArrowDown className="size-4" />
            </a>
          </div>
          <Caption />
        </div>
        <p className={cn("container-x mt-6 hidden font-mono text-[0.62rem] uppercase tracking-[0.22em] text-faint md:block")}>Drag to turn · click a book to bring it forward · click again to open it</p>
      </div>
    </section>
  );
}
