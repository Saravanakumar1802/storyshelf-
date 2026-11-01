import type { Book } from "@/types";
import type { BookSwatch, Theme } from "@/theme";
import { drawEmblem } from "@/lib/cover/emblems";
import { BRAND } from "@/lib/brand";
import { WRAP_U, bookDims, type BookDims } from "@/lib/cover/dims";
import { hashString, mulberry32 } from "@/lib/random";
import { bookSwatch } from "@/lib/cover/swatch";

/* ════════════════════════════════════════════════════════════════════════
 * Canvas cover painter (no three.js). Paints a book's full printed case —
 * back | spine | front — for the 3D textures, and crops the front cover for
 * flat 2D use (grids, cart, checkout) so both always match.
 * ════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────── fonts ──

export interface CanvasFonts {
  display: string;
  serif: string;
  sans: string;
  mono: string;
}

const FALLBACK_FONTS: CanvasFonts = {
  display: "Georgia, serif",
  serif: "Georgia, serif",
  sans: "system-ui, sans-serif",
  mono: "ui-monospace, monospace",
};

let fontsPromise: Promise<CanvasFonts> | null = null;

/** Resolves the next/font family names and waits (bounded) for them to load,
 *  so covers are never painted with a fallback face. */
export function loadCanvasFonts(): Promise<CanvasFonts> {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    if (typeof document === "undefined") return FALLBACK_FONTS;
    const cs = getComputedStyle(document.documentElement);
    const read = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb;
    const fonts: CanvasFonts = {
      display: read("--ff-display", FALLBACK_FONTS.display),
      serif: read("--ff-serif", FALLBACK_FONTS.serif),
      sans: read("--ff-sans", FALLBACK_FONTS.sans),
      mono: read("--ff-mono", FALLBACK_FONTS.mono),
    };
    const specs = [
      `300 64px ${fonts.display}`,
      `400 64px ${fonts.display}`,
      `500 64px ${fonts.serif}`,
      `600 64px ${fonts.serif}`,
      `italic 400 64px ${fonts.serif}`,
      `600 64px ${fonts.sans}`,
      `500 64px ${fonts.mono}`,
    ];
    try {
      await Promise.race([
        Promise.all(specs.map((s) => document.fonts.load(s))),
        new Promise((r) => setTimeout(r, 3500)),
      ]);
    } catch {
      /* fall through with whatever loaded */
    }
    return fonts;
  })();
  return fontsPromise;
}

// ─────────────────────────────────────────────────────────────── utils ──

export function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { canvas: c, ctx };
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToHex(h: number, s: number, l: number) {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Lighten (+) or darken (−) a hex colour in HSL lightness. */
export function shade(hex: string, amt: number) {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return hslToHex(h, s, Math.min(1, Math.max(0, l + amt)));
}

export function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Text with manual tracking (portable across browsers). */
export function drawTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number, align: "left" | "center" | "right" = "center") {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + tracking;
  });
  ctx.textAlign = prev;
  return total;
}

export function trackedWidth(ctx: CanvasRenderingContext2D, text: string, tracking: number) {
  const chars = [...text];
  return chars.reduce((a, ch) => a + ctx.measureText(ch).width, 0) + tracking * Math.max(0, chars.length - 1);
}

/** Largest font size (≤ max) at which `text` fits `maxW`. */
export function fitSize(ctx: CanvasRenderingContext2D, text: string, maxW: number, max: number, font: (s: number) => string, trackingEm = 0) {
  ctx.font = font(max);
  const w = trackedWidth(ctx, text, max * trackingEm);
  if (w <= maxW) return max;
  return Math.max(0.1, (max * maxW) / w);
}

export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// ───────────────────────────────────────────────────────────── EAN-13 ──

const EAN_L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const EAN_G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const EAN_R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const EAN_PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

/** Valid EAN-13 for an ISBN (recomputes the check digit). */
export function eanDigits(isbn: string) {
  const d = isbn.replace(/\D/g, "").padEnd(12, "0").slice(0, 12).split("").map(Number);
  const sum = d.reduce((a, n, i) => a + n * (i % 2 ? 3 : 1), 0);
  d.push((10 - (sum % 10)) % 10);
  return d;
}

