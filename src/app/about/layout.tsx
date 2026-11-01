import { requireRoute } from "@/config/gate";

/** Switched off for now — see src/config/features.ts. */
export default function AboutLayout({ children }: LayoutProps<"/about">) {
  requireRoute("/about");
  return children;
}
