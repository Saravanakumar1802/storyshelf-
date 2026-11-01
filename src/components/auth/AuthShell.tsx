import type { ReactNode } from "react";
import { showcaseBooks as books } from "@/data/showcaseBooks";
import { BookCover } from "@/components/library/BookCover";

/** Split layout for sign-in/up: form on one side, a fanned stack of covers on the other. */
export function AuthShell({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children: ReactNode }) {
  const fan = [books[6], books[0], books[10]];
  return (
    <main className="container-x grid min-h-[100svh] items-center gap-16 pb-16 pt-28 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-md animate-panel-in">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display-md mt-3">{title}</h1>
        <div className="mt-10">{children}</div>
      </div>
      <div aria-hidden className="relative hidden h-[560px] lg:block">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--c-accent-soft),transparent_65%)]" />
        {fan.map((b, i) => (
          <div
            key={b.id}
            className="absolute left-1/2 top-1/2 w-56"
            style={{ transform: `translate(-50%,-50%) translateX(${(i - 1) * 120}px) rotate(${(i - 1) * 9}deg)`, zIndex: i === 1 ? 2 : 1 }}
          >
            {/* separate element: the float keyframes animate `transform` too */}
            <div className="animate-float" style={{ animationDelay: `${i * 0.8}s` }}>
              <BookCover book={b} className="w-full" height={600} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