function eanBits(digits: number[]) {
  const parity = EAN_PARITY[digits[0]];
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === "L" ? EAN_L : EAN_G)[digits[i]];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += EAN_R[digits[i]];
  bits += "101";
  return bits;
}

function drawBarcode(ctx: CanvasRenderingContext2D, isbn: string, x: number, y: number, w: number, h: number, fonts: CanvasFonts, pass: Pass) {
  const digits = eanDigits(isbn);
  const bits = eanBits(digits);
  ctx.fillStyle = pass.kind === "color" ? "#fbf8f1" : pass.orm(0.5, 0);
  ctx.fillRect(x, y, w, h);
  const pad = w * 0.08;
  const bw = (w - pad * 2) / bits.length;
  const barH = h * 0.72;
  ctx.fillStyle = pass.kind === "color" ? "#111" : pass.orm(0.45, 0);
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== "1") continue;
    const guard = i < 3 || (i >= 45 && i < 50) || i >= 92;
    ctx.fillRect(x + pad + i * bw, y + h * 0.08, bw * 1.02, barH + (guard ? h * 0.06 : 0));
  }
  if (pass.kind === "color") {
    ctx.font = `500 ${h * 0.11}px ${fonts.mono}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(digits.join(""), x + w / 2, y + h * 0.97);
    ctx.font = `500 ${h * 0.08}px ${fonts.mono}`;
    ctx.fillText(`ISBN ${isbn}`, x + w / 2, y - h * 0.03);
  }
}

// ───────────────────────────────────────────────────── cover painting ──

export type PassKind = "color" | "orm";
interface Pass {
  kind: PassKind;
  /** ORM colour: R = AO (always 1), G = roughness, B = metalness */
  orm: (rough: number, metal: number) => string;
}
const ormFill = (rough: number, metal: number) => `rgb(255,${Math.round(rough * 255)},${Math.round(metal * 255)})`;

interface FinishModel {
  base: number; // roughness
  print: number;
  foil: number;
  blind: number;
}
const FINISH: Record<Book["finish"], FinishModel> = {
  cloth: { base: 0.86, print: 0.8, foil: 0.2, blind: 0.62 },
  jacket: { base: 0.3, print: 0.32, foil: 0.16, blind: 0.25 },
  paperback: { base: 0.58, print: 0.56, foil: 0.22, blind: 0.45 },
};

interface Region {
  /** pixel x of the region on the wrap canvas */
  px: number;
  pw: number;
  /** physical size (mm) */
  w: number;
  h: number;
}

interface PaintCtx {
  ctx: CanvasRenderingContext2D;
  book: Book;
  sw: BookSwatch;
  fonts: CanvasFonts;
  pass: Pass;
  fm: FinishModel;
  rnd: () => number;
}

function enterRegion(ctx: CanvasRenderingContext2D, r: Region, canvasH: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.px, 0, r.pw, canvasH);
  ctx.clip();
  ctx.translate(r.px, 0);
  ctx.scale(r.pw / r.w, canvasH / r.h);
}

/** Foil fill: a brushed-metal gradient in the colour pass, smooth metal in ORM. */
function foil(p: PaintCtx, x0: number, y0: number, x1: number, y1: number) {
  if (p.pass.kind === "orm") return p.pass.orm(p.fm.foil, 1);
  const g = p.ctx.createLinearGradient(x0, y0, x1, y1);
  const c = p.sw.foil;
  g.addColorStop(0, shade(c, -0.08));
  g.addColorStop(0.35, shade(c, 0.1));
  g.addColorStop(0.55, c);
  g.addColorStop(0.8, shade(c, 0.06));
  g.addColorStop(1, shade(c, -0.1));
  return g;
}

function ink(p: PaintCtx, color: string) {
  return p.pass.kind === "orm" ? p.pass.orm(p.fm.print, 0) : color;
}

function paintBase(p: PaintCtx, W: number, H: number) {
  const { ctx, pass, sw, book, rnd } = p;
  if (pass.kind === "orm") {
    ctx.fillStyle = pass.orm(p.fm.base, 0);
    ctx.fillRect(0, 0, W, H);
    // rougher, rubbed edges (wear)
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pass.orm(Math.min(1, p.fm.base + 0.08), 0));
    g.addColorStop(0.04, pass.orm(p.fm.base, 0));
    g.addColorStop(0.96, pass.orm(p.fm.base, 0));
    g.addColorStop(1, pass.orm(Math.min(1, p.fm.base + 0.08), 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (book.finish === "cloth") {
    ctx.fillStyle = sw.base;
    ctx.fillRect(0, 0, W, H);
    // dye mottling
    for (let i = 0; i < 260; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const r = (0.04 + rnd() * 0.12) * W * 0.25;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const light = rnd() > 0.5;
      g.addColorStop(0, light ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // faint fibre streaks
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rnd() > 0.5 ? "#fff" : "#000";
      ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1);
    }
    ctx.globalAlpha = 1;
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, shade(sw.base, 0.03));
    g.addColorStop(1, shade(sw.base, -0.05));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // print grain
    ctx.globalAlpha = 0.035;
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = rnd() > 0.5 ? "#fff" : "#000";
      ctx.fillRect(rnd() * W, rnd() * H, 1.2, 1.2);
    }
    ctx.globalAlpha = 1;
  }
}

/** Corner & edge wear, painted in canvas pixels over the whole wrap. */
function paintWear(p: PaintCtx, W: number, H: number, regions: { back: Region; spine: Region; front: Region }) {
  const { ctx, pass, rnd } = p;
  if (pass.kind === "orm") return;
  const strength = p.book.finish === "cloth" ? 0.2 : 0.08;
  const corner = (x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,240,220,${strength})`);
    g.addColorStop(1, "rgba(255,240,220,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const r = W * 0.03;
  // fore-edge corners on both boards
  corner(0, 0, r);
  corner(0, H, r);
  corner(W, 0, r);
  corner(W, H, r);
  // spine head & tail rubbing
  const sx = regions.spine.px;
  const sw = regions.spine.pw;
  for (const y of [0, H]) {
    const g = ctx.createLinearGradient(0, y, 0, y === 0 ? H * 0.035 : H * 0.965);
    g.addColorStop(0, `rgba(255,235,210,${strength * 0.9})`);
    g.addColorStop(1, "rgba(255,235,210,0)");
    ctx.fillStyle = g;
    ctx.fillRect(sx, y === 0 ? 0 : H * 0.965, sw, H * 0.035);
  }
  // sun-fade on the spine (books on shelves fade where light hits)
  ctx.fillStyle = `rgba(255,248,235,${p.book.finish === "cloth" ? 0.035 : 0.015})`;
  ctx.fillRect(sx, 0, sw, H);
  // a few scuffs
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + rnd() * 0.03})`;
    ctx.save();
    ctx.translate(rnd() * W, rnd() * H);
    ctx.rotate(rnd() * Math.PI);
    ctx.fillRect(0, 0, 4 + rnd() * 22, 0.8);
    ctx.restore();
  }
}

// ── cloth hardcover ──

function clothFront(p: PaintCtx, r: Region) {
  const { ctx, book, fonts } = p;
  const { w, h } = r;
  // double rule frame
  ctx.strokeStyle = foil(p, 0, 0, w, h);
  ctx.lineWidth = 0.55;
  ctx.strokeRect(7, 7, w - 14, h - 14);
  ctx.lineWidth = 0.25;
  ctx.strokeRect(9, 9, w - 18, h - 18);
  // title
  const lines = book.coverLines ?? [book.title];
  ctx.fillStyle = foil(p, 0, 20, w, 70);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const maxW = w - 34;
  let size = 11.5;
  for (const l of lines) size = Math.min(size, fitSize(ctx, l.toUpperCase(), maxW, 11.5, (s) => `600 ${s}px ${fonts.serif}`, 0.06));
  ctx.font = `600 ${size}px ${fonts.serif}`;
  let y = 30 + size;
  for (const l of lines) {
    drawTracked(ctx, l.toUpperCase(), w / 2, y, size * 0.06);
    y += size * 1.12;
  }
  // emblem
  const emSize = Math.min(w * 0.46, 58);
  const emY = Math.max(y + emSize * 0.55 + 6, h * 0.56);
  ctx.strokeStyle = foil(p, w / 2 - emSize / 2, emY - emSize / 2, w / 2 + emSize / 2, emY + emSize / 2);
  ctx.fillStyle = ctx.strokeStyle;
  drawEmblem(ctx, book.emblem, w / 2, emY, emSize, 2.2);
  // author
  ctx.fillStyle = foil(p, 0, h - 30, w, h - 18);
  const aSize = fitSize(ctx, book.author.toUpperCase(), w - 40, 4.6, (s) => `500 ${s}px ${fonts.sans}`, 0.28);
  ctx.font = `500 ${aSize}px ${fonts.sans}`;
  drawTracked(ctx, book.author.toUpperCase(), w / 2, h - 22, aSize * 0.28);
}

function clothSpine(p: PaintCtx, r: Region) {
  const { ctx, book } = p;
  const { w, h } = r;
  const f = () => foil(p, 0, 0, w, h);
  ctx.fillStyle = f();
  // head & tail bands
  for (const y of [11, 13.4, h - 13.4, h - 11]) ctx.fillRect(1.5, y, w - 3, y === 11 || y === h - 11 ? 0.55 : 0.25);
  // small emblem near the head
  const em = Math.min(w * 0.62, 13);
  ctx.strokeStyle = f();
  drawEmblem(ctx, book.emblem, w / 2, 17 + em / 2 + 2, em, 3);
  const top = 17 + em + 9;
  const bottom = h - 34;
  spineTitle(p, r, top, bottom, f);
  // author surname + publisher mark
  ctx.fillStyle = f();
  spineFooter(p, r, f);
}

function clothBack(p: PaintCtx, r: Region) {
  const { ctx, book } = p;
  const { w, h } = r;
  // blind-stamped (debossed) emblem: darker in colour, slightly smoother in ORM
  if (p.pass.kind === "orm") {
    ctx.strokeStyle = p.pass.orm(p.fm.blind, 0);
  } else {
    ctx.strokeStyle = shade(p.sw.base, -0.06);
  }
  ctx.fillStyle = ctx.strokeStyle;
  drawEmblem(ctx, book.emblem, w / 2, h * 0.8, Math.min(w * 0.2, 24), 2.6);
}

/** Title running head-to-tail down the spine; always fits. */
function spineTitle(p: PaintCtx, r: Region, top: number, bottom: number, fill: () => string | CanvasGradient, opts?: { weight?: number; color?: string }) {
  const { ctx, book, fonts } = p;
  const avail = Math.max(10, bottom - top);
  const weight = opts?.weight ?? 600;
  const font = (s: number) => `${weight} ${s}px ${fonts.serif}`;
  const maxH = Math.min(r.w * 0.5, 9.5);
  const single = book.title;
  let size = fitSize(ctx, single, avail, maxH, font, 0.02);
  let lines = [single];
  const twoLine = book.coverLines && book.coverLines.length > 1 && size < r.w * 0.3 && r.w > 20;
  if (twoLine) {
    const half = Math.ceil(book.coverLines!.length / 2);
    lines = [book.coverLines!.slice(0, half).join(" "), book.coverLines!.slice(half).join(" ")];
    size = Math.min(r.w * 0.3, ...lines.map((l) => fitSize(ctx, l, avail, maxH, font, 0.02)));
  }
  size = Math.max(size, 2.2);
  ctx.save();
  ctx.translate(r.w / 2, (top + bottom) / 2);
  ctx.rotate(Math.PI / 2);
  ctx.font = font(size);
  ctx.textBaseline = "middle";
  ctx.fillStyle = opts?.color ?? fill();
  lines.forEach((l, i) => {
    const offset = (i - (lines.length - 1) / 2) * size * 1.15;
    const tw = trackedWidth(ctx, l, size * 0.02);
    ctx.save();
    // guarantee no overflow: condense horizontally if still too long
    if (tw > avail) ctx.scale(avail / tw, 1);
    drawTracked(ctx, l, 0, offset, size * 0.02);
    ctx.restore();
  });
  ctx.restore();
}

function spineFooter(p: PaintCtx, r: Region, fill: () => string | CanvasGradient, color?: string) {
  const { ctx, book, fonts } = p;
  const surname = book.author.split(" ").slice(-1)[0];
  ctx.fillStyle = color ?? fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = fitSize(ctx, surname, r.w - 3.5, 3.6, (s) => `600 ${s}px ${fonts.sans}`, 0.08);
  if (size >= 1.9) {
    ctx.font = `600 ${size}px ${fonts.sans}`;
    drawTracked(ctx, surname, r.w / 2, r.h - 26, size * 0.08);
  }
  // publisher's mark at the foot of the spine
  ctx.strokeStyle = ctx.fillStyle;
  drawEmblem(ctx, "shelf", r.w / 2, r.h - 18, Math.min(r.w * 0.62, 8), 4.2);
}

// ── dust jacket ──

function jacketFront(p: PaintCtx, r: Region) {
  const { ctx, book, fonts, sw, pass } = p;
  const { w, h } = r;
  // illustrated panel
  if (pass.kind === "color") {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 4, w * 0.5, h * 0.42, h * 0.6);
    g.addColorStop(0, rgba(sw.art, 0.9));
    g.addColorStop(1, rgba(sw.art, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // big illustration in art/ink colour
  ctx.strokeStyle = ink(p, rgba(sw.ink, 0.88));
  ctx.fillStyle = ctx.strokeStyle;
  const em = Math.min(w * 0.72, 108);
  drawEmblem(ctx, book.emblem, w / 2, h * 0.42, em, 1.6);
  // title
  const lines = book.coverLines ?? [book.title];
  ctx.fillStyle = ink(p, sw.ink);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let size = 15;
  for (const l of lines) size = Math.min(size, fitSize(ctx, l, w - 22, 15, (s) => `500 ${s}px ${fonts.serif}`));
  ctx.font = `500 ${size}px ${fonts.serif}`;
  let y = h * 0.68;
  for (const l of lines) {
    ctx.fillText(l, w / 2, y);
    y += size * 1.04;
  }
  // author
  const aSize = fitSize(ctx, book.author.toUpperCase(), w - 34, 4.4, (s) => `600 ${s}px ${fonts.sans}`, 0.3);
  ctx.font = `600 ${aSize}px ${fonts.sans}`;
  drawTracked(ctx, book.author.toUpperCase(), w / 2, h - 14, aSize * 0.3);
  // quote line
  if (book.quote) {
    ctx.font = `italic 400 3.4px ${fonts.serif}`;
    ctx.fillStyle = ink(p, rgba(sw.ink, 0.8));
    const q = `“${book.quote.text}”`;
    const qs = fitSize(ctx, q, w - 26, 3.4, (s) => `italic 400 ${s}px ${fonts.serif}`);
    ctx.font = `italic 400 ${qs}px ${fonts.serif}`;
    ctx.fillText(q, w / 2, 16);
  }
  // bestseller foil roundel
  if (book.bestseller) {
    const cx = w - 22;
    const cy = 30;
    ctx.fillStyle = foil(p, cx - 12, cy - 12, cx + 12, cy + 12);
    ctx.beginPath();
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const rr = i % 2 ? 11 : 12.2;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    if (pass.kind === "color") {
      ctx.fillStyle = shade(sw.foil, -0.45);
      ctx.font = `700 2.6px ${fonts.sans}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      drawTracked(ctx, "BEST", cx, cy - 1.8, 0.4);
      drawTracked(ctx, "SELLER", cx, cy + 1.8, 0.4);
    }
  }
}

