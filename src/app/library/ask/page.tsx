import type { Metadata } from "next";
import { Suspense } from "react";
import { AskChat } from "@/components/library/AskChat";

export const metadata: Metadata = { title: "Ask My Library", robots: { index: false } };

export default function AskPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <AskChat />
    </Suspense>
  );
}
