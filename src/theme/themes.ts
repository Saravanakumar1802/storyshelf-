import type { BookSwatch, ReaderTone, ReaderToneName, Theme } from "./types";

/** Reader page tones, shared by both site themes: a reader picks the page, not the site. */
const readerTones: Record<ReaderToneName, ReaderTone> = {
  night: { label: "Night", bg: "#0f0d0b", text: "#e6dfcf", muted: "rgba(230, 223, 207, 0.55)", accent: "#c9a45c", rule: "rgba(230, 223, 207, 0.12)" },
  sepia: { label: "Sepia", bg: "#f1e7d0", text: "#3b2f22", muted: "rgba(59, 47, 34, 0.6)", accent: "#8a5a1c", rule: "rgba(59, 47, 34, 0.15)" },
  paper: { label: "Paper", bg: "#fcfaf5", text: "#1d1a16", muted: "rgba(29, 26, 22, 0.55)", accent: "#8a5a1c", rule: "rgba(29, 26, 22, 0.12)" },
};

/** Book cover swatches shared by both themes — books are "real objects", their
 * colours don't change with the page theme, only the lighting around them. */
const bookSwatches: BookSwatch[] = [
  { base: "#5b1f24", art: "#8a3b2f", foil: "#d9b56c", ink: "#f3e6cf" }, // oxblood
  { base: "#1f3a2e", art: "#2f5a45", foil: "#e0c27a", ink: "#efe6d0" }, // bottle green
  { base: "#16223d", art: "#2a3f6b", foil: "#cfd6e2", ink: "#e9edf5" }, // midnight navy
  { base: "#c98a2b", art: "#7a4a12", foil: "#2a1a0c", ink: "#2a1a0c" }, // ochre
  { base: "#2c5e63", art: "#4f8f8a", foil: "#f1dfb0", ink: "#f4efe2" }, // teal
  { base: "#d4561f", art: "#f2b33d", foil: "#1d140c", ink: "#1d140c" }, // vermilion
  { base: "#2a2522", art: "#4a3f36", foil: "#d8b26a", ink: "#ece2cf" }, // espresso
  { base: "#e9e1cf", art: "#b88b4a", foil: "#8a5a22", ink: "#2b2118" }, // bone
  { base: "#7c2d3c", art: "#b54a5a", foil: "#f0d8a8", ink: "#f6e9e0" }, // claret
  { base: "#8c8f93", art: "#5a5e64", foil: "#1a1c20", ink: "#14161a" }, // pewter
  { base: "#14100d", art: "#3b2a1c", foil: "#e3be72", ink: "#efe3c8" }, // ink black
  { base: "#3d4f2a", art: "#6d7f3c", foil: "#ead9a4", ink: "#f2ecd8" }, // olive
];

/** Plan volumes: cloth in the PDF plan colours, stamped in gold. */
const planBookSwatches: Theme["scene"]["planBooks"] = {
  kickstart: { base: "#1f3f72", art: "#2f62a8", foil: "#e3c27a", ink: "#eef2fa" },
  levelUp: { base: "#1b5038", art: "#25805a", foil: "#e6c77f", ink: "#eef6f0" },
  pro: { base: "#5e3a10", art: "#a8681a", foil: "#f0d394", ink: "#fbf1e0" },
};

