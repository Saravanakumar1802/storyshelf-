import * as THREE from "three";

/**
 * Procedural, physically-proportioned book geometry.
 *
 * World units: 1 unit = 100 mm. A book is modelled the way it is bound:
 *  - one printed "case" (back board + rounded spine + front board) whose outer
 *    surface carries a single wrap texture laid out back | spine | front,
 *  - the front board split off so it can hinge open,
 *  - a text block with a concave fore-edge and rounded spine-side,
 *  - headbands at the head and tail of the spine.
 *
 * Profiles are drawn in the XZ plane (x = across the thickness, z = depth,
 * spine at +z) and extruded along Y with a small rolled bevel so edges catch
 * light like cloth-wrapped board.
 */

import { MM, WRAP_U, outerBoardPath, spineArc, type BookDims, type P2 } from "@/lib/cover/dims";

export { MM, WRAP_U, bookDims, type BookDims } from "@/lib/cover/dims";

/** Rounded fore-edge of a board: semicircle from `from` to `to` bulging to -z. */
function boardForeEdge(d: BookDims, side: -1 | 1, outerFirst: boolean): P2[] {
  const r = d.bt / 2;
  const cx = side * (d.T / 2 - r);
  const cz = -d.D / 2 + r;
  const pts: P2[] = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    // angle sweeps from the outer side (pointing ±x) through -z to the inner side
    const t = i / n;
    const ang = side > 0 ? -Math.PI * t : Math.PI + Math.PI * t; // front: 0 → -π ; back: π → 2π
    pts.push([cx + r * Math.cos(ang), cz + r * Math.sin(ang)]);
  }
  return outerFirst ? pts : pts.reverse();
}

// ───────────────────────────────── extrusion ──

export type UvMode =
  | { kind: "wrap"; u0: number; u1: number }
  | { kind: "planarZ"; zMin: number; zMax: number; flip?: boolean }
  | { kind: "planarX"; xMin: number; xMax: number }
  | { kind: "arc"; scale: number };

interface Segment {
  pts: P2[];
  group: number;
  uv: UvMode;
}

interface ExtrudeOptions {
  height: number;
  bevel: number;
  /** material group for the two caps */
  capGroup: number;
  capUv: "planarX" | "physical";
  /** uv1 (physical, for tiling detail maps) density: repeats per unit */
  detailScale: number;
}

/**
 * Extrudes a closed loop made of open segments. Segments keep their own
 * vertices so normals stay crisp between them; inside a segment normals are
 * smoothed. Caps are triangulated from the bevel-inset loop.
 */
