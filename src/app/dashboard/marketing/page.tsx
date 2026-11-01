import type { Metadata } from "next";
import { MarketingView } from "@/components/dashboard/Views";

export const metadata: Metadata = { title: "Marketing" };

export default function Page() {
  return <MarketingView />;
}
