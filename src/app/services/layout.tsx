import { requireRoute } from "@/config/gate";

/** Switched off for now — see src/config/features.ts. */
export default function ServicesLayout({ children }: LayoutProps<"/services">) {
  requireRoute("/services");
  return children;
}
