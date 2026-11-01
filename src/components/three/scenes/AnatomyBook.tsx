"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { easing } from "maath";
import type { Book } from "@/types";
import { useTheme } from "@/theme";
import { bookDims } from "@/lib/three/bookGeometry";
import { firstPageTexture, type CanvasFonts, type CoverTextures } from "@/lib/three/textures";
import { BookMeshes, useBookGeometry, useBookMaterials } from "../BookModel";
import SceneCanvas from "../SceneCanvas";
import { useCoverSet } from "../useCoverSet";
import { useBlobTexture, useFitCamera } from "../sceneTextures";

export type AnatomyFocus = "front" | "spine" | "back" | "head" | "open";

/** Book pose per part: turn (yaw), tip toward the camera (pitch), cover opening, zoom. */
const FOCUS: Record<AnatomyFocus, { yaw: number; pitch: number; open: number; zoom: number }> = {
  front: { yaw: -Math.PI / 2 + 0.28, pitch: 0, open: 0, zoom: 1 },
  spine: { yaw: -0.32, pitch: 0, open: 0, zoom: 1.12 },
  back: { yaw: Math.PI / 2 - 0.3, pitch: 0, open: 0, zoom: 1 },
  head: { yaw: -Math.PI / 2 + 0.75, pitch: 0.95, open: 0, zoom: 1.15 },
  open: { yaw: -Math.PI / 2 - 0.42, pitch: 0, open: 2.3, zoom: 0.92 },
};

function Model({ book, textures, fonts, focus, onFirstFrame }: { book: Book; textures: CoverTextures; fonts: CanvasFonts; focus: AnatomyFocus; onFirstFrame: () => void }) {
  const theme = useTheme();
  const dims = useMemo(() => bookDims(book), [book]);
  const geo = useBookGeometry(dims);
  const mats = useBookMaterials(book, textures);
  const blob = useBlobTexture();
  const root = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const st = useRef({ yaw: FOCUS.front.yaw, pitch: 0, open: 0, zoom: 1 });
  const first = useRef(false);

  useEffect(() => {
    mats.firstPage.map = firstPageTexture(book, theme, fonts, (dims.D - dims.oh) / dims.Hp);
    mats.firstPage.color.set("#ffffff");
    mats.firstPage.needsUpdate = true;
  }, [book, dims, fonts, mats, theme]);

  useFrame((s, dt) => {
    const d = Math.min(dt, 1 / 20);
    const t = s.clock.elapsedTime;
    const f = FOCUS[focus];
    const v = st.current;
    easing.damp(v, "yaw", f.yaw, 0.5, d);
    easing.damp(v, "pitch", f.pitch, 0.5, d);
    easing.damp(v, "open", f.open, 0.55, d);
    easing.damp(v, "zoom", f.zoom, 0.5, d);
    if (root.current) {
      // XYZ: turn first, then tip toward the camera about the world X axis
      root.current.rotation.set(v.pitch, v.yaw + s.pointer.x * 0.18 + Math.sin(t * 0.3) * 0.04, 0, "XYZ");
      root.current.position.y = Math.sin(t * 0.6) * 0.03;
      root.current.scale.setScalar(v.zoom);
    }
    if (hinge.current) hinge.current.rotation.y = -v.open;
    if (!first.current) {
      first.current = true;
      onFirstFrame();
    }
  });

  return (
    <>
      <group ref={root}>
        <BookMeshes ref={hinge} dims={dims} geo={geo} mats={mats} shadows={false} />
      </group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -dims.H / 2 - 0.25, 0]} scale={[3.4, 2, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={blob} transparent depthWrite={false} opacity={0.5} />
      </mesh>
    </>
  );
}

function Stage({ book, focus, onReady }: { book: Book; focus: AnatomyFocus; onReady: () => void }) {
  const theme = useTheme();
  const books = useMemo(() => [book], [book]);
  const covers = useCoverSet(books, "hi");
  useFitCamera(7.4, 0.85, 0);
  const L = theme.scene.lights;
  return (
    <>
      <ambientLight intensity={L.ambient.intensity * 2.8} color={L.ambient.color} />
      <spotLight position={[-2, 5, 4]} angle={0.6} penumbra={1} decay={2} intensity={L.key.intensity * 0.32} color={L.key.color} />
      <directionalLight position={[4, 3, -4]} intensity={L.rim.intensity * 1.2} color={L.rim.color} />
      <pointLight position={[1.5, 0.5, 3]} intensity={L.fill.intensity * 5} color={L.fill.color} distance={8} />
      <Environment resolution={128} frames={1} environmentIntensity={L.environment * 1.2}>
        <Lightformer form="rect" intensity={2.4} color={theme.scene.env.top} scale={[10, 3, 1]} position={[0, 5, 4]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color={theme.scene.env.warm} scale={[0.8, 8, 1]} position={[-5, 2, 2]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} color={theme.scene.env.cool} scale={[0.8, 8, 1]} position={[5, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      {covers && <Model book={book} textures={covers.textures[0]} fonts={covers.fonts} focus={focus} onFirstFrame={onReady} />}
    </>
  );
}

/** Book-design anatomy: one hardcover that turns to show each part. */
export default function AnatomyBook({ book, focus, active, onReady, onFatal }: { book: Book; focus: AnatomyFocus; active: boolean; onReady: () => void; onFatal: () => void }) {
  return (
    <SceneCanvas active={active} onFatal={onFatal} label="A hardcover book turning to show its cover, spine, back, head and pages" camera={{ fov: 30, position: [0, 0.4, 7.4], near: 0.1, far: 40 }} className="!absolute inset-0">
      <Stage book={book} focus={focus} onReady={onReady} />
    </SceneCanvas>
  );
}
