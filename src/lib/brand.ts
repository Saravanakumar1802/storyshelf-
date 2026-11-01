/**
 * The StoryShelf brand in one place: name, lines, domain and the mark.
 * The mark is shared by the SVG logo and the canvas emblem on 3D covers.
 */
export const BRAND = {
  name: "StoryShelf",
  domain: "storyshelf.in",
  tagline: "Read freely. Publish proudly.",
  slogan: "Every story deserves a shelf",
  descriptor: "Read · Write · Publish",
} as const;

/**
 * StoryShelf mark in a 48×48 box: an open book resting on a shelf, with
 * three sparks rising from its gutter (the story taking flight).
 * `strokes` are drawn in order; `sparks` are the dots at the tips.
 */
export const MARK = {
  strokes: [
    "M3 41 H45", // the shelf
    "M24 17 V37", // spine
    "M24 17 C19 13.5 12 13 6 15 V34.5 C12 32.5 19 33 24 37", // left page
    "M24 17 C29 13.5 36 13 42 15 V34.5 C36 32.5 29 33 24 37", // right page
    "M10 20.5 C13.5 19.5 17 19.7 20 21",
    "M10 25.5 C13.5 24.5 17 24.7 20 26",
    "M38 20.5 C34.5 19.5 31 19.7 28 21",
    "M38 25.5 C34.5 24.5 31 24.7 28 26",
    "M24 11 V6.5", // sparks
    "M17.5 12.5 L15.2 9.4",
    "M30.5 12.5 L32.8 9.4",
    "M11 41 V45", // brackets
    "M37 41 V45",
  ],
  sparks: [
    [24, 4.2],
    [14, 7.8],
    [34, 7.8],
  ] as [number, number][],
} as const;
