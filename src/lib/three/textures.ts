import * as THREE from "three";
import type { Book } from "@/types";
import type { Theme } from "@/theme";
import { drawEmblem } from "@/lib/cover/emblems";
import { BRAND } from "@/lib/brand";
import { drawTracked, fitSize, loadCanvasFonts, makeCanvas, paintWrap, type CanvasFonts } from "@/lib/cover/paint";

export { loadCanvasFonts, type CanvasFonts };
import type { BookDims } from "./bookGeometry";
import { hashString, mulberry32 } from "@/lib/random";

export { hashString, mulberry32 };

/* ════════════════════════════════════════════════════════════════════════
 * Procedural textures for the 3D bookshelf. Everything is generated on the
 * client from canvas — no network downloads — so the scene works offline and
 * every cover is re-themable from data.
 * ════════════════════════════════════════════════════════════════════════ */

// ───────────────────────────────────────────────── public generators ──

export interface CoverTextures {
  map: THREE.CanvasTexture;
  orm: THREE.CanvasTexture;
}

function toTexture(canvas: HTMLCanvasElement, srgb: boolean, anisotropy: number) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = anisotropy;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

const coverCache = new Map<string, CoverTextures>();

export function coverTextures(book: Book, dims: BookDims, theme: Theme, fonts: CanvasFonts, size: number, anisotropy = 8): CoverTextures {
  const key = `${book.id}|${theme.name}|${size}`;
  const hit = coverCache.get(key);
  if (hit) return hit;
  const map = toTexture(paintWrap(book, dims, theme, fonts, size, "color"), true, anisotropy);
  const orm = toTexture(paintWrap(book, dims, theme, fonts, Math.max(256, size / 2), "orm"), false, anisotropy);
  const res = { map, orm };
  coverCache.set(key, res);
  return res;
}

/** Frees a cached cover set (used for hi-res textures that are swapped out). */
export function releaseCoverTextures(book: Book, theme: Theme, size: number) {
  const key = `${book.id}|${theme.name}|${size}`;
  const hit = coverCache.get(key);
  if (!hit) return;
  hit.map.dispose();
  hit.orm.dispose();
  coverCache.delete(key);
}

const shared = new Map<string, THREE.Texture>();
function memo<T extends THREE.Texture>(key: string, make: () => T): T {
  const hit = shared.get(key);
  if (hit) return hit as T;
  const t = make();
  shared.set(key, t);
  return t;
}

