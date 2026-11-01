"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { easing } from "maath";
import { useTheme } from "@/theme";
import { brandBook } from "@/data/showcase";
import { bookDims } from "@/lib/three/bookGeometry";
import { firstPageTexture, type CanvasFonts, type CoverTextures } from "@/lib/three/textures";
import { BookMeshes, useBookGeometry, useBookMaterials } from "../BookModel";
import SceneCanvas from "../SceneCanvas";
import { useCoverSet } from "../useCoverSet";
import { useLeaves } from "../useLeaves";
import { useBlobTexture, useFitCamera } from "../sceneTextures";

const LEAVES = 8;
const COVER_OPEN = 2.55;
/** seconds per page turn in the idle loop */
const PERIOD = 2.6;
const TURN = 1.2;

const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/** Leaf progress (0 = right, 1 = turned left) at time t: turn them all over, then back. */
function leafProgress(i: number, t: number) {
  const cycle = t % (2 * LEAVES * PERIOD);
  const k = Math.floor(cycle / PERIOD);
  const f = Math.min(1, (cycle - k * PERIOD) / TURN);
  if (k < LEAVES) return i < k ? 1 : i === k ? f : 0;
  const back = LEAVES - 1 - (k - LEAVES);
  return i < back ? 1 : i === back ? 1 - f : 0;
}

function Book({ textures, fonts, onFirstFrame }: { textures: CoverTextures; fonts: CanvasFonts; onFirstFrame: () => void }) {
  const theme = useTheme();
  const dims = useMemo(() => bookDims(brandBook), []);
  const geo = useBookGeometry(dims);
  const mats = useBookMaterials(brandBook, textures);
  const leaf = useLeaves(dims, theme, fonts, LEAVES);
  const blob = useBlobTexture();
  const root = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const first = useRef(false);
  const hingePos = useMemo(() => new THREE.Vector3(), []);
  // where each leaf comes to rest on the left: on top of the board and of the leaves turned before it
  const landing = useMemo(
    () =>
      Array.from({ length: LEAVES }, (_, i) => {
        const theta = COVER_OPEN - 0.03 - i * 0.006;
        return { theta, offset: leaf.landedOffset(COVER_OPEN, theta, i + 1) };
      }),
    [leaf],
  );

  useEffect(() => {
    mats.firstPage.map = firstPageTexture(brandBook, theme, fonts, (dims.D - dims.oh) / dims.Hp);
    mats.firstPage.color.set("#ffffff");
    mats.firstPage.needsUpdate = true;
  }, [dims, fonts, mats, theme]);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const g = root.current;
    if (!g) return;
    const yaw = -Math.PI / 2 - (Math.PI - COVER_OPEN) / 2;
    easing.damp(g.rotation, "y", yaw + s.pointer.x * 0.22 + Math.sin(t * 0.2) * 0.05, 0.5, Math.min(dt, 1 / 20));
    g.rotation.x = -0.05 + s.pointer.y * 0.04;
    // keep the spine (centre of the spread) in the middle of the frame
    hingePos.set(dims.pw, 0, dims.zJ).applyAxisAngle(THREE.Object3D.DEFAULT_UP, g.rotation.y);
    g.position.set(-hingePos.x, Math.sin(t * 0.6) * 0.03, -hingePos.z);
    if (hinge.current) hinge.current.rotation.y = -COVER_OPEN;

    const arr = leaf.attr.array as Float32Array;
    for (let i = 0; i < LEAVES; i++) {
      const p = leafProgress(i, t + 0.6);
      const e = easeInOutCubic(p);
      arr[i * 4] = landing[i].theta * e;
      arr[i * 4 + 1] = 0.7 * Math.sin(2 * Math.PI * p) - 0.05 * e;
      arr[i * 4 + 2] = (LEAVES - i) * leaf.gapStep * (1 - e) + landing[i].offset * e;
      arr[i * 4 + 3] = 0;
    }
    leaf.attr.needsUpdate = true;

    if (!first.current) {
      first.current = true;
      onFirstFrame();
    }
  });

  return (
    <>
      <group ref={root}>
        <BookMeshes ref={hinge} dims={dims} geo={geo} mats={mats} shadows={false} />
        <mesh geometry={leaf.geometry} material={leaf.material} frustumCulled={false} />
      </group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -dims.H / 2 - 0.02, 0]} scale={[4.4, 2.6, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={blob} transparent depthWrite={false} opacity={0.55} />
      </mesh>
    </>
  );
}

function Stage({ onReady }: { onReady: () => void }) {
  const theme = useTheme();
  const books = useMemo(() => [brandBook], []);
  const covers = useCoverSet(books, "hi");
  useFitCamera(7.6, 1.2, 0.1);
  const L = theme.scene.lights;
  return (
    <>
      <ambientLight intensity={L.ambient.intensity * 3} color={L.ambient.color} />
      <spotLight position={[-1.6, 5, 4.4]} angle={0.6} penumbra={1} decay={2} intensity={L.key.intensity * 0.3} color={L.key.color} />
      <directionalLight position={[3, 6, -5]} intensity={L.rim.intensity * 1.1} color={L.rim.color} />
      <pointLight position={[-2.2, 2.4, 3.4]} intensity={L.fill.intensity * 5} color={L.fill.color} distance={10} />
      <Environment resolution={128} frames={1} environmentIntensity={L.environment}>
        <Lightformer form="rect" intensity={2.4} color={theme.scene.env.top} scale={[10, 3, 1]} position={[0, 6, 4]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color={theme.scene.env.warm} scale={[0.8, 8, 1]} position={[-5, 2, 2]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} color={theme.scene.env.cool} scale={[0.8, 8, 1]} position={[5, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      {covers && <Book textures={covers.textures[0]} fonts={covers.fonts} onFirstFrame={onReady} />}
    </>
  );
}

/** Guide hero: the StoryShelf house volume, open, quietly turning its pages. */
export default function OpenBook({ active, onReady, onFatal }: { active: boolean; onReady: () => void; onFatal: () => void }) {
  return (
    <SceneCanvas active={active} onFatal={onFatal} label="An open book turning its pages" camera={{ fov: 30, position: [0, 1.4, 7.6], near: 0.3, far: 40 }} className="!absolute inset-0">
      <Stage onReady={onReady} />
    </SceneCanvas>
  );
}
