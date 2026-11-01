import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// generated once at build time (also required by the static export)
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/login", "/signup"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
