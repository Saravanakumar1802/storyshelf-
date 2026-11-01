import type { BookFinish } from "@/theme";

export type Emblem =
  | "rain"
  | "compass"
  | "waves"
  | "lamp"
  | "moth"
  | "key"
  | "circuit"
  | "snowflake"
  | "leaf"
  | "flame"
  | "quill"
  | "tree"
  | "shelf";

export type Genre =
  | "Literary Fiction"
  | "Essays"
  | "Poetry"
  | "Historical"
  | "Short Stories"
  | "Romance"
  | "Science Fiction"
  | "Thriller"
  | "Nature"
  | "Fantasy"
  | "Memoir"
  | "Mystery"
  | "Adventure"
  | "Horror"
  | "Philosophy"
  | "Drama"
  | "Children's Classics";

/**
 * What every book on the site has: enough to paint its cover in 2D and 3D and
 * to list it. Print-edition fields belong to the StoryShelf-published showcase titles
 * used across the publishing pages; library books leave them out.
 */
export interface Book {
  id: string;
  slug: string;
  title: string;
  /** Optional line break hint for covers: title split into lines */
  coverLines?: string[];
  subtitle?: string | null;
  author: string;
  genre: Genre;
  emblem: Emblem;
  finish: BookFinish;
  /** Index into theme.scene.books (wrapped to its length) */
  swatch: number;
  /** Use a plan cloth (theme.scene.planBooks) instead of `swatch` */
  planSwatch?: PlanId;
  /** Physical trim size in millimetres */
  trim: { width: number; height: number };
  pages: number;
  language: string;
  synopsis: string;
  // ── print edition (showcase titles only) ──
  isbn?: string;
  mrp?: number;
  published?: string;
  plan?: PlanId;
  blurb?: string;
  quote?: { text: string; source: string };
  ribbon?: boolean;
  bestseller?: boolean;
}

/** The model behind an AI answer (see src/lib/api/ai.ts AiMeta). */
export interface AiMetaInfo {
  task: string;
  provider: string;
  model: string;
  latencyMs: number;
  cached: boolean;
  fallbacks: { provider: string; model: string; reason: string }[];
}

/** AI-written insights about a book. */
export interface BookAi {
  summary: string;
  hook: string;
  themes: string[];
  moods: string[];
  tone: string;
  readingLevel: string;
  contentNotes: string[];
  meta: AiMetaInfo;
}

export interface ChapterAi {
  summary: string;
  keyMoments: string[];
  characters: string[];
  meta: AiMetaInfo;
}

/** A public-domain book in the library, readable in the app. */
export interface LibraryBook extends Book {
  authorYears: string | null;
  words: number;
  readingMinutes: number;
  chapterCount: number;
  /** The book's real first lines */
  opening: string;
  featured: boolean;
  /** AI insights, once the book has been enriched */
  ai: BookAi | null;
}

export interface TocEntry {
  index: number;
  title: string;
  words: number;
}

export interface LibraryBookDetail extends LibraryBook {
  contributors: { name: string; role: string; years: string | null }[];
  subjects: string[];
  source: { name: string; url: string };
  toc: TocEntry[];
  /** Slugs of the books closest in meaning (from the vector index, at build time) */
  similar: string[];
}

export interface Chapter {
  book: { slug: string; title: string; author: string };
  index: number;
  title: string;
  paragraphs: string[];
  words: number;
  total: number;
  prev: number | null;
  next: number | null;
  ai: ChapterAi | null;
}

export type PlanId = "kickstart" | "levelUp" | "pro";

/** A plan cell value: true = included, "addon" = available as paid add-on, string = specific value */
export type PlanCell = true | "addon" | string;

export interface PlanFeatureRow {
  label: string;
  hint?: string;
  values: Record<PlanId, PlanCell>;
}

export interface PlanCategory {
  id: string;
  title: string;
  rows: PlanFeatureRow[];
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: number;
  highlights: string[];
  bestFor: string;
  popular?: boolean;
}

export interface Service {
  slug: string;
  number: string;
  title: string;
  short: string;
  description: string;
  emblem: Emblem;
  includes: { title: string; text: string }[];
  process: { title: string; text: string }[];
  planNote: string;
}

export interface Faq {
  id: string;
  category: FaqCategory;
  q: string;
  a: string;
}

export type FaqCategory = "Plans" | "Royalty" | "ISBN & Rights" | "Distribution" | "Editing & Design" | "Payments" | "Support";

export interface Guide {
  slug: string;
  title: string;
  summary: string;
  stage: string;
  readMinutes: number;
  sections: { heading: string; body: string; tips?: string[] }[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  book: string;
  quote: string;
  plan: PlanId;
  swatch: number;
}

export type TicketStatus = "open" | "in-progress" | "resolved";
export type TicketPriority = "low" | "normal" | "high";
export type TicketCategory = "Manuscript & Editing" | "Cover & Design" | "Distribution" | "Royalties & Payments" | "Marketing" | "Account" | "Other";

export interface TicketMessage {
  id: string;
  from: "author" | "support";
  name: string;
  body: string;
  at: string;
}

export interface Ticket {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  email: string;
  attachments: string[];
  messages: TicketMessage[];
}

export type Role = "reader" | "author" | "admin";

/** A signed-in account. Readers use the library; authors also get the dashboard; admins run the catalogue. */
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  /** Publishing plan — authors only. */
  plan: PlanId | null;
  joinedAt: string;
}

/** An author account, which always has a plan. */
export type AuthorUser = User & { plan: PlanId };

export const isAuthor = (u: User | null): u is AuthorUser => !!u && u.role === "author" && u.plan !== null;

export type AddonId =
  | "ebook"
  | "audiobook"
  | "googlePlay"
  | "amazonPrime"
  | "amazonAPlus"
  | "authorPage"
  | "videoPromo"
  | "amazonSponsored"
  | "youtube"
  | "promoCode"
  | "extraPages";

export interface Addon {
  id: AddonId;
  name: string;
  description: string;
  price: number;
  /** Plans where this is already included (so not selectable) */
  includedIn: PlanId[];
}

export interface PublishRequest {
  id: string;
  createdAt: string;
  author: { name: string; email: string; phone: string; city: string; bio?: string };
  manuscript: {
    title: string;
    genre: Genre | "Other";
    language: string;
    stage: "idea" | "draft" | "final";
    pages: number;
    fileName?: string;
    fileSize?: number;
  };
  plan: PlanId;
  addons: AddonId[];
  consultation: { date: string; slot: string };
  quote: { base: number; addons: number; subtotal: number; gst: number; total: number };
  /** where the book is in the eight-stage journey (moved along by the publishing team) */
  stage: PublishingStage;
  stageIndex: number;
}

export type PublishingStage =
  | "Consultation"
  | "Agreement"
  | "Editing"
  | "Cover & Interior"
  | "ISBN & Proofs"
  | "Distribution"
  | "Marketing"
  | "Royalties";
