import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { features } from "@/config/features";
import { Suspense } from "react";
import { PublishSuccess } from "@/components/publish/PublishSuccess";

export const metadata: Metadata = { title: "Request received", robots: { index: false } };

export default function PublishSuccessPage() {
  // switched off for now — see src/config/features.ts
  if (!features.publishWizard) notFound();
  return (
    <main className="container-x">
      <Suspense fallback={<div className="py-40 text-center text-muted">Confirming your request…</div>}>
        <PublishSuccess />
      </Suspense>
    </main>
  );
}
