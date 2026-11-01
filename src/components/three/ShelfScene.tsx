"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial, PerformanceMonitor, Sparkles } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect } from "postprocessing";
import { easing } from "maath";
import type { Book } from "@/types";
import { useTheme } from "@/theme";
import { useShelf } from "@/lib/store/shelf";
import { afterIntro, whenIntroIdle } from "@/lib/intro";
import { bookDims } from "@/lib/three/bookGeometry";
import {
  coverTextures,
  glowTexture,
  hashString,
  loadCanvasFonts,
  mulberry32,
  textureQuality,
  woodTextures,
  wordmarkTexture,
  type CanvasFonts,
  type CoverTextures,
} from "@/lib/three/textures";
import { Book3D } from "./Book3D";
import { computeLayout, createRig, shelfPointer, type ShelfRig } from "./rig";

export type Tier = "high" | "medium" | "low";
const FOV = 30;

interface Prepared {
  fonts: CanvasFonts;
  textures: CoverTextures[];
}

/** Generates cover textures one book per frame (keeps the main thread responsive). */
function usePreparedBooks(books: Book[], dims: ReturnType<typeof bookDims>[], rig: React.RefObject<ShelfRig>) {
  const theme = useTheme();
  const gl = useThree((s) => s.gl);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const setProgress = useShelf((s) => s.setProgress);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fonts = await loadCanvasFonts();
      const q = textureQuality();
      const r = rig.current;
      r.baseSize = q.base;
      r.hiResSize = q.hi;
      r.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      const list: CoverTextures[] = [];
      for (let i = 0; i < books.length; i++) {
        // painting covers is main-thread work: keep it out of the intro's motion
        await whenIntroIdle();
        if (cancelled) return;
        list.push(coverTextures(books[i], dims[i], theme, fonts, q.base, r.anisotropy));
        setProgress((i + 1) / books.length);
        await new Promise((res) => setTimeout(res, 0));
      }
      if (!cancelled) setPrepared({ fonts, textures: list });
    })().catch((err) => {
      console.error("[shelf] texture generation failed", err);
    });
    return () => {
      cancelled = true;
    };
  }, [books, dims, gl, rig, setProgress, theme]);

  return prepared;
}

/** Frames the shelf for any aspect ratio, adds pointer parallax, pans on
 *  narrow screens, and computes where a featured book is held. */
