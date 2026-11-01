import type { PublishingStage, Service } from "@/types";

export const services: Service[] = [
  {
    slug: "writing-and-editing",
    number: "01",
    title: "Writing & Editing",
    short: "Shape your manuscript and write for the readers you want to reach.",
    description:
      "Every great book is rewritten. Our editors work alongside you — from structure and voice to the last comma — so your manuscript reads the way you hear it in your head, and speaks to the audience you're writing for.",
    emblem: "quill",
    includes: [
      { title: "Manuscript assessment", text: "A candid read of your draft with notes on structure, pacing, character and argument." },
      { title: "Developmental editing", text: "Big-picture guidance on plot, flow and audience before a single line is polished." },
      { title: "Copy & line editing", text: "Grammar, consistency, clarity and rhythm, line by line, in tracked changes you approve." },
      { title: "Plagiarism screening", text: "Originality checks on every manuscript so you publish with confidence." },
      { title: "Ghostwriting support", text: "Have the story but not the time? Collaborate with a writer who captures your voice." },
      { title: "Proofreading", text: "A final, fresh pair of eyes on the typeset pages before they go to print." },
    ],
    process: [
      { title: "Read", text: "Your editor reads the whole manuscript and maps its strengths." },
      { title: "Discuss", text: "A call to agree goals, audience and the depth of editing." },
      { title: "Edit", text: "Rounds of edits with comments you can accept, reject or discuss." },
      { title: "Approve", text: "You sign off the final text — it's always your book." },
    ],
    planNote: "Kickstart includes a plagiarism check, Level-Up adds copy editing, and Pro includes extensive editing.",
  },
  {
    slug: "book-production",
    number: "02",
    title: "Book Production",
    short: "Turn your manuscript into a professionally designed, retail-ready book.",
    description:
      "Typography, covers, paper and print are where a manuscript becomes a book. Our designers and production team craft covers that stop scrolling thumbs and interiors that are a pleasure to read — then deliver print-ready and eBook files to retail standards.",
    emblem: "lamp",
    includes: [
      { title: "Cover design", text: "Original concepts (1, 3 or 6 by plan) refined with you until it feels unmistakably yours." },
      { title: "Interior typesetting", text: "Editorial-grade layouts for ~350 pages in B/W or full colour, with chapter openers and front matter." },
      { title: "ISBN & barcode", text: "Registered ISBN and retail barcode, in your name as the copyright holder." },
      { title: "Paperback & hardback", text: "Standard trim sizes with regular lamination, printed on quality book paper." },
      { title: "eBook & EPUB", text: "Reflowable eBooks built to pass every major store's validation." },
      { title: "Audiobook", text: "Narration and mastering for listeners on the go (Pro or add-on)." },
    ],
    process: [
      { title: "Brief", text: "We learn your genre, readers and the books you love." },
      { title: "Concepts", text: "Cover directions and sample spreads for you to react to." },
      { title: "Refine", text: "Iterations until type, colour and image feel right." },
      { title: "Proof", text: "Digital and physical proofs before the print run." },
    ],
    planNote: "Cover concepts scale from 1 (Kickstart) to 3 (Level-Up) to 6 (Pro); Pro unlocks full-colour interiors.",
  },
  {
    slug: "marketing-and-publicity",
    number: "03",
    title: "Marketing & Publicity",
    short: "Promote your book and build a community of readers.",
    description:
      "A book finds its readers when someone tells them about it. We build your launch plan — posters, video, Amazon storefront, ads and our own channels — and help you grow a readership that stays for the next book.",
    emblem: "flame",
    includes: [
      { title: "Launch kit", text: "Digital posters, social assets and copy ready to share on launch day." },
      { title: "Amazon storefront", text: "A+ content and an optimised Author Page that convert browsers into buyers." },
      { title: "Sponsored campaigns", text: "Managed Amazon Sponsored ads targeting readers of comparable books." },
      { title: "Video promotion", text: "Cinematic book trailers and features on the StoryShelf YouTube channel." },
      { title: "Store promotions", text: "Promo codes and placements on the StoryShelf store." },
      { title: "StoryShelf Awards", text: "Every book we publish is eligible for our annual awards." },
    ],
    process: [
      { title: "Position", text: "Define your reader, comparable titles and the story behind the book." },
      { title: "Prepare", text: "Assets, listings and early reviews lined up before launch." },
      { title: "Launch", text: "Coordinated release across stores, social and our channels." },
      { title: "Sustain", text: "Monthly insights and ideas to keep the book selling." },
    ],
    planNote: "Every plan includes marketing assistance; Pro adds A+ listing, Author Page, enhanced video and 30 days of sponsored ads.",
  },
  {
    slug: "publishing-management",
    number: "04",
    title: "Publishing Management",
    short: "We handle the complete publishing process, end to end.",
    description:
      "Agreements, ISBNs, printing, distribution, listings, royalties — publishing has a hundred moving parts. A dedicated Publication Manager runs them all on a clear timeline, while you keep your rights and earn a better share of every sale.",
    emblem: "compass",
    includes: [
      { title: "Digital agreement", text: "A simple, non-exclusive agreement you sign online. Copyright stays with you." },
      { title: "Publication Manager", text: "One accountable person who owns your timeline and keeps you posted." },
      { title: "Distribution", text: "National online stores, global channels, print-on-demand and the StoryShelf Store." },
      { title: "Retail listings", text: "Amazon, Flipkart, Google Play and more — listed and maintained for you." },
      { title: "Royalty tracking", text: "Transparent sales reports, with your earnings paid annually — or quarterly on Pro." },
      { title: "Print-on-demand", text: "No warehouses, no wasted stock — books are printed as they're ordered." },
    ],
    process: [
      { title: "Agreement", text: "Choose a plan and sign digitally in minutes." },
      { title: "Schedule", text: "Your manager shares a dated plan for every stage." },
      { title: "Produce", text: "Editing, design and proofs move through on time." },
      { title: "Publish", text: "Your book goes live across every channel in your plan." },
    ],
    planNote: "All plans include ISBN, barcode, POD and national, global & StoryShelf store distribution.",
  },
  {
    slug: "author-support",
    number: "05",
    title: "Author Support",
    short: "Guidance at every step — before, during and long after launch.",
    description:
      "We work with you every step of the way to make the process easy while creating great results. A Publishing Consultant guides your choices, a Publication Manager runs the work, and our support team is a message away — even years after your book is published.",
    emblem: "key",
    includes: [
      { title: "Publishing Consultant", text: "Free consultation to choose the right plan and shape your goals." },
      { title: "Dedicated manager", text: "A named Publication Manager for your entire journey." },
      { title: "Help centre & guides", text: "Step-by-step guides on manuscripts, rights, royalties and marketing." },
      { title: "Ticketed support", text: "Raise a request any time and track it to resolution in your dashboard." },
      { title: "Post-publication care", text: "Corrections, reprints, new editions and listing updates handled for you." },
      { title: "Author community", text: "Events, workshops and the StoryShelf Awards to celebrate your work." },
    ],
    process: [
      { title: "Ask", text: "Chat, call, WhatsApp or raise a ticket — whichever suits you." },
      { title: "Assign", text: "The right specialist picks it up, with a clear response time." },
      { title: "Resolve", text: "We fix it, explain it, and confirm you're happy." },
      { title: "Follow up", text: "We check back so nothing falls through the cracks." },
    ],
    planNote: "Consultant, Publication Manager, marketing and post-publication assistance are included in every plan.",
  },
];

export const serviceBySlug = (slug: string) => services.find((s) => s.slug === slug);

export const journey: { stage: PublishingStage; weeks: string; text: string }[] = [
  { stage: "Consultation", weeks: "Day 1", text: "Talk to a Publishing Consultant about your book, goals and the right plan." },
  { stage: "Agreement", weeks: "Day 2", text: "Sign a non-exclusive agreement digitally. Your copyright stays with you." },
  { stage: "Editing", weeks: "Weeks 1–4", text: "Plagiarism checks, copy edits or extensive editing — depending on your plan." },
  { stage: "Cover & Interior", weeks: "Weeks 3–6", text: "Cover concepts and typeset interiors, refined together until they're right." },
  { stage: "ISBN & Proofs", weeks: "Week 6", text: "ISBN, barcode and final proofs. You approve every page before print." },
  { stage: "Distribution", weeks: "Week 7", text: "Live on national and global stores, the StoryShelf Store and print-on-demand." },
  { stage: "Marketing", weeks: "Week 7+", text: "Posters, video, Amazon storefront and campaigns put your book in front of readers." },
  { stage: "Royalties", weeks: "Ongoing", text: "Better profit on every sale, reported transparently and paid annually or quarterly." },
];
