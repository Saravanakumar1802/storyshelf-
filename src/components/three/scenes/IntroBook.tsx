"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import gsap from "gsap";
import { useTheme } from "@/theme";
import { brandBook } from "@/data/showcase";
import { bookDims } from "@/lib/three/bookGeometry";
import { coverTextures, firstPageTexture, glowTexture, loadCanvasFonts, textureQuality, type CanvasFonts, type CoverTextures } from "@/lib/three/textures";
import { BookMeshes, useBookGeometry, useBookMaterials } from "../BookModel";
import { useBlobTexture, useFloorTexture } from "../sceneTextures";
import { useLeaves } from "../useLeaves";
import { hexToRgb } from "@/lib/cover/paint";

const LEAVES = 16;
/** Final opening of the front board (rad). ~150° keeps a deep, readable spread. */
const COVER_OPEN = 2.62;
const FOV = 30;
const HALF_TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

/** When each leaf starts turning (s): two deliberate turns, then a riffle. */
const LEAF_START = Array.from({ length: LEAVES }, (_, i) => 2.05 + (i < 2 ? i * 0.26 : 0.52 + (i - 2) * 0.062));
const LEAF_DUR = 0.95;
/** Length of the choreography before the hold (s). */
export const INTRO_SEQUENCE_S = LEAF_START[LEAVES - 1] + LEAF_DUR + 0.1;

const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const lerp = THREE.MathUtils.lerp;

export interface IntroControls {
  /** start the dive into the title page; `onDived` fires when the page fills the screen */
  reveal: () => void;
}

interface Timeline {
  lift: number;
  pitch: number;
  light: number;
  cover: number;
  frame: number;
  yaw: number;
  camYaw: number;
  camPitch: number;
  dive: number;
  leaves: number[];
}

interface SceneProps {
  onReady: () => void;
  onSequenceDone: () => void;
  onDived: () => void;
  controls: React.RefObject<IntroControls | null>;
  reducedQuality: boolean;
}