function CameraRig({ rig }: { rig: React.RefObject<ShelfRig> }) {
  const { camera, gl } = useThree();
  const look = useRef(new THREE.Vector3(0, 1, 0));
  const lookTarget = useRef(new THREE.Vector3());
  const camTarget = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());
  const fwd = useRef(new THREE.Vector3());
  const openShift = useRef({ v: 0 });
  const featured = useShelf((s) => s.featured);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = FOV;
    cam.near = 0.1;
    cam.far = 60;
    cam.updateProjectionMatrix();
  }, [camera]);

  // reset spin when the featured book changes
  useEffect(() => {
    const s = rig.current.spin;
    s.x = s.y = s.vx = s.vy = 0;
    s.active = false;
  }, [featured, rig]);

  // pointer drag: spin the featured book, or pan the shelf on narrow screens
  useEffect(() => {
    const el = gl.domElement;
    let startX = 0;
    let lastX = 0;
    let lastY = 0;
    let down = false;
    const onDown = (e: PointerEvent) => {
      down = true;
      startX = lastX = e.clientX;
      lastY = e.clientY;
      shelfPointer.dragMoved = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const r = rig.current;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (Math.abs(e.clientX - startX) > 6) shelfPointer.dragMoved = true;
      if (r.spin.active) {
        r.spin.y += dx * 0.009;
        r.spin.vy = dx * 0.009;
        if (e.pointerType !== "touch") r.spin.x = THREE.MathUtils.clamp(r.spin.x + dy * 0.005, -0.45, 0.45);
        r.spin.idle = 0;
      } else if (r.panLimit > 0 && useShelf.getState().featured === null) {
        const worldPerPx = (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * camera.position.z) / el.clientHeight;
        r.pan = THREE.MathUtils.clamp(r.pan - dx * worldPerPx, -r.panLimit, r.panLimit);
      }
    };
    const onUp = () => {
      down = false;
      rig.current.spin.active = false;
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [camera, gl, rig]);

  useFrame((state, dt) => {
    const r = rig.current;
    const cam = state.camera as THREE.PerspectiveCamera;
    const delta = Math.min(dt, 1 / 20);
    const aspect = state.size.width / Math.max(1, state.size.height);
    const tanH = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const portrait = aspect < 0.95;
    const W = r.rowWidth + 0.7;
    const Hm = r.maxHeight;
    const dH = (Hm * 1.32) / ((portrait ? 0.52 : 0.66) * 2 * tanH);
    const dW = W / ((portrait ? 0.96 : 0.62) * 2 * tanH * aspect);
    const dist = THREE.MathUtils.clamp(portrait ? dH : Math.max(dH, dW), 4.5, 18);
    const visW = 2 * tanH * dist * aspect;
    r.panLimit = Math.max(0, (W - visW) / 2 + 0.15);
    if (r.panLimit === 0) r.pan = 0;
    else r.pan = THREE.MathUtils.clamp(r.pan, -r.panLimit, r.panLimit);

    // keep the shelf a little above centre (headline sits below it)
    const k = portrait ? 0.24 : 0.2;
    const lookY = Hm / 2 - k * dist * tanH;
    const par = r.reduced || portrait ? 0 : 1;
    lookTarget.current.set(r.pan, lookY, 0);
    camTarget.current.set(r.pan + state.pointer.x * 0.22 * par, lookY + dist * 0.055 + state.pointer.y * 0.12 * par, dist);
    easing.damp3(cam.position, camTarget.current, 0.45, delta);
    easing.damp3(look.current, lookTarget.current, 0.45, delta);
    cam.lookAt(look.current);

    // where a featured book is held: in front of the row, left of centre on
    // wide screens, upper-centre on narrow ones
    // an open cover needs more room on the left
    easing.damp(openShift.current, "v", useShelf.getState().coverOpen ? 1 : 0, 0.5, delta);
    const ndcX = portrait ? 0.12 * openShift.current.v : -0.4 + 0.2 * openShift.current.v;
    const ndcY = portrait ? 0.3 : 0.06;
    const frac = portrait ? 0.4 : 0.64;
    const dF = Math.max(2.2, dist - 2.4);
    r.featureHeight = frac * dF * 2 * tanH;
    cam.updateMatrixWorld();
    dir.current.set(ndcX, ndcY, 0.5).unproject(cam).sub(cam.position).normalize();
    cam.getWorldDirection(fwd.current);
    r.anchor.copy(cam.position).addScaledVector(dir.current, dF / Math.max(0.2, dir.current.dot(fwd.current)));

    // featured spin inertia & gentle return to the hero angle
    const s = r.spin;
    if (!s.active) {
      s.y += s.vy;
      s.vy *= Math.pow(0.04, delta);
      s.idle += delta;
      if (s.idle > 1.8) {
        easing.damp(s, "y", Math.round(s.y / (Math.PI * 2)) * Math.PI * 2, 0.6, delta);
        easing.damp(s, "x", 0, 0.6, delta);
      }
    }
  });

  return null;
}

function Lights({ tier, rig }: { tier: Tier; rig: React.RefObject<ShelfRig> }) {
  const theme = useTheme();
  const L = theme.scene.lights;
  const key = useRef<THREE.SpotLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0.2, 0.9, 0);
    return o;
  }, []);
  useFrame((state) => {
    const r = rig.current;
    if (r.startPending || (r.start !== null && state.clock.elapsedTime < r.start)) {
      r.start = state.clock.elapsedTime;
      r.startPending = false;
    }
    const start = r.start;
    const t = start === null ? 0 : THREE.MathUtils.clamp((state.clock.elapsedTime - start) / 1.8, 0, 1);
    const e = 1 - Math.pow(1 - t, 3);
    if (key.current) key.current.intensity = L.key.intensity * (0.08 + 0.92 * e);
    if (rim.current) rim.current.intensity = L.rim.intensity * e;
  });
  const mapSize = tier === "high" ? 2048 : 1024;
  const feat = useRef<THREE.SpotLight>(null);
  const featTarget = useMemo(() => new THREE.Object3D(), []);
  const featAmt = useRef({ v: 0 });
  useFrame((_, dt) => {
    const f = feat.current;
    if (!f) return;
    const isF = useShelf.getState().featured !== null;
    easing.damp(featAmt.current, "v", isF ? 1 : 0, 0.5, Math.min(dt, 1 / 20));
    const a = rig.current.anchor;
    featTarget.position.copy(a);
    f.position.set(a.x - 1.6, a.y + 2.4, a.z + 2.6);
    f.intensity = L.key.intensity * 0.16 * featAmt.current.v;
  });
  return (
    <>
      <primitive object={target} />
      <ambientLight color={L.ambient.color} intensity={L.ambient.intensity} />
      <hemisphereLight color={L.fill.color} groundColor="#000000" intensity={L.fill.intensity} />
      <spotLight
        ref={key}
        color={L.key.color}
        position={[-2.4, 5.6, 4.8]}
        angle={0.62}
        penumbra={0.85}
        decay={2}
        distance={0}
        target={target}
        castShadow={tier !== "low"}
        shadow-mapSize-width={mapSize}
        shadow-mapSize-height={mapSize}
        shadow-bias={-0.0002}
        shadow-normalBias={0.015}
        shadow-radius={5}
        shadow-camera-near={2}
        shadow-camera-far={16}
      />
      <primitive object={featTarget} />
      <spotLight ref={feat} color={L.key.color} angle={0.5} penumbra={1} decay={2} distance={0} intensity={0} target={featTarget} />
      <directionalLight ref={rim} color={L.rim.color} position={[4.5, 3.2, -3.5]} intensity={L.rim.intensity} />
    </>
  );
}

