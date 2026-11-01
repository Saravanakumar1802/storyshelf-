/**
 * Content model for the Publish guides. Pages are data; components in
 * src/components/publish-guides render it. Text is plain (no markup).
 */

export type CalloutTone = "tip" | "note" | "india" | "with8085" | "warning";

export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "callout"; tone: CalloutTone; title: string; text: string }
  /** `highlight` = index of the column to emphasise (e.g. the StoryShelf column) */
  | { type: "table"; caption: string; columns: string[]; rows: string[][]; highlight?: number }
  | { type: "checklist"; title?: string; items: string[] }
  | { type: "takeaways"; items: string[] }
  /** interactive components rendered in place */
  | { type: "widget"; name: "launchTimeline" }
  /** "next step" card linking elsewhere on the site */
  | { type: "next"; href: string; label: string; text: string };

export interface GuideChapter {
  /** URL hash, kebab-case, unique on the page */
  id: string;
  /** short label used in the table of contents */
  toc: string;
  kicker: string;
  title: string;
  blocks: GuideBlock[];
}

export interface FaqItem {
  q: string;
  a: string;
}
