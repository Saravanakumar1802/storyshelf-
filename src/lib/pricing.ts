import type { AddonId, PlanId } from "@/types";
import { addons, planById } from "@/data/plans";
import { GST_RATE, round2 } from "@/lib/utils";

export const INCLUDED_PAGES = 350;
const EXTRA_PAGES_BLOCK = 100;

export interface QuoteLine {
  label: string;
  amount: number;
  note?: string;
}

/** Publishing quote. Add-ons already included in the plan are ignored. */
export function calcQuote(plan: PlanId, addonIds: AddonId[], pages: number) {
  const p = planById(plan);
  const lines: QuoteLine[] = [{ label: `${p.name} plan`, amount: p.price }];
  const chosen = new Set(addonIds);
  for (const a of addons) {
    if (a.id === "extraPages") continue;
    if (!chosen.has(a.id) || a.includedIn.includes(plan)) continue;
    lines.push({ label: a.name, amount: a.price });
  }
  const extraBlocks = pages > INCLUDED_PAGES ? Math.ceil((pages - INCLUDED_PAGES) / EXTRA_PAGES_BLOCK) : 0;
  if (extraBlocks > 0) {
    const extra = addons.find((a) => a.id === "extraPages")!;
    lines.push({ label: extra.name, amount: extra.price * extraBlocks, note: `${extraBlocks} × ${EXTRA_PAGES_BLOCK} pages` });
  }
  const subtotal = lines.reduce((a, l) => a + l.amount, 0);
  const gst = round2(subtotal * GST_RATE);
  return { lines, base: p.price, addons: subtotal - p.price, subtotal, gst, total: round2(subtotal + gst) };
}
