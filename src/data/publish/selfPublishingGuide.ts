import type { FaqItem, GuideChapter } from "./types";

/**
 * "The complete guide to self-publishing in India" — long-form guide content.
 * Plan prices and features mirror src/data/plans.ts (prices exclude GST).
 */
export const guideMeta = {
  title: "The complete guide to self-publishing in India",
  intro:
    "Everything you need to go from finished draft to a book readers can buy — editing, design, ISBN, formats, printing, pricing and launch — explained in plain English, with the Indian details that matter. Read it end to end, or jump to the step you’re on.",
  readMinutes: 14,
  updated: "October 2026" as const,
  learn: [
    "How self-publishing compares with traditional publishing — and which suits you",
    "The eight steps from finished manuscript to a book on sale",
    "How ISBNs, copyright and metadata work in India",
    "How list price, retailer share and print cost decide your earnings",
    "What each stage typically costs, and what a plan includes",
    "A launch plan and a checklist you can follow today",
  ],
};

export const selfPublishingGuide: GuideChapter[] = [
  {
    id: "self-vs-traditional",
    toc: "Self vs traditional",
    kicker: "Before you begin",
    title: "Self-publishing vs traditional publishing",
    blocks: [
      {
        type: "p",
        text: "There are three broad routes to a published book. A traditional publisher buys the rights and handles everything. DIY self-publishing means you manage every task and supplier yourself. Assisted self-publishing sits in between: you keep your rights and control, while a professional team does the production work with you.",
      },
      {
        type: "p",
        text: "None of these is “right” for everyone. The table below sets out the trade-offs so you can see which matters most to you — control, speed, cost or support.",
      },
      {
        type: "table",
        caption: "How the three publishing routes compare",
        columns: ["", "Traditional", "DIY self-publishing", "StoryShelf"],
        highlight: 3,
        rows: [
          ["Rights & copyright", "Publisher usually licenses key rights, often exclusively", "You keep everything", "Copyright stays with you; the agreement is non-exclusive"],
          ["Creative control", "Publisher has the final say on title, cover and edits", "Complete, but every decision is yours alone", "You approve every edit, cover and page"],
          ["Time to market", "Often a year or more after acceptance", "As fast as you can manage each step", "Typically 6–8 weeks from signing"],
          ["Upfront cost", "None to the author", "Varies — you pay each supplier separately", "One plan price from ₹19,999 (GST extra)"],
          ["Royalties & earnings", "A smaller royalty, usually after any advance earns out", "Your earnings, minus retailer share and print cost", "A better share of the profit on every sale"],
          ["Editing & design", "Done in-house by the publisher", "You find and manage freelancers", "Editing, cover and typesetting included by plan"],
          ["Distribution", "Strong bookshop reach where the publisher sells", "Mostly online, set up account by account", "National, global and StoryShelf Store, with print-on-demand"],
          ["Marketing support", "Varies by title; authors still do much of it", "Entirely up to you", "Marketing assistance in every plan, more on Level-Up and Pro"],
        ],
      },
      {
        type: "takeaways",
        items: [
          "Traditional publishing costs nothing upfront but is slow, selective and takes rights.",
          "DIY gives total control but makes you the project manager for everything.",
          "Assisted self-publishing keeps your rights and adds a professional team.",
        ],
      },
    ],
  },
  {
    id: "is-it-right-for-you",
    toc: "Is it right for you?",
    kicker: "Before you begin",
    title: "Is self-publishing right for you?",
    blocks: [
      {
        type: "p",
        text: "Self-publishing suits authors who want their book out in the world on their own terms. It works for debut novelists, poets, academics, business leaders, memoirists and anyone writing for a community they already know.",
      },
      {
        type: "list",
        items: [
          "You keep your copyright and decide where else your work appears.",
          "You choose the title, the cover and the final text.",
          "Your book can be on sale in weeks, not years.",
          "You earn a better share of the profit than a typical royalty deal.",
          "Your book stays available through print-on-demand — it need never go out of print.",
          "You can publish niche, regional or specialist books a large publisher might pass on.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        title: "What self-publishing asks of you",
        text: "You are the publisher. That means investing money upfront, making decisions quickly, and — above all — promoting your book after launch. Readers will not find it on their own. If you’re not ready to talk about your book for months, budget for marketing help.",
      },
      {
        type: "p",
        text: "A good test: picture the reader who will buy your book. If you can describe them and where they spend time, self-publishing gives you a direct line to them.",
      },
    ],
  },
  {
    id: "finish-your-manuscript",
    toc: "Finish your manuscript",
    kicker: "Step 1 of 8",
    title: "Finish your manuscript",
    blocks: [
      {
        type: "p",
        text: "Everything that follows depends on a complete, revised draft. Before you pay for editing, take your manuscript as far as you can on your own. Every problem you fix now is one an editor doesn’t have to charge you for.",
      },
      {
        type: "h3",
        text: "Self-editing tips",
      },
      {
        type: "list",
        items: [
          "Rest the draft for two to four weeks, then reread it as a reader would.",
          "Read it aloud — it catches missing words and clumsy rhythm.",
          "Cut scenes, chapters or sections that don’t move the book forward.",
          "Check names, dates and spellings stay consistent throughout.",
          "Trim filler words such as “very”, “really” and “just”.",
          "Make sure every chapter opens and ends with a reason to turn the page.",
        ],
      },
      {
        type: "table",
        caption: "Typical word counts by genre — broad conventions, not strict rules",
        columns: ["Genre", "Typical length"],
        rows: [
          ["Adult fiction", "70,000–100,000 words"],
          ["Young adult", "50,000–80,000 words"],
          ["Memoir", "60,000–90,000 words"],
          ["General non-fiction", "40,000–70,000 words"],
          ["Poetry collection", "60–120 pages"],
          ["Children’s picture book", "300–1,000 words"],
        ],
      },
      {
        type: "p",
        text: "Next, find three to five beta readers — people who read your genre and will be honest. Friends and family are kind, but they rarely tell you where they got bored. Ask specific questions: where did you skim, who did you not believe, what confused you?",
      },
      {
        type: "callout",
        tone: "tip",
        title: "Look for patterns",
        text: "One beta reader’s complaint is an opinion. The same note from three readers is a problem worth fixing.",
      },
    ],
  },
  {
    id: "get-it-edited",
    toc: "Get it edited",
    kicker: "Step 2 of 8",
    title: "Get your book professionally edited",
    blocks: [
      {
        type: "p",
        text: "Editing is the single biggest difference between a book that looks self-published and one that simply looks published. There are three kinds, and they happen in this order.",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Developmental editing looks at the big picture: structure, pacing, plot, argument and audience. It answers “does this book work?”",
          "Copy editing works line by line: grammar, clarity, consistency, repetition and word choice. It answers “does every sentence work?”",
          "Proofreading is the final pass on the typeset pages, catching typos, broken layouts and stray errors before print.",
        ],
      },
      {
        type: "p",
        text: "A good editor makes suggestions in tracked changes and explains why. You accept, reject or discuss each one. Your voice should still be recognisably yours when the edit is done — just clearer.",
      },
      {
        type: "callout",
        tone: "with8085",
        title: "Editing on each plan",
        text: "Every plan includes a plagiarism check. Level-Up adds professional copy editing. Pro includes extensive editing for manuscripts that need deeper structural and line-level work.",
      },
      {
        type: "takeaways",
        items: [
          "Fix the big picture first; polishing sentences you later cut wastes money.",
          "Proofreading happens after typesetting, not before.",
          "Edits are suggestions — the final text is always yours.",
        ],
      },
    ],
  },
  {
    id: "design-cover-interior",
    toc: "Cover & interior",
    kicker: "Step 3 of 8",
    title: "Design your cover and interior",
    blocks: [
      {
        type: "p",
        text: "Readers do judge a book by its cover — usually as a thumbnail on a phone screen. The interior matters just as much once they open it. Good design is invisible; bad design makes a reader put the book down.",
      },
      {
        type: "list",
        items: [
          "Make the title legible at thumbnail size.",
          "Fit your genre’s conventions so readers instantly know what kind of book it is.",
          "Use one strong image or idea rather than several competing ones.",
          "Design the spine and back cover too — they sell the book on a shelf.",
          "Choose a readable body font, comfortable margins and consistent chapter openers.",
          "Supply images at 300 dpi and confirm you have the rights to use them.",
        ],
      },
      {
        type: "callout",
        tone: "with8085",
        title: "Design on each plan",
        text: "Kickstart includes 1 cover design suggestion, Level-Up 3 and Pro 6. Every plan includes interior formatting for approximately 350 pages in B/W; Pro also offers full-colour interiors.",
      },
      {
        type: "next",
        href: "/publish/book-design",
        label: "How to design a book",
        text: "Covers, trim sizes, fonts and layout — our step-by-step design guide.",
      },
    ],
  },
  {
    id: "isbn-copyright-metadata",
    toc: "ISBN & metadata",
    kicker: "Step 4 of 8",
    title: "ISBN, copyright and metadata",
    blocks: [
      {
        type: "p",
        text: "An ISBN is the unique number that identifies your book to retailers, libraries and distributors. Each format — paperback, hardcover, eBook — normally needs its own. The barcode on the back cover encodes the ISBN so shops can scan it.",
      },
      {
        type: "callout",
        tone: "india",
        title: "ISBN and copyright in India",
        text: "In India, ISBNs are issued free of charge by the Raja Rammohun Roy National Agency for ISBN (isbn.gov.in). Copyright exists automatically the moment you create your work; registering it with the Copyright Office is optional, though it can help as evidence if a dispute ever arises.",
      },
      {
        type: "p",
        text: "Metadata is the information that describes your book online. It decides whether readers find your book when they search — so treat it as carefully as the cover.",
      },
      {
        type: "list",
        items: [
          "Title and subtitle — a subtitle is especially useful for non-fiction search.",
          "Description — a short, gripping blurb that opens with a hook.",
          "Categories — BISAC-style subjects that place your book on the right virtual shelf.",
          "Keywords — the words your readers actually type when searching.",
          "Author bio — two or three sentences on why you wrote this book.",
          "Format details — page count, trim size, language and price.",
        ],
      },
      {
        type: "callout",
        tone: "with8085",
        title: "Included in every plan",
        text: "Every StoryShelf plan includes an ISBN and a retail barcode, registered with you as the copyright holder. Your Publication Manager also helps you prepare the metadata for your listings.",
      },
    ],
  },
  {
    id: "choose-your-formats",
    toc: "Choose your formats",
    kicker: "Step 5 of 8",
    title: "Choose your formats",
    blocks: [
      {
        type: "p",
        text: "Readers buy books in different ways. Offering more than one format lets each reader choose — and every extra format is another way to earn from the same manuscript.",
      },
      {
        type: "table",
        caption: "Book formats compared",
        columns: ["Format", "Pros", "Cons", "With StoryShelf"],
        highlight: 3,
        rows: [
          ["Paperback", "Affordable, familiar, easy to gift and sign", "Print cost reduces earnings per copy", "Included in every plan"],
          ["Hardcover", "Premium feel, durable, suits gifts and collectors", "Higher print cost and list price", "Included in every plan"],
          ["eBook", "No print cost, instant delivery, easy to update", "Lower list prices; some readers prefer print", "Included in Level-Up and Pro; add-on for Kickstart"],
          ["Audiobook", "Reaches listeners on the move", "Narration and production take time and budget", "Included in Pro; add-on for Kickstart and Level-Up"],
        ],
      },
      {
        type: "p",
        text: "Most authors start with a paperback and an eBook, then add an audiobook once the book has found its readers. Picture books, cookbooks and photo-rich titles may suit a full-colour print edition first.",
      },
      {
        type: "takeaways",
        items: [
          "Paperback plus eBook covers most readers from day one.",
          "eBooks have no print cost, so more of the price can become your earnings.",
          "Add an audiobook when you’re ready to reach listeners.",
        ],
      },
    ],
  },
  {
    id: "print-and-distribute",
    toc: "Print & distribute",
    kicker: "Step 6 of 8",
    title: "Print and distribute your book",
    blocks: [
      {
        type: "p",
        text: "There are two main ways to print. Print-on-demand (POD) prints each copy when it’s ordered. Offset printing produces a large run in one go. Most self-published authors start with POD and switch to offset only when they need many copies at once.",
      },
      {
        type: "table",
        caption: "Print-on-demand vs offset printing",
        columns: ["", "Print-on-demand", "Offset printing"],
        rows: [
          ["How it works", "Each copy printed when ordered", "A large batch printed at once"],
          ["Upfront cost", "Low — no stock to buy", "Higher — you pay for the whole run"],
          ["Cost per copy", "Higher", "Lower at large quantities"],
          ["Storage", "None needed", "You need space for the stock"],
          ["Out of stock?", "Never", "When the run sells out"],
          ["Best for", "Online sales and steady demand", "Events, bulk orders and bookshop supply"],
        ],
      },
      {
        type: "p",
        text: "In India, most readers buy books online through Amazon.in and Flipkart. Global retailers make your book available to readers abroad, and eBook stores such as Google Play reach readers who read on phones and tablets.",
      },
      {
        type: "list",
        items: [
          "National online stores — Amazon.in, Flipkart and similar.",
          "Global online retailers for readers outside India.",
          "eBook platforms, including Google Play Books.",
          "The StoryShelf Store, our own storefront for StoryShelf authors.",
          "Your own events, readings and direct sales with author copies.",
        ],
      },
      {
        type: "callout",
        tone: "with8085",
        title: "Distribution on each plan",
        text: "Every plan includes print-on-demand plus national online, global and StoryShelf Store distribution. Level-Up and Pro add Google Play and EPUB distribution; Pro adds a one-month Amazon Prime listing.",
      },
    ],
  },
  {
    id: "price-your-book",
    toc: "Price your book",
    kicker: "Step 7 of 8",
    title: "Price your book",
    blocks: [
      {
        type: "p",
        text: "Three numbers decide what you earn from each copy. The list price is what the reader pays. The retailer keeps a share for selling it. And for print books, the printer charges for paper, ink and binding. What’s left is yours.",
      },
      {
        type: "callout",
        tone: "note",
        title: "The formula",
        text: "Earnings per copy = list price − retailer share − print cost. For eBooks there is no print cost, so the formula is simply list price minus retailer share.",
      },
      {
        type: "p",
        text: "Page count and colour drive print cost, so a long or full-colour book needs a higher list price to earn the same per copy.",
      },
      {
        type: "callout",
        tone: "tip",
        title: "Price by comparison",
        text: "Search your genre on Amazon.in and note the prices of five to ten similar books with a similar page count. Pricing within that range tells readers your book belongs alongside them.",
      },
      {
        type: "p",
        text: "With StoryShelf you earn a better share of the profit on every sale, with transparent statements. Payouts are annual on Kickstart and Level-Up, and quarterly on Pro.",
      },
    ],
  },
  {
    id: "launch-and-market",
    toc: "Launch & market",
    kicker: "Step 8 of 8",
    title: "Launch and market your book",
    blocks: [
      {
        type: "p",
        text: "A launch is a few weeks of focused effort that gives your book its best start. Plan it before your book goes live — the timeline below shows what to do and when.",
      },
      {
        type: "widget",
        name: "launchTimeline",
      },
      {
        type: "h3",
        text: "Marketing channels that work",
      },
      {
        type: "list",
        items: [
          "Your own network — friends, colleagues, alumni groups and WhatsApp communities.",
          "Social media — Instagram, LinkedIn or YouTube, wherever your readers spend time.",
          "Reader reviews — ask early readers to post honest reviews in launch week.",
          "Your retail pages — a strong description, A+ content and an Author Page.",
          "Paid ads — sponsored listings that target readers of similar books.",
          "Events — launches, readings, literature festivals and school or college visits.",
          "Local media — newspapers, radio and blogs, especially in your home city.",
        ],
      },
      {
        type: "callout",
        tone: "with8085",
        title: "Marketing on each plan",
        text: "Every plan includes marketing assistance and digital posters — 1 on Kickstart and Level-Up, 2 on Pro. Level-Up and Pro add YouTube promotion. Pro adds an Amazon A+ listing, an Amazon Author Page, enhanced video promotion and 30 days of Amazon Sponsored ads.",
      },
      {
        type: "takeaways",
        items: [
          "Start planning your launch before the book goes live.",
          "Reviews in launch week help every later sale.",
          "Keep marketing after launch — books sell over months and years.",
        ],
      },
    ],
  },
  {
    id: "what-does-it-cost",
    toc: "What does it cost?",
    kicker: "Budget",
    title: "What does self-publishing cost?",
    blocks: [
      {
        type: "p",
        text: "Doing it yourself means paying separate suppliers for each stage. Prices vary widely with your book’s length, genre and the experience of the professional you hire. The ranges below give you a starting point for budgeting.",
      },
      {
        type: "table",
        caption: "Indicative market ranges for a typical-length book in India — actual quotes vary by supplier and manuscript",
        columns: ["Item", "Typical DIY cost", "With a StoryShelf plan"],
        highlight: 2,
        rows: [
          ["Editing", "₹15,000–₹1,00,000+", "Included — plagiarism check on all; copy editing on Level-Up; extensive editing on Pro"],
          ["Cover design", "₹5,000–₹30,000", "Included — 1, 3 or 6 suggestions by plan"],
          ["Typesetting", "₹8,000–₹25,000", "Included — approx. 350 pages"],
          ["ISBN", "Free in India", "Included, with barcode"],
          ["Printing proofs", "₹500–₹3,000", "Included, plus 3, 5 or 15 author copies by plan"],
          ["Marketing", "₹10,000–₹50,000+", "Assistance in every plan; more on Level-Up and Pro"],
        ],
      },
      {
        type: "p",
        text: "StoryShelf plans bring these stages together for one price: Kickstart at ₹19,999, Level-Up at ₹49,999 and Pro at ₹99,999. GST is extra on all plans. Each includes a dedicated Publication Manager to run the process for you.",
      },
      {
        type: "callout",
        tone: "note",
        title: "Need just one extra?",
        text: "eBook, audiobook, Amazon storefront and advertising options are available as add-ons, so you can start with a smaller plan and add only what your book needs.",
      },
    ],
  },
  {
    id: "publishing-checklist",
    toc: "Your checklist",
    kicker: "Wrap-up",
    title: "Your self-publishing checklist",
    blocks: [
      {
        type: "p",
        text: "Use this checklist to track your progress. Tick each item off as you go — and come back to it before launch day.",
      },
      {
        type: "checklist",
        title: "From manuscript to launch",
        items: [
          "Complete and self-edit your full manuscript",
          "Gather feedback from three to five beta readers",
          "Get your manuscript professionally edited",
          "Approve your cover design, including spine and back",
          "Approve your typeset interior",
          "Secure your ISBN and barcode",
          "Write your description, keywords and author bio",
          "Choose your formats and set your list price",
          "Check and approve your final proofs",
          "Confirm your book is live on every store",
          "Prepare your launch posts, posters and review requests",
          "Launch — then keep marketing for the months ahead",
        ],
      },
      {
        type: "takeaways",
        items: [
          "A well-edited, well-designed book is the foundation of every sale.",
          "Your price, formats and metadata decide how readers find and buy it.",
          "Launch is the start of marketing, not the end.",
        ],
      },
      {
        type: "next",
        href: "/plans",
        label: "Compare publishing plans",
        text: "See what Kickstart, Level-Up and Pro include, side by side.",
      },
    ],
  },
];

