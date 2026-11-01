"use client";

import Link from "@/components/ui/SiteLink";
import { useEffect, useRef } from "react";
import { mainNav, publishGuides } from "@/data/site";
import { supportChannels } from "@/data/support";
import { cn, pad2 } from "@/lib/utils";
import { isRouteEnabled } from "@/config/features";
import { getLenis } from "./SmoothScroll";

/** Full-screen editorial menu for small screens. Locks scroll, traps Esc. */
export function MenuOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const first = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // sections that are switched off stay listed, visibly disabled; the wizard entry only shows when it's on
  const items = [...mainNav, ...(isRouteEnabled("/publish") ? [{ href: "/publish", label: "Publish your book" }] : [])];
  const firstOn = items.findIndex((l) => isRouteEnabled(l.href));

  return (
    <div
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "fixed inset-0 z-40 bg-bg/95 backdrop-blur-xl transition-[opacity,clip-path] duration-700 ease-book lg:hidden",
        open ? "opacity-100 [clip-path:inset(0_0_0_0)]" : "pointer-events-none opacity-0 [clip-path:inset(0_0_100%_0)]",
      )}
    >
      <nav className="container-x flex h-full flex-col justify-between pb-10 pt-28">
        <ul className="flex flex-col gap-1">
          {items.map((l, i) => (
            <li
              key={l.href}
              className={cn("transition-all duration-700 ease-book", open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}
              style={{ transitionDelay: open ? `${120 + i * 60}ms` : "0ms" }}
            >
              <Link ref={i === firstOn ? first : undefined} href={l.href} onClick={onClose} className={cn("group flex items-baseline gap-4 py-2", !isRouteEnabled(l.href) && "opacity-35")}>
                <span className="font-mono text-xs text-accent">{pad2(i + 1)}</span>
                <span className="font-display text-4xl font-light text-fg transition-colors group-hover:text-accent sm:text-5xl">{l.label}</span>
              </Link>
              {"menu" in l && l.menu === "publish" && isRouteEnabled(l.href) && (
                <ul className="mb-2 ml-9 flex flex-col gap-1 border-l border-line pl-4">
                  {publishGuides.map((g) => (
                    <li key={g.href}>
                      <Link href={g.href} onClick={onClose} className="block py-1 text-base text-muted transition-colors hover:text-accent">
                        {g.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <div className="space-y-1 text-sm text-muted">
          <p>{supportChannels.email}</p>
          <p>{supportChannels.phone}</p>
          <p className="text-faint">{supportChannels.hours}</p>
        </div>
      </nav>
    </div>
  );
}