export const midnightLibrary: Theme = {
  name: "midnightLibrary",
  mode: "dark",
  colors: {
    bg: "#0c0a09",
    bgDeep: "#070605",
    surface: "#14110e",
    surfaceRaised: "#1b1713",
    surfaceHover: "#231e19",
    border: "rgba(237, 230, 214, 0.10)",
    borderStrong: "rgba(237, 230, 214, 0.22)",
    text: "#ede6d6",
    textMuted: "rgba(237, 230, 214, 0.68)",
    textFaint: "rgba(237, 230, 214, 0.42)",
    accent: "#c9a45c",
    accentBright: "#e6c47e",
    accentSoft: "rgba(201, 164, 92, 0.14)",
    accentContrast: "#120e09",
    ember: "#e2683c",
    success: "#7fb08a",
    warning: "#e0b25a",
    danger: "#e0705f",
    info: "#7fa6d6",
    paper: "#efe7d6",
    paperInk: "#2a2018",
    editMark: "#c0392b",
    cloth: "#3e1519",
    overlay: "rgba(7, 6, 5, 0.72)",
  },
  plans: { kickstart: "#2f62a8", levelUp: "#25805a", pro: "#a8681a" },
  radii: { sm: "6px", md: "10px", lg: "18px", xl: "28px", pill: "999px" },
  shadows: {
    soft: "0 10px 30px -12px rgba(0,0,0,0.55)",
    lifted: "0 30px 80px -30px rgba(0,0,0,0.85)",
    glow: "0 0 0 1px rgba(201,164,92,0.35), 0 10px 40px -10px rgba(201,164,92,0.35)",
  },
  motion: {
    fast: 0.25,
    base: 0.6,
    slow: 1.2,
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
    gsapEase: "power3.inOut",
    gsapEaseOut: "expo.out",
  },
  effects: { grainOpacity: 0.07, vignette: "rgba(0,0,0,0.55)" },
  reader: readerTones,
  scene: {
    background: "#0a0807",
    backgroundGlow: "#2a1d12",
    fog: { color: "#0a0807", near: 14, far: 30 },
    shelf: { color: "#1a110b", edge: "#2b1c12", roughness: 0.38, reflectivity: 0.55, mirror: 0.35 },
    lights: {
      ambient: { color: "#fff1dc", intensity: 0.12 },
      key: { color: "#ffd9a8", intensity: 210 },
      rim: { color: "#9fb6ff", intensity: 2.2 },
      fill: { color: "#ffcf9a", intensity: 0.45 },
      environment: 0.55,
    },
    wordmark: { color: "#e8dcc4", opacity: 0.9 },
    dust: { color: "#ffd9a0", opacity: 0.55 },
    page: { color: "#efe4cc", edgeShade: "#cbb894", endpaper: "#e9dcc0", ink: "#2a2018" },
    env: { top: "#ffe6c4", warm: "#ffd9a6", cool: "#c9d6ff", ring: "#fff2dc" },
    headband: ["#8b1e2b", "#efe2c6"],
    bloom: { intensity: 0.55, threshold: 0.82 },
    vignette: 0.62,
    grain: 0.045,
    books: bookSwatches,
    planBooks: planBookSwatches,
  },
};

export const lightEditorial: Theme = {
  name: "lightEditorial",
  mode: "light",
  colors: {
    bg: "#f3eee4",
    bgDeep: "#e9e2d4",
    surface: "#fbf8f2",
    surfaceRaised: "#ffffff",
    surfaceHover: "#f0e9dc",
    border: "rgba(30, 24, 18, 0.12)",
    borderStrong: "rgba(30, 24, 18, 0.25)",
    text: "#1c1712",
    textMuted: "rgba(28, 23, 18, 0.7)",
    textFaint: "rgba(28, 23, 18, 0.45)",
    accent: "#9a6f25",
    accentBright: "#b8862f",
    accentSoft: "rgba(154, 111, 37, 0.12)",
    accentContrast: "#fffaf0",
    ember: "#c4502a",
    success: "#3f7d4f",
    warning: "#a8761c",
    danger: "#b5432f",
    info: "#3f6aa6",
    paper: "#fffdf8",
    paperInk: "#2a2018",
    editMark: "#b8322a",
    cloth: "#1f3557",
    overlay: "rgba(243, 238, 228, 0.8)",
  },
  plans: { kickstart: "#1f4e8c", levelUp: "#1e6b4a", pro: "#7a4a0b" },
  radii: { sm: "6px", md: "10px", lg: "18px", xl: "28px", pill: "999px" },
  shadows: {
    soft: "0 10px 30px -14px rgba(60,40,20,0.25)",
    lifted: "0 30px 80px -30px rgba(60,40,20,0.4)",
    glow: "0 0 0 1px rgba(154,111,37,0.35), 0 10px 40px -12px rgba(154,111,37,0.3)",
  },
  motion: midnightLibrary.motion,
  effects: { grainOpacity: 0.05, vignette: "rgba(80,60,30,0.18)" },
  reader: readerTones,
  scene: {
    background: "#efe8da",
    backgroundGlow: "#fff6e4",
    fog: { color: "#efe8da", near: 16, far: 34 },
    shelf: { color: "#c9b08a", edge: "#a88a62", roughness: 0.55, reflectivity: 0.25, mirror: 0.15 },
    lights: {
      ambient: { color: "#ffffff", intensity: 0.55 },
      key: { color: "#fff3e0", intensity: 160 },
      rim: { color: "#ffffff", intensity: 1.2 },
      fill: { color: "#fff1dd", intensity: 0.9 },
      environment: 0.9,
    },
    wordmark: { color: "#2a2119", opacity: 0.85 },
    dust: { color: "#b08a50", opacity: 0.25 },
    page: { color: "#f6eedb", edgeShade: "#d8c7a4", endpaper: "#efe3c9", ink: "#2a2018" },
    env: { top: "#fff4e4", warm: "#ffe9cc", cool: "#e4ecff", ring: "#ffffff" },
    headband: ["#1f3a6b", "#f3ead6"],
    bloom: { intensity: 0.2, threshold: 0.95 },
    vignette: 0.25,
    grain: 0.03,
    books: bookSwatches,
    planBooks: planBookSwatches,
  },
};

export const themes = { midnightLibrary, lightEditorial } as const;
export type ThemeName = keyof typeof themes;