function extrudeLoop(segments: Segment[], opt: ExtrudeOptions): THREE.BufferGeometry {
  // Build the loop (unique points) to orient it and compute inset normals.
  const loop: P2[] = [];
  const segIdx: number[][] = [];
  for (const s of segments) {
    const idx: number[] = [];
    s.pts.forEach((p, i) => {
      if (i === 0 && loop.length) {
        const last = loop[loop.length - 1];
        if (Math.hypot(last[0] - p[0], last[1] - p[1]) < 1e-7) {
          idx.push(loop.length - 1);
          return;
        }
      }
      loop.push(p);
      idx.push(loop.length - 1);
    });
    segIdx.push(idx);
  }
  // close: last point equals first?
  const first = loop[0];
  const lastP = loop[loop.length - 1];
  if (Math.hypot(first[0] - lastP[0], first[1] - lastP[1]) < 1e-7) {
    loop.pop();
    const lastSeg = segIdx[segIdx.length - 1];
    lastSeg[lastSeg.length - 1] = 0;
  }
  const n = loop.length;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
  }
  // outward normal of edge (dx,dz) is s*(-dz, dx)
  const s = area < 0 ? 1 : -1;

  const edgeNormal = (a: P2, b: P2): P2 => {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l = Math.hypot(dx, dz) || 1;
    return [(s * -dz) / l, (s * dx) / l];
  };

  // Loop-level averaged normals → bevel inset
  const loopN: P2[] = loop.map((p, i) => {
    const prev = loop[(i - 1 + n) % n];
    const next = loop[(i + 1) % n];
    const n1 = edgeNormal(prev, p);
    const n2 = edgeNormal(p, next);
    const x = n1[0] + n2[0];
    const z = n1[1] + n2[1];
    const l = Math.hypot(x, z) || 1;
    return [x / l, z / l];
  });

  const e = opt.bevel;
  const y0 = -opt.height / 2;
  const y1 = opt.height / 2;
  const inset = (i: number): P2 => [loop[i][0] - loopN[i][0] * e * 0.7, loop[i][1] - loopN[i][1] * e * 0.7];

  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const uv1: number[] = [];
  const indices: number[] = [];
  const geo = new THREE.BufferGeometry();
  let groupStart = 0;
  const groups: { start: number; count: number; group: number }[] = [];
  const pushGroup = (group: number) => {
    const count = indices.length - groupStart;
    if (count > 0) groups.push({ start: groupStart, count, group });
    groupStart = indices.length;
  };

  const SQ = Math.SQRT1_2;
  const rows = [
    { y: y0, inset: true, ny: -1 },
    { y: y0 + e, inset: false, ny: 0 },
    { y: y1 - e, inset: false, ny: 0 },
    { y: y1, inset: true, ny: 1 },
  ];

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    const ids = segIdx[si];
    const m = ids.length;
    if (m < 2) continue;
    const pts = ids.map((i) => loop[i]);
    // segment-local smooth normals
    const segN: P2[] = pts.map((p, i) => {
      const nA = i > 0 ? edgeNormal(pts[i - 1], p) : null;
      const nB = i < m - 1 ? edgeNormal(p, pts[i + 1]) : null;
      if (nA && nB) {
        const x = nA[0] + nB[0];
        const z = nA[1] + nB[1];
        const l = Math.hypot(x, z) || 1;
        return [x / l, z / l];
      }
      return (nA ?? nB) as P2;
    });
    // arc length along the segment
    const acc: number[] = [0];
    for (let i = 1; i < m; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = acc[m - 1] || 1;

    const base = pos.length / 3;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let i = 0; i < m; i++) {
        const p = row.inset ? inset(ids[i]) : pts[i];
        pos.push(p[0], row.y, p[1]);
        let nx = segN[i][0];
        let ny = 0;
        let nz = segN[i][1];
        if (row.ny !== 0) {
          nx *= SQ;
          nz *= SQ;
          ny = row.ny * SQ;
        }
        nor.push(nx, ny, nz);
        const v = (row.y - y0) / opt.height;
        let u = 0;
        switch (seg.uv.kind) {
          case "wrap":
            u = seg.uv.u0 + (seg.uv.u1 - seg.uv.u0) * (acc[i] / total);
            break;
          case "planarZ": {
            const t = (p[1] - seg.uv.zMin) / (seg.uv.zMax - seg.uv.zMin);
            u = seg.uv.flip ? 1 - t : t;
            break;
          }
          case "planarX":
            u = (p[0] - seg.uv.xMin) / (seg.uv.xMax - seg.uv.xMin);
            break;
          case "arc":
            u = acc[i] * seg.uv.scale;
            break;
        }
        uv.push(u, v);
        uv1.push(acc[i] * opt.detailScale, (row.y - y0) * opt.detailScale);
      }
    }
    for (let r = 0; r < rows.length - 1; r++) {
      for (let i = 0; i < m - 1; i++) {
        const a0 = base + r * m + i;
        const b0 = a0 + 1;
        const a1 = a0 + m;
        const b1 = b0 + m;
        if (s === 1) indices.push(a0, b0, b1, a0, b1, a1);
        else indices.push(a0, b1, b0, a0, a1, b1);
      }
    }
    pushGroup(seg.group);
  }

  // Caps
  const capPts = loop.map((_, i) => inset(i));
  const contour = capPts.map((p) => new THREE.Vector2(p[0], p[1]));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  let xMin = Infinity;
  let xMax = -Infinity;
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const p of capPts) {
    xMin = Math.min(xMin, p[0]);
    xMax = Math.max(xMax, p[0]);
    zMin = Math.min(zMin, p[1]);
    zMax = Math.max(zMax, p[1]);
  }
  for (const [cy, ny] of [
    [y0, -1],
    [y1, 1],
  ] as const) {
    const base = pos.length / 3;
    for (const p of capPts) {
      pos.push(p[0], cy, p[1]);
      nor.push(0, ny, 0);
      if (opt.capUv === "planarX") uv.push((p[0] - xMin) / (xMax - xMin || 1), (p[1] - zMin) / (zMax - zMin || 1));
      else uv.push(p[0] * 2, p[1] * 2);
      uv1.push(p[0] * opt.detailScale, p[1] * opt.detailScale);
    }
    for (const t of tris) {
      const [a, b, c] = t;
      const pa = capPts[a];
      const pb = capPts[b];
      const pc = capPts[c];
      const cross = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
      // In XZ, a positive 2D cross gives a -Y facing triangle.
      const wantsUp = ny > 0;
      const facesUp = cross < 0;
      if (wantsUp === facesUp) indices.push(base + a, base + b, base + c);
      else indices.push(base + a, base + c, base + b);
    }
  }
  pushGroup(opt.capGroup);

  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("uv1", new THREE.Float32BufferAttribute(uv1, 2));
  geo.setIndex(indices);
  // merge consecutive identical groups
  for (const g of groups) geo.addGroup(g.start, g.count, g.group);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// ───────────────────────────────── public builders ──

