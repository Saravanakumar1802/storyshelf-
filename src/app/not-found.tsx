import Link from "@/components/ui/SiteLink";
import { featuredBooks as books } from "@/data/books";
import { CssBook } from "@/components/library/CssBook";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="container-x grid min-h-[100svh] items-center gap-16 pb-16 pt-28 lg:grid-cols-2">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="display-xl mt-5">
          This page fell <em className="gold-text italic">off the shelf</em>.
        </h1>
        <p className="mt-6 max-w-md text-muted">The page you&rsquo;re looking for has been moved, renamed, or was never written. Let&rsquo;s get you back to the good stuff.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/">Back to the shelf</ButtonLink>
          <ButtonLink href="/library" variant="ghost">
            Browse books
          </ButtonLink>
        </div>
        <p className="mt-8 text-sm text-faint">
          Need help? <Link href="/support" className="text-accent hover:underline">Visit Author Support</Link>
        </p>
      </div>
      <div aria-hidden className="relative hidden h-[520px] [perspective:1400px] lg:block">
        <div className="absolute bottom-16 left-1/2 h-px w-3/4 -translate-x-1/2 bg-line-strong" />
        <div className="absolute bottom-16 left-[30%] origin-bottom-left [transform:rotateZ(-74deg)_rotateY(-20deg)] [transform-style:preserve-3d]">
          <CssBook book={books[3]} width={190} />
        </div>
        <div className="absolute bottom-16 left-[52%] [transform:rotateY(-35deg)] [transform-style:preserve-3d]">
          <CssBook book={books[11]} width={180} />
        </div>
      </div>
    </main>
  );
}
