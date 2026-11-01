import { Cormorant_Garamond, Fraunces, Inter_Tight, JetBrains_Mono, Manrope } from "next/font/google";

/**
 * Site typography — part of the central theme. Swap families here; the CSS
 * variables below are what every component (and the 3D cover generator) uses.
 */
export const fontDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--ff-display",
  display: "swap",
});

export const fontSerif = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--ff-serif",
  display: "swap",
});

export const fontSans = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--ff-sans",
  display: "swap",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--ff-mono",
  display: "swap",
});

/**
 * Figures: prices, stats, counters. Crisp lining/tabular numerals and a real
 * ₹ glyph (lives in the latin-ext subset), unlike the old-style figures of
 * the display serif.
 */
export const fontNum = Inter_Tight({
  subsets: ["latin", "latin-ext"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--ff-num",
  display: "swap",
});

export const fontVariables = [fontDisplay, fontSerif, fontSans, fontMono, fontNum].map((f) => f.variable).join(" ");
