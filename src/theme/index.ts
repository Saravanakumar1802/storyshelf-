import { themes, type ThemeName } from "./themes";
import type { Theme } from "./types";

/**
 * ───────────────────────────────────────────────────────────────
 *  CHANGE THE WHOLE SITE'S LOOK HERE.
 *  Pick any key from `themes` (see ./themes.ts) or add a new theme
 *  object there. CSS variables, Tailwind utilities and the 3D scene
 *  all derive from this single value.
 * ───────────────────────────────────────────────────────────────
 */
export const ACTIVE_THEME: ThemeName = "midnightLibrary";

export const theme: Theme = themes[ACTIVE_THEME];

export function useTheme(): Theme {
  return theme;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Serialises a theme into CSS custom properties consumed by globals.css. */
export function themeToCss(t: Theme): string {
  const vars: string[] = [];
  for (const [k, v] of Object.entries(t.colors)) vars.push(`--c-${kebab(k)}:${v}`);
  for (const [k, v] of Object.entries(t.plans)) vars.push(`--c-plan-${kebab(k)}:${v}`);
  for (const [k, v] of Object.entries(t.radii)) vars.push(`--r-${k}:${v}`);
  for (const [k, v] of Object.entries(t.shadows)) vars.push(`--sh-${k}:${v}`);
  vars.push(`--ease:${t.motion.ease}`, `--ease-out:${t.motion.easeOut}`);
  vars.push(`--dur-fast:${t.motion.fast}s`, `--dur-base:${t.motion.base}s`, `--dur-slow:${t.motion.slow}s`);
  vars.push(`--grain-opacity:${t.effects.grainOpacity}`, `--vignette:${t.effects.vignette}`);
  return `:root{${vars.join(";")};color-scheme:${t.mode}}`;
}

export type { Theme, BookFinish, BookSwatch } from "./types";
