import type { Book } from "@/types";

/**
 * Physical book dimensions (three.js-free, so 2D UI can use them too).
 * World units: 1 unit = 100 mm.
 */

export const MM = 0.01;

/** Fractions of the wrap texture's width given to each region. The spine gets
 *  far more texels per unit than the boards so its lettering stays crisp. */
export const WRAP_U = { back: 0.3, spine: 0.22, front: 0.48 } as const;

export interface BookDims {
  /** Board (case) height */
  H: number;
  /** Board depth from fore-edge to spine apex */
  D: number;
  /** Overall thickness */
  T: number;
  /** Board thickness */
  bt: number;
  /** Board overhang beyond the text block */
  oh: number;
  /** Depth of the rounded spine curve */
  sb: number;
  /** z of the joints (where boards meet the spine curve) */
  zJ: number;
  /** Text block height */
  Hp: number;
  /** Text block half-thickness */
  pw: number;
  hardcover: boolean;
  /** Outer arc lengths, used to lay out the wrap texture */
  lenBack: number;
  lenSpine: number;
  lenFront: number;
}

export function bookDims(book: Pick<Book, "trim" | "pages" | "finish">): BookDims {
  const hardcover = book.finish !== "paperback";
  const bt = hardcover ? 2.8 * MM : 0.45 * MM;
  const oh = hardcover ? 3 * MM : 0.4 * MM;
  const sheets = Math.max(24, book.pages / 2);
  const blockT = sheets * 0.13 * MM;
  const gap = hardcover ? 0.6 * MM : 0;
  const T = blockT + 2 * bt + 2 * gap;
  const H = book.trim.height * MM + 2 * oh;
  const D = book.trim.width * MM + oh + (hardcover ? 3 * MM : 0);
  const sb = hardcover ? Math.min(5 * MM, T * 0.17) : 0.5 * MM;
  const zJ = D / 2 - sb;
  const Hp = book.trim.height * MM;
  const pw = T / 2 - bt - gap;

  const d: BookDims = {
    H,
    D,
    T,
    bt,
    oh,
    sb,
    zJ,
    Hp,
    pw,
    hardcover,
    lenBack: 0,
    lenSpine: 0,
    lenFront: 0,
  };
  d.lenBack = polyLength(outerBoardPath(d, -1));
  d.lenSpine = polyLength(spineArc(d, T / 2, sb, Math.PI, 0, 24));
  d.lenFront = d.lenBack;
  return d;
}

// ───────────────────────────────── profile helpers ──

export type P2 = [number, number];

export function polyLength(pts: P2[]) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

/** Elliptical arc centred on (0, zJ). φ from a0 to a1. */
export function spineArc(d: BookDims, a: number, b: number, a0: number, a1: number, n: number): P2[] {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n;
    out.push([a * Math.cos(t), d.zJ + b * Math.sin(t)]);
  }
  return out;
}

/**
 * Outer surface of a board, running from the fore-edge to the joint.
 * side = -1 → back board (x = -T/2), +1 → front board (x = +T/2).
 * Includes the hinge groove that real cased books have near the spine.
 */
export function outerBoardPath(d: BookDims, side: -1 | 1): P2[] {
  const x = (side * d.T) / 2;
  const r = d.bt / 2;
  const zStart = -d.D / 2 + r;
  const pts: P2[] = [[x, zStart]];
  if (d.hardcover) {
    const gEnd = d.zJ - 3.5 * MM;
    const gStart = gEnd - 6 * MM;
    const depth = Math.min(1.1 * MM, d.bt * 0.45);
    pts.push([x, gStart]);
    const n = 8;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push([x - side * depth * Math.sin(Math.PI * t), gStart + (gEnd - gStart) * t]);
    }
    pts.push([x, gEnd]);
  } else {
    pts.push([x, (zStart + d.zJ) / 2]);
  }
  pts.push([x, d.zJ]);
  return pts;
}

