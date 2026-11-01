"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useCursor } from "@react-three/drei";
import { easing } from "maath";
import type { Book } from "@/types";
import { useTheme } from "@/theme";
import { bookDims } from "@/lib/three/bookGeometry";
import type { CoverTextures } from "@/lib/three/textures";
import { useCarousel, wrapIndex } from "@/lib/store/carousel";
import { BookMeshes, useBookGeometry, useBookMaterials } from "../BookModel";
import SceneCanvas from "../SceneCanvas";
import { useCoverSet } from "../useCoverSet";
import { firstScreenScroll, useBlobTexture, useFitCamera, useFloorTexture } from "../sceneTextures";

const RADIUS = 3.45;
const AUTOPLAY_IDLE_MS = 4500;
const AUTOPLAY_EVERY_S = 3.2;

/** Pointer state shared by the DOM drag handlers and the render loop. */
const input = { dragging: false, moved: 0, lastX: 0, velocity: 0 };

interface RingBookProps {
  book: Book;
  index: number;
  count: number;
  textures: CoverTextures;
  ring: React.RefObject<{ pos: number; born: number }>;
  blob: THREE.Texture;
}

function RingBook({ book, index, count, textures, ring, blob }: RingBookProps) {
  const router = useRouter();
  const dims = useMemo(() => bookDims(book), [book]);
  const geo = useBookGeometry(dims);
  const mats = useBookMaterials(book, textures);
  const group = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const anim = useRef({ lift: 0, open: 0, appear: 0 });
  useCursor(hovered);
  const step = (Math.PI * 2) / count;

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(dt, 1 / 20);
    const a = anim.current;
    const t = state.clock.elapsedTime;
    // staggered entrance once the covers are painted
    const since = t - ring.current.born - index * 0.07;
    a.appear = THREE.MathUtils.clamp(since / 0.9, 0, 1);
    const appear = 1 - Math.pow(1 - a.appear, 3);

    const theta = (index - ring.current.pos) * step;
    // closeness to the front: 1 at the front, 0 at the back
    const front = Math.max(0, Math.cos(theta));
    const isFront = Math.abs(Math.atan2(Math.sin(theta), Math.cos(theta))) < step / 2;
    easing.damp(a, "lift", hovered ? 1 : isFront ? 0.55 : 0, 0.25, d);
    easing.damp(a, "open", hovered && isFront ? 1 : 0, 0.35, d);

    g.position.set(RADIUS * Math.sin(theta), -1 + (1 - appear) * -0.8 + a.lift * 0.12 + Math.sin(t * 0.9 + index) * 0.025, RADIUS * Math.cos(theta) - RADIUS);
    g.rotation.set(0, theta - Math.PI / 2 + front * 0.18 + a.open * -0.25, (1 - appear) * 0.4);
    g.scale.setScalar((0.82 + front * 0.18) * (0.6 + appear * 0.4));
    if (hinge.current) hinge.current.rotation.y = -a.open * 0.55;
    if (shadow.current) {
      shadow.current.position.set(g.position.x, -1.003, g.position.z);
      const m = shadow.current.material as THREE.MeshBasicMaterial;
      m.opacity = appear * (0.55 - a.lift * 0.2);
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
          if (input.moved > 6) return;
          const st = useCarousel.getState();
          if (wrapIndex(st.target, st.count) === index) router.push(`/library/${book.slug}`);
          else st.go(index);
        }}
      >
        {/* lift the book so it stands on y = 0 of the ring */}
        <group position={[0, dims.H / 2, 0]}>
          <BookMeshes ref={hinge} dims={dims} geo={geo} mats={mats} shadows={false} />
        </group>
      </group>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} scale={[1.9, 1.2, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={blob} transparent depthWrite={false} opacity={0} />
      </mesh>
    </>
  );
}

