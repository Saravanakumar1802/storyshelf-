import type { Metadata } from "next";
import { SupportView } from "@/components/dashboard/Views";

export const metadata: Metadata = { title: "Support" };

export default function Page() {
  return <SupportView />;
}
