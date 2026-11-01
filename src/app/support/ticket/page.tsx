import type { Metadata } from "next";
import { Suspense } from "react";
import { MyTickets, TicketForm } from "@/components/support/TicketForm";

export const metadata: Metadata = { title: "Raise a request", description: "Ask StoryShelf Author Support anything — we reply within one working day." };

export default function TicketPage() {
  return (
    <main className="container-x grid gap-14 pb-16 pt-32 md:pt-40 lg:grid-cols-[1.3fr_0.7fr]">
      <div>
        <p className="eyebrow">Author Support · New request</p>
        <h1 className="display-lg mt-4">How can we help?</h1>
        <p className="mt-4 max-w-xl text-muted">A specialist will pick this up and reply within one working day. You can follow the conversation and reply here or in your dashboard.</p>
        <div className="mt-10 rounded-xl border border-line bg-surface p-6 md:p-8">
          <Suspense>
            <TicketForm />
          </Suspense>
        </div>
      </div>
      <aside className="lg:pt-24">
        <p className="eyebrow mb-4">Your requests</p>
        <MyTickets />
      </aside>
    </main>
  );
}