const WORD_Z = -2.9;

/** Glow backdrop + the giant brand wordmark rising behind the books. The
 *  wordmark is sized from the camera so it always spans the view. */
function Backdrop({ fonts, rowWidth, rig }: { fonts: CanvasFonts; rowWidth: number; rig: React.RefObject<ShelfRig> }) {
  const theme = useTheme();
  const wordMesh = useRef<THREE.Mesh>(null);
  const wordRef = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useMemo(() => glowTexture(theme), [theme]);
  const word = useMemo(() => wordmarkTexture("StoryShelf", fonts), [fonts]);
  const dim = useRef({ v: 1 });
  useFrame((state, dt) => {
    const r = rig.current;
    const start = r.start;
    const t = start === null ? 0 : THREE.MathUtils.clamp((state.clock.elapsedTime - start - 0.3) / 2.2, 0, 1);
    const e = 1 - Math.pow(1 - t, 3);
    easing.damp(dim.current, "v", useShelf.getState().featured !== null ? 0.22 : 1, 0.45, Math.min(dt, 1 / 20));
    if (wordRef.current) wordRef.current.opacity = theme.scene.wordmark.opacity * e * dim.current.v;
    const m = wordMesh.current;
    if (!m) return;
    const cam = state.camera as THREE.PerspectiveCamera;
    const depth = cam.position.z - WORD_Z;
    const visW = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * depth * cam.aspect;
    const ww = Math.max(visW * 0.98, rowWidth * 1.6);
    const wh = ww / 4;
    // baseline sits high on the books so the letters rise above the row
    const baseline = r.maxHeight * (cam.aspect < 0.95 ? 1.04 : 0.78);
    m.scale.set(ww, wh, 1);
    m.position.set(r.pan * 0.35, baseline + 0.28 * wh - (1 - e) * 0.25, WORD_Z);
  });
  return (
    <>
      <mesh position={[0, 2, -7]}>
        <planeGeometry args={[46, 26]} />
        <meshBasicMaterial map={glow} fog={false} />
      </mesh>
      <mesh ref={wordMesh} position={[0, 2.4, WORD_Z]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial ref={wordRef} map={word} color={theme.scene.wordmark.color} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

function Ledge({ tier }: { tier: Tier }) {
  const theme = useTheme();
  const wood = useMemo(() => woodTextures(theme), [theme]);
  const S = theme.scene.shelf;
  const width = 30;
  const depth = 2.5;
  const thick = 0.16;
  const zc = -0.15;
  useEffect(() => {
    for (const t of [wood.map, wood.rough]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(6, 1);
      t.needsUpdate = true;
    }
  }, [wood]);
  return (
    <group>
      <mesh position={[0, -thick / 2, zc]} receiveShadow>
        <boxGeometry args={[width, thick, depth]} />
        <meshStandardMaterial map={wood.map} roughnessMap={wood.rough} roughness={1} color="#ffffff" />
      </mesh>
      {/* brass inlay along the front edge */}
      <mesh position={[0, -0.022, zc + depth / 2 + 0.002]}>
        <boxGeometry args={[width, 0.012, 0.006]} />
        <meshStandardMaterial color={theme.colors.accent} metalness={1} roughness={0.32} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.0006, zc]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        {tier === "low" ? (
          <meshStandardMaterial map={wood.map} roughnessMap={wood.rough} roughness={1} />
        ) : (
          <MeshReflectorMaterial
            map={wood.map}
            roughnessMap={wood.rough}
            roughness={1}
            blur={[420, 140]}
            resolution={tier === "high" ? 1024 : 512}
            mixBlur={1}
            mixStrength={S.mirror * 3}
            mixContrast={1}
            depthScale={0.6}
            minDepthThreshold={0.2}
            maxDepthThreshold={1.4}
            metalness={0.15}
            mirror={S.reflectivity}
            color="#ffffff"
          />
        )}
      </mesh>
    </group>
  );
}

function Effects({ tier, rig }: { tier: Tier; rig: React.RefObject<ShelfRig> }) {
  const theme = useTheme();
  const dof = useRef<DepthOfFieldEffect>(null);
  const focus = useRef(new THREE.Vector3());
  const bokeh = useRef({ v: 0 });
  useFrame((_, dt) => {
    const featured = useShelf.getState().featured !== null;
    easing.damp(bokeh.current, "v", featured ? 2.6 : 0, 0.5, Math.min(dt, 1 / 20));
    if (dof.current) {
      focus.current.copy(rig.current.anchor);
      if (!dof.current.target) dof.current.target = focus.current;
      dof.current.bokehScale = bokeh.current.v;
    }
  });
  if (tier === "low") return null;
  if (tier === "medium")
    return (
      <EffectComposer multisampling={0}>
        <N8AO halfRes aoRadius={0.4} intensity={2.2} distanceFalloff={0.6} quality="medium" />
        <Bloom mipmapBlur intensity={theme.scene.bloom.intensity} luminanceThreshold={theme.scene.bloom.threshold} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.25} darkness={theme.scene.vignette} />
        <SMAA />
      </EffectComposer>
    );
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.4} intensity={2.4} distanceFalloff={0.6} quality="high" />
      <DepthOfField ref={dof} focusRange={1.6} bokehScale={0} />
      <Bloom mipmapBlur intensity={theme.scene.bloom.intensity} luminanceThreshold={theme.scene.bloom.threshold} luminanceSmoothing={0.2} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.25} darkness={theme.scene.vignette} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={theme.scene.grain} />
      <SMAA />
    </EffectComposer>
  );
}

