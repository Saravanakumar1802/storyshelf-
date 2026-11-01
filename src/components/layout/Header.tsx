"use client";

import Link from "@/components/ui/SiteLink";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, UserRound, X } from "lucide-react";
import { mainNav } from "@/data/site";
import { homeFor, useAuth } from "@/lib/store/auth";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";
import { features, isRouteEnabled } from "@/config/features";
import { Logo } from "./Logo";
import { MenuOverlay } from "./MenuOverlay";
import { PublishMenu } from "./PublishMenu";
import { AiStatusDot } from "@/components/ai/AiStatusDot";

/** Sign in, or the signed-in account's home (authors: dashboard, readers: library). */
function AccountLink() {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const signedIn = hydrated && user;
  return (
    <Link
      href={signedIn ? homeFor(user) : "/login"}
      aria-label={signedIn ? ({ author: "Author dashboard", admin: "Admin console", reader: "Your library" } as const)[user.role] : "Sign in"}
      className="grid size-10 place-items-center rounded-full text-fg transition-colors hover:bg-hover"
    >
      {signedIn ? (
        <span className="grid size-7 place-items-center rounded-full bg-accent-soft font-serif text-xs font-semibold text-accent">{user.name.slice(0, 1)}</span>
      ) : (
        <UserRound className="size-4.5" />
      )}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      // hide on scroll down, reveal on scroll up
      if (Math.abs(y - lastY.current) > 6) setHidden(y > lastY.current && y > 240);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // sticky in-page bars (e.g. the plan comparison header) sit just below the header
  useEffect(() => {
    document.documentElement.style.setProperty("--header-offset", hidden && !menuOpen ? "0px" : "var(--header-h)");
  }, [hidden, menuOpen]);

  // close the menu on navigation
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color] duration-500 ease-book",
          hidden && !menuOpen ? "-translate-y-full" : "translate-y-0",
          scrolled || menuOpen ? "glass border-b border-line" : "border-b border-transparent",
        )}
      >
        <div className="container-x flex h-16 items-center justify-between gap-6 md:h-20">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {mainNav.map((l) => {
              // switched-off sections stay in the bar, visibly disabled (src/config/features.ts)
              if (!isRouteEnabled(l.href)) {
                return (
                  <span key={l.href} aria-disabled="true" title="Coming soon" className="cursor-not-allowed rounded-pill px-4 py-2 text-sm text-muted opacity-40">
                    {l.label}
                  </span>
                );
              }
              return l.menu === "publish" ? (
                <PublishMenu key={l.href} active={isActive("/publish")} />
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative rounded-pill px-4 py-2 text-sm text-muted transition-colors hover:text-fg",
                    isActive(l.href) && "text-fg after:absolute after:inset-x-4 after:-bottom-0.5 after:h-px after:bg-accent",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1.5">
            <AiStatusDot />
            {features.accounts && <AccountLink />}
            {/* wrapper owns visibility: the button's own inline-flex would override `hidden` */}
            <span className="ml-2 hidden sm:block">
              <ButtonLink href="/publish" size="sm">
                Publish your book
              </ButtonLink>
            </span>
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="ml-1 grid size-10 place-items-center rounded-full text-fg hover:bg-hover lg:hidden"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>
      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
