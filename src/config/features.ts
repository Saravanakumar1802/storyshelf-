/**
 * Feature switches. Turning a feature off is the "commented out" state: its
 * screens answer 404 (and leave the sitemap), navigation shows its entries
 * disabled or hides them, and links / call-to-action buttons that lead there
 * render disabled. The code stays compiled and type-checked, so turning a
 * feature back on is a one-line change here.
 *
 * Currently every section is live.
 */
export const features = {
  /** Author sign-in / sign-up and the author dashboard (/login, /signup, /dashboard/*). */
  accounts: true,
  /** The "Publish your book" request wizard (/publish, /publish/success). */
  publishWizard: true,
  /** The Publish guides: How it works, How to self-publish, How to design a book. */
  publishGuides: true,
  /** Services overview and the five service pages. */
  services: true,
  /** Help centre, FAQs, guides, tickets, consultation booking and the chat widget. */
  support: true,
  /** About us. */
  about: true,
  /** The AI Library: browse, book pages and the in-app reader. */
  library: true,
  /** StoryShelf Awards. */
  awards: true,
} as const;

export type Feature = keyof typeof features;

/** Paths each feature owns: `exact` paths, and `prefix` paths together with everything below them. */
const GATED: { feature: Feature; exact?: string[]; prefix?: string[] }[] = [
  { feature: "accounts", exact: ["/login", "/signup"], prefix: ["/dashboard"] },
  { feature: "publishWizard", exact: ["/publish", "/publish/success"] },
  { feature: "publishGuides", exact: ["/publish/how-it-works", "/publish/self-publishing-guide", "/publish/book-design", "/process"] },
  { feature: "services", prefix: ["/services"] },
  { feature: "support", prefix: ["/support"] },
  { feature: "about", prefix: ["/about"] },
  { feature: "library", prefix: ["/library"] },
  { feature: "awards", prefix: ["/awards"] },
];

const off = GATED.filter((g) => !features[g.feature]);

/** Paths of every switched-off screen (used to answer real 404s on static hosts). */
export const disabledPaths = {
  exact: off.flatMap((g) => g.exact ?? []),
  prefix: off.flatMap((g) => g.prefix ?? []),
};

/** Whether an internal href leads to a screen that is currently switched on (external and hash links always are). */
export function isRouteEnabled(href: string): boolean {
  if (!href.startsWith("/")) return true;
  const path = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  return !disabledPaths.exact.includes(path) && !disabledPaths.prefix.some((p) => path === p || path.startsWith(`${p}/`));
}
