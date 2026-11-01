import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { features } from "@/config/features";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = { title: { default: "Author dashboard", template: "%s · Dashboard · StoryShelf" }, robots: { index: false } };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // switched off for now — see src/config/features.ts
  if (!features.accounts) notFound();
  return <DashboardShell>{children}</DashboardShell>;
}
