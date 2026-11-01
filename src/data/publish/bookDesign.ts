import type { FaqItem } from "./types";

/**
 * Content for the "Book design" guide: cover and interior anatomy, trim sizes,
 * finishes and print-ready file requirements. Text is plain (no markup).
 */

export const designMeta: { title: string; intro: string; readMinutes: number } = {
  title: "Book design, cover to colophon",
  intro:
    "Readers judge a book by its cover, then stay for the pages. Here’s how a professional book is put together — the parts of a hardcover, the sizes that suit each genre, the type and paper choices that make reading easy, and the files a printer needs to get it right.",
  readMinutes: 9,
};

/** Parts of a hardcover, used by an interactive 3D anatomy viewer. `focus` tells the 3D camera what to show. */
export interface AnatomyPart {
  id: string;
  label: string;
  focus: "front" | "spine" | "back" | "open" | "head";
  /** ≤ 90 characters */
  short: string;
  /** 1–2 sentences */
  detail: string;
  /** 2–3 tips */
  tips: string[];
}

export const anatomy: AnatomyPart[] = [
  {
    id: "front-cover",
    label: "Front cover",
    focus: "front",
    short: "Your book’s shop window — title, author name and an image that signals the genre.",
    detail:
      "Most readers first see your cover as a small thumbnail on a phone screen. It has a second or two to say what kind of book this is and why it’s worth a tap.",
    tips: [
      "Make the title readable at thumbnail size before you worry about fine detail.",
      "Use one strong image or idea rather than several competing ones.",
      "Look at current bestsellers in your genre and meet their visual cues.",
    ],
  },
  {
    id: "spine",
    label: "Spine",
    focus: "spine",
    short: "What browsers see on a shelf — title, author and the publisher’s mark.",
    detail:
      "The spine’s width depends on your page count and paper, so it’s finalised only after the interior is typeset. On thinner books the text must be short and set with care.",
    tips: [
      "Keep the title as large as the width allows; drop subtitles if space is tight.",
      "Text usually runs top to bottom, so it reads when the book lies face up.",
      "Very slim books (under about 80 pages) may be too thin for spine text at all.",
    ],
  },
  {
    id: "back-cover",
    label: "Back cover",
    focus: "back",
    short: "The sales pitch — blurb, author bio, barcode with ISBN, and the price.",
    detail:
      "A reader who turns the book over is already curious; the back cover’s job is to close the deal. It also carries the retail barcode with your ISBN and the MRP printed for Indian retail.",
    tips: [
      "Keep the blurb to around 150 words that hook, not summarise.",
      "Leave a clear, white space for the barcode so scanners read it first time.",
      "A short endorsement or one-line review can sit above the blurb.",
    ],
  },
  {
    id: "head",
    label: "Head, page block & headbands",
    focus: "head",
    short: "The top edge of the book — the page block and the small cloth bands at the spine.",
    detail:
      "The page block is the stack of printed pages; on a hardcover, headbands at the top and bottom of the spine hide the binding and add a finished, crafted look.",
    tips: [
      "Choose a headband colour that picks up a tone from your cover.",
      "Cream paper gives a warm, bookish edge; white looks crisp and modern.",
    ],
  },
  {
    id: "endpapers",
    label: "Endpapers & title page",
    focus: "open",
    short: "The first spread a reader sees — endpapers, half title and the title page.",
    detail:
      "Endpapers join the page block to a hardcover’s boards and can be plain or printed. The front matter that follows — half title, title page and copyright page — sets the tone before chapter one.",
    tips: [
      "Printed endpapers suit maps, family trees or a repeating pattern from the cover.",
      "The copyright page carries your ISBN, edition and publisher details.",
      "Keep the title page simple: title, subtitle, author and publisher’s mark.",
    ],
  },
  {
    id: "interior",
    label: "Interior typography & first page",
    focus: "open",
    short: "Where the reading happens — margins, typeface, spacing and the chapter opener.",
    detail:
      "Good interior design is invisible: the reader simply forgets they’re reading. A considered chapter opener, an easy typeface and generous margins make that possible.",
    tips: [
      "Start chapters on a right-hand (recto) page for a classic finish.",
      "Pick a serif body face designed for long reading at 10–12 pt.",
      "Use a drop cap or small caps to ease readers into each chapter.",
    ],
  },
];

export interface TrimSize {
  id: string;
  name: string;
  /** width × height in inches */
  inches: [number, number];
  /** width × height in millimetres, rounded */
  mm: [number, number];
  genres: string[];
  note: string;
  popular?: boolean;
}