function jacketSpine(p: PaintCtx, r: Region) {
  const { ctx, book, sw } = p;
  const em = Math.min(r.w * 0.6, 12);
  ctx.strokeStyle = foil(p, 0, 0, r.w, 30);
  ctx.fillStyle = ctx.strokeStyle;
  drawEmblem(ctx, book.emblem, r.w / 2, 14 + em / 2, em, 3);
  spineTitle(p, r, 14 + em + 8, r.h - 32, () => ink(p, sw.ink), { weight: 500, color: ink(p, sw.ink) as string });
  spineFooter(p, r, () => ink(p, sw.ink), ink(p, sw.ink) as string);
}

function jacketBack(p: PaintCtx, r: Region) {
  const { ctx, book, fonts, sw, pass } = p;
  const { w, h } = r;
  ctx.fillStyle = ink(p, sw.ink);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (book.quote) {
    ctx.font = `italic 400 6px ${fonts.serif}`;
    const qLines = wrapLines(ctx, `“${book.quote.text}”`, w - 36);
    let y = 32;
    for (const l of qLines) {
      ctx.fillText(l, 18, y);
      y += 7.4;
    }
    ctx.font = `600 3px ${fonts.sans}`;
    drawTracked(ctx, `— ${book.quote.source.toUpperCase()}`, 18, y + 2, 0.6, "left");
  }
  ctx.font = `400 4px ${fonts.serif}`;
  const body = book.blurb ? `${book.synopsis} ${book.blurb}` : book.synopsis;
  const lines = wrapLines(ctx, body, w - 36);
  let y = book.quote ? 70 : 34;
  for (const l of lines.slice(0, 14)) {
    ctx.fillText(l, 18, y);
    y += 5.6;
  }
  // logo
  ctx.strokeStyle = ink(p, sw.ink);
  ctx.fillStyle = ctx.strokeStyle;
  drawEmblem(ctx, "shelf", 26, h - 26, 14, 3);
  ctx.font = `600 3.2px ${fonts.sans}`;
  drawTracked(ctx, BRAND.name.toUpperCase(), 36, h - 24, 0.5, "left");
  // barcode
  const bw = 44;
  const bh = 26;
  if (book.isbn) {
    drawBarcode(ctx, book.isbn, w - bw - 14, h - bh - 14, bw, bh, fonts, pass);
    if (pass.kind === "color" && book.mrp) {
      ctx.fillStyle = sw.ink;
      ctx.font = `600 3.4px ${fonts.sans}`;
      ctx.textAlign = "right";
      ctx.fillText(`₹ ${book.mrp}`, w - 14, h - bh - 20);
    }
  } else if (pass.kind === "color") {
    // library editions: no barcode or price — a public-domain imprint instead
    ctx.fillStyle = sw.ink;
    ctx.font = `600 3px ${fonts.sans}`;
    drawTracked(ctx, "FREE TO READ", w - 14, h - 30, 0.6, "right");
    drawTracked(ctx, "PUBLIC DOMAIN EDITION", w - 14, h - 24, 0.6, "right");
  }
}

