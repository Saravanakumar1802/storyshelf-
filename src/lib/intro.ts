/**
 * Opening intro state. An inline script in the root layout sets
 * `<html data-intro>` before first paint:
 *   "on"   → the intro is playing (first visit this session)
 *   "off"  → skipped (already seen this session, or reduced motion)
 *   "done" → the intro has handed over to the page
 *
 * While it plays, a finer-grained phase tells the rest of the site to keep
 * the main thread and GPU free (pages pause their own 3D rendering and only
 * do heavy preparation while the intro is not in motion).
 */
export const INTRO_DONE_EVENT = "8085:intro-done";
export const INTRO_SEEN_KEY = "8085:intro-seen";

/** Runs before paint (no React, no imports): decides whether the intro plays. */
export const INTRO_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{var seen=sessionStorage.getItem("${INTRO_SEEN_KEY}");var rm=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;d.dataset.intro=seen||rm?"off":"on"}catch(e){d.dataset.intro="on"}})();`;

export function introPlaying() {
  return typeof document !== "undefined" && document.documentElement.dataset.intro === "on";
}

/** Calls `cb` once the intro has finished (immediately if none is playing). Returns a cleanup. */
export function afterIntro(cb: () => void): () => void {
  if (!introPlaying()) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  window.addEventListener(INTRO_DONE_EVENT, handler, { once: true });
  return () => window.removeEventListener(INTRO_DONE_EVENT, handler);
}

/* ───────────────────────────────────────────────── motion phase store ── */

/** "busy" while the intro's choreography is running (frames matter most). */
type Motion = "idle" | "busy";
let motion: Motion = "idle";
const listeners = new Set<() => void>();

export function setIntroMotion(next: Motion) {
  if (motion === next) return;
  motion = next;
  listeners.forEach((l) => l());
}

/** Resolves when the intro is not mid-animation (immediately if it isn't). */
export function whenIntroIdle(): Promise<void> {
  if (motion === "idle") return Promise.resolve();
  return new Promise((resolve) => {
    const l = () => {
      if (motion === "idle") {
        listeners.delete(l);
        resolve();
      }
    };
    listeners.add(l);
  });
}

/** For useSyncExternalStore: is the intro still covering the page? */
export function subscribeIntro(cb: () => void) {
  window.addEventListener(INTRO_DONE_EVENT, cb);
  return () => window.removeEventListener(INTRO_DONE_EVENT, cb);
}
