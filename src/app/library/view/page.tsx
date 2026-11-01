import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveBook } from "@/components/library/LiveBook";

// books imported after the last build: rendered from the API (their static pages arrive with the next build)
export const metadata: Metadata = { title: "Library book", robots: { index: false, follow: true } };

export default function LiveBookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LiveBook />
    </Suspense>
  );
}
