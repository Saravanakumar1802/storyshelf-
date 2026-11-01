import type { PublishingStage } from "@/types";
import { journey } from "@/data/services";
import type { FaqItem } from "./types";

/**
 * "How it works" in depth: each stage of the StoryShelf journey with who
 * leads it, what the author does, what we do, and what comes out of it.
 * Week ranges are typical for a finished manuscript of ~350 pages.
 */
export interface StageDetail {
  stage: PublishingStage;
  weeks: string;
  /** week range for the timeline chart (0-based, end exclusive) */
  span: [number, number];
  summary: string;
  lead: string;
  you: string[];
  us: string[];
  outcome: string;
}

const detail: Record<PublishingStage, Omit<StageDetail, "stage" | "weeks" | "summary">> = {
  Consultation: {
    span: [0, 0.4],
    lead: "Publishing Consultant",
    you: ["Share your manuscript (or a sample) and your goals", "Tell us about your readers and timeline"],
    us: ["Read your sample and recommend a plan", "Explain every cost, upfront — GST included"],
    outcome: "A clear plan and a written quote",
  },
  Agreement: {
    span: [0.4, 0.8],
    lead: "Publishing Consultant",
    you: ["Review and sign the agreement online", "Upload your final manuscript"],
    us: ["Issue a non-exclusive agreement — your copyright stays yours", "Assign your Publication Manager"],
    outcome: "Signed agreement and a named manager",
  },
  Editing: {
    span: [0.8, 4],
    lead: "Editor",
    you: ["Answer queries and accept or reject edits", "Approve the final edited manuscript"],
    us: ["Plagiarism check on every plan", "Copy or extensive editing on Level-Up and Pro"],
    outcome: "A clean, approved manuscript",
  },
  "Cover & Interior": {
    span: [3, 6],
    lead: "Designers",
    you: ["Pick your favourite cover concept", "Proof the typeset pages"],
    us: ["1, 3 or 6 cover concepts depending on your plan", "Typeset the interior (~350 pages included)"],
    outcome: "Approved cover and print-ready interior",
  },
  "ISBN & Proofs": {
    span: [6, 6.8],
    lead: "Publication Manager",
    you: ["Sign off the final proof — nothing prints without it"],
    us: ["Register your ISBN and generate the barcode", "Prepare print and eBook files"],
    outcome: "ISBN, barcode and final files",
  },
  Distribution: {
    span: [6.8, 7.6],
    lead: "Publication Manager",
    you: ["Receive your author copies", "Share your book's store links"],
    us: ["List on national and global stores and the StoryShelf Store", "Enable print-on-demand"],
    outcome: "Your book, live and buyable",
  },
  Marketing: {
    span: [7, 10],
    lead: "Marketing team",
    you: ["Share posters and videos with your readers", "Join launch activities you're comfortable with"],
    us: ["Digital posters and video promotion", "Amazon A+, Author Page and sponsored ads on Pro"],
    outcome: "Readers who know your book exists",
  },
  Royalties: {
    span: [8, 10],
    lead: "Author Support",
    you: ["Track sales in your author dashboard"],
    us: ["Transparent sales reports", "Royalty payouts annually — or quarterly on Pro"],
    outcome: "Earnings from every copy sold",
  },
};

export const stages: StageDetail[] = journey.map((j) => ({ stage: j.stage, weeks: j.weeks, summary: j.text, ...detail[j.stage] }));

/** Weeks shown on the timeline chart. */
export const TIMELINE_WEEKS = 10;

/** What an author needs before starting (shown as a checklist). */
export const whatYouNeed = [
  { title: "Your manuscript", text: "A Word or PDF file — finished, or close to it. Not sure? A sample chapter is enough for your consultation." },
  { title: "A few details about you", text: "A short author bio, a photo for the back cover and your preferred author name." },
  { title: "Ideas for the cover", text: "Optional. Books you admire, colours and moods — our designers take it from there." },
  { title: "A plan that fits", text: "Kickstart, Level-Up or Pro. Your Publishing Consultant helps you choose, with no pressure." },
] as const;

export const howItWorksFaq: FaqItem[] = [
  { q: "How long does it take to publish my book?", a: "Most books go live 6–8 weeks after signing. Extensive editing, colour interiors or slow approvals can add time — your Publication Manager keeps you updated at every stage." },
  { q: "Do I keep the rights to my book?", a: "Yes. The agreement is non-exclusive and your copyright always stays with you. You can publish elsewhere too." },
  { q: "What if I don’t like the cover?", a: "You choose from 1, 3 or 6 concepts depending on your plan, and we refine your chosen design with you until it’s right. Nothing is printed without your sign-off." },
  { q: "Who will I be working with?", a: "A Publishing Consultant helps you choose a plan; a dedicated Publication Manager then runs your timeline and coordinates editors, designers, printers and the marketing team." },
  { q: "Where will my book be sold?", a: "On national online stores, global channels and the StoryShelf Store, with print-on-demand so it never goes out of stock. eBook and Google Play distribution are included from Level-Up." },
  { q: "How and when are royalties paid?", a: "Sales are reported transparently in your author dashboard. Royalties are paid annually on Kickstart and Level-Up, and quarterly on Pro." },
];