function Ring({ books, reducedMotion, onReady }: { books: Book[]; reducedMotion: boolean; onReady: () => void }) {
  const theme = useTheme();
  const covers = useCoverSet(books);
  const blob = useBlobTexture();
  const floor = useFloorTexture(theme);
  const clock = useThree((s) => s.clock);
  useFitCamera(9.2, 0.8, -0.05, -1.2);
  const ring = useRef({ pos: 0, born: Infinity });
  const root = useRef<THREE.Group>(null);
  const lastAuto = useRef(0);

  useEffect(() => {
    useCarousel.getState().setCount(books.length);
  }, [books.length]);


  useEffect(() => {
    if (!covers) return;
    ring.current.born = clock.elapsedTime;
    onReady();
  }, [covers, clock, onReady]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20);
    const st = useCarousel.getState();
    const now = performance.now();
    // gentle showcase: step to the next book while the visitor is idle
    if (!reducedMotion && !input.dragging && now - st.lastInteraction > AUTOPLAY_IDLE_MS && state.clock.elapsedTime - lastAuto.current > AUTOPLAY_EVERY_S) {
      lastAuto.current = state.clock.elapsedTime;
      useCarousel.setState({ target: Math.round(st.target) + 1 });
    }
    easing.damp(ring.current, "pos", useCarousel.getState().target, input.dragging ? 0.08 : 0.45, d);
    st.setIndex(wrapIndex(ring.current.pos, books.length));
    // depth haze follows the camera distance (it backs off on portrait screens)
    const fog = state.scene.fog as THREE.Fog | null;
    if (fog) {
      fog.near = state.camera.position.z - 0.7;
      fog.far = state.camera.position.z + 7;
    }
    // scrolling the hero away tips the ring back a little
    const scroll = firstScreenScroll();
    if (root.current) {
      // wide screens: the ring sits right of the headline
      const aspect = state.size.width / Math.max(1, state.size.height);
      const shift = aspect > 1.25 ? Math.min(2.6, (aspect - 1) * 3) : 0;
      easing.damp(root.current.rotation, "x", scroll * 0.22 + state.pointer.y * -0.04, 0.3, d);
      easing.damp(root.current.position, "x", shift + state.pointer.x * 0.15, 0.4, d);
      // phones: the copy sits at the bottom, so lift the ring into the top half
      root.current.position.y = aspect < 0.9 ? 2.5 : 0.3;
    }
  });

  const L = theme.scene.lights;
  return (
    <>
      <fog attach="fog" args={[theme.scene.fog.color, 8.5, 16]} />
      <ambientLight intensity={L.ambient.intensity * 2.4} color={L.ambient.color} />
      <spotLight position={[0.5, 5.5, 3.5]} angle={0.55} penumbra={1} decay={2} intensity={L.key.intensity * 0.32} color={L.key.color} />
      <directionalLight position={[-4, 3, -6]} intensity={L.rim.intensity * 1.2} color={L.rim.color} />
      <pointLight position={[0, 0.4, 2.2]} intensity={L.fill.intensity * 6} color={L.fill.color} distance={6} />
      <Environment resolution={128} frames={1} environmentIntensity={L.environment}>
        <Lightformer form="rect" intensity={2.2} color={theme.scene.env.top} scale={[10, 3, 1]} position={[0, 5, 4]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.6} color={theme.scene.env.warm} scale={[0.8, 8, 1]} position={[-5, 2, 2]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.3} color={theme.scene.env.cool} scale={[0.8, 8, 1]} position={[5, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      <group ref={root} position={[0, 0, 0]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, -1.01, -RADIUS]}>
          <circleGeometry args={[RADIUS + 3, 64]} />
          <meshBasicMaterial map={floor} transparent depthWrite={false} />
        </mesh>
        {covers &&
          books.map((b, i) => <RingBook key={b.id} book={b} index={i} count={books.length} textures={covers.textures[i]} ring={ring} blob={blob} />)}
      </group>
    </>
  );
}

interface Props {
  books: Book[];
  active: boolean;
  reducedMotion: boolean;
  onReady: () => void;
  onFatal: () => void;
}

/** The library hero: the catalogue as a turning ring of real books. */
export default function BookCarousel({ books, active, reducedMotion, onReady, onFatal }: Props) {
  const theme = useTheme();
  // Drag to turn. Moves/ups are tracked on window rather than with pointer
  // capture: capture would retarget the pointerup away from the canvas and
  // swallow the 3D click on a book.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    input.dragging = true;
    input.moved = 0;
    input.lastX = e.clientX;
    input.velocity = 0;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - input.lastX;
      input.lastX = ev.clientX;
      input.moved += Math.abs(dx);
      if (input.moved < 4) return;
      const books = -dx / 170;
      input.velocity = books;
      useCarousel.getState().nudge(books);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      input.dragging = false;
      // a drag flings, then settles on a whole book; a tap changes nothing here
      if (input.moved >= 4) {
        const st = useCarousel.getState();
        useCarousel.setState({ target: Math.round(st.target + input.velocity * 6) });
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <div className="absolute inset-0" style={{ touchAction: "pan-y" }} onPointerDown={onPointerDown}>
      <SceneCanvas
        active={active}
        onFatal={onFatal}
        label="A turning carousel of books from the StoryShelf Library"
        camera={{ fov: 32, position: [0, 0.7, 9.2], near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance", stencil: false }}
      >
        <color attach="background" args={[theme.scene.background]} />
        <Ring books={books} reducedMotion={reducedMotion} onReady={onReady} />
      </SceneCanvas>
    </div>
  );
}
