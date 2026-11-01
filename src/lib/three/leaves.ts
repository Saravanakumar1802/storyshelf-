import * as THREE from "three";
import type { Theme } from "@/theme";
import { drawTracked, makeCanvas, type CanvasFonts } from "@/lib/cover/paint";
import { drawEmblem } from "@/lib/cover/emblems";
import { BRAND } from "@/lib/brand";
import { hashString, mulberry32 } from "@/lib/random";

/* ════════════════════════════════════════════════════════════════════════
 * Turning pages ("leaves") for the intro book, drawn as ONE instanced mesh.
 *
 * Each leaf is a strip hinged at the spine. In the vertex shader it is bent
 * into a circular arc of constant curvature — a closed form, so there is no
 * simulation — from three per-instance numbers:
 *   theta  angle of the leaf at the hinge (0 = lying on the block, rotating
 *          the same way as the front board)
 *   curl   curvature along the leaf (+ the free edge leads, − it trails)
 *   offset stacking distance along the leaf normal (keeps layers apart)
 * plus `variant` (which page is printed on the back of the leaf).
 *
 * The arc in the book's XZ plane, for arc length s along the leaf:
 *   a(s) = theta + curl·s
 *   p(s) = ((cos θ − cos a)/c, (sin θ − sin a)/c)   (→ s·(sin θ, −cos θ) as c→0)
 *   n(s) = (cos a, sin a)
 * ════════════════════════════════════════════════════════════════════════ */

export interface LeafUniforms {
  uLen: { value: number };
  uHinge: { value: THREE.Vector2 };
}

const HEAD = /* glsl */ `
attribute vec4 aLeaf; // theta, curl, offset, variant
uniform float uLen;
uniform vec2 uHinge;
varying float vVariant;
vec3 leafPos;
vec3 leafNormal;
void leafDeform(vec3 p) {
  float s = p.x * uLen;
  float th = aLeaf.x;
  float c = aLeaf.y;
  float a = th + c * s;
  vec2 q = abs(c) < 1e-4 ? vec2(s * sin(th), -s * cos(th)) : vec2((cos(th) - cos(a)) / c, (sin(th) - sin(a)) / c);
  vec2 n = vec2(cos(a), sin(a));
  q += n * aLeaf.z;
  leafPos = vec3(uHinge.x + q.x, p.y, uHinge.y + q.y);
  leafNormal = vec3(n.x, 0.0, n.y);
}
`;

function injectVertex(shader: THREE.WebGLProgramParametersWithUniforms, uniforms: LeafUniforms, withNormals: boolean) {
  shader.uniforms.uLen = uniforms.uLen;
  shader.uniforms.uHinge = uniforms.uHinge;
  shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>\n${HEAD}`);
  if (withNormals) {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      "leafDeform(position);\nvec3 objectNormal = leafNormal;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif",
    );
  }
  shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "leafDeform(position);\nvec3 transformed = leafPos;\nvVariant = aLeaf.w;");
}

/** Paper material: front/back pages from a 2-cell atlas, darker toward the gutter. */
export function createLeafMaterials(atlas: THREE.Texture, uniforms: LeafUniforms, envIntensity: number) {
  const material = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.93, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide, envMapIntensity: envIntensity });
  material.onBeforeCompile = (shader) => {
    injectVertex(shader, uniforms, true);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vVariant;")
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        #ifdef USE_MAP
          // front: cell 0 as is; back: mirrored so it reads correctly, cell = variant
          float pu = gl_FrontFacing ? vMapUv.x : 1.0 - vMapUv.x;
          float cell = gl_FrontFacing ? 0.0 : vVariant;
          diffuseColor *= texture2D( map, vec2( ( cell + pu ) * 0.5, vMapUv.y ) );
          // paper curving into the gutter catches less light
          diffuseColor.rgb *= mix( 0.72, 1.0, smoothstep( 0.0, 0.16, vMapUv.x ) );
        #endif`,
      );
  };
  material.customProgramCacheKey = () => "8085-leaf";

  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  depth.onBeforeCompile = (shader) => injectVertex(shader, uniforms, false);
  depth.customProgramCacheKey = () => "8085-leaf-depth";
  return { material, depth };
}

