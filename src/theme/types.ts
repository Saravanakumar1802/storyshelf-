/**
 * Theme contract. Every colour, font, radius, motion value and 3D scene
 * setting used anywhere on the site is defined by an object of this shape.
 * Components never hard-code these values — they read CSS variables
 * (generated from the active theme) or `useTheme()` in 3D code.
 */

export type BookFinish = "cloth" | "jacket" | "paperback";

export interface BookSwatch {
  /** Main cover / cloth colour */
  base: string;
  /** Secondary art colour (jackets & paperbacks) */
  art: string;
  /** Foil / stamping colour */
  foil: string;
  /** Text colour for printed (non-foil) type on jackets */
  ink: string;
}

export interface ThemeColors {
  bg: string;
  bgDeep: string;
  surface: string;
  surfaceRaised: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentBright: string;
  accentSoft: string;
  accentContrast: string;
  ember: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  paper: string;
  /** dark ink printed on paper surfaces */
  paperInk: string;
  /** editor's red pencil */
  editMark: string;
  /** cloth of the brand book in the opening intro */
  cloth: string;
  overlay: string;
}

export interface ThemeScene {
  background: string;
  backgroundGlow: string;
  fog: { color: string; near: number; far: number };
  shelf: { color: string; edge: string; roughness: number; reflectivity: number; mirror: number };
  lights: {
    ambient: { color: string; intensity: number };
    key: { color: string; intensity: number };
    rim: { color: string; intensity: number };
    fill: { color: string; intensity: number };
    environment: number;
  };
  wordmark: { color: string; opacity: number };
  dust: { color: string; opacity: number };
  page: { color: string; edgeShade: string; endpaper: string; ink: string };
  /** studio light-former colours used for reflections */
  env: { top: string; warm: string; cool: string; ring: string };
  headband: [string, string];
  bloom: { intensity: number; threshold: number };
  vignette: number;
  grain: number;
  /** Swatches assigned to books by `swatch` index in the catalogue data */
  books: BookSwatch[];
  /** Cloth for the three plan "volumes" shown in 3D on the plans page */
  planBooks: Record<"kickstart" | "levelUp" | "pro", BookSwatch>;
}

export interface Theme {
  name: string;
  mode: "dark" | "light";
  colors: ThemeColors;
  plans: { kickstart: string; levelUp: string; pro: string };
  radii: { sm: string; md: string; lg: string; xl: string; pill: string };
  shadows: { soft: string; lifted: string; glow: string };
  motion: {
    fast: number;
    base: number;
    slow: number;
    /** CSS easing */
    ease: string;
    easeOut: string;
    /** GSAP easing names */
    gsapEase: string;
    gsapEaseOut: string;
  };
  effects: { grainOpacity: number; vignette: string };
  scene: ThemeScene;
  /** Page tones the in-app reader offers (chosen per reader, independent of the site theme) */
  reader: Record<ReaderToneName, ReaderTone>;
}

export type ReaderToneName = "night" | "sepia" | "paper";

export interface ReaderTone {
  label: string;
  bg: string;
  text: string;
  muted: string;
  accent: string;
  rule: string;
}
