"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, type CanvasProps } from "@react-three/fiber";
import { sceneDpr } from "@/lib/webgl";

class Boundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[3d] scene crashed", err);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface Props extends Omit<CanvasProps, "children" | "frameloop" | "onCreated" | "dpr"> {
  active: boolean;
  onFatal: () => void;
  label: string;
  children: ReactNode;
}

/**
 * Canvas for decorative page scenes: transparent, DPR-capped, paused while
 * inactive, crash-isolated, and remounted once after a lost GPU context
 * (if that keeps happening it gives up and the fallback stays).
 */
export default function SceneCanvas({ active, onFatal, label, children, ...rest }: Props) {
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false);
  const losses = useRef(0);
  const [dpr] = useState(sceneDpr);

  const onCreated = useCallback(({ gl }: { gl: { domElement: HTMLCanvasElement } }) => {
    gl.domElement.addEventListener(
      "webglcontextlost",
      (e) => {
        e.preventDefault();
        losses.current += 1;
        setLost(true);
      },
      { once: true },
    );
  }, []);

  useEffect(() => {
    if (!lost) return;
    if (losses.current > 1) {
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
    <Boundary onError={onFatal}>
      <Canvas
        key={generation}
        dpr={dpr}
        frameloop={active ? "always" : "never"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
        onCreated={onCreated}
        aria-label={label}
        role="img"
        {...rest}
      >
        {children}
      </Canvas>
    </Boundary>
  );
}
