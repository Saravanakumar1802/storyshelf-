// Runs after `npm run build:static` (npm "post" hook).
//
// The static export writes each route's prefetch payloads into nested folders,
// e.g. out/plans/__next.plans/__PAGE__.txt, but the browser asks for the
// dotted name, out/plans/__next.plans.__PAGE__.txt. A plain static host
// (Netlify Drop) has no rewrites, so those requests would 404 and client-side
// navigation would fall back to full page loads. This adds the dotted copies.
import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = "out";
let copied = 0;

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? filesUnder(p) : [p];
  });
}

function visit(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (!statSync(p).isDirectory() || name === "_next") continue;
    if (name.startsWith("__next.")) {
      for (const file of filesUnder(p)) {
        const flat = join(dir, `${name}.${relative(p, file).split(sep).join(".")}`);
        if (!existsSync(flat)) {
          copyFileSync(file, flat);
          copied++;
        }
      }
    } else {
      visit(p);
    }
  }
}

if (!existsSync(OUT)) {
  console.error(`flatten-segment-payloads: ./${OUT} not found — run the static build first.`);
  process.exit(1);
}
visit(OUT);
console.log(`flatten-segment-payloads: added ${copied} prefetch payload file(s) to ./${OUT}`);
