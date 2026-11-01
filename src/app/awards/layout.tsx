import { requireRoute } from "@/config/gate";

/** Switched off for now — see src/config/features.ts. */
export default function AwardsLayout({ children }: LayoutProps<"/awards">) {
  requireRoute("/awards");
  return children;
}
