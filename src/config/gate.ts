import { notFound } from "next/navigation";
import { isRouteEnabled } from "./features";

/** In a page or layout: answer 404 while the screen at `path` is switched off (see ./features.ts). */
export function requireRoute(path: string) {
  if (!isRouteEnabled(path)) notFound();
}