export const trimSizes: TrimSize[] = [
  {
    id: "5x8",
    name: "5 × 8 in",
    inches: [5, 8],
    mm: [127, 203],
    genres: ["Poetry", "Novellas", "Short fiction"],
    note: "Compact and easy to hold — ideal for shorter books and pocket-friendly editions.",
  },
  {
    id: "5.25x8",
    name: "5.25 × 8 in",
    inches: [5.25, 8],
    mm: [133, 203],
    genres: ["Fiction", "Memoir"],
    note: "A slightly roomier paperback that still feels light in the hand.",
  },
  {
    id: "5.5x8.5",
    name: "5.5 × 8.5 in",
    inches: [5.5, 8.5],
    mm: [140, 216],
    genres: ["Fiction", "Memoir", "Self-help"],
    note: "A versatile, familiar size for novels and personal stories.",
  },
  {
    id: "6x9",
    name: "6 × 9 in",
    inches: [6, 9],
    mm: [152, 229],
    genres: ["Fiction", "Non-fiction", "Business", "Biography"],
    note: "The all-rounder — comfortable to read and widely used across genres.",
    popular: true,
  },
  {
    id: "a5",
    name: "A5",
    inches: [5.83, 8.27],
    mm: [148, 210],
    genres: ["Fiction", "Poetry", "Academic"],
    note: "The metric standard common in India and Europe; a natural fit for local print runs.",
  },
  {
    id: "7x10",
    name: "7 × 10 in",
    inches: [7, 10],
    mm: [178, 254],
    genres: ["Textbooks", "Guides", "Cookbooks"],
    note: "Extra width for tables, diagrams and worked examples.",
  },
  {
    id: "8.5x11",
    name: "8.5 × 11 in",
    inches: [8.5, 11],
    mm: [216, 279],
    genres: ["Workbooks", "Children’s books", "Photo books"],
    note: "Large format for full-page images, activities and colour-rich layouts.",
  },
];

export interface CoverRule {
  title: string;
  text: string;
}

export const coverPrinciples: CoverRule[] = [
  {
    title: "Legible at thumbnail size",
    text: "Shrink your cover to the size of a stamp. If you can still read the title and grasp the mood, it will work on any online store.",
  },
  {
    title: "Send the right genre signals",
    text: "Thrillers, romances and business books each have a visual language. Readers shop by it, so meet their expectations — then add your own twist.",
  },
  {
    title: "Clear typography hierarchy",
    text: "Decide what matters most — usually the title, or the author’s name for a known writer — and size everything else to support it.",
  },
  {
    title: "One strong image",
    text: "A single, well-chosen photograph or illustration beats a collage. Use licensed or commissioned artwork at full print resolution.",
  },
  {
    title: "A spine that works on a shelf",
    text: "Bookshop and library shelves show spines, not covers. Keep spine text bold, short and in contrast with the background.",
  },
  {
    title: "Back cover copy that sells",
    text: "Lead with a hook, keep the blurb tight and add a short author bio. Leave room for the barcode, ISBN and MRP.",
  },
];

export interface InteriorElement {
  id: "margins" | "gutter" | "runningHeads" | "dropCap" | "leading" | "pageNumbers";
  label: string;
  text: string;
  spec: string;
}

export const interiorElements: InteriorElement[] = [
  {
    id: "margins",
    label: "Margins",
    text: "White space around the text block gives thumbs somewhere to rest and keeps lines from feeling cramped.",
    spec: "Top 16 mm · bottom 19 mm · outer 13 mm",
  },
  {
    id: "gutter",
    label: "Gutter",
    text: "The inner margin needs extra room so words don’t disappear into the binding — more for thicker books.",
    spec: "Inner 19 mm · add 3 mm above 400 pages",
  },
  {
    id: "runningHeads",
    label: "Running heads",
    text: "Small lines at the top of each page help readers find their place — often the author on the left, the title or chapter on the right.",
    spec: "8–9 pt small caps · omitted on chapter openers",
  },
  {
    id: "dropCap",
    label: "Drop cap",
    text: "An enlarged first letter marks the start of a chapter and draws the eye into the opening line.",
    spec: "3 lines deep · followed by small caps",
  },
  {
    id: "leading",
    label: "Leading",
    text: "The space between lines. Too tight and the text feels dense; too loose and the eye loses its way.",
    spec: "11 pt type on 15 pt leading",
  },
  {
    id: "pageNumbers",
    label: "Page numbers",
    text: "Folios sit at the outer edge or centred at the foot, where readers look for them. Front matter uses roman numerals.",
    spec: "9 pt · outer foot · roman i, ii, iii in prelims",
  },
];

/** Fonts must be ones the site loads: Cormorant Garamond, Fraunces, Manrope, Inter Tight, JetBrains Mono, Georgia. */
export interface FontPairing {
  name: string;
  body: string;
  display: string;
  mood: string;
}

export const fontPairings: FontPairing[] = [
  {
    name: "Classic literary",
    body: "Cormorant Garamond",
    display: "Cormorant Garamond",
    mood: "Timeless and elegant — at home in literary fiction, poetry and memoir.",
  },
  {
    name: "Warm contemporary",
    body: "Georgia",
    display: "Fraunces",
    mood: "Friendly with a little character — suits upmarket fiction and narrative non-fiction.",
  },
  {
    name: "Clean and modern",
    body: "Georgia",
    display: "Inter Tight",
    mood: "Crisp and confident — a strong fit for business, self-help and how-to books.",
  },
];

