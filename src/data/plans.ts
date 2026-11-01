import type { Addon, Plan, PlanCategory, PlanId } from "@/types";

/** Source: "StoryShelf Publishing Plans (IN)" PDF. Prices exclude GST. */
export const plans: Plan[] = [
  {
    id: "kickstart",
    name: "Kickstart",
    tagline: "Everything you need to hold your book in your hands.",
    price: 19999,
    bestFor: "First-time authors with a polished manuscript",
    highlights: ["ISBN, barcode & digital agreement", "1 cover design concept", "Plagiarism check", "3 B/W author copies", "National, global & StoryShelf Store distribution"],
  },
  {
    id: "levelUp",
    name: "Level-Up",
    tagline: "Professional editing, more covers, and an eBook on day one.",
    price: 49999,
    bestFor: "Authors who want editing and wider digital reach",
    popular: true,
    highlights: ["3 cover design concepts", "Plagiarism + copy editing", "5 B/W author copies", "eBook, EPUB & Google Play included", "YouTube promotion"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "The full launch: extensive editing, colour, audiobook and ads.",
    price: 99999,
    bestFor: "Authors launching to win readers at scale",
    highlights: ["6 cover concepts, B/W or full colour interior", "Extensive editing", "15 B/W or 6 colour author copies", "Audiobook + Amazon A+ & Author Page", "30-day Amazon Sponsored ads, quarterly payouts"],
  },
];

export const planById = (id: PlanId) => plans.find((p) => p.id === id)!;

const all = <T,>(v: T) => ({ kickstart: v, levelUp: v, pro: v });

export const planComparison: PlanCategory[] = [
  {
    id: "legal",
    title: "Legal & Support",
    rows: [
      { label: "Copyrights", values: all("Author") },
      { label: "Agreement", values: all("Non-Exclusive") },
      { label: "ISBN", values: all<true>(true) },
      { label: "Bar Code", values: all<true>(true) },
      { label: "Sign Agreement Digitally", values: all<true>(true) },
      { label: "Publishing Consultant", values: all<true>(true) },
      { label: "Publication Manager", values: all<true>(true) },
      { label: "Marketing Assistance", values: all<true>(true) },
      { label: "Post-Publication Assistance", values: all<true>(true) },
    ],
  },
  {
    id: "prepress",
    title: "Prepress, Printing & eBook",
    rows: [
      { label: "Cover Design", values: { kickstart: "1 Suggestion", levelUp: "3 Suggestions", pro: "6 Suggestions" } },
      { label: "Interior", values: { kickstart: "B/W", levelUp: "B/W", pro: "B/W or Full Color" } },
      { label: "Editing", values: { kickstart: "Plagiarism", levelUp: "Plagiarism & Copy Editing", pro: "Extensive Editing" } },
      { label: "Author Copies", values: { kickstart: "3 B/W", levelUp: "5 B/W", pro: "15 B/W or 6 Colored" } },
      { label: "Format", values: all("Paperback & Hardback") },
      { label: "Book Size", values: all("Standard") },
      { label: "Lamination", values: all("Regular") },
      { label: "eBook", values: { kickstart: "addon", levelUp: true, pro: true } },
      { label: "Audio Book", values: { kickstart: "addon", levelUp: "addon", pro: true } },
    ],
  },
  {
    id: "distribution",
    title: "Distribution",
    rows: [
      { label: "National Online", values: all<true>(true) },
      { label: "Global", values: all<true>(true) },
      { label: "StoryShelf Store", values: all<true>(true) },
      { label: "Google Play", values: { kickstart: "addon", levelUp: true, pro: true } },
      { label: "EPUB", values: { kickstart: "addon", levelUp: true, pro: true } },
      { label: "Amazon Prime Listing", values: { kickstart: "addon", levelUp: "addon", pro: "1 Month" } },
      { label: "POD", hint: "Print on demand", values: all<true>(true) },
    ],
  },
  {
    id: "marketing",
    title: "Marketing Strategies",
    rows: [
      { label: "Digital Posters", values: { kickstart: "1", levelUp: "1", pro: "2" } },
      { label: "Amazon A+ Listing", values: { kickstart: "addon", levelUp: "addon", pro: true } },
      { label: "Amazon Author Page", values: { kickstart: "addon", levelUp: "addon", pro: true } },
      { label: "Video Promotions", values: { kickstart: "addon", levelUp: "addon", pro: "Enhanced" } },
      { label: "Amazon Sponsored", values: { kickstart: "addon", levelUp: "addon", pro: "30 Days" } },
      { label: "YouTube Promotion", values: { kickstart: "addon", levelUp: true, pro: true } },
      { label: "Promo Code for StoryShelf Website", values: { kickstart: "addon", levelUp: "addon", pro: "15 Days" } },
      { label: "StoryShelf Awards", values: all("Eligible") },
    ],
  },
  {
    id: "royalty",
    title: "Sales & Royalty",
    rows: [
      { label: "Royalty", values: all("Better profit share") },
      { label: "Payout Frequency", values: { kickstart: "Annually", levelUp: "Annually", pro: "Quarterly" } },
    ],
  },
];

export const FORMATTING_NOTE = "Each plan includes formatting services for approx. 350 pages.";

/**
 * Add-ons. The PDF lists them as "Add-On" without prices; the figures below
 * are indicative prototype prices (GST extra) to be confirmed by StoryShelf.
 */
export const addons: Addon[] = [
  { id: "ebook", name: "eBook edition", description: "Reflowable eBook conversion & listing.", price: 2999, includedIn: ["levelUp", "pro"] },
  { id: "googlePlay", name: "Google Play + EPUB", description: "EPUB build and Google Play Books distribution.", price: 1999, includedIn: ["levelUp", "pro"] },
  { id: "audiobook", name: "Audiobook", description: "Narration, mastering and audio distribution.", price: 14999, includedIn: ["pro"] },
  { id: "amazonPrime", name: "Amazon Prime listing (1 month)", description: "Prime-eligible listing for faster delivery.", price: 3999, includedIn: ["pro"] },
  { id: "amazonAPlus", name: "Amazon A+ listing", description: "Rich A+ content modules on your product page.", price: 4999, includedIn: ["pro"] },
  { id: "authorPage", name: "Amazon Author Page", description: "Set-up and optimisation of your author page.", price: 1499, includedIn: ["pro"] },
  { id: "videoPromo", name: "Video promotion", description: "A cinematic book trailer for social media.", price: 6999, includedIn: ["pro"] },
  { id: "amazonSponsored", name: "Amazon Sponsored ads (30 days)", description: "Managed sponsored-product campaign.", price: 9999, includedIn: ["pro"] },
  { id: "youtube", name: "YouTube promotion", description: "Feature on the StoryShelf channel.", price: 2499, includedIn: ["levelUp", "pro"] },
  { id: "promoCode", name: "StoryShelf store promo code (15 days)", description: "Discount code to drive launch sales.", price: 999, includedIn: ["pro"] },
  { id: "extraPages", name: "Formatting beyond 350 pages", description: "Typesetting for longer manuscripts (per 100 pages).", price: 2499, includedIn: [] },
];

export const addonById = (id: string) => addons.find((a) => a.id === id);
