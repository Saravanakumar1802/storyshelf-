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
import { BookMeshes, useBookGeometry, useBookMaterials, type BookGeometry, type BookMaterials } from "../BookModel";
import SceneCanvas from "../SceneCanvas";
import { useCoverSet } from "../useCoverSet";
import { useBlobTexture, useFitCamera, useManuscriptTexture } from "../sceneTextures";

const SHEETS = 8;

/** What the book looks like at each stage of the journey (index = stage). */
interface Pose {
  /** loose manuscript sheets: drifting, squared into a stack, fanned for editing, or bound in */
  sheets: "scatter" | "stack" | "fan" | "bound";
  /** 0 = parts apart, 1 = case and block assembled */
  built: number;
  /** turn of the book (0 = cover to camera, π = back cover) */
  yaw: number;
  /** copies fanned out beside it (distribution) */
  copies: number;
  /** front board opening (rad) */
  open: number;
  /** spotlight + gold sparkles (marketing, royalties) */
  glow: number;
  lift: number;
}

const POSES: Pose[] = [
  { sheets: "scatter", built: 0, yaw: -0.35, copies: 0, open: 0, glow: 0, lift: 0 }, // Consultation
  { sheets: "stack", built: 0, yaw: -0.3, copies: 0, open: 0, glow: 0, lift: 0 }, // Agreement
  { sheets: "fan", built: 0, yaw: -0.15, copies: 0, open: 0, glow: 0, lift: 0 }, // Editing
  { sheets: "bound", built: 0.55, yaw: -0.55, copies: 0, open: 0.5, glow: 0, lift: 0 }, // Cover & Interior
  { sheets: "bound", built: 1, yaw: Math.PI - 0.42, copies: 0, open: 0, glow: 0, lift: 0 }, // ISBN & Proofs (back cover: barcode)
  { sheets: "bound", built: 1, yaw: -0.35, copies: 1, open: 0, glow: 0, lift: 0 }, // Distribution
  { sheets: "bound", built: 1, yaw: -0.25, copies: 0, open: 0.4, glow: 1, lift: 0.25 }, // Marketing
  { sheets: "bound", built: 1, yaw: -0.45, copies: 0, open: 1.15, glow: 0.7, lift: 0.1 }, // Royalties
];

/** A second/third copy of the book (distribution), sharing geometry and materials. */
function Copy({ dims, geo, mats, side, state }: { dims: ReturnType<typeof bookDims>; geo: BookGeometry; mats: BookMaterials; side: -1 | 1; state: React.RefObject<{ copies: number }> }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const c = state.current.copies;
    if (!g.current) return;
    g.current.visible = c > 0.01;
    g.current.position.set(side * c * 1.25, 0, -c * 0.55);
    g.current.rotation.y = side * c * 0.32;
    g.current.scale.setScalar(Math.max(0.001, c * 0.94));
  });
  return (
    <group ref={g}>
      <BookMeshes dims={dims} geo={geo} mats={mats} shadows={false} />
    </group>
  );
}

