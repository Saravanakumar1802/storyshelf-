"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import type { Theme } from "@/theme";
import { hexToRgb } from "@/lib/cover/paint";
import { hashString, mulberry32 } from "@/lib/random";

/** Soft round contact shadow: alpha falls off from the centre. A textured
 *  quad per object is far cheaper than real-time shadow maps. */
export function useBlobTexture() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,0.7)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** Warm pool of light on the floor, fading out to transparent (so it blends
 *  into whatever is behind a transparent canvas). Use with `transparent`. */
export function useFloorTexture(theme: Theme) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    const [r, gr, b] = hexToRgb(theme.scene.backgroundGlow);
    g.addColorStop(0, `rgba(${r},${gr},${b},1)`);
    g.addColorStop(0.55, `rgba(${r},${gr},${b},0.45)`);
    g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [theme]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/**
 * Keeps a scene framed on any canvas shape: the camera sits at `distance`
 * for canvases at least `designAspect` wide, and backs off on narrower
 * (portrait) ones so nothing is cropped.
 */
export function useFitCamera(distance: number, designAspect: number, lookY = 0, lookZ = 0) {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  useEffect(() => {
    const aspect = width / Math.max(1, height);
    camera.position.z = distance * Math.max(1, designAspect / aspect);
    camera.lookAt(0, lookY, lookZ);
  }, [camera, width, height, distance, designAspect, lookY, lookZ]);
}

/** Scroll progress of the first viewport (0 at the top, 1 one screen down). */
export const firstScreenScroll = () => Math.min(1, window.scrollY / Math.max(1, window.innerHeight));

/** A manuscript page: lines of type with an editor's red-pencil marks. */
export function useManuscriptTexture(theme: Theme) {
  const tex = useMemo(() => {
    const W = 512;
    const H = 768;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    const rnd = mulberry32(hashString("manuscript"));
    ctx.fillStyle = theme.scene.page.color;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = theme.scene.page.ink;
    ctx.globalAlpha = 0.55;
    const left = 64;
    const right = W - 56;
    for (let y = 90; y < H - 80; y += 22) {
      if (rnd() < 0.08) continue; // paragraph break
      let x = left + (rnd() < 0.15 ? 28 : 0);
      const end = rnd() < 0.12 ? left + (right - left) * (0.3 + rnd() * 0.5) : right;
      while (x < end) {
        const w = 14 + rnd() * 46;
        ctx.fillRect(x, y, Math.min(w, end - x), 5);
        x += w + 7;
      }
    }
    ctx.globalAlpha = 1;
    // red pencil: strike-throughs, carets, a margin note
    ctx.strokeStyle = theme.colors.editMark;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i++) {
      const y = 100 + Math.floor(rnd() * 26) * 22 + 3;
      const x = left + rnd() * 200;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 60 + rnd() * 90, y + (rnd() - 0.5) * 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 20, y + 16);
      ctx.lineTo(x + 28, y + 6);
      ctx.lineTo(x + 36, y + 16);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(right - 70, 250, 46, 16, -0.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let x = 18; x < 52; x += 6) ctx.lineTo(x, 380 + Math.sin(x) * 6);
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [theme]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
