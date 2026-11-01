"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useCursor } from "@react-three/drei";
import { easing } from "maath";
import type { Book } from "@/types";
import { useTheme } from "@/theme";
import { bookDims } from "@/lib/three/bookGeometry";
import { firstPageTexture, type CanvasFonts, type CoverTextures } from "@/lib/three/textures";
import { getLenis } from "@/components/layout/SmoothScroll";
import { BookMeshes, useBookGeometry, useBookMaterials } from "../BookModel";
import SceneCanvas from "../SceneCanvas";
import { useCoverSet } from "../useCoverSet";
import { firstScreenScroll, useBlobTexture, useFitCamera, useFloorTexture } from "../sceneTextures";

/** Slot per volume: x, how far it turns towards the centre, forward offset. */
const SLOTS = [
  { x: -1.42, turn: 0.42, z: -0.1 },
  { x: 0, turn: 0.08, z: 0.35 },
  { x: 1.42, turn: -0.42, z: -0.1 },
];

function scrollToPlan(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(el, { offset: -110 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

interface VolumeProps {
  book: Book;
  slot: number;
  textures: CoverTextures;
  fonts: CanvasFonts;
  featured: boolean;
  blob: THREE.Texture;
  born: React.RefObject<number>;
}

function Volume({ book, slot, textures, fonts, featured, blob, born }: VolumeProps) {
  const theme = useTheme();
  const dims = useMemo(() => bookDims(book), [book]);
  const geo = useBookGeometry(dims);
  const mats = useBookMaterials(book, textures);
  const group = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const anim = useRef({ lift: 0, open: 0 });
  useCursor(hovered);

  // the half-title page shows when the cover swings open
  useEffect(() => {
    mats.firstPage.map = firstPageTexture(book, theme, fonts, (dims.D - dims.oh) / dims.Hp);
    mats.firstPage.color.set("#ffffff");
    mats.firstPage.needsUpdate = true;
  }, [book, dims, fonts, mats, theme]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(dt, 1 / 20);
    const t = state.clock.elapsedTime;
    const s = SLOTS[slot];
    const a = anim.current;
    const appear = 1 - Math.pow(1 - THREE.MathUtils.clamp((t - born.current - slot * 0.15) / 1.1, 0, 1), 3);
    const scroll = firstScreenScroll();
    easing.damp(a, "lift", hovered ? 1 : 0, 0.25, d);
    easing.damp(a, "open", hovered ? 1 : featured ? 0.18 + Math.sin(t * 0.7) * 0.06 : 0, 0.4, d);
    g.position.set(
      s.x * (1 + scroll * 0.35),
      -1 + (featured ? 0.12 : 0) + a.lift * 0.18 + Math.sin(t * 0.8 + slot * 1.7) * 0.03 - (1 - appear) * 1.2,
      s.z,
    );
    g.rotation.set(0, -Math.PI / 2 + s.turn + scroll * (slot - 1) * 0.5 - a.lift * 0.12, (1 - appear) * (slot - 1) * 0.3);
    if (hinge.current) hinge.current.rotation.y = -a.open * 0.95;
    if (shadow.current) {
      shadow.current.position.set(g.position.x, -1.003, s.z);
      (shadow.current.material as THREE.MeshBasicMaterial).opacity = appear * (0.6 - a.lift * 0.25);
    }
  });

  return (
    <>
      <group
        ref={group}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          scrollToPlan(book.id);
        }}
      >
        <group position={[0, dims.H / 2, 0]}>
          <BookMeshes ref={hinge} dims={dims} geo={geo} mats={mats} shadows={false} />
        </group>
      </group>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} scale={[2.1, 1.3, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={blob} transparent depthWrite={false} opacity={0} />
      </mesh>
    </>
  );
}

function Volumes({ books, featuredId, onReady }: { books: Book[]; featuredId: string; onReady: () => void }) {
  const theme = useTheme();
  const covers = useCoverSet(books, "hi");
  const blob = useBlobTexture();
  const floor = useFloorTexture(theme);
  const clock = useThree((s) => s.clock);
  useFitCamera(8.4, 1.25, 0.05);
  const root = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const born = useRef(Infinity);


  useEffect(() => {
    if (!covers) return;
    born.current = clock.elapsedTime;
    onReady();
  }, [covers, clock, onReady]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20);
    const t = state.clock.elapsedTime;
    if (root.current) {
      easing.damp(root.current.rotation, "y", state.pointer.x * 0.22 + Math.sin(t * 0.25) * 0.06, 0.5, d);
      easing.damp(root.current.rotation, "x", -state.pointer.y * 0.05 + firstScreenScroll() * 0.18, 0.5, d);
    }
    if (halo.current) (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(t * 1.4) * 0.12;
  });

  const L = theme.scene.lights;
  return (
    <>
      <ambientLight intensity={L.ambient.intensity * 2.6} color={L.ambient.color} />
      <spotLight position={[-1.5, 5, 4]} angle={0.6} penumbra={1} decay={2} intensity={L.key.intensity * 0.3} color={L.key.color} />
      <directionalLight position={[4, 3, -4]} intensity={L.rim.intensity * 1.3} color={L.rim.color} />
      <pointLight position={[0, 0.6, 2.4]} intensity={L.fill.intensity * 5} color={L.fill.color} distance={6} />
      <Environment resolution={128} frames={1} environmentIntensity={L.environment * 1.2}>
        <Lightformer form="rect" intensity={2.4} color={theme.scene.env.top} scale={[10, 3, 1]} position={[0, 5, 4]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color={theme.scene.env.warm} scale={[0.8, 8, 1]} position={[-5, 2, 2]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} color={theme.scene.env.cool} scale={[0.8, 8, 1]} position={[5, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      <group ref={root}>
        <mesh rotation-x={-Math.PI / 2} position={[0, -1.01, 0]}>
          <circleGeometry args={[3.3, 64]} />
          <meshBasicMaterial map={floor} transparent depthWrite={false} />
        </mesh>
        {/* gold halo under the most-chosen plan */}
        <mesh ref={halo} rotation-x={-Math.PI / 2} position={[0, -1.005, SLOTS[1].z]}>
          <ringGeometry args={[0.95, 1.02, 64]} />
          <meshBasicMaterial color={theme.colors.accent} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        {covers &&
          books.map((b, i) => (
            <Volume key={b.id} book={b} slot={i} textures={covers.textures[i]} fonts={covers.fonts} featured={b.id === featuredId} blob={blob} born={born} />
          ))}
      </group>
    </>
  );
}

interface Props {
  books: Book[];
  featuredId: string;
  active: boolean;
  onReady: () => void;
  onFatal: () => void;
}

/** Plans hero: the three plans as cased volumes; click one to jump to it. */
export default function PlanVolumes({ books, featuredId, active, onReady, onFatal }: Props) {
  return (
    <SceneCanvas active={active} onFatal={onFatal} label="The Kickstart, Level-Up and Pro plans shown as three hardcover books" camera={{ fov: 30, position: [0, 0.9, 8.4], near: 0.1, far: 40 }} className="!absolute inset-0">
      <Volumes books={books} featuredId={featuredId} onReady={onReady} />
    </SceneCanvas>
  );
}