/** Material group indices shared by case meshes */
export const CASE_GROUP = { wrap: 0, edge: 1, inner: 2 } as const;
/** Material group indices for the text block */
export const BLOCK_GROUP = { edges: 0, firstPage: 1, plain: 2 } as const;

const DETAIL = 9; // linen weave repeats per unit (≈ every 11mm)

/** Back board + spine. */
export function buildCaseBack(d: BookDims): THREE.BufferGeometry {
  const { T, bt, sb } = d;
  const uSpine0 = WRAP_U.back;
  const uSpine1 = WRAP_U.back + WRAP_U.spine;
  const backOuter = outerBoardPath(d, -1);
  const spineOuter = spineArc(d, T / 2, sb, Math.PI, 0, 28);
  const innerB = Math.max(sb - bt, 0.0002);
  const spineInner = spineArc(d, T / 2 - bt, innerB, 0, Math.PI, 28);
  const r = bt / 2;
  const backInner: P2[] = [
    [-T / 2 + bt, d.zJ],
    [-T / 2 + bt, -d.D / 2 + r],
  ];
  const segments: Segment[] = [
    { pts: backOuter, group: CASE_GROUP.wrap, uv: { kind: "wrap", u0: 0, u1: uSpine0 } },
    { pts: spineOuter, group: CASE_GROUP.wrap, uv: { kind: "wrap", u0: uSpine0, u1: uSpine1 } },
    {
      pts: [
        [T / 2, d.zJ],
        [T / 2 - bt, d.zJ],
      ],
      group: CASE_GROUP.edge,
      uv: { kind: "arc", scale: 4 },
    },
    { pts: [...spineInner, ...backInner.slice(1)], group: CASE_GROUP.inner, uv: { kind: "planarZ", zMin: -d.D / 2, zMax: d.D / 2 } },
    { pts: boardForeEdge(d, -1, false), group: CASE_GROUP.edge, uv: { kind: "arc", scale: 4 } },
  ];
  return extrudeLoop(segments, { height: d.H, bevel: Math.min(0.9 * MM, bt * 0.3), capGroup: CASE_GROUP.edge, capUv: "physical", detailScale: DETAIL });
}

