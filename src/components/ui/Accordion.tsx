"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  title: string;
  body: React.ReactNode;
}

/** Accessible disclosure list (one open at a time by default). */
export function Accordion({ items, multiple = false, className, defaultOpen = [] }: { items: AccordionItem[]; multiple?: boolean; className?: string; defaultOpen?: string[] }) {
  const [open, setOpen] = useState<string[]>(defaultOpen);
  const base = useId();
  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : multiple ? [...o, id] : [id]));
  return (
    <ul className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((it) => {
        const isOpen = open.includes(it.id);
        const panel = `${base}-${it.id}`;
        return (
          <li key={it.id}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => toggle(it.id)}
                className="group flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="font-serif text-lg text-fg transition-colors group-hover:text-accent md:text-xl">{it.title}</span>
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border border-line-strong transition-transform duration-500 ease-book", isOpen && "rotate-45 border-accent text-accent")}>
                  <Plus className="size-4" />
                </span>
              </button>
            </h3>
            <div id={panel} role="region" className={cn("grid transition-[grid-template-rows] duration-500 ease-book", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <div className="overflow-hidden">
                <div className="max-w-3xl pb-6 text-sm leading-relaxed text-muted md:text-base">{it.body}</div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