/** Page-edge striations across the thickness of the text block. */
export function pageEdgeTexture(theme: Theme) {
  return memo(`pages|${theme.name}`, () => {
    const W = 1024;
    const H = 8;
    const { canvas, ctx } = makeCanvas(W, H);
    const rnd = mulberry32(42);
    const base = new THREE.Color(theme.scene.page.color);
    const edge = new THREE.Color(theme.scene.page.edgeShade);
    const img = ctx.createImageData(W, H);
    for (let x = 0; x < W; x++) {
      const t = x / (W - 1);
      // darker towards the boards, a few deeper "signature" lines
      const edgeMix = Math.pow(Math.abs(t - 0.5) * 2, 6) * 0.6;
      let l = (rnd() - 0.5) * 0.07;
      if (rnd() < 0.035) l -= 0.12 + rnd() * 0.1;
      const c = base.clone().lerp(edge, edgeMix + (l < -0.1 ? 0.35 : 0));
      const f = 1 + l;
      for (let y = 0; y < H; y++) {
        const i = (y * W + x) * 4;
        img.data[i] = Math.min(255, c.r * 255 * f);
        img.data[i + 1] = Math.min(255, c.g * 255 * f);
        img.data[i + 2] = Math.min(255, c.b * 255 * f);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

/** Woven linen normal map (tiling), shared by all cloth surfaces. */
export function linenNormalTexture() {
  return memo("linen", () => {
    const N = 256;
    const { canvas, ctx } = makeCanvas(N, N);
    const rnd = mulberry32(7);
    const hgt = new Float32Array(N * N);
    const period = 8;
    const jitter = new Float32Array(N).map(() => rnd() * 0.35);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const cx = (x % period) / period;
        const cy = (y % period) / period;
        const warpUp = (Math.floor(x / period) + Math.floor(y / period)) % 2 === 0;
        const warp = Math.sin(cx * Math.PI) * (0.65 + jitter[x]);
        const weft = Math.sin(cy * Math.PI) * (0.65 + jitter[y]);
        hgt[y * N + x] = (warpUp ? Math.max(warp, weft * 0.7) : Math.max(weft, warp * 0.7)) + rnd() * 0.08;
      }
    }
    const img = ctx.createImageData(N, N);
    const at = (x: number, y: number) => hgt[((y + N) % N) * N + ((x + N) % N)];
    const strength = 2.2;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
        const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
        const l = Math.hypot(dx, dy, 1);
        const i = (y * N + x) * 4;
        img.data[i] = ((dx / l) * 0.5 + 0.5) * 255;
        img.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
        img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.channel = 1;
    return t;
  });
}

/** Two-colour striped silk for the headbands. */
export function headbandTexture(theme: Theme) {
  return memo(`headband|${theme.name}`, () => {
    const { canvas, ctx } = makeCanvas(8, 64);
    const [a, b] = theme.scene.headband;
    for (let y = 0; y < 64; y += 8) {
      ctx.fillStyle = a;
      ctx.fillRect(0, y, 8, 4);
      ctx.fillStyle = b;
      ctx.fillRect(0, y + 4, 8, 4);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 6);
    return t;
  });
}

/** Walnut shelf: colour + roughness from one procedural grain field. */
export function woodTextures(theme: Theme) {
  const key = `wood|${theme.name}`;
  const cached = shared.get(`${key}|map`);
  if (cached) return { map: cached, rough: shared.get(`${key}|rough`)! };
  const W = 1024;
  const H = 256;
  const color = makeCanvas(W, H);
  const rough = makeCanvas(W, H);
  const rnd = mulberry32(99);
  const base = new THREE.Color(theme.scene.shelf.color);
  const light = new THREE.Color(theme.scene.shelf.edge);
  // 1D value noise along y with x warp
  const noise = new Float32Array(512).map(() => rnd());
  const vn = (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = noise[((i % 512) + 512) % 512];
    const b = noise[(((i + 1) % 512) + 512) % 512];
    return a + (b - a) * (f * f * (3 - 2 * f));
  };
  const ci = color.ctx.createImageData(W, H);
  const ri = rough.ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const warp = vn(x * 0.012 + y * 0.004) * 6 + vn(x * 0.05) * 1.2;
      const g = Math.sin((y + warp * 9) * 0.32) * 0.5 + 0.5;
      const fine = vn(y * 1.7 + x * 0.002) * 0.5;
      const t = Math.pow(g, 3) * 0.55 + fine * 0.3;
      const c = base.clone().lerp(light, t);
      const i = (y * W + x) * 4;
      ci.data[i] = c.r * 255;
      ci.data[i + 1] = c.g * 255;
      ci.data[i + 2] = c.b * 255;
      ci.data[i + 3] = 255;
      const rv = theme.scene.shelf.roughness + (t - 0.3) * 0.25;
      ri.data[i] = 255;
      ri.data[i + 1] = THREE.MathUtils.clamp(rv, 0.05, 1) * 255;
      ri.data[i + 2] = 0;
      ri.data[i + 3] = 255;
    }
  }
  color.ctx.putImageData(ci, 0, 0);
  rough.ctx.putImageData(ri, 0, 0);
  const map = new THREE.CanvasTexture(color.canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const r = new THREE.CanvasTexture(rough.canvas);
  r.colorSpace = THREE.NoColorSpace;
  shared.set(`${key}|map`, map);
  shared.set(`${key}|rough`, r);
  return { map, rough: r };
}

/** Large brand wordmark that sits behind the shelf. White glyphs; tinted by material colour. */
export function wordmarkTexture(text: string, fonts: CanvasFonts) {
  return memo(`wordmark|${text}|${fonts.display}`, () => {
    const W = 4096;
    const H = 1024;
    const { canvas, ctx } = makeCanvas(W, H);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const size = fitSize(ctx, text, W * 0.96, 820, (s) => `300 ${s}px ${fonts.display}`, -0.02);
    ctx.font = `300 ${size}px ${fonts.display}`;
    drawTracked(ctx, text, W / 2, H * 0.78, -size * 0.02);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

/** Soft radial glow behind the shelf. */
export function glowTexture(theme: Theme) {
  return memo(`glow|${theme.name}`, () => {
    const N = 512;
    const { canvas, ctx } = makeCanvas(N, N);
    const g = ctx.createRadialGradient(N / 2, N * 0.55, 0, N / 2, N * 0.55, N * 0.5);
    g.addColorStop(0, theme.scene.backgroundGlow);
    g.addColorStop(1, theme.scene.background);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, N, N);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Half-title page revealed when the front board swings open. */
export function firstPageTexture(book: Book, theme: Theme, fonts: CanvasFonts, aspect: number) {
  return memo(`first|${book.id}|${theme.name}`, () => {
    const W = 768;
    const H = Math.round(W / aspect);
    const { canvas, ctx } = makeCanvas(W, H);
    const rnd = mulberry32(hashString(book.id + "page"));
    ctx.fillStyle = theme.scene.page.color;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = rnd() > 0.5 ? "#fff" : theme.scene.page.edgeShade;
      ctx.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
    // gutter shadow on the spine side
    const gut = ctx.createLinearGradient(0, 0, W * 0.12, 0);
    gut.addColorStop(0, "rgba(60,40,20,0.22)");
    gut.addColorStop(1, "rgba(60,40,20,0)");
    ctx.fillStyle = gut;
    ctx.fillRect(0, 0, W * 0.12, H);
    const inkC = theme.scene.page.ink;
    ctx.fillStyle = inkC;
    ctx.strokeStyle = inkC;
    ctx.textAlign = "center";
    drawEmblem(ctx, book.emblem, W / 2, H * 0.22, W * 0.14, 2.4);
    const lines = book.coverLines ?? [book.title];
    let size = 64;
    for (const l of lines) size = Math.min(size, fitSize(ctx, l, W * 0.7, 64, (s) => `italic 400 ${s}px ${fonts.serif}`));
    ctx.font = `italic 400 ${size}px ${fonts.serif}`;
    let y = H * 0.42;
    for (const l of lines) {
      ctx.fillText(l, W / 2, y);
      y += size * 1.1;
    }
    ctx.font = `500 22px ${fonts.sans}`;
    drawTracked(ctx, book.author.toUpperCase(), W / 2, y + 30, 5);
    ctx.globalAlpha = 0.7;
    ctx.font = `italic 400 26px ${fonts.serif}`;
    ctx.fillText(`${BRAND.slogan}.`, W / 2, H * 0.8);
    ctx.globalAlpha = 1;
    drawEmblem(ctx, "shelf", W / 2, H * 0.88, 40, 3.2);
    ctx.font = `500 16px ${fonts.mono}`;
    drawTracked(ctx, BRAND.name.toUpperCase(), W / 2, H * 0.93, 4);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

/** Device-appropriate cover texture sizes. */
export function textureQuality() {
  if (typeof window === "undefined") return { base: 1024, hi: 2048 };
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (coarse || small || mem <= 4) return { base: 512, hi: 1024 };
  return { base: 1024, hi: 2048 };
}
