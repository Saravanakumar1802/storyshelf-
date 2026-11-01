"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import { easing } from "maath";
import type { Book } from "@/types";
import { useTheme } from "@/theme";
import { bookDims, hingePivot } from "@/lib/three/bookGeometry";
import { firstPageTexture, type CanvasFonts, type CoverTextures } from "@/lib/three/textures";
import { useBookGeometry, useBookMaterials } from "../BookModel";
import SceneCanvas from "../SceneCanvas";
import { useCoverSet } from "../useCoverSet";
import { firstScreenScroll, useBlobTexture, useFitCamera, useManuscriptTexture } from "../sceneTextures";

const SHEETS = 6;

const smooth = (x: number) => x * x * (3 - 2 * x);

function Parts({ book, textures, fonts, onFirstFrame }: { book: Book; textures: CoverTextures; fonts: CanvasFonts; onFirstFrame: () => void }) {
  const theme = useTheme();
  const dims = useMemo(() => bookDims(book), [book]);
  const geo = useBookGeometry(dims);
  const mats = useBookMaterials(book, textures);
  const manuscript = useManuscriptTexture(theme);
  const blob = useBlobTexture();
  const sheetMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: manuscript, roughness: 0.95, side: THREE.DoubleSide, envMapIntensity: theme.scene.lights.environment * 0.5 }),
    [manuscript, theme],
  );
  useEffect(() => () => sheetMat.dispose(), [sheetMat]);

  useEffect(() => {
    mats.firstPage.map = firstPageTexture(book, theme, fonts, (dims.D - dims.oh) / dims.Hp);
    mats.firstPage.color.set("#ffffff");
    mats.firstPage.needsUpdate = true;
  }, [book, dims, fonts, mats, theme]);

  const root = useRef<THREE.Group>(null);
  const back = useRef<THREE.Group>(null);
  const block = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const sheets = useRef<(THREE.Mesh | null)[]>([]);
  const shadow = useRef<THREE.Mesh>(null);
  const state = useRef({ assembled: 0, appear: 0, first: false });
  const [hx, hz] = hingePivot(dims);
  const caseMats = [mats.wrap, mats.edge, mats.inner];

  useFrame((s, dt) => {
    const d = Math.min(dt, 1 / 20);
    const st = state.current;
    if (!st.first) {
      st.first = true;
      onFirstFrame();
    }
    const t = s.clock.elapsedTime;
    easing.damp(st, "appear", 1, 0.6, d);
    // scrolling the hero away assembles the book
    easing.damp(st, "assembled", smooth(Math.min(1, firstScreenScroll() * 1.6)), 0.25, d);
    const e = 1 - st.assembled; // explode amount
    const breathe = Math.sin(t * 0.8) * 0.04 * e;

    if (root.current) {
      easing.damp(root.current.rotation, "y", -0.62 + s.pointer.x * 0.25 + Math.sin(t * 0.2) * 0.08 + st.assembled * 0.35, 0.5, d);
      easing.damp(root.current.rotation, "x", 0.06 - s.pointer.y * 0.06, 0.5, d);
      root.current.position.set(-0.3 * (1 - st.assembled), Math.sin(t * 0.6) * 0.04 - (1 - st.appear) * 0.6, 0);
      root.current.scale.setScalar(0.85 + st.appear * 0.15);
    }
    if (back.current) {
      back.current.position.set(-e * (1.05 + breathe), e * 0.05, -e * 0.15);
      back.current.rotation.set(0, e * 0.22, e * 0.05);
    }
    if (block.current) {
      block.current.position.set(e * 0.05, e * 0.12 + breathe, 0);
      block.current.rotation.set(e * 0.04, -e * 0.08, -e * 0.03);
    }
    if (front.current && hinge.current) {
      front.current.position.set(e * (1.3 + breathe), e * 0.08, e * 0.25);
      hinge.current.rotation.y = -e * 1.05;
    }
    sheets.current.forEach((m, i) => {
      if (!m) return;
      const k = i - (SHEETS - 1) / 2;
      m.visible = e > 0.015;
      m.position.set(dims.T / 2 + e * (0.28 + i * 0.2), e * (k * 0.06 + Math.sin(t * 0.7 + i) * 0.06), -dims.oh + e * Math.sin(t * 0.5 + i * 1.3) * 0.08);
      m.rotation.set(e * Math.sin(t * 0.6 + i) * 0.06, Math.PI / 2 + e * (k * 0.07 + Math.sin(t * 0.4 + i) * 0.08), e * k * 0.035);
    });
    if (shadow.current) (shadow.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + st.assembled * 0.3;
  });

  return (
    <group ref={root}>
      <group ref={back}>
        <mesh geometry={geo.back} material={caseMats} />
      </group>
      <group ref={block}>
        <mesh geometry={geo.block} material={[mats.pageEdges, mats.firstPage, mats.plainPage]} />
        {dims.hardcover && (
          <>
            <mesh geometry={geo.headband} material={mats.headband} position={[0, geo.hb.y, geo.hb.z]} />
            <mesh geometry={geo.headband} material={mats.headband} position={[0, -geo.hb.y, geo.hb.z]} />
          </>
        )}
      </group>
      {Array.from({ length: SHEETS }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            sheets.current[i] = m;
          }}
          material={sheetMat}
        >
          <planeGeometry args={[dims.D - dims.oh * 2.5, dims.Hp * 0.98]} />
        </mesh>
      ))}
      <group ref={front}>
        <group ref={hinge} position={[hx, 0, hz]}>
          <mesh geometry={geo.front} position={[-hx, 0, -hz]} material={caseMats} />
        </group>
      </group>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position={[0, -dims.H / 2 - 0.35, 0]} scale={[3.6, 2, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={blob} transparent depthWrite={false} opacity={0.4} />
      </mesh>
    </group>
  );
}

