"use client";

import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import type { Book } from "@/types";
import { useShelf } from "@/lib/store/shelf";
import ShelfScene, { type Tier } from "./ShelfScene";
import { shelfPointer } from "./rig";
import { introPlaying, subscribeIntro } from "@/lib/intro";

class CanvasBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[shelf] 3D scene crashed", err);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const DPR: Record<Tier, [number, number]> = { high: [1, 2], medium: [1, 1.5], low: [1, 1] };

interface Props {
  books: Book[];
  active: boolean;
  reducedMotion: boolean;
  onFatal: () => void;
}

/**
 * The WebGL canvas for the hero shelf. Handles:
 *  - context loss (shows nothing, then remounts; gives up after 2 tries)
 *  - render errors (error boundary → parent falls back to the DOM shelf)
 *  - pausing the render loop while off-screen
 *  - quality tiers (DPR follows the tier chosen by the PerformanceMonitor)
 */
export default function ShelfCanvas({ books, active, reducedMotion, onFatal }: Props) {
  const [initialTier] = useState<Tier>(() => {
    if (typeof window === "undefined") return "high";
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 8;
    if (mem <= 2 || cores <= 2) return "low";
    return coarse || mem <= 4 ? "medium" : "high";
  });
  const [tier, setTier] = useState<Tier>(initialTier);
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false);
  const losses = useRef(0);
  const feature = useShelf((s) => s.feature);
  // while covers are being generated nothing is visible behind the loader, so
  // don't spend the main thread on full-quality frames
  const loaded = useShelf((s) => s.progress >= 1);
  // under the opening intro: render only on change (compiles shaders, no loop)
  const underIntro = useSyncExternalStore(subscribeIntro, introPlaying, () => false);

  const handleCreated = useCallback(
    ({ gl }: { gl: { domElement: HTMLCanvasElement } }) => {
      const el = gl.domElement;
      el.addEventListener(
        "webglcontextlost",
        (e) => {
          e.preventDefault();
          losses.current += 1;
          setLost(true);
        },
        { once: true },
      );
    },
    [],
  );

  useEffect(() => {
    if (!lost) return;
    if (losses.current > 2) {
      onFatal();
      return;
    }
    const id = window.setTimeout(() => {
      setLost(false);
      setGeneration((g) => g + 1);
    }, 600);
    return () => window.clearTimeout(id);
  }, [lost, onFatal]);

  if (lost) return null;

  return (
    <CanvasBoundary onError={onFatal}>
      <Canvas
        key={generation}
        className="!absolute inset-0"
        style={{ touchAction: "pan-y" }}
        dpr={DPR[tier]}
        shadows="percentage"
        frameloop={!active ? "never" : loaded && !underIntro ? "always" : "demand"}
        gl={{ antialias: initialTier === "low", powerPreference: "high-performance", alpha: false, stencil: false }}
        camera={{ fov: 30, position: [0, 1.4, 7], near: 0.1, far: 60 }}
        onCreated={handleCreated}
        onPointerMissed={() => {
          if (!shelfPointer.dragMoved) feature(null);
        }}
        aria-hidden
      >
        <ShelfScene books={books} initialTier={initialTier} reducedMotion={reducedMotion} onTierChange={setTier} />
      </Canvas>
    </CanvasBoundary>
  );
}
