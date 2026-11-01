"use client";

import { bookHref } from "@/lib/libraryBook";
import Link from "@/components/ui/SiteLink";
import { useEffect, useRef, useState } from "react";
import { BookmarkCheck, BookmarkPlus, Check, ChevronDown } from "lucide-react";
import type { ShelfStatus } from "@/lib/api/library";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";
import { useShelfStatus } from "@/lib/store/shelf-status";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";

export const SHELF_LABEL: Record<ShelfStatus, string> = { want: "Want to read", reading: "Reading", finished: "Finished" };
const ORDER: ShelfStatus[] = ["want", "reading", "finished"];

/** "Add to My Library": puts a book on one of the reader's three shelves. */
export function ShelfButton({ slug, title }: { slug: string; title: string }) {
  const hydrated = useHydrated();
  const signedIn = useAuth((s) => !!s.user);
  const { status, load, set, remove } = useShelfStatus();
  const current = status[slug];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (signedIn) void load().catch(() => undefined);
  }, [signedIn, load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !menu.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const base = "inline-flex h-12 items-center gap-2 rounded-pill border px-6 text-sm font-medium transition-colors";
  if (!hydrated || !signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(bookHref(slug))}`} className={cn(base, "border-line-strong text-fg hover:border-accent")}>
        <BookmarkPlus className="size-4" /> Add to My Library
      </Link>
    );
  }

  const choose = async (next: ShelfStatus | null) => {
    setOpen(false);
    setBusy(true);
    try {
      if (next) {
        await set(slug, next);
        toast.success(`${title}: ${SHELF_LABEL[next]}`, "Saved to My Library");
      } else {
        await remove(slug);
        toast.success("Removed from My Library", title);
      }
    } catch (e) {
      toast.error("Couldn't update your shelf", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={menu} className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={() => (current ? setOpen((v) => !v) : void choose("want"))}
        aria-haspopup={current ? "menu" : undefined}
        aria-expanded={current ? open : undefined}
        className={cn(base, current ? "border-accent bg-accent-soft text-accent" : "border-line-strong text-fg hover:border-accent", busy && "opacity-60")}
      >
        {current ? <BookmarkCheck className="size-4" /> : <BookmarkPlus className="size-4" />}
        {current ? SHELF_LABEL[current] : "Add to My Library"}
        {current && <ChevronDown className="size-4" />}
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-lg border border-line-strong bg-raised py-1 shadow-lifted">
          {ORDER.map((s) => (
            <button key={s} type="button" role="menuitem" onClick={() => choose(s)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-hover">
              {SHELF_LABEL[s]} {s === current && <Check className="size-4 text-accent" />}
            </button>
          ))}
          <button type="button" role="menuitem" onClick={() => choose(null)} className="w-full border-t border-line px-4 py-2.5 text-left text-sm text-muted hover:bg-hover">
            Remove from My Library
          </button>
        </div>
      )}
    </div>
  );
}
