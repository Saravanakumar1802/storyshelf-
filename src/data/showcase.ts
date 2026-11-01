import type { Book, Emblem } from "@/types";
import { BRAND } from "@/lib/brand";

/**
 * "Your book": the author's own book as it is made, used by the services
 * hero (an exploded hardcover that assembles as you scroll). Each service
 * page shows it in its own cloth and emblem.
 */
export function yourBook(variant: { key: string; emblem: Emblem; swatch: number; finish?: Book["finish"] }): Book {
  return {
    id: `your-book-${variant.key}`,
    slug: `your-book-${variant.key}`,
    title: "Your Story",
    coverLines: ["Your", "Story"],
    author: "Your Name",
    genre: "Literary Fiction",
    emblem: variant.emblem,
    finish: variant.finish ?? "cloth",
    swatch: variant.swatch,
    trim: { width: 152, height: 229 },
    pages: 360,
    mrp: 0,
    isbn: "978-93-48201-99-4",
    language: "English",
    published: "Soon",
    plan: "levelUp",
    synopsis: "Your manuscript, edited, designed, printed and published.",
    blurb: "Your manuscript, edited, designed, printed and published.",
  };
}

/** Cloth per service page (indices into theme.scene.books). */
export const serviceSwatch: Record<string, number> = {
  "writing-and-editing": 0,
  "book-production": 2,
  "marketing-and-publicity": 8,
  "publishing-management": 1,
  "author-support": 4,
};

/** The StoryShelf house volume opened by the site intro. */
export const brandBook: Book = {
  id: "brand-storyshelf",
  slug: "brand-storyshelf",
  title: BRAND.name,
  coverLines: ["Story", "Shelf"],
  author: "Read freely · Publish proudly",
  genre: "Literary Fiction",
  emblem: "shelf",
  finish: "cloth",
  swatch: 0,
  trim: { width: 165, height: 245 },
  pages: 440,
  mrp: 0,
  isbn: "978-93-48201-80-2",
  language: "English",
  published: "2026",
  plan: "pro",
  synopsis: `${BRAND.slogan}.`,
  blurb: "Timeless classics, free to read. New voices, worth every page. And a place on the shelf for yours.",
};
