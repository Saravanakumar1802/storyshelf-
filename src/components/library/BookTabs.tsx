import Link from "@/components/ui/SiteLink";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { LibraryBookDetail } from "@/types";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { formatReadingTime, readerHref } from "@/lib/libraryBook";
import { cn } from "@/lib/utils";

const WPM = 238;

function Opening({ book }: { book: LibraryBookDetail }) {
  return (
    <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <p className="eyebrow">How it begins</p>
        <blockquote className="mt-5 font-display text-2xl italic leading-relaxed text-fg first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-[4.2rem] first-letter:not-italic first-letter:leading-[0.8] first-letter:text-accent md:text-[1.7rem]">
          {book.opening}
        </blockquote>
        <Link href={readerHref(book.slug)} className="mt-8 inline-flex items-center gap-2 text-sm text-accent hover:underline">
          Keep reading <ArrowRight className="size-4" />
        </Link>
      </div>
      {book.subjects.length > 0 && (
        <aside className="h-fit rounded-xl border border-line bg-surface p-7">
          <p className="eyebrow">Subjects</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {book.subjects.map((s) => (
              <li key={s} className="rounded-pill border border-line-strong px-3 py-1 text-xs text-muted">
                {s.replace(/ -- /g, " · ")}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}

function Contents({ book }: { book: LibraryBookDetail }) {
  return (
    <div className="mx-auto max-w-3xl">
      <ol className="divide-y divide-line border-y border-line">
        {book.toc.map((e) => (
          <li key={e.index}>
            <Link href={readerHref(book.slug, e.index)} className="group flex items-baseline gap-4 py-3.5">
              <span className="num w-8 shrink-0 text-xs text-faint">{String(e.index + 1).padStart(2, "0")}</span>
              <span className="font-serif text-lg text-fg transition-colors group-hover:text-accent">{e.title}</span>
              <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-line-strong" />
              <span className="num shrink-0 text-sm text-muted">{formatReadingTime(Math.max(1, Math.round(e.words / WPM)))}</span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-right text-xs text-faint">
        <span className="num">{book.chapterCount}</span> chapters · <span className="num">{formatReadingTime(book.readingMinutes)}</span> in all
      </p>
    </div>
  );
}

const NUMERIC = new Set(["Words", "Reading time", "Chapters"]);

function Details({ book }: { book: LibraryBookDetail }) {
  const others = book.contributors.filter((c) => c.role !== "author");
  const rows: [string, string][] = [
    ["Author", book.authorYears ? `${book.author} (${book.authorYears})` : book.author],
    ...others.map((c): [string, string] => [c.role[0].toUpperCase() + c.role.slice(1), c.years ? `${c.name} (${c.years})` : c.name]),
    ["Genre", book.genre],
    ["Language", book.language],
    ["Words", book.words.toLocaleString("en-IN")],
    ["Reading time", formatReadingTime(book.readingMinutes)],
    ["Chapters", String(book.chapterCount)],
    ["Rights", "Public domain"],
  ];
  return (
    <div>
      <dl className="grid gap-x-10 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-6 border-b border-line py-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{k}</dt>
            <dd className={cn("text-right text-sm text-fg", NUMERIC.has(k) && "num")}>{v}</dd>
          </div>
        ))}
      </dl>
      {/* acknowledgement of the source text, as its licence asks */}
      <p className="mt-8 text-sm text-muted">
        Text from{" "}
        <a href={book.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
          {book.source.name} <ExternalLink className="size-3.5" />
        </a>
        , prepared for reading in the StoryShelf Library.
      </p>
    </div>
  );
}

/** How it begins · Contents · Details. */
export function BookTabs({ book }: { book: LibraryBookDetail }) {
  const items: TabItem[] = [
    { id: "opening", label: "How it begins", content: <Opening book={book} /> },
    {
      id: "contents",
      label: (
        <>
          Contents <span className="num ml-1 text-faint">{book.chapterCount}</span>
        </>
      ),
      content: <Contents book={book} />,
    },
    { id: "details", label: "Details", content: <Details book={book} /> },
  ];
  return (
    <section className="container-x pb-24" aria-label="About this book">
      <Tabs items={items} label={`About ${book.title}`} />
    </section>
  );
}