/** Front board (separate so it can hinge open). Pivot it about (T/2 - bt/2, zJ). */
export function buildCaseFront(d: BookDims): THREE.BufferGeometry {
  const { T, bt } = d;
  const u0 = WRAP_U.back + WRAP_U.spine;
  const outer = outerBoardPath(d, 1).reverse(); // joint → fore-edge
  const r = bt / 2;
  const segments: Segment[] = [
    { pts: outer, group: CASE_GROUP.wrap, uv: { kind: "wrap", u0, u1: 1 } },
    { pts: boardForeEdge(d, 1, true), group: CASE_GROUP.edge, uv: { kind: "arc", scale: 4 } },
    {
      pts: [
        [T / 2 - bt, -d.D / 2 + r],
        [T / 2 - bt, d.zJ],
      ],
      group: CASE_GROUP.inner,
      uv: { kind: "planarZ", zMin: -d.D / 2, zMax: d.D / 2, flip: true },
    },
    {
      pts: [
        [T / 2 - bt, d.zJ],
        [T / 2, d.zJ],
      ],
      group: CASE_GROUP.edge,
      uv: { kind: "arc", scale: 4 },
    },
  ];
  return extrudeLoop(segments, { height: d.H, bevel: Math.min(0.9 * MM, bt * 0.3), capGroup: CASE_GROUP.edge, capUv: "physical", detailScale: DETAIL });
}

/** The text block: concave fore-edge, rounded back, page-edge striations. */
export function buildTextBlock(d: BookDims): THREE.BufferGeometry {
  const w = d.pw;
  const foreZ = -d.D / 2 + d.oh + (d.hardcover ? 0 : 0.2 * MM);
  const concave = d.hardcover ? Math.min(1.6 * MM, d.sb * 0.45) : 0.15 * MM;
  const backB = d.hardcover ? Math.max(d.sb - d.bt - 0.6 * MM, 0.4 * MM) : 0.3 * MM;
  const spineZ = d.zJ - (d.hardcover ? 0.4 * MM : 0);

  const fore: P2[] = [];
  const nF = 16;
  for (let i = 0; i <= nF; i++) {
    const x = -w + (2 * w * i) / nF;
    const t = x / w;
    fore.push([x, foreZ + concave * (1 - t * t)]);
  }
  const back: P2[] = [];
  const nB = 20;
  for (let i = 0; i <= nB; i++) {
    const ang = (Math.PI * i) / nB; // 0 → π : +w → -w
    back.push([w * Math.cos(ang), spineZ + backB * Math.sin(ang)]);
  }
  const segments: Segment[] = [
    { pts: fore, group: BLOCK_GROUP.edges, uv: { kind: "planarX", xMin: -w, xMax: w } },
    {
      pts: [
        [w, foreZ],
        [w, spineZ],
      ],
      group: BLOCK_GROUP.firstPage,
      uv: { kind: "planarZ", zMin: foreZ, zMax: spineZ, flip: true },
    },
    { pts: back, group: BLOCK_GROUP.edges, uv: { kind: "planarX", xMin: -w, xMax: w } },
    {
      pts: [
        [-w, spineZ],
        [-w, foreZ],
      ],
      group: BLOCK_GROUP.plain,
      uv: { kind: "planarZ", zMin: foreZ, zMax: spineZ },
    },
  ];
  return extrudeLoop(segments, { height: d.Hp, bevel: 0.5 * MM, capGroup: BLOCK_GROUP.edges, capUv: "planarX", detailScale: DETAIL });
}

/** Where the front board hinges (local XZ of the book). */
export function hingePivot(d: BookDims): [number, number] {
  return [d.T / 2 - d.bt / 2, d.zJ];
}

/** Headband position (top / bottom of spine). */
export function headbandSpec(d: BookDims) {
  const backB = Math.max(d.sb - d.bt - 0.6 * MM, 0.4 * MM);
  return {
    length: d.pw * 2 * 0.94,
    radius: 1.1 * MM,
    y: d.Hp / 2,
    z: d.zJ + backB * 0.55,
  };
}
