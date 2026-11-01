export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹49,999 */
export const formatINR = (n: number) => inr.format(Math.round(n));
/** ₹58,998.82 */
export const formatINR2 = (n: number) => inr2.format(n);

export const GST_RATE = 0.18;
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const withGst = (n: number) => round2(n * (1 + GST_RATE));
export const gstOf = (n: number) => round2(n * GST_RATE);

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Short, human-friendly reference id, e.g. "PUB-7K3QX2" (client-side only). */
export function refId(prefix: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
