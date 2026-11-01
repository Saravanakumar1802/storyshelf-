"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Theme } from "@/theme";
import { MM, hingePivot, type BookDims } from "@/lib/three/bookGeometry";
import { textureQuality, type CanvasFonts } from "@/lib/three/textures";
import { createLeafGeometry, createLeafMaterials, leafAtlasTexture } from "@/lib/three/leaves";

/**
 * `count` bendable leaves sitting on a book's text block (see
 * src/lib/three/leaves.ts), hinged at the spine edge of the block's front
 * face. Everything is disposed with the component.
 */
export function useLeaves(dims: BookDims, theme: Theme, fonts: CanvasFonts, count: number) {
  const leaf = useMemo(() => {
    const foreZ = -dims.D / 2 + dims.oh;
    const spineZ = dims.zJ - 0.4 * MM;
    const len = spineZ - foreZ - 0.6 * MM;
    const uniforms = { uLen: { value: len }, uHinge: { value: new THREE.Vector2(dims.pw, spineZ - 0.3 * MM) } };
    const q = textureQuality();
    const atlas = leafAtlasTexture(theme, fonts, len / dims.Hp, q.base === 1024 ? 768 : 512);
    const { geometry, attr } = createLeafGeometry(dims.Hp * 0.995, count);
    const { material, depth } = createLeafMaterials(atlas, uniforms, theme.scene.lights.environment * 0.55);
    // the leaves share the joint gap between block and front board
    const gapStep = (0.55 * MM) / count;
    const hinge = uniforms.uHinge.value;

    /**
     * Offset (along the leaf normal; negative = lift) that keeps a leaf turned
     * to `theta` lying ON the front board opened to `cover`, `stack` layers up.
     * The leaves hinge on the text block but the board hinges on the joint,
     * about a board's thickness further out, so a leaf turned to the board's
     * angle would otherwise pass under the board's inner face near the gutter
     * and the board would hide that part of the page.
     */
    const landedOffset = (cover: number, theta: number, stack = 0) => {
      const [hx, hz] = hingePivot(dims);
      const c = Math.cos(-cover);
      const sn = Math.sin(-cover);
      // Object3D.rotation.y: (x, z) -> (x cos + z sin, -x sin + z cos)
      const rot = (x: number, z: number) => [x * c + z * sn, -x * sn + z * c];
      const [ix, iz] = rot(-dims.bt / 2, 0);
      const [nx, nz] = rot(-1, 0); // the board's inner face normal, toward the pages
      const dist = (s: number) => (hinge.x + s * Math.sin(theta) - (hx + ix)) * nx + (hinge.y - s * Math.cos(theta) - (hz + iz)) * nz;
      // the first few percent sit in the gutter fold, where real pages hide too
      const lowest = Math.min(dist(len * 0.04), dist(len));
      const along = Math.cos(theta) * nx + Math.sin(theta) * nz; // ≈ −1 once turned
      const want = 0.35 * MM + stack * gapStep - lowest;
      return want > 0 && along < 0 ? want / along : -stack * gapStep;
    };
    return { geometry, attr, material, depth, atlas, len, foreZ, spineZ, gapStep, landedOffset };
  }, [dims, fonts, theme, count]);
  useEffect(
    () => () => {
      leaf.geometry.dispose();
      leaf.material.dispose();
      leaf.depth.dispose();
      leaf.atlas.dispose();
    },
    [leaf],
  );
  return leaf;
}
