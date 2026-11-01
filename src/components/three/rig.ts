import * as THREE from "three";
import type { BookDims } from "@/lib/three/bookGeometry";

/** Mutable, per-frame state shared by the camera rig and every book.
 *  Lives in a ref (not React state) so nothing re-renders at 60fps. */
export interface ShelfRig {
  layoutX: number[];
  restRz: number[];
  depthJitter: number[];
  rowWidth: number;
  maxHeight: number;
  /** World position where a featured book's centre is held */
  anchor: THREE.Vector3;
  /** World height a featured book is scaled to */
  featureHeight: number;
  spin: { x: number; y: number; vx: number; vy: number; active: boolean; lastX: number; lastY: number; idle: number };
  pan: number;
  panLimit: number;
  reduced: boolean;
  baseSize: number;
  hiResSize: number;
  anisotropy: number;
  hiResLru: number[];
  revertHiRes: Record<number, () => void>;
  /** clock time when the intro started (null until textures are ready) */
  start: number | null;
  /** set when the entrance may begin; the next frame stamps `start` */
  startPending: boolean;
}

export function createRig(init: Pick<ShelfRig, "layoutX" | "restRz" | "depthJitter" | "rowWidth" | "maxHeight" | "reduced">): ShelfRig {
  return {
    ...init,
    anchor: new THREE.Vector3(-1.2, 1.3, 2),
    featureHeight: 2.4,
    spin: { x: 0, y: 0, vx: 0, vy: 0, active: false, lastX: 0, lastY: 0, idle: 0 },
    pan: 0,
    panLimit: 0,
    baseSize: 1024,
    hiResSize: 2048,
    anisotropy: 8,
    hiResLru: [],
    revertHiRes: {},
    start: null,
    startPending: false,
  };
}

/** Shared pointer status (read by DOM handlers outside the R3F tree too). */
export const shelfPointer = { dragMoved: false };

const LEAN = 0.13; // radians, the last book rests against its neighbour

/**
 * Lays the books out left→right with hairline gaps, the last one leaning.
 * When a book is featured its slot closes: books to its right slide left by
 * its width and the whole row re-centres (this keeps the leaning book's
 * contact point intact).
 */
export function computeLayout(dims: BookDims[], featured: number | null, seedGaps: number[]) {
  const n = dims.length;
  const x: number[] = new Array(n).fill(0);
  const rz: number[] = new Array(n).fill(0);
  let cursor = 0;
  for (let i = 0; i < n; i++) {
    const d = dims[i];
    const lean = i === n - 1 && n > 2;
    if (lean) {
      // bottom-left corner sits away from the neighbour so the top rests on it
      const prev = dims[i - 1];
      const contactH = Math.min(prev.H, d.H * Math.cos(LEAN));
      cursor += contactH * Math.tan(LEAN) + 0.004;
      rz[i] = LEAN;
    }
    x[i] = cursor + d.T / 2;
    cursor += d.T + (seedGaps[i] ?? 0.004);
  }
  // visual extent (the leaning book's top leans left, so the row ends at its pivot+T)
  const width = cursor;
  const shift = featured !== null ? dims[featured].T + (seedGaps[featured] ?? 0.004) : 0;
  for (let i = 0; i < n; i++) {
    if (featured !== null && i > featured) x[i] -= shift;
    x[i] += -width / 2 + shift / 2;
  }
  return { x, rz, width };
}
