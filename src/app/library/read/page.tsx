import type { Metadata } from "next";
import { Suspense } from "react";
import { Reader } from "@/components/library/Reader";

// the text itself is public domain and published elsewhere; the book pages are what search should index
export const metadata: Metadata = { title: "Reading", robots: { index: false, follow: true } };

export default function ReadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Reader />
    </Suspense>
  );
}
