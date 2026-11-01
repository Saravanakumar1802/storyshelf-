import { requireRoute } from "@/config/gate";

/** Switched off for now — see src/config/features.ts. */
export default function SupportLayout({ children }: LayoutProps<"/support">) {
  requireRoute("/support");
  return children;
}
