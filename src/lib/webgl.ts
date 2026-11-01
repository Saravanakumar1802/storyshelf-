/** Client capability checks shared by every 3D surface (cached per page load). */

let webgl: boolean | null = null;

export function supportsWebGL(): boolean {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    webgl = !!gl;
    // free the probe context straight away (browsers cap live contexts)
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

/** Very weak hardware or data saver: decorative scenes keep their static fallback. */
export function isLowEndDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return true;
  return (nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2;
}

/** DPR cap for decorative scenes: crisp on desktop, cheaper on phones. */
export function sceneDpr(): [number, number] {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return coarse ? [1, 1.25] : [1, 1.5];
}
