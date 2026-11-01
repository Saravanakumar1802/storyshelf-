"use client";

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PresentationControls } from "@react-three/drei";
import { easing } from "maath";
import type { Book } from "@/types";
import { useTheme } from "@/theme";
import { bookDims } from "@/lib/three/bookGeometry";
import { coverTextures, firstPageTexture, loadCanvasFonts, textureQuality, type CanvasFonts, type CoverTextures } from "@/lib/three/textures";
import { BookMeshes, useBookGeometry, useBookMaterials } from "./BookModel";

function Model({ book, textures, fonts, open }: { book: Book; textures: CoverTextures; fonts: CanvasFonts; open: boolean }) {
  const theme = useTheme();
  const dims = useMemo(() => bookDims(book), [book]);
  const geo = useBookGeometry(dims);
  const mats = useBookMaterials(book, textures);
  const hinge = useRef<THREE.Group>(null);
  const group = useRef<THREE.Group>(null);
  const amt = useRef({ v: 0, turn: 0 });

  useEffect(() => {
    mats.firstPage.map = firstPageTexture(book, theme, fonts, (dims.D - dims.oh) / dims.Hp);
    mats.firstPage.color.set("#ffffff");
    mats.firstPage.needsUpdate = true;
  }, [book, dims, fonts, mats, theme]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20);
    easing.damp(amt.current, "v", open ? 1.9 : 0, 0.5, d);
    easing.damp(amt.current, "turn", open ? -0.5 : 0, 0.5, d);
    if (hinge.current) hinge.current.rotation.y = -amt.current.v;
    if (group.current) {
      group.current.rotation.y = -Math.PI / 2 + 0.5 + amt.current.turn;
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
    }
  });

  return (
    <group ref={group} scale={2.3 / dims.H}>
      <BookMeshes ref={hinge} dims={dims} geo={geo} mats={mats} />
    </group>
  );
}

function Scene({ book, open, onReady }: { book: Book; open: boolean; onReady: () => void }) {
  const theme = useTheme();
  const gl = useThree((s) => s.gl);
  const [assets, setAssets] = useState<{ fonts: CanvasFonts; textures: CoverTextures } | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const fonts = await loadCanvasFonts();
      if (!alive) return;
      const q = textureQuality();
      const textures = coverTextures(book, bookDims(book), theme, fonts, q.hi, Math.min(8, gl.capabilities.getMaxAnisotropy()));
      if (alive) {
        setAssets({ fonts, textures });
        onReady();
      }
    })().catch((e) => console.error("[viewer]", e));
    return () => {
      alive = false;
    };
  }, [book, gl, onReady, theme]);

  const L = theme.scene.lights;
  return (
    <>
      <ambientLight intensity={L.ambient.intensity * 2} color={L.ambient.color} />
      <spotLight position={[-3, 5, 5]} angle={0.5} penumbra={1} decay={2} intensity={L.key.intensity * 0.45} color={L.key.color} />
      <directionalLight position={[4, 2, -3]} intensity={L.rim.intensity} color={L.rim.color} />
      <Environment resolution={256} frames={1} environmentIntensity={L.environment}>
        <Lightformer form="rect" intensity={2.4} color={theme.scene.env.top} scale={[10, 3, 1]} position={[0, 5, 4]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color={theme.scene.env.warm} scale={[0.8, 8, 1]} position={[-5, 2, 2]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} color={theme.scene.env.cool} scale={[0.8, 8, 1]} position={[5, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      {assets && (
        <PresentationControls global snap speed={1.4} polar={[-0.25, 0.25]} azimuth={[-1.2, 1.2]} cursor>
          <Model book={book} textures={assets.textures} fonts={assets.fonts} open={open} />
        </PresentationControls>
      )}
      <ContactShadows position={[0, -1.25, 0]} opacity={0.55} scale={6} blur={2.4} far={2} />
    </>
  );
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Interactive single-book viewer (drag to turn, open the cover). */
export default function BookViewer({ book, open, fallback }: { book: Book; open: boolean; fallback: ReactNode }) {
  const [ready, setReady] = useState(false);
  const onReady = useMemo(() => () => setReady(true), []);
  return (
    <Boundary fallback={fallback}>
      <div className="relative size-full">
        {!ready && <div className="absolute inset-0 grid place-items-center">{fallback}</div>}
        <Canvas
          className="!absolute inset-0"
          style={{ touchAction: "pan-y" }}
          dpr={[1, 2]}
          camera={{ fov: 30, position: [0, 0.15, 6.2] }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          aria-label={`3D model of ${book.title}`}
        >
          <Scene book={book} open={open} onReady={onReady} />
        </Canvas>
      </div>
    </Boundary>
  );
}
