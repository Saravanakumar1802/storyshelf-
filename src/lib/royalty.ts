/**
 * Indicative earnings model (the worked example on How it works).
 *
 *   earnings per copy = list price − retailer share − print cost
 *
 * Print costs and retailer shares below are prototype estimates for India
 * (to be replaced with StoryShelf's printer rate card and channel terms).
 */

export type RoyaltyFormat = "paperback" | "hardcover" | "ebook";
export type RoyaltyChannel = "store" | "amazon" | "retail";
export type Interior = "bw" | "colour";

export const CHANNELS: Record<RoyaltyChannel, { label: string; share: number; note: string }> = {
  store: { label: "StoryShelf Store", share: 0.2, note: "Sold direct — the smallest cut" },
  amazon: { label: "Amazon.in", share: 0.4, note: "Typical marketplace share" },
  retail: { label: "Other stores", share: 0.45, note: "Flipkart, bookshops & global retail" },
};

export const FORMATS: Record<RoyaltyFormat, { label: string }> = {
  paperback: { label: "Paperback" },
  hardcover: { label: "Hardcover" },
  ebook: { label: "eBook" },
};

export const PAGE_LIMITS = { min: 24, max: 800 };

/** Indicative per-copy print cost in ₹ (print-on-demand). */
export function printCost(format: RoyaltyFormat, pages: number, interior: Interior): number {
  if (format === "ebook") return 0;
  const p = Math.min(PAGE_LIMITS.max, Math.max(PAGE_LIMITS.min, Math.round(pages)));
  const perPage = interior === "colour" ? 1.9 : 0.42;
  const base = format === "hardcover" ? 190 : 40;
  return Math.round(base + p * perPage);
}

export interface Earnings {
  price: number;
  retailer: number;
  print: number;
  earnings: number;
  /** lowest price (ending in 9) that still earns something per copy */
  minPrice: number;
}

export function estimateEarnings(o: { format: RoyaltyFormat; pages: number; interior: Interior; price: number; channel: RoyaltyChannel }): Earnings {
  const price = Math.max(0, Math.round(o.price));
  const share = CHANNELS[o.channel].share;
  const print = printCost(o.format, o.pages, o.interior);
  const retailer = Math.round(price * share);
  const earnings = price - retailer - print;
  // price at which earnings turn positive, rounded up to the next …9
  const breakeven = Math.ceil((print + 1) / (1 - share));
  const minPrice = Math.ceil((breakeven + 1) / 10) * 10 - 1;
  return { price, retailer, print, earnings, minPrice };
}

/** Copies needed for earnings to cover a one-time publishing fee. */
export function copiesToRecover(fee: number, perCopy: number): number | null {
  if (perCopy <= 0) return null;
  return Math.ceil(fee / perCopy);
}