/** A strip from x = 0 (hinge) to 1 (fore-edge), `height` tall, finely split along x so it can bend. */
export function createLeafGeometry(height: number, count: number) {
  const g = new THREE.PlaneGeometry(1, height, 48, 1);
  g.translate(0.5, 0, 0);
  const inst = new THREE.InstancedBufferGeometry().copy(g as unknown as THREE.InstancedBufferGeometry);
  g.dispose();
  inst.instanceCount = count;
  const attr = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  attr.setUsage(THREE.DynamicDrawUsage);
  inst.setAttribute("aLeaf", attr);
  return { geometry: inst, attr };
}

const PROSE =
  "It began, as most books do, with a single line written late at night and almost thrown away. The line became a page, the page a chapter, and somewhere between the third draft and the fourth cup of tea the story decided it wanted to be read. Every great story deserves a shelf: a cover that catches the eye, a spine that holds its place, pages set with care so that a stranger, years from now, can open it and hear a voice that was once only in your head. ";

/**
 * Two page designs side by side: [0] a typeset text page, [1] the epigraph
 * that ends up as the left-hand page of the final spread.
 */
export function leafAtlasTexture(theme: Theme, fonts: CanvasFonts, pageAspect: number, cellW: number) {
  const cellH = Math.round(cellW / pageAspect);
  const { canvas, ctx } = makeCanvas(cellW * 2, cellH);
  const rnd = mulberry32(hashString("leaf-atlas"));
  ctx.fillStyle = theme.scene.page.color;
  ctx.fillRect(0, 0, cellW * 2, cellH);
  // paper fibre
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rnd() > 0.5 ? "#ffffff" : theme.scene.page.edgeShade;
    ctx.fillRect(rnd() * cellW * 2, rnd() * cellH, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.scene.page.ink;

  // ── cell 0: text page (gutter on the left)
  const fs = Math.round(cellW * 0.03);
  const lh = fs * 1.55;
  const left = cellW * 0.14;
  const right = cellW * 0.9;
  const top = cellH * 0.13;
  const bottom = cellH * 0.86;
  ctx.font = `500 ${Math.round(fs * 0.62)}px ${fonts.mono}`;
  ctx.globalAlpha = 0.55;
  ctx.textAlign = "center";
  drawTracked(ctx, "EVERY GREAT STORY", (left + right) / 2, top - lh * 1.4, fs * 0.18);
  ctx.globalAlpha = 0.85;
  ctx.textAlign = "left";
  ctx.font = `400 ${fs}px ${fonts.serif}`;
  const words = (PROSE + PROSE + PROSE).split(" ");
  let y = top + lh;
  let line: string[] = [];
  const flush = (justify: boolean) => {
    const w = line.reduce((s, x) => s + ctx.measureText(x).width, 0);
    const gaps = Math.max(1, line.length - 1);
    const space = justify ? (right - left - w) / gaps : ctx.measureText(" ").width;
    let x = left;
    for (const word of line) {
      ctx.fillText(word, x, y);
      x += ctx.measureText(word).width + space;
    }
    line = [];
    y += lh;
  };
  for (const word of words) {
    if (y > bottom) break;
    const trial = [...line, word].join(" ");
    if (ctx.measureText(trial).width > right - left && line.length) flush(true);
    line.push(word);
  }
  ctx.globalAlpha = 0.6;
  ctx.textAlign = "center";
  ctx.font = `400 ${Math.round(fs * 0.8)}px ${fonts.serif}`;
  ctx.fillText("7", (left + right) / 2, cellH * 0.93);

  // ── cell 1: epigraph (gutter on the right once mirrored onto the back)
  const cx = cellW + cellW * 0.5;
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = theme.scene.page.ink;
  ctx.save();
  ctx.fillStyle = theme.scene.page.ink;
  drawEmblem(ctx, "shelf", cx, cellH * 0.3, cellW * 0.1, 2.2);
  ctx.restore();
  ctx.font = `italic 400 ${Math.round(cellW * 0.058)}px ${fonts.serif}`;
  const lines = ["For every writer", "who ever dreamed", "of a shelf."];
  lines.forEach((l, i) => ctx.fillText(l, cx, cellH * 0.46 + i * cellW * 0.085));
  ctx.globalAlpha = 0.6;
  ctx.font = `500 ${Math.round(cellW * 0.022)}px ${fonts.mono}`;
  drawTracked(ctx, BRAND.name.toUpperCase(), cx, cellH * 0.75, cellW * 0.006);
  ctx.globalAlpha = 1;

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