export const selfPublishingFaq: FaqItem[] = [
  {
    q: "Do I keep the copyright if I self-publish with StoryShelf?",
    a: "Yes. Copyright always stays with you, and our agreement is non-exclusive, so you remain free to publish your work elsewhere.",
  },
  {
    q: "Do I need to buy an ISBN?",
    a: "In India, ISBNs are issued free of charge by the national ISBN agency. With StoryShelf, an ISBN and retail barcode are included in every plan, so you don’t need to apply yourself.",
  },
  {
    q: "Do I have to register my copyright?",
    a: "No. Copyright exists automatically when you create your work. Registration with the Copyright Office is optional, though some authors choose it for added evidence of ownership.",
  },
  {
    q: "How long does self-publishing take?",
    a: "With StoryShelf, typically 6–8 weeks from signing, depending on how much editing your manuscript needs and how quickly you approve designs and proofs.",
  },
  {
    q: "How much will I earn from each copy?",
    a: "Your earnings per copy are the list price minus the retailer’s share and the print cost. You earn a better share of the profit on every sale, with transparent statements.",
  },
  {
    q: "Can I publish an eBook or audiobook too?",
    a: "Yes. The eBook is included in Level-Up and Pro and available as an add-on on Kickstart. The audiobook is included in Pro and available as an add-on on the other plans.",
  },
  {
    q: "Will my book be available outside India?",
    a: "Yes. Every plan includes global distribution alongside national online stores, the StoryShelf Store and print-on-demand.",
  },
  {
    q: "Are plan prices inclusive of GST?",
    a: "No. Kickstart (₹19,999), Level-Up (₹49,999) and Pro (₹99,999) are shown excluding GST, which is added and itemised on your quote and invoice.",
  },
];