/** Vertical falloff with soft sides: a shaft of light (used additively). */
function useShaftTexture() {
  const theme = useTheme();
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const [r, g, b] = hexToRgb(theme.scene.env.warm);
    const v = ctx.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
    v.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 64, 256);
    // soften the sides
    ctx.globalCompositeOperation = "destination-in";
    const h = ctx.createLinearGradient(0, 0, 64, 0);
    h.addColorStop(0, "rgba(0,0,0,0)");
    h.addColorStop(0.5, "rgba(0,0,0,1)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, 64, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [theme]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function Book({
  textures,
  fonts,
  onSequenceDone,
  onDived,
  controls,
  onFirstFrame,
  shadowSize,
}: { textures: CoverTextures; fonts: CanvasFonts; onFirstFrame: () => void; shadowSize: number } & Pick<SceneProps, "onSequenceDone" | "onDived" | "controls">) {
  const theme = useTheme();
  const { camera, size, gl, scene } = useThree();
  const dims = useMemo(() => bookDims(brandBook), []);
  const geo = useBookGeometry(dims);
  const mats = useBookMaterials(brandBook, textures);
  const blob = useBlobTexture();

  // ── page block faces: the right-hand title page under the leaves
  useEffect(() => {
    mats.firstPage.map = firstPageTexture(brandBook, theme, fonts, (dims.D - dims.oh) / dims.Hp);
    mats.firstPage.color.set("#ffffff");
    mats.firstPage.needsUpdate = true;
  }, [dims, fonts, mats, theme]);

  // ── leaves: hinge at the spine edge of the block's front face
  const leaf = useLeaves(dims, theme, fonts, LEAVES);

  // per-leaf character: slightly different landing angles and curl strength
  const leafSeeds = useMemo(() => Array.from({ length: LEAVES }, (_, i) => ({ curl: 0.62 + ((i * 37) % 11) / 40, land: ((i * 53) % 7) / 1000 })), []);
  // each leaf comes to rest on top of the open board (and of the leaves turned before it)
  const landed = useMemo(
    () =>
      leafSeeds.map((seed, i) => {
        const landing = COVER_OPEN - 0.03 - i * 0.0045 - seed.land;
        return { landing, offset: leaf.landedOffset(COVER_OPEN, landing, i + 1) };
      }),
    [leaf, leafSeeds],
  );

  const root = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const tl = useRef<Timeline>({ lift: -0.34, pitch: -0.16, light: 0, cover: 0, frame: 0, yaw: -Math.PI / 2 + 0.1, camYaw: -0.66, camPitch: 0.12, dive: 0, leaves: new Array(LEAVES).fill(0) });
  /** the timelines are advanced from the render loop (one clock, no second rAF) */
  const seq = useRef<{ main: gsap.core.Timeline | null; dive: gsap.core.Tween | null; t0: number | null; d0: number | null; frames: number }>({ main: null, dive: null, t0: null, d0: null, frames: 0 });
  const shaft = useRef<THREE.Mesh>(null);
  const shaftTex = useShaftTexture();
  const tmp = useMemo(
    () => ({ target: new THREE.Vector3(), page: new THREE.Vector3(), normal: new THREE.Vector3(), pos: new THREE.Vector3(), hinge: new THREE.Vector3(), eye: new THREE.Vector3() }),
    [],
  );

  // ── the deterministic choreography
  useEffect(() => {
    const s = tl.current;
    const yawOpen = -Math.PI / 2 - (Math.PI - COVER_OPEN) / 2; // spread faces the camera
    const t = gsap.timeline({ paused: true, onComplete: onSequenceDone });
    t.to(s, { lift: 0, duration: 1.45, ease: "power3.out" }, 0)
      .to(s, { pitch: 0, duration: 1.6, ease: "power2.out" }, 0)
      .to(s, { light: 1, duration: 1.3, ease: "power2.out" }, 0)
      .to(s, { camYaw: -0.38, camPitch: 0.2, duration: 1.6, ease: "sine.inOut" }, 0)
      // the board lifts against its hinge, swings, overshoots a touch and settles
      .to(s, { cover: COVER_OPEN + 0.07, duration: 1.4, ease: "power3.inOut" }, 1.15)
      .to(s, { cover: COVER_OPEN, duration: 0.45, ease: "sine.inOut" }, 2.55)
      .to(s, { yaw: yawOpen, duration: 1.9, ease: "power2.inOut" }, 1.05)
      .to(s, { frame: 1, duration: 2.0, ease: "power2.inOut" }, 1.2)
      .to(s, { camYaw: 0, camPitch: 0.3, duration: 2.1, ease: "power2.inOut" }, 1.6);
    LEAF_START.forEach((start, i) => {
      t.to(s.leaves, { [i]: 1, duration: LEAF_DUR, ease: "none" }, start);
    });
    t.to({}, { duration: 0.1 }, INTRO_SEQUENCE_S - 0.1);
    const q = seq.current;
    q.main = t;
    controls.current = {
      reveal: () => {
        if (q.dive) return;
        // hand over to the paper leaves just before the page fills the screen,
        // so the two cross-fade instead of cutting
        let handed = false;
        q.dive = gsap.to(s, {
          dive: 1,
          duration: 1.05,
          ease: "power2.inOut",
          paused: true,
          onUpdate: () => {
            if (!handed && s.dive > 0.85) {
              handed = true;
              onDived();
            }
          },
        });
      },
    };
    return () => {
      t.kill();
      q.dive?.kill();
      q.main = null;
      q.dive = null;
      controls.current = null;
    };
  }, [controls, onDived, onSequenceDone]);

  // upload every texture and compile every shader before the first visible
  // frame, so the opening never hitches
  useEffect(() => {
    [textures.map, textures.orm, leaf.atlas, mats.firstPage.map, mats.wrap.normalMap, mats.pageEdges.map, mats.headband.map, blob, shaftTex].forEach((tex) => tex && gl.initTexture(tex));
    gl.compile(scene, camera);
  }, [gl, scene, camera, textures, leaf, mats, blob, shaftTex]);

  useFrame((state) => {
    const s = tl.current;
    const g = root.current;
    if (!g) return;
    const time = state.clock.elapsedTime;
    const q = seq.current;
    // frame 1 uploads; from frame 2 the scene is shown and the timeline runs
    q.frames += 1;
    if (q.frames === 2) {
      q.t0 = time + 0.1;
      onFirstFrame();
    }
    if (q.main && q.t0 !== null) q.main.time(Math.max(0, time - q.t0));
    if (q.dive) {
      if (q.d0 === null) q.d0 = time;
      q.dive.time(time - q.d0);
    }

    // book pose: stands on the floor (y = 0), rises into place, turns to face us
    const settle = s.frame;
    g.rotation.set(0, s.yaw, s.pitch);
    g.position.y = dims.H / 2 + s.lift;
    // keep the hinge (centre of the spread) on screen centre once it opens
    tmp.hinge.set(dims.pw, 0, dims.zJ).applyAxisAngle(THREE.Object3D.DEFAULT_UP, s.yaw);
    g.position.x = -tmp.hinge.x * settle;
    g.position.z = -tmp.hinge.z * settle;
    if (hinge.current) hinge.current.rotation.y = -s.cover;

    // leaves
    const arr = leaf.attr.array as Float32Array;
    for (let i = 0; i < LEAVES; i++) {
      const p = s.leaves[i];
      const { landing, offset } = landed[i];
      const e = easeInOutCubic(p);
      // free edge leads as it lifts, trails as it falls; a gentle rest curve near the gutter
      const curl = leafSeeds[i].curl * Math.sin(2 * Math.PI * p) * (1 - s.dive) + -0.05 * e;
      // idle breathing while held open
      const breathe = p >= 1 ? Math.sin(time * 0.9 + i * 0.6) * 0.004 : 0;
      arr[i * 4] = landing * e + breathe;
      arr[i * 4 + 1] = curl;
      arr[i * 4 + 2] = (LEAVES - i) * leaf.gapStep * (1 - e) + offset * e;
      arr[i * 4 + 3] = i === LEAVES - 1 ? 1 : 0;
    }
    leaf.attr.needsUpdate = true;

    if (key.current) key.current.intensity = theme.scene.lights.key.intensity * 0.022 * s.light;
    if (shadow.current) {
      shadow.current.position.set(g.position.x, 0.002, g.position.z);
      (shadow.current.material as THREE.MeshBasicMaterial).opacity = 0.75 * s.light * (1 - Math.min(1, -s.lift * 2.2));
    }

    // ── camera: frame the book for this aspect ratio (closed → open spread)
    g.updateMatrixWorld();
    const aspect = size.width / Math.max(1, size.height);
    // seen three-quarter, a closed book is narrower than its depth; phones frame it tighter
    const closedW = dims.D * (aspect < 1 ? 0.92 : 1.15);
    const openW = 2 * leaf.len * Math.sin(COVER_OPEN / 2) + dims.T;
    const w = lerp(closedW, openW, settle);
    const h = dims.H * lerp(1.0, 1.1, settle);
    const margin = lerp(1.3, 1.16, settle) * (aspect < 1 ? 1.08 : 1);
    const dist = Math.max(h / (2 * HALF_TAN), w / (2 * HALF_TAN * aspect)) * margin;
    tmp.target.set(0, dims.H * lerp(0.5, 0.47, settle) + s.lift * 0.4, 0);
    const yawC = s.camYaw + Math.sin(time * 0.25) * 0.015;
    const pitchC = s.camPitch;
    tmp.pos.set(Math.sin(yawC) * Math.cos(pitchC), Math.sin(pitchC), Math.cos(yawC) * Math.cos(pitchC)).multiplyScalar(dist).add(tmp.target);

    // dive: glide square-on to the title page until it fills the screen
    if (s.dive > 0) {
      tmp.page.set(dims.pw, 0, (leaf.foreZ + leaf.spineZ) / 2);
      g.localToWorld(tmp.page);
      tmp.normal.set(1, 0, 0).transformDirection(g.matrixWorld);
      const close = (dims.Hp / (2 * HALF_TAN)) * (aspect < 0.75 ? 0.62 : 0.9);
      const d = s.dive;
      tmp.target.lerp(tmp.page, d);
      tmp.pos.lerp(tmp.eye.copy(tmp.page).addScaledVector(tmp.normal, close), d);
    }
    camera.position.copy(tmp.pos);
    camera.lookAt(tmp.target);

    if (shaft.current) (shaft.current.material as THREE.MeshBasicMaterial).opacity = 0.2 * s.light * (1 - s.dive);
  });

  return (
    <>
      <directionalLight
        ref={key}
        position={[-1.6, 5.4, 4.4]}
        color={theme.scene.lights.key.color}
        intensity={0}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-1}
        shadow-camera-near={1}
        shadow-camera-far={14}
      />
      <group ref={root}>
        <BookMeshes ref={hinge} dims={dims} geo={geo} mats={mats} />
        <mesh geometry={leaf.geometry} material={leaf.material} customDepthMaterial={leaf.depth} castShadow receiveShadow frustumCulled={false} />
      </group>
      {/* a soft shaft of light falling across the book from the key light */}
      <mesh ref={shaft} position={[-1.2, 3.1, -0.6]} rotation-z={0.42} scale={[2.6, 8, 1]} renderOrder={2}>
        <planeGeometry />
        <meshBasicMaterial map={shaftTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
      </mesh>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} scale={[3.4, 3.4, 1]} renderOrder={1}>
        <planeGeometry />
        <meshBasicMaterial map={blob} transparent depthWrite={false} opacity={0} />
      </mesh>
    </>
  );
}

