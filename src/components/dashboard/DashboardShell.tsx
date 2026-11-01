"use client";

import Link from "@/components/ui/SiteLink";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BarChart3, BookOpen, LayoutDashboard, LifeBuoy, LogOut, Megaphone } from "lucide-react";
import { isAuthor, type AuthorUser } from "@/types";
import { errorMessage, getDashboard, logout, type DashboardData } from "@/lib/api";
import { useAuth } from "@/lib/store/auth";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { planById } from "@/data/plans";
import { planColor } from "@/lib/planColor";
import { cn } from "@/lib/utils";
import { FormError } from "@/components/ui/Form";
import { ButtonLink } from "@/components/ui/Button";

interface Ctx {
  user: AuthorUser;
  data: DashboardData | null;
  error: string | null;
  reload: () => void;
}
const DashboardContext = createContext<Ctx | null>(null);

export function useDashboard() {
  const c = useContext(DashboardContext);
  if (!c) throw new Error("useDashboard must be used inside <DashboardShell>");
  return c;
}

const nav = [
  { href: "/dashboard", label: "Overview", I: LayoutDashboard },
  { href: "/dashboard/books", label: "My books", I: BookOpen },
  { href: "/dashboard/royalties", label: "Royalties", I: BarChart3 },
  { href: "/dashboard/marketing", label: "Marketing", I: Megaphone },
  { href: "/dashboard/support", label: "Support", I: LifeBuoy },
];

function Loader() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton h-10 w-2/3 rounded-md" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-28 rounded-xl" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );
}

function Provider({ user, children }: { user: AuthorUser; children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    getDashboard()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e) => alive && setError(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [user, attempt]);
  const reload = useCallback(() => {
    setError(null);
    setAttempt((a) => a + 1);
  }, []);
  return <DashboardContext.Provider value={{ user, data, error, reload }}>{children}</DashboardContext.Provider>;
}

/** Client-side auth gate + sidebar for every /dashboard page. */
export function DashboardShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  // set while signing out on purpose, so the guard below doesn't bounce to the sign-in page
  const leaving = useRef(false);

  useEffect(() => {
    if (hydrated && !user && !leaving.current) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, user, router, pathname]);

  if (!hydrated || !user)
    return (
      <main className="container-x pb-24 pt-32">
        <Loader />
      </main>
    );

  if (!isAuthor(user))
    return (
      <main className="container-x pb-24 pt-32">
        <div className="mx-auto max-w-xl rounded-xl border border-line bg-surface p-10 text-center">
          <p className="eyebrow">Author dashboard</p>
          <h1 className="display-md mt-3">This space is for our authors.</h1>
          <p className="mt-4 text-muted">You&rsquo;re signed in as a reader. Your shelves and AI picks live in the library — or start publishing to get a dashboard of your own.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/library">Go to the library</ButtonLink>
            <ButtonLink href="/publish" variant="ghost">
              Publish a book
            </ButtonLink>
          </div>
        </div>
      </main>
    );

  const plan = planById(user.plan);
  return (
    <Provider user={user}>
      <main className="container-x grid gap-10 pb-24 pt-28 lg:grid-cols-[230px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft font-serif text-lg text-accent">{user.name.slice(0, 1)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-xs" style={{ color: planColor[user.plan] }}>
                {plan.name} plan
              </p>
            </div>
          </div>
          <nav aria-label="Dashboard" className="mt-4 flex gap-1 overflow-x-auto lg:flex-col">
            {nav.map(({ href, label, I }) => {
              const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors", active ? "bg-accent-soft text-accent" : "text-muted hover:bg-hover hover:text-fg")}
                >
                  <I className="size-4" /> {label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                leaving.current = true;
                router.replace("/");
                void logout();
              }}
              className="flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted transition-colors hover:bg-hover hover:text-fg lg:mt-4"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </nav>
        </aside>
        <section className="min-w-0">{children}</section>
      </main>
    </Provider>
  );
}

/** Renders children once dashboard data is ready; handles loading/error/retry. */
export function WithData({ children }: { children: (d: DashboardData, user: AuthorUser) => ReactNode }) {
  const { data, error, reload, user } = useDashboard();
  if (error) return <FormError message={error} onRetry={reload} />;
  if (!data) return <Loader />;
  return <>{children(data, user)}</>;
}