// ── paperback ──

function paperFront(p: PaintCtx, r: Region) {
  const { ctx, book, fonts, sw, pass } = p;
  const { w, h } = r;
  // colour block band
  ctx.fillStyle = pass.kind === "orm" ? pass.orm(p.fm.print, 0) : sw.art;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);
  // emblem straddling the band
  ctx.strokeStyle = ink(p, sw.ink);
  ctx.fillStyle = ctx.strokeStyle;
  drawEmblem(ctx, book.emblem, w * 0.62, h * 0.58, Math.min(w * 0.6, 80), 1.8);
  // title — top-left aligned, editorial
  const lines = book.coverLines ?? [book.title];
  ctx.fillStyle = ink(p, sw.ink);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let size = 16;
  for (const l of lines) size = Math.min(size, fitSize(ctx, l, w - 24, 16, (s) => `600 ${s}px ${fonts.serif}`));
  ctx.font = `600 ${size}px ${fonts.serif}`;
  let y = 14 + size;
  for (const l of lines) {
    ctx.fillText(l, 12, y);
    y += size * 0.98;
  }
  const aSize = fitSize(ctx, book.author.toUpperCase(), w - 24, 4.2, (s) => `600 ${s}px ${fonts.sans}`, 0.25);
  ctx.font = `600 ${aSize}px ${fonts.sans}`;
  ctx.fillStyle = ink(p, sw.ink);
  drawTracked(ctx, book.author.toUpperCase(), 12, h - 12, aSize * 0.25, "left");
  if (book.bestseller) {
    ctx.fillStyle = foil(p, w - 40, 10, w - 10, 20);
    ctx.font = `700 3.2px ${fonts.sans}`;
    drawTracked(ctx, "BESTSELLER", w - 12, h - 12, 0.5, "right");
  }
}

