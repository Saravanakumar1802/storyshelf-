"use client";

import Link from "@/components/ui/SiteLink";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, MessageCircleQuestion, Plug, RotateCcw, Sparkles } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { getRecommendationsForMe, getShelf, type ReaderRecommendations, type ShelfItem, type ShelfStatus } from "@/lib/api/library";
import { bookHref, readerHref } from "@/lib/libraryBook";
import { useAuth } from "@/lib/store/auth";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AiMetaChip } from "@/components/ai/AiMetaChip";
import { BookCover } from "./BookCover";
import { RecommendationRail } from "./RecommendationRail";
import { SHELF_LABEL } from "./ShelfButton";

const TABS: ShelfStatus[] = ["reading", "want", "finished"];

function ShelfCard({ item }: { item: ShelfItem }) {
  const { book } = item;
  const pct = Math.round(item.progress * 100);
  return (
    <li className="group">
      <Link href={bookHref(book.slug)} className="block rounded-lg bg-surface p-5 transition-colors group-hover:bg-raised" aria-label={`${book.title} by ${book.author}`}>
        <div className="mx-auto w-[72%]">
          <BookCover book={book} className="w-full" height={520} />
        </div>
      </Link>
      <p className="mt-3 font-serif text-lg leading-tight">{book.title}</p>
      <p className="text-sm text-muted">{book.author}</p>
      {item.status !== "want" && (
        <div className="mt-3" aria-label={`${pct}% read`}>
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(pct, 3)}%` }} />
          </div>
          <p className="mt-1 text-xs text-faint">{item.status === "finished" ? "Finished" : `Chapter ${item.chapter + 1} of ${book.chapterCount} · ${pct}%`}</p>
        </div>
      )}
      {item.status !== "finished" && (
        <Link href={readerHref(book.slug, item.chapter)} className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
          <BookOpen className="size-3.5" /> {item.status === "reading" ? "Continue" : "Start reading"}
        </Link>
      )}
    </li>
  );
}

function ForMe() {
  const [recs, setRecs] = useState<ReaderRecommendations | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getRecommendationsForMe()
      .then(setRecs)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  if (error) return null; // recommendations are a bonus; the shelves still work
  return (
    <section aria-labelledby="for-me" className="mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Sparkles className="size-3.5" /> Picked for you
          </p>
          <h2 id="for-me" className="display-md mt-3">
            Because you read&hellip;
          </h2>
          {recs && recs.basis.length > 0 && <p className="mt-2 max-w-2xl text-sm text-muted">Drawn from {recs.basis.slice(0, 4).join(", ")}{recs.basis.length > 4 ? " and more" : ""}.</p>}
        </div>
        {recs?.meta && <AiMetaChip meta={recs.meta} />}
      </div>
      <div className="mt-6">
        {!recs ? (
          <div className="flex gap-4 overflow-hidden" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton h-44 w-[300px] shrink-0 rounded-xl" />
            ))}
          </div>
        ) : recs.items.length ? (
          <RecommendationRail items={recs.items} label="Recommended for you" />
        ) : (
          <p className="text-sm text-muted">{recs.note}</p>
        )}
      </div>
    </section>
  );
}

/** /library/shelf: the reader's three shelves and AI picks drawn from them. */
export function MyLibrary() {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<ShelfItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ShelfStatus>("reading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (hydrated && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, user, router, pathname]);

  useEffect(() => {
    if (!user) return;
    getShelf()
      .then((list) => {
        setItems(list);
        setError(null);
        // open on the first shelf that has books
        const first = TABS.find((t) => list.some((i) => i.status === t));
        if (first) setTab(first);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [user, attempt]);

  if (!hydrated || !user) return <div className="container-x min-h-[60vh] pt-40" />;

  const counts = Object.fromEntries(TABS.map((t) => [t, items?.filter((i) => i.status === t).length ?? 0])) as Record<ShelfStatus, number>;
  const shown = items?.filter((i) => i.status === tab) ?? [];
  return (
    <main className="container-x pb-28 pt-32 md:pt-40">
      <p className="eyebrow">My Library</p>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="display-lg mt-4">
          {user.name.split(" ")[0]}&rsquo;s <em className="gold-text italic">shelves</em>.
        </h1>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/library/ask" variant="ghost">
            <MessageCircleQuestion className="size-4" /> Ask My Library
          </ButtonLink>
          <ButtonLink href="/library/connect" variant="ghost">
            <Plug className="size-4" /> Connect your AI
          </ButtonLink>
        </div>
      </div>

      <div role="tablist" aria-label="Shelves" className="mt-10 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("relative px-4 py-3 text-sm transition-colors", tab === t ? "text-fg after:absolute after:inset-x-4 after:-bottom-px after:h-0.5 after:bg-accent" : "text-muted hover:text-fg")}
          >
            {SHELF_LABEL[t]} <span className="num ml-1 text-faint">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-10">
        {error ? (
          <div className="py-16 text-center" role="alert">
            <p className="text-muted">{error}</p>
            <Button variant="ghost" className="mt-6" onClick={() => setAttempt((a) => a + 1)}>
              <RotateCcw className="size-4" /> Try again
            </Button>
          </div>
        ) : !items ? (
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-lg" />
            ))}
          </div>
        ) : shown.length ? (
          <ul className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
            {shown.map((item) => (
              <ShelfCard key={item.book.id} item={item} />
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-line p-10 text-center">
            <p className="font-display text-2xl">Nothing here yet.</p>
            <p className="mt-2 text-sm text-muted">Add books from their pages, or let the AI librarian suggest some by mood.</p>
            <ButtonLink href="/library" className="mt-6">
              Browse the library
            </ButtonLink>
          </div>
        )}
      </div>

      {items && items.length > 0 && <ForMe />}
    </main>
  );
}