function Assembly({ book, onReady }: { book: Book; onReady: () => void }) {
  const theme = useTheme();
  const books = useMemo(() => [book], [book]);
  const covers = useCoverSet(books, "hi");
  useFitCamera(8.6, 1.3, -0.05);
  const L = theme.scene.lights;
  return (
    <>
      <ambientLight intensity={L.ambient.intensity * 2.6} color={L.ambient.color} />
      <spotLight position={[-2, 5, 4]} angle={0.6} penumbra={1} decay={2} intensity={L.key.intensity * 0.3} color={L.key.color} />
      <directionalLight position={[4, 2, -4]} intensity={L.rim.intensity * 1.3} color={L.rim.color} />
      <pointLight position={[1.5, 0.5, 2.5]} intensity={L.fill.intensity * 5} color={L.fill.color} distance={7} />
      <Environment resolution={128} frames={1} environmentIntensity={L.environment * 1.2}>
        <Lightformer form="rect" intensity={2.4} color={theme.scene.env.top} scale={[10, 3, 1]} position={[0, 5, 4]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color={theme.scene.env.warm} scale={[0.8, 8, 1]} position={[-5, 2, 2]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} color={theme.scene.env.cool} scale={[0.8, 8, 1]} position={[5, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      <Sparkles count={36} scale={[7, 4, 3]} size={2.2} speed={0.25} opacity={theme.scene.dust.opacity} color={theme.scene.dust.color} />
      {covers && <Parts book={book} textures={covers.textures[0]} fonts={covers.fonts} onFirstFrame={onReady} />}
    </>
  );
}

interface Props {
  book: Book;
  active: boolean;
  onReady: () => void;
  onFatal: () => void;
}

/** Services hero: a hardcover in pieces (boards, text block, edited sheets)
 *  that comes together as you scroll. */
export default function BookAssembly({ book, active, onReady, onFatal }: Props) {
  return (
    <SceneCanvas active={active} onFatal={onFatal} label="A book in pieces — boards, pages and edited manuscript sheets — coming together" camera={{ fov: 30, position: [0, 0.5, 8.6], near: 0.1, far: 40 }} className="!absolute inset-0">
      <Assembly book={book} onReady={onReady} />
    </SceneCanvas>
  );
}
