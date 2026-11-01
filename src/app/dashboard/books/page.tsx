import type { Metadata } from "next";
import { BooksView } from "@/components/dashboard/Views";

export const metadata: Metadata = { title: "My books" };

export default function Page() {
  return <BooksView />;
}
