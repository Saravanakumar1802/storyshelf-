import faqData from "./faqs.json";
import type { Faq, FaqCategory, Guide, Testimonial } from "@/types";

export const faqCategories: FaqCategory[] = ["Plans", "Royalty", "ISBN & Rights", "Distribution", "Editing & Design", "Payments", "Support"];

// one source for the site and the AI help assistant (backend/app/modules/assistant)
export const faqs = faqData as Faq[];

export const guides: Guide[] = [
  {
    slug: "preparing-your-manuscript",
    title: "Preparing your manuscript",
    summary: "Formatting, file types and the checks to run before you send your book to us.",
    stage: "Before you start",
    readMinutes: 6,
    sections: [
      { heading: "Use a clean, simple file", body: "Send a .docx or .pdf. Use one font, consistent heading styles and real page breaks between chapters — no manual spacing with blank lines.", tips: ["Use Heading 1 for chapter titles", "Avoid text boxes and floating images", "Name the file with your book title"] },
      { heading: "Include your front and back matter", body: "Dedication, acknowledgements, author bio and any epigraphs. Tell us which pages should appear before chapter one." },
      { heading: "Images and permissions", body: "Supply images at 300 dpi and confirm you have the right to use every quotation, lyric or photograph." },
      { heading: "Read it aloud once", body: "Reading aloud catches missing words and awkward rhythm better than any spellchecker." },
    ],
  },
  {
    slug: "choosing-the-right-plan",
    title: "Choosing the right plan",
    summary: "How Kickstart, Level-Up and Pro differ — and how to decide in five minutes.",
    stage: "Before you start",
    readMinutes: 4,
    sections: [
      { heading: "Start with your manuscript", body: "If it has already been professionally edited, Kickstart may be all you need. If it hasn't, Level-Up's copy editing or Pro's extensive editing will make a visible difference." },
      { heading: "Then think about your readers", body: "Readers who buy on phones expect an eBook (included from Level-Up). Listeners expect an audiobook (included in Pro)." },
      { heading: "Finally, your launch", body: "If you want ads, an Amazon A+ page and quarterly royalty payouts, Pro is designed for you." },
    ],
  },
  {
    slug: "understanding-royalties",
    title: "Understanding royalties",
    summary: "How your earnings are calculated, reported and paid.",
    stage: "After launch",
    readMinutes: 5,
    sections: [
      { heading: "The formula", body: "Royalty = list price − retailer share − printing cost. What remains is your profit.", tips: ["Higher list prices increase royalty per copy", "eBooks have no printing cost"] },
      { heading: "Payout schedule", body: "Annual payouts for Kickstart and Level-Up, quarterly for Pro. Statements are available in your dashboard." },
      { heading: "Taxes", body: "Royalties are income. We issue statements you can share with your accountant; TDS applies as per Indian law." },
    ],
  },
  {
    slug: "launching-your-book",
    title: "Launching your book",
    summary: "A 30-day launch checklist that works for debut and seasoned authors alike.",
    stage: "Launch",
    readMinutes: 7,
    sections: [
      { heading: "Two weeks before", body: "Share the cover reveal, line up early readers, and prepare your launch posts using your StoryShelf launch kit." },
      { heading: "Launch week", body: "Announce everywhere at once, ask early readers to review, and pin your book link on every profile." },
      { heading: "After launch", body: "Keep momentum with readings, guest posts, and a steady rhythm of content. Track what works in your dashboard." },
    ],
  },
  {
    slug: "working-with-your-editor",
    title: "Working with your editor",
    summary: "How editing rounds work and how to give feedback that gets results.",
    stage: "Production",
    readMinutes: 5,
    sections: [
      { heading: "Tracked changes", body: "Every edit is a suggestion. Accept, reject, or reply to a comment — your editor will discuss anything you're unsure about." },
      { heading: "Rounds", body: "Most books take two rounds of editing plus a final proofread after typesetting." },
      { heading: "Giving feedback", body: "Be specific: 'this feels too formal for my narrator' helps more than 'I don't like it'." },
    ],
  },
  {
    slug: "approving-your-cover",
    title: "Approving your cover",
    summary: "What to look for in cover concepts — at thumbnail size and on the shelf.",
    stage: "Production",
    readMinutes: 4,
    sections: [
      { heading: "Test it small", body: "Most readers first see your cover as a thumbnail. Check the title is legible at the size of a fingernail." },
      { heading: "Compare with your genre", body: "Place it next to bestsellers in your genre. It should belong — and still stand out." },
      { heading: "Check the spine and back", body: "The spine sells the book on a shelf; the back cover sells it in the hand." },
    ],
  },
];

export const guideBySlug = (slug: string) => guides.find((g) => g.slug === slug);

export const testimonials: Testimonial[] = [
  { id: "t1", name: "Meera Varghese", role: "Novelist, Kottayam", book: "The Monsoon Ledger", plan: "pro", swatch: 0, quote: "I sent them a manuscript and a nervous email. Eight weeks later I was holding a book I'm proud to give to anyone. The editing alone changed my writing life." },
  { id: "t2", name: "Kabir Joshi", role: "Engineer & debut author", book: "Circuit of Stars", plan: "pro", swatch: 6, quote: "My Publication Manager answered every question, at every stage. The cover concepts were extraordinary — choosing one was the hardest part." },
  { id: "t3", name: "Leela Raman", role: "Romance author, Kolkata", book: "The Last Tram to Esplanade", plan: "levelUp", swatch: 5, quote: "Level-Up was exactly right: real copy editing, beautiful cover options and my eBook was live on launch day." },
  { id: "t4", name: "Rohan D'Souza", role: "Poet, Goa", book: "Saltwater Hymns", plan: "kickstart", swatch: 2, quote: "Kickstart made publishing my first collection simple and affordable — and I still own every word." },
  { id: "t5", name: "Aditi Rao", role: "Journalist & memoirist", book: "Ink & Undertow", plan: "pro", swatch: 10, quote: "The launch campaign put my memoir in front of readers I could never have reached alone. Quarterly royalties are a lovely surprise every time." },
];

export const supportChannels = {
  phone: "+91 80 4085 8085",
  whatsapp: "+91 98450 08085",
  email: "authors@storyshelf.in",
  hours: "Mon–Sat · 9:30 am – 7:00 pm IST",
  address: "StoryShelf, 2nd Floor, Indiranagar, Bengaluru 560038",
};