function paperSpine(p: PaintCtx, r: Region) {
  const { sw } = p;
  spineTitle(p, r, 12, r.h - 30, () => ink(p, sw.ink), { weight: 600, color: ink(p, sw.ink) as string });
  spineFooter(p, r, () => ink(p, sw.ink), ink(p, sw.ink) as string);
}

export function paintWrap(book: Book, dims: BookDims, theme: Theme, fonts: CanvasFonts, size: number, kind: PassKind) {
  const W = size;
  const H = size;
  const { canvas, ctx } = makeCanvas(W, H);
  const sw = bookSwatch(theme, book);
  const pass: Pass = { kind, orm: ormFill };
  const p: PaintCtx = { ctx, book, sw, fonts, pass, fm: FINISH[book.finish], rnd: mulberry32(hashString(book.id + kind)) };
  const hMM = dims.H * 100;
  const regions = {
    back: { px: 0, pw: W * WRAP_U.back, w: dims.lenBack * 100, h: hMM },
    spine: { px: W * WRAP_U.back, pw: W * WRAP_U.spine, w: dims.lenSpine * 100, h: hMM },
    front: { px: W * (WRAP_U.back + WRAP_U.spine), pw: W * WRAP_U.front, w: dims.lenFront * 100, h: hMM },
  };
  paintBase(p, W, H);
  const painters =
    book.finish === "cloth"
      ? { back: clothBack, spine: clothSpine, front: clothFront }
      : book.finish === "jacket"
        ? { back: jacketBack, spine: jacketSpine, front: jacketFront }
        : { back: jacketBack, spine: paperSpine, front: paperFront };
  for (const key of ["back", "spine", "front"] as const) {
    enterRegion(ctx, regions[key], H);
    painters[key](p, regions[key]);
    ctx.restore();
  }
  paintWear(p, W, H, regions);
  return canvas;
}


const frontCache = new Map<string, string>();

/** Front cover as a data URL (aspect-correct), for 2D UI. Client only. */
export function frontCoverUrl(book: Book, theme: Theme, fonts: CanvasFonts, height = 720): string {
  const key = `${book.id}|${theme.name}|${height}|${fonts.serif}`;
  const hit = frontCache.get(key);
  if (hit) return hit;
  const dims = bookDims(book);
  const size = Math.max(512, Math.round(height));
  const wrap = paintWrap(book, dims, theme, fonts, size, "color");
  const aspect = dims.lenFront / dims.H;
  const { canvas, ctx } = makeCanvas(Math.round(height * aspect), height);
  const sx = size * (WRAP_U.back + WRAP_U.spine);
  ctx.drawImage(wrap, sx, 0, size * WRAP_U.front, size, 0, 0, canvas.width, canvas.height);
  // hinge shading so it reads as a bound book
  const g = ctx.createLinearGradient(0, 0, canvas.width * 0.08, 0);
  g.addColorStop(0, "rgba(0,0,0,0.35)");
  g.addColorStop(0.35, "rgba(255,255,255,0.08)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width * 0.08, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.88);
  frontCache.set(key, url);
  return url;
}