export interface Finish {
  id: string;
  group: "Paper" | "Lamination" | "Binding";
  name: string;
  text: string;
}

export const finishes: Finish[] = [
  {
    id: "paper-cream",
    group: "Paper",
    name: "Cream (natural)",
    text: "Soft on the eyes over long reading sessions — the classic choice for novels and memoirs.",
  },
  {
    id: "paper-white",
    group: "Paper",
    name: "White",
    text: "Bright and neutral, so photographs, charts and colour pages reproduce accurately.",
  },
  {
    id: "lam-matte",
    group: "Lamination",
    name: "Matte",
    text: "A smooth, non-reflective finish that feels refined and hides fingerprints well.",
  },
  {
    id: "lam-gloss",
    group: "Lamination",
    name: "Gloss",
    text: "Shiny and vivid — makes colours pop and wipes clean easily, great for children’s books.",
  },
  {
    id: "lam-soft-touch",
    group: "Lamination",
    name: "Soft-touch",
    text: "A velvety, premium feel in the hand, often used for special and gift editions.",
  },
  {
    id: "bind-perfect",
    group: "Binding",
    name: "Perfect bound paperback",
    text: "Pages glued into a flexible card cover — affordable, light and the standard for most books.",
  },
  {
    id: "bind-case",
    group: "Binding",
    name: "Case-bound hardcover",
    text: "Pages bound into rigid boards for a durable, collectable edition that lasts for years.",
  },
  {
    id: "bind-jacket",
    group: "Binding",
    name: "Dust jacket",
    text: "A printed paper wrap for a hardcover, with flaps for the blurb and author bio.",
  },
];

export const fileChecklist: string[] = [
  "All images at 300 dpi at their final printed size.",
  "Colours converted to CMYK for print (keep RGB for the eBook).",
  "3 mm (0.125 in) bleed on every edge where artwork runs off the page.",
  "Text and key details kept inside a safe zone at least 6 mm from the trim.",
  "All fonts embedded, with licences that allow print and eBook use.",
  "Exported as PDF/X-1a (or the printer’s preferred PDF standard).",
  "Spine width calculated from the final page count and paper stock.",
  "Separate PDFs for the cover spread and the interior pages.",
  "Interior pages at the exact trim size, single pages, in reading order.",
  "Barcode and ISBN placed on the back cover in a clear white area.",
];

export interface DesignStep {
  title: string;
  text: string;
}

export const designProcess: DesignStep[] = [
  {
    title: "Brief",
    text: "We learn about your story, readers and genre, and the covers you love (and don’t). Your designer turns that into a clear creative direction.",
  },
  {
    title: "Concepts",
    text: "You receive original cover concepts — 1 with Kickstart, 3 with Level-Up, 6 with Pro — alongside sample interior spreads.",
  },
  {
    title: "Refine",
    text: "Pick a direction and we polish it with you: type, colour, imagery and the interior layout, until it feels unmistakably yours.",
  },
  {
    title: "Final files & proofs",
    text: "We typeset the full interior, build the cover wrap to the exact spine width and share proofs for your sign-off before print.",
  },
];

export const designFaq: FaqItem[] = [
  {
    q: "Can I use my own cover design or artwork?",
    a: "Yes. Share your artwork and our designers will check its resolution and licensing, then adapt it to the correct trim, spine and bleed for print.",
  },
  {
    q: "How many cover concepts will I get?",
    a: "Kickstart includes 1 cover concept, Level-Up includes 3 and Pro includes 6. Each is an original direction that we then refine with you.",
  },
  {
    q: "Can my book have colour pages inside?",
    a: "Kickstart and Level-Up include black-and-white interiors. Pro offers a choice of black-and-white or full-colour interiors — ideal for children’s books, cookbooks and photo-heavy titles.",
  },
  {
    q: "Which trim size should I choose?",
    a: "It depends on your genre and page count. 6 × 9 in suits most fiction and non-fiction, while smaller sizes work well for poetry and novellas. Your publishing consultant will recommend one.",
  },
  {
    q: "How many pages does formatting cover?",
    a: "Every plan includes interior formatting for approximately 350 pages. Longer manuscripts can be formatted as an add-on.",
  },
  {
    q: "Do I get to approve the design before printing?",
    a: "Always. You review the cover and interior proofs and nothing goes to print until you sign off — it’s your book.",
  },
];

/** Approximate spine width in mm: pages × paper caliper (cream 0.07 mm/page, white 0.06 mm/page) + 2 mm for a hardcover's boards allowance (0 for paperback). Indicative. */
export function spineWidthMm(
  pages: number,
  paper: "cream" | "white",
  binding: "paperback" | "hardcover",
): number {
  const safePages = Number.isFinite(pages) ? pages : 24;
  const clamped = Math.min(1000, Math.max(24, safePages));
  const caliper = paper === "cream" ? 0.07 : 0.06;
  const boards = binding === "hardcover" ? 2 : 0;
  return Math.round((clamped * caliper + boards) * 10) / 10;
}
