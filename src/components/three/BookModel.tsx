"use client";

import { forwardRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Book } from "@/types";
import { useTheme } from "@/theme";
import { buildCaseBack, buildCaseFront, buildTextBlock, headbandSpec, hingePivot, type BookDims } from "@/lib/three/bookGeometry";
import { headbandTexture, linenNormalTexture, pageEdgeTexture, type CoverTextures } from "@/lib/three/textures";
import { bookSwatch } from "@/lib/cover/swatch";

/** Geometry for one physical book size (disposed on change/unmount). */
export function useBookGeometry(dims: BookDims) {
  const geo = useMemo(() => {
    const back = buildCaseBack(dims);
    const front = buildCaseFront(dims);
    const block = buildTextBlock(dims);
    const hb = headbandSpec(dims);
    const headband = new THREE.CylinderGeometry(hb.radius, hb.radius, hb.length, 10, 1);
    headband.rotateZ(Math.PI / 2);
    return { back, front, block, headband, hb };
  }, [dims]);
  useEffect(
    () => () => {
      geo.back.dispose();
      geo.front.dispose();
      geo.block.dispose();
      geo.headband.dispose();
    },
    [geo],
  );
  return geo;
}

export type BookGeometry = ReturnType<typeof useBookGeometry>;

/** PBR materials: linen/foil case, page edges, endpapers, headbands. */
export function useBookMaterials(book: Book, textures: CoverTextures) {
  const theme = useTheme();
  const mats = useMemo(() => {
    const sw = bookSwatch(theme, book);
    const linen = linenNormalTexture();
    const cloth = book.finish === "cloth";
    const jacket = book.finish === "jacket";
    const envI = theme.scene.lights.environment;
    const wrap = new THREE.MeshPhysicalMaterial({
      map: textures.map,
      roughnessMap: textures.orm,
      metalnessMap: textures.orm,
      roughness: 1,
      metalness: 1,
      normalMap: linen,
      normalScale: new THREE.Vector2(cloth ? 0.42 : 0.05, cloth ? 0.42 : 0.05),
      sheen: cloth ? 0.55 : 0,
      sheenRoughness: 0.75,
      sheenColor: new THREE.Color(sw.base).lerp(new THREE.Color("#ffffff"), 0.35),
      clearcoat: jacket ? 0.55 : book.finish === "paperback" ? 0.08 : 0,
      clearcoatRoughness: jacket ? 0.22 : 0.6,
      envMapIntensity: envI,
    });
    const edge = new THREE.MeshStandardMaterial({
      color: new THREE.Color(sw.base).multiplyScalar(0.9),
      roughness: cloth ? 0.9 : 0.5,
      normalMap: linen,
      normalScale: new THREE.Vector2(0.3, 0.3),
      envMapIntensity: envI,
    });
    // coloured endpapers, like a real cased book: the paper tone tinted by the cloth
    const inner = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.scene.page.endpaper).lerp(new THREE.Color(sw.base), 0.55),
      roughness: 0.9,
      envMapIntensity: envI * 0.6,
    });
    const pageEdges = new THREE.MeshStandardMaterial({ map: pageEdgeTexture(theme), roughness: 0.92, envMapIntensity: envI * 0.5 });
    const firstPage = new THREE.MeshStandardMaterial({ color: theme.scene.page.color, roughness: 0.95, envMapIntensity: envI * 0.5 });
    const plainPage = new THREE.MeshStandardMaterial({ color: theme.scene.page.color, roughness: 0.95, envMapIntensity: envI * 0.5 });
    const headband = new THREE.MeshStandardMaterial({ map: headbandTexture(theme), roughness: 0.55, envMapIntensity: envI });
    return { wrap, edge, inner, pageEdges, firstPage, plainPage, headband };
  }, [book, textures, theme]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

export type BookMaterials = ReturnType<typeof useBookMaterials>;

interface MeshesProps {
  dims: BookDims;
  geo: BookGeometry;
  mats: BookMaterials;
  shadows?: boolean;
}

/** The book's meshes, centred on its middle. The forwarded ref is the front
 *  board's hinge group: rotate it on Y (negative = open). */
export const BookMeshes = forwardRef<THREE.Group, MeshesProps>(function BookMeshes({ dims, geo, mats, shadows = true }, hingeRef) {
  const [hx, hz] = hingePivot(dims);
  const hb = geo.hb;
  const caseMats = [mats.wrap, mats.edge, mats.inner];
  return (
    <>
      <mesh geometry={geo.back} material={caseMats} castShadow={shadows} receiveShadow={shadows} />
      <group ref={hingeRef} position={[hx, 0, hz]}>
        <mesh geometry={geo.front} position={[-hx, 0, -hz]} material={caseMats} castShadow={shadows} receiveShadow={shadows} />
      </group>
      <mesh geometry={geo.block} material={[mats.pageEdges, mats.firstPage, mats.plainPage]} castShadow={shadows} receiveShadow={shadows} />
      {dims.hardcover && (
        <>
          <mesh geometry={geo.headband} material={mats.headband} position={[0, hb.y, hb.z]} />
          <mesh geometry={geo.headband} material={mats.headband} position={[0, -hb.y, hb.z]} />
        </>
      )}
    </>
  );
});
