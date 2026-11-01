import { theme, themeToCss } from "./index";

/** Injects the active theme as CSS variables. Rendered once in the root layout. */
export function ThemeStyle() {
  return <style id="theme-vars" dangerouslySetInnerHTML={{ __html: themeToCss(theme) }} />;
}
