import type { NextConfig } from "next";

// cacheComponents/partialPrefetching are intentionally off: this prototype is
// client-heavy (WebGL canvas, localStorage-backed stores). Re-evaluate when the
// real backend lands.
//
// `npm run build:static` builds a fully static site into ./out (no Node server)
// that can be dragged onto Netlify Drop or served by any static host. Static
// export has no server redirects, so the same redirects also ship as
// out/_redirects for Netlify (src/app/%5Fredirects/route.ts).
const staticExport = process.env.npm_lifecycle_event === "build:static";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  ...(staticExport
    ? { output: "export" }
    : {
        // keep in sync with LEGACY_REDIRECTS in src/app/%5Fredirects/route.ts (the static build's copy)
        async redirects() {
          return [
            // "How it works" moved under the Publish section
            { source: "/process", destination: "/publish/how-it-works", permanent: true },
            // the bookstore became the free AI Library; cart and checkout were retired with it
            { source: "/bookstore", destination: "/library", permanent: true },
            { source: "/bookstore/:slug", destination: "/library/:slug", permanent: true },
            { source: "/cart", destination: "/library", permanent: true },
            { source: "/checkout/:path*", destination: "/library", permanent: true },
          ];
        },
      }),
  turbopack: {
    rules: {
      // Tailwind compiles the global stylesheet only; *.module.css files keep
      // their module type (renaming them to "*.css" would make them global)
      "*.css": {
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
