import { disabledPaths } from "@/config/features";

// generated once at build time: in the static export (npm run build:static) this becomes out/_redirects
export const dynamic = "force-static";

/**
 * Netlify redirect rules for the static build. Static export has no server,
 * so switched-off screens (src/config/features.ts) are forced to a real 404
 * here — their exported HTML would otherwise be served with status 200 — and
 * the redirects from next.config.ts are mirrored. Rules apply top-down.
 */
const LEGACY_REDIRECTS = [
  "/process  /publish/how-it-works  301",
  "/bookstore  /library  301",
  "/bookstore/*  /library/:splat  301",
  "/cart  /library  301",
  "/checkout  /library  301",
  "/checkout/*  /library  301",
];

export function GET() {
  const notFound = (p: string) => `${p}  /404.html  404!`;
  const lines = [
    "# Generated from src/config/features.ts by src/app/%5Fredirects/route.ts",
    ...disabledPaths.exact.map(notFound),
    ...disabledPaths.prefix.flatMap((p) => [notFound(p), notFound(`${p}/*`)]),
    ...LEGACY_REDIRECTS,
  ];
  return new Response(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
