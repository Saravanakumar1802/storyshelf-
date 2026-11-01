import type { Metadata } from "next";
import { OverviewView } from "@/components/dashboard/Views";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return <OverviewView />;
}
