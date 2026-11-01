"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

/** Route-level error boundary: keeps the shell, offers a retry. */
export default function RouteError({ error, reset, retry }: { error: unknown; reset?: () => void; retry?: () => void }) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);
  const again = retry ?? reset;
  return (
    <main className="container-x flex min-h-[70svh] flex-col items-center justify-center py-32 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="display-lg mt-4 max-w-[18ch]">A page got stuck in the binding.</h1>
      <p className="mt-4 max-w-md text-muted">It&rsquo;s not you — it&rsquo;s us. Try again, or head back to the shelf.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {again && <Button onClick={() => again()}>Try again</Button>}
        <ButtonLink href="/" variant="ghost">
          Go home
        </ButtonLink>
      </div>
    </main>
  );
}
