import type { Metadata } from "next";
import { MyLibrary } from "@/components/library/MyLibrary";

export const metadata: Metadata = { title: "My Library", robots: { index: false } };

export default function ShelfPage() {
  return <MyLibrary />;
}
