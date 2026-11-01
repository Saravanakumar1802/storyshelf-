import type { Metadata } from "next";
import { RoyaltiesView } from "@/components/dashboard/Views";

export const metadata: Metadata = { title: "Royalties" };

export default function Page() {
  return <RoyaltiesView />;
}
