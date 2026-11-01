import { isRouteEnabled } from "@/config/features";

/** Where "book a consultation" leads: the booking screen, or Contact while Support is switched off. */
export const CONSULT_HREF = isRouteEnabled("/support/consultation") ? "/support/consultation" : "/contact";

/** The "Publish" mega-menu: learn how publishing works, then start. */
export const publishGuides = [
  {
    href: "/publish/how-it-works",
    label: "How it works",
    description: "Eight clear stages from manuscript to bookshelf — who does what, and when.",
    kicker: "The journey",
  },
  {
    href: "/publish/self-publishing-guide",
    label: "How to self-publish",
    description: "The complete step-by-step guide: rights, ISBN, editing, pricing and launch.",
    kicker: "The guide",
  },
  {
    href: "/publish/book-design",
    label: "How to design a book",
    description: "Covers, interiors, trim sizes and print specs — the anatomy of a great book.",
    kicker: "Design",
  },
] as const;

export const publishPlanLinks = [
  { href: "/publish/book-design#trim-sizes", label: "Formats & trim sizes", description: "Paperback, hardcover and eBook specs at a glance." },
  { href: "/plans", label: "Plans & pricing", description: "Kickstart, Level-Up and Pro, compared line by line." },
  { href: "/support/consultation", label: "Free consultation", description: "Talk your book through with a Publishing Consultant." },
] as const;

export const publishServiceLinks = [
  { href: "/services/writing-and-editing", label: "Editing", description: "Plagiarism checks, copy and extensive editing." },
  { href: "/services/book-production", label: "Cover & interior design", description: "Covers, typesetting, ISBN and print files." },
  { href: "/services/marketing-and-publicity", label: "Distribution & marketing", description: "Stores, posters, video and Amazon campaigns." },
] as const;

export type NavItem = { href: string; label: string; menu?: "publish" };

export const mainNav: readonly NavItem[] = [
  { href: "/services", label: "Services" },
  { href: "/plans", label: "Plans" },
  { href: "/publish/how-it-works", label: "Publish", menu: "publish" },
  { href: "/library", label: "Library" },
  { href: "/support", label: "Support" },
  { href: "/about", label: "About" },
];

const footerColumns = [
  {
    title: "Publish",
    links: [
      { href: "/publish", label: "Start publishing" },
      { href: "/plans", label: "Plans & pricing" },
      { href: "/publish/how-it-works", label: "How it works" },
      { href: "/publish/self-publishing-guide", label: "How to self-publish" },
      { href: "/publish/book-design", label: "How to design a book" },
      { href: "/services", label: "All services" },
      { href: "/awards", label: "StoryShelf Awards" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/services/writing-and-editing", label: "Writing & Editing" },
      { href: "/services/book-production", label: "Book Production" },
      { href: "/services/marketing-and-publicity", label: "Marketing & Publicity" },
      { href: "/services/publishing-management", label: "Publishing Management" },
      { href: "/services/author-support", label: "Author Support" },
    ],
  },
  {
    title: "Authors",
    links: [
      { href: "/dashboard", label: "Author dashboard" },
      { href: "/support", label: "Help centre" },
      { href: "/support/faq", label: "FAQs" },
      { href: "/support/ticket", label: "Raise a ticket" },
      { href: CONSULT_HREF, label: "Book a consultation" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/library", label: "Library" },
      { href: "/ai", label: "AI status" },
      { href: "/contact", label: "Contact" },
    ],
  },
] as const;

/** Footer columns, without links to screens that are switched off (src/config/features.ts). */
export const footerNav = footerColumns.map((col) => ({ ...col, links: col.links.filter((l) => isRouteEnabled(l.href)) })).filter((col) => col.links.length > 0);
