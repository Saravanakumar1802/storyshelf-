"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

/**
 * Accessible tabs (WAI-ARIA tabs pattern): arrow keys / Home / End move
 * between tabs, a gold underline slides to the active one. Every panel is
 * rendered (inactive ones `hidden`), so all content is in the server HTML.
 */
export function Tabs({ items, label, className }: { items: TabItem[]; label: string; className?: string }) {
  const uid = useId();
  const [active, setActive] = useState(items[0]?.id);
  const tabs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const list = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  // measure the active tab for the sliding indicator (and keep it in view)
  useLayoutEffect(() => {
    const el = tabs.current.get(active);
    const host = list.current;
    const ind = bar.current;
    if (!el || !host || !ind) return;
    const measure = () => {
      ind.style.width = `${el.offsetWidth}px`;
      ind.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [active]);

  const focusTab = (i: number) => {
    const item = items[(i + items.length) % items.length];
    setActive(item.id);
    const el = tabs.current.get(item.id);
    el?.focus();
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((t) => t.id === active);
    const keys: Record<string, () => void> = {
      ArrowRight: () => focusTab(i + 1),
      ArrowLeft: () => focusTab(i - 1),
      Home: () => focusTab(0),
      End: () => focusTab(items.length - 1),
    };
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  };

  return (
    <div className={className}>
      <div
        ref={list}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="relative flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                if (el) tabs.current.set(t.id, el);
                else tabs.current.delete(t.id);
              }}
              id={`${uid}-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${uid}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              className={cn(
                "relative shrink-0 whitespace-nowrap px-4 py-4 text-sm transition-colors duration-300 md:px-5",
                selected ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {t.label}
            </button>
          );
        })}
        <span ref={bar} aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-0 bg-accent transition-[transform,width] duration-500 ease-book" />
      </div>
      {items.map((t) => (
        <div
          key={t.id}
          id={`${uid}-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-${t.id}`}
          hidden={t.id !== active}
          tabIndex={0}
          className="animate-panel-in pt-10 focus-visible:outline-none"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
