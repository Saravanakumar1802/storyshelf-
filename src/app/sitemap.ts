import type { MetadataRoute } from "next";
import { catalog } from "@/data/catalog";
import { services } from "@/data/services";
import { guides } from "@/data/support";
import { isRouteEnabled } from "@/config/features";
import { SITE_URL } from "@/lib/seo";

const BASE = SITE_URL;

// generated once at build time (also required by the static export)
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "",
    "/services",
    "/plans",
    "/publish/how-it-works",
    "/publish/self-publishing-guide",
    "/publish/book-design",
    "/library",
    "/ai",
    "/about",
    "/awards",
    "/contact",
    "/publish",
    "/support",
    "/support/faq",
    "/support/consultation",
  ].filter(isRouteEnabled);
  const details = [
    ...services.map((s) => ({ path: `/services/${s.slug}`, priority: 0.6 })),
    ...catalog.map((b) => ({ path: `/library/${b.slug}`, priority: 0.6 })),
    ...guides.map((g) => ({ path: `/support/guides/${g.slug}`, priority: 0.4 })),
  ].filter((d) => isRouteEnabled(d.path));
  return [
    ...pages.map((p) => ({ url: `${BASE}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...details.map(({ path, priority }) => ({ url: `${BASE}${path}`, priority })),
  ];
}