function Stage({ onReady, onSequenceDone, onDived, controls, reducedQuality }: SceneProps) {
  const theme = useTheme();
  const gl = useThree((s) => s.gl);
  const assets = useIntroAssets(gl);
  const glow = useMemo(() => glowTexture(theme), [theme]);
  const pool = useFloorTexture(theme);
  const L = theme.scene.lights;
  return (
    <>
      <color attach="background" args={[theme.scene.background]} />
      <fog attach="fog" args={[theme.scene.fog.color, 9, 26]} />
      <ambientLight intensity={L.ambient.intensity * 1.6} color={L.ambient.color} />
      {/* rim from behind and above: outlines the boards without lighting the floor */}
      <directionalLight position={[3, 6, -5]} intensity={L.rim.intensity * 1.2} color={L.rim.color} />
      {/* soft fill from the front-left so the left-hand page isn't lost in shadow */}
      <pointLight position={[-1.2, 2.2, 3.6]} intensity={L.fill.intensity * 8} color={L.fill.color} distance={11} />
      <Environment resolution={128} frames={1} environmentIntensity={L.environment * 1.15}>
        <Lightformer form="rect" intensity={2.4} color={theme.scene.env.top} scale={[10, 3, 1]} position={[0, 6, 4]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color={theme.scene.env.warm} scale={[0.8, 8, 1]} position={[-5, 2, 2]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} color={theme.scene.env.cool} scale={[0.8, 8, 1]} position={[5, 2, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={1.2} color={theme.scene.env.ring} scale={2} position={[0, 3, -5]} target={[0, 0, 0]} />
      </Environment>
      {/* backdrop: a warm pool of light behind the book */}
      <mesh position={[0, 2.4, -7]} scale={[26, 15, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={glow} toneMapped={false} fog={false} />
      </mesh>
      {/* studio void: no visible floor, only a warm pool of light and the book's shadow */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.001} scale={[10, 10, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={pool} transparent depthWrite={false} opacity={0.55} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.002} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial opacity={0.55} depthWrite={false} />
      </mesh>
      {/* dust drifting through the light */}
      <Sparkles count={reducedQuality ? 30 : 70} scale={[4.5, 4, 3]} position={[0, 2.2, 0.4]} size={2.2} speed={0.18} opacity={theme.scene.dust.opacity} color={theme.scene.dust.color} />
      {assets && (
        <Book
          textures={assets.textures}
          fonts={assets.fonts}
          onSequenceDone={onSequenceDone}
          onDived={onDived}
          controls={controls}
          onFirstFrame={onReady}
          shadowSize={reducedQuality ? 512 : 1024}
        />
      )}
    </>
  );
}

/** Paints the cover once, at high resolution (it fills the screen). */
function useIntroAssets(gl: THREE.WebGLRenderer) {
  const theme = useTheme();
  const [assets, setAssets] = useState<{ fonts: CanvasFonts; textures: CoverTextures } | null>(null);
  useEffect(() => {
    let alive = true;
    loadCanvasFonts()
      .then((fonts) => {
        if (!alive) return;
        const q = textureQuality();
        setAssets({ fonts, textures: coverTextures(brandBook, bookDims(brandBook), theme, fonts, q.hi, Math.min(8, gl.capabilities.getMaxAnisotropy())) });
      })
      .catch((err) => console.error("[intro] texture generation failed", err));
    return () => {
      alive = false;
    };
  }, [gl, theme]);
  return assets;
}

/**
 * The full-screen opening: a real-scale hardcover that rises into place,
 * opens on its hinge, riffles its pages and holds on the title page.
 */
export default function IntroBook({ onReady, onSequenceDone, onDived, controls, reducedQuality }: SceneProps) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={reducedQuality ? [1, 1.25] : [1, 1.5]}
      shadows="percentage"
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: FOV, position: [0, 1.2, 8], near: 0.3, far: 60 }}
      aria-hidden
    >
      <Stage onReady={onReady} onSequenceDone={onSequenceDone} onDived={onDived} controls={controls} reducedQuality={reducedQuality} />
    </Canvas>
  );
}
