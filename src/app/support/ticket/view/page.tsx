import type { Metadata } from "next";
import { Suspense } from "react";
import { TicketView } from "@/components/support/TicketThread";

export const metadata: Metadata = { title: "Support request", robots: { index: false } };

/** Tickets live in the browser (mock API), so the id comes from the query string: /support/ticket/view?id=… */
export default function TicketDetailPage() {
  return (
    <main className="container-x max-w-3xl pb-16 pt-32 md:pt-40">
      <Suspense fallback={<div className="py-24 text-center text-muted">Loading your request…</div>}>
        <TicketView />
      </Suspense>
    </main>
  );
}