function Journey({ book, textures, fonts, stage, onFirstFrame }: { book: Book; textures: CoverTextures; fonts: CanvasFonts; stage: number; onFirstFrame: () => void }) {
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
  const caseBack = useRef<THREE.Group>(null);
  const block = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const sheets = useRef<(THREE.Mesh | null)[]>([]);
  const sparkles = useRef<THREE.Group>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const state = useRef({ built: 0, yaw: POSES[0].yaw, copies: 0, open: 0, glow: 0, lift: 0, bound: 0 });
  const first = useRef(false);
  const [hx, hz] = hingePivot(dims);
  const caseMats = [mats.wrap, mats.edge, mats.inner];
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpRot = useMemo(() => new THREE.Euler(), []);
  // stable drift for scattered sheets
  const seeds = useMemo(() => Array.from({ length: SHEETS }, (_, i) => ({ a: (i / SHEETS) * Math.PI * 2 + i * 0.37, r: 1.05 + (i % 3) * 0.32, y: ((i * 7) % 5) / 5 - 0.45, spin: ((i * 13) % 7) / 7 - 0.5 })), []);

  useFrame((s, dt) => {
    const d = Math.min(dt, 1 / 20);
    const t = s.clock.elapsedTime;
    const pose = POSES[Math.max(0, Math.min(POSES.length - 1, stage))];
    const st = state.current;
    easing.damp(st, "built", pose.built, 0.45, d);
    easing.damp(st, "yaw", pose.yaw, 0.55, d);
    easing.damp(st, "copies", pose.copies, 0.4, d);
    easing.damp(st, "open", pose.open, 0.45, d);
    easing.damp(st, "glow", pose.glow, 0.5, d);
    easing.damp(st, "lift", pose.lift, 0.5, d);
    easing.damp(st, "bound", pose.sheets === "bound" ? 1 : 0, 0.35, d);

    if (root.current) {
      root.current.rotation.set(Math.sin(t * 0.3) * 0.03, -Math.PI / 2 + st.yaw + s.pointer.x * 0.15, 0);
      root.current.position.y = st.lift + Math.sin(t * 0.7) * 0.03;
    }
    // case and block arrive from the sides as the book is built
    const apart = 1 - st.built;
    const shown = Math.max(0.001, Math.min(1, st.built * 1.6));
    if (caseBack.current) {
      caseBack.current.position.set(-apart * 1.1, 0, 0);
      caseBack.current.scale.setScalar(shown);
    }
    if (block.current) block.current.scale.setScalar(shown);
    if (front.current) {
      front.current.position.set(apart * 1.2, 0, apart * 0.2);
      front.current.scale.setScalar(shown);
    }
    if (hinge.current) hinge.current.rotation.y = -(st.open + apart * 0.9);

    // sheets: target pose per mode, eased per sheet
    sheets.current.forEach((m, i) => {
      if (!m) return;
      const k = i - (SHEETS - 1) / 2;
      const sd = seeds[i];
      if (pose.sheets === "scatter") {
        const a = sd.a + t * 0.12;
        tmpPos.set(Math.cos(a) * sd.r * 0.8, sd.y + Math.sin(t * 0.8 + i) * 0.08, Math.sin(a) * sd.r * 0.6);
        tmpRot.set(sd.spin * 0.6, Math.PI / 2 + sd.spin * 1.6 + t * 0.05, sd.spin * 0.4);
      } else if (pose.sheets === "stack") {
        tmpPos.set(dims.T / 2 - 0.02 + i * 0.012, 0, -dims.oh);
        tmpRot.set(0, Math.PI / 2, k * 0.008);
      } else if (pose.sheets === "fan") {
        // hinged at the spine edge, opened like pages being reviewed
        const ang = -0.12 - i * 0.16;
        const half = (dims.D - dims.oh * 2.5) / 2;
        tmpPos.set(dims.T / 2 + Math.sin(-ang) * half, 0, dims.zJ - Math.cos(ang) * half);
        tmpRot.set(0, Math.PI / 2 + ang, 0);
      } else {
        tmpPos.set(dims.T / 2 - 0.04, 0, -dims.oh);
        tmpRot.set(0, Math.PI / 2, 0);
      }
      easing.damp3(m.position, tmpPos, 0.4 + i * 0.03, d);
      easing.dampE(m.rotation, tmpRot, 0.4 + i * 0.03, d);
      // once bound in, the loose sheets are inside the block
      const vis = 1 - st.bound;
      m.visible = vis > 0.02;
      m.scale.setScalar(Math.max(0.001, 0.4 + vis * 0.6));
    });

    if (sparkles.current) sparkles.current.scale.setScalar(Math.max(0.001, st.glow));
    if (spot.current) spot.current.intensity = theme.scene.lights.key.intensity * 0.18 * st.glow;

    if (!first.current) {
      first.current = true;
      onFirstFrame();
    }
  });

  return (
    <>
      <spotLight ref={spot} position={[0, 4.5, 2.5]} angle={0.35} penumbra={0.9} decay={2} intensity={0} color={theme.colors.accentBright} />
      <group ref={root}>
        <group ref={caseBack}>
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
        <group ref={front}>
          <group ref={hinge} position={[hx, 0, hz]}>
            <mesh geometry={geo.front} position={[-hx, 0, -hz]} material={caseMats} />
          </group>
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
      </group>
      <Copy dims={dims} geo={geo} mats={mats} side={-1} state={state} />
      <Copy dims={dims} geo={geo} mats={mats} side={1} state={state} />
      <group ref={sparkles}>
        <Sparkles count={50} scale={[4.5, 3.2, 2.5]} size={3} speed={0.35} opacity={0.9} color={theme.colors.accentBright} />
      </group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -dims.H / 2 - 0.3, 0]} scale={[3.8, 2.2, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={blob} transparent depthWrite={false} opacity={0.55} />
      </mesh>
    </>
  );
}

function Stage({ book, stage, onReady }: { book: Book; stage: number; onReady: () => void }) {
  const theme = useTheme();
  const books = useMemo(() => [book], [book]);
  const covers = useCoverSet(books, "hi");
  useFitCamera(8.2, 0.85, -0.05);
  const L = theme.scene.lights;
  return (
    <>
      <ambientLight intensity={L.ambient.intensity * 2.6} color={L.ambient.color} />
      <spotLight position={[-2, 5, 4]} angle={0.6} penumbra={1} decay={2} intensity={L.key.intensity * 0.3} color={L.key.color} />
      <directionalLight position={[4, 2, -4]} intensity={L.rim.intensity * 1.2} color={L.rim.color} />
      <pointLight position={[1.5, 0.5, 2.5]} intensity={L.fill.intensity * 5} color={L.fill.color} distance={7} />
      <Environment resolution={128} frames={1} environmentIntensity={L.environment * 1.2}>
        <Lightformer form="rect" intensity={2.4} color={theme.scene.env.top} scale={[10, 3, 1]} position={[0, 5, 4]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color={theme.scene.env.warm} scale={[0.8, 8, 1]} position={[-5, 2, 2]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} color={theme.scene.env.cool} scale={[0.8, 8, 1]} position={[5, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      {covers && <Journey book={book} textures={covers.textures[0]} fonts={covers.fonts} stage={stage} onFirstFrame={onReady} />}
    </>
  );
}

interface Props {
  book: Book;
  stage: number;
  active: boolean;
  onReady: () => void;
  onFatal: () => void;
}

/** How-it-works companion: one book, eight stages, morphing as you scroll. */
export default function JourneyBook({ book, stage, active, onReady, onFatal }: Props) {
  return (
    <SceneCanvas active={active} onFatal={onFatal} label="A book taking shape stage by stage, from loose manuscript pages to a finished, published book" camera={{ fov: 30, position: [0, 0.6, 8.2], near: 0.1, far: 40 }} className="!absolute inset-0">
      <Stage book={book} stage={stage} onReady={onReady} />
    </SceneCanvas>
  );
}
