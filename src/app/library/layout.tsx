import { requireRoute } from "@/config/gate";

/** Gated by the `library` flag — see src/config/features.ts. */
export default function LibraryLayout({ children }: LayoutProps<"/library">) {
  requireRoute("/library");
  return children;
}