export interface ShelfSceneProps {
  books: Book[];
  initialTier: Tier;
  reducedMotion: boolean;
  onTierChange?: (t: Tier) => void;
}

export default function ShelfScene({ books, initialTier, reducedMotion, onTierChange }: ShelfSceneProps) {
  const theme = useTheme();
  const [tier, setTier] = useState<Tier>(initialTier);
  const setReady = useShelf((s) => s.setReady);
  const ready = useShelf((s) => s.ready);
  const setCount = useShelf((s) => s.setCount);

  const dims = useMemo(() => books.map((b) => bookDims(b)), [books]);
  const seeds = useMemo(() => {
    const rnd = mulberry32(hashString(books.map((b) => b.id).join()));
    return {
      gaps: books.map(() => 0.003 + rnd() * 0.008),
      depth: books.map(() => (rnd() - 0.5) * 0.06),
    };
  }, [books]);

  // layout → rig (created with the layout, so books mount in the right slots)
  const initial = useMemo(() => computeLayout(dims, null, seeds.gaps), [dims, seeds]);
  const rig = useMemo<React.RefObject<ShelfRig>>(
    () => ({
      current: createRig({
        layoutX: initial.x,
        restRz: initial.rz,
        depthJitter: seeds.depth,
        rowWidth: initial.width,
        maxHeight: Math.max(...dims.map((d) => d.H)),
        reduced: reducedMotion,
      }),
    }),
    [initial, seeds, dims, reducedMotion],
  );

  useEffect(() => {
    setCount(books.length);
    rig.current.layoutX = computeLayout(dims, useShelf.getState().featured, seeds.gaps).x;
    return useShelf.subscribe((s, prev) => {
      if (s.featured !== prev.featured) rig.current.layoutX = computeLayout(dims, s.featured, seeds.gaps).x;
    });
  }, [books.length, dims, seeds, setCount, rig]);

  useEffect(() => {
    onTierChange?.(tier);
  }, [tier, onTierChange]);

  const prepared = usePreparedBooks(books, dims, rig);

  useEffect(() => {
    if (!prepared) return;
    // lights and wordmark come up as the page is revealed (after any opening intro)
    // (stamped on the next rendered frame: R3F resets its clock when the
    // frameloop changes, which happens as the intro hands over)
    const cancelIntro = afterIntro(() => {
      rig.current.startPending = true;
    });
    // allow interaction once the books have been set down
    const id = window.setTimeout(() => setReady(true), reducedMotion ? 50 : 1200 + books.length * 70);
    return () => {
      cancelIntro();
      window.clearTimeout(id);
      setReady(false);
    };
  }, [prepared, reducedMotion, books.length, setReady, rig]);

  const step = (dir: -1 | 1) => setTier((t) => (dir < 0 ? (t === "high" ? "medium" : "low") : t === "low" ? "medium" : "high"));

  return (
    <>
      <color attach="background" args={[theme.scene.background]} />
      <fog attach="fog" args={[theme.scene.fog.color, theme.scene.fog.near, theme.scene.fog.far]} />
      {/* only judge performance once loading/shader compilation is over */}
      {ready && (
        <PerformanceMonitor onDecline={() => step(-1)} onIncline={() => (initialTier === "high" ? step(1) : undefined)} flipflops={3} onFallback={() => setTier("low")} />
      )}
      <CameraRig rig={rig} />
      <Lights tier={tier} rig={rig} />
      <Environment resolution={256} frames={1} environmentIntensity={theme.scene.lights.environment}>
        <Lightformer form="rect" intensity={2.4} color={theme.scene.env.top} scale={[12, 3, 1]} position={[0, 6, 4]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3.2} color={theme.scene.env.warm} scale={[0.8, 8, 1]} position={[-6, 2.5, 2]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={1.6} color={theme.scene.env.cool} scale={[0.8, 8, 1]} position={[6, 2.5, 1]} target={[0, 1, 0]} />
        <Lightformer form="ring" intensity={1.2} color={theme.scene.env.ring} scale={3} position={[2, 4, 6]} target={[0, 1, 0]} />
      </Environment>
      <Ledge tier={tier} />
      {prepared && (
        <>
          <Backdrop fonts={prepared.fonts} rowWidth={initial.width} rig={rig} />
          {books.map((b, i) => (
            <Book3D key={b.id} book={b} dims={dims[i]} index={i} restRz={initial.rz[i]} fonts={prepared.fonts} textures={prepared.textures[i]} rig={rig} />
          ))}
        </>
      )}
      {!reducedMotion && (
        <Sparkles count={tier === "high" ? 70 : 35} scale={[9, 3.6, 3.2]} position={[0, 1.8, 0.6]} size={1.8} speed={0.18} opacity={theme.scene.dust.opacity} color={theme.scene.dust.color} noise={0.6} />
      )}
      <Effects tier={tier} rig={rig} />
    </>
  );
}
