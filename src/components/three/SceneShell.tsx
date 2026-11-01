"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { isLowEndDevice, supportsWebGL } from "@/lib/webgl";
import { introPlaying, subscribeIntro } from "@/lib/intro";
import { cn } from "@/lib/utils";

const noop = () => () => {};

export interface SceneSlot {
  /** false while the scene is off-screen or the tab is hidden: stop rendering */
  active: boolean;
  /** call once the first meaningful frame is up (fades the fallback out) */
  onReady: () => void;
  /** call when the scene cannot continue (the fallback stays) */
  onFatal: () => void;
}

/**
 * Hosts a decorative WebGL scene the cheap way:
 *  - the static fallback is server-rendered and stays until the scene is ready
 *  - the scene's code is only mounted when the host nears the viewport
 *  - rendering pauses while off-screen or in a background tab
 *  - no WebGL, very weak hardware or a crash: the fallback simply stays
 */
export function SceneShell({ fallback, className, children }: { fallback: ReactNode; className?: string; children: (slot: SceneSlot) => ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const capable = useSyncExternalStore(noop, () => supportsWebGL() && !isLowEndDevice(), () => false);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState(false);
  const underIntro = useSyncExternalStore(subscribeIntro, introPlaying, () => false);

  useEffect(() => {
    const el = host.current;
    if (!el || !capable) return;
    const nearIo = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "300px 0px" });
    const visIo = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    nearIo.observe(el);
    visIo.observe(el);
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      nearIo.disconnect();
      visIo.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [capable]);

  const onReady = useCallback(() => setReady(true), []);
  const onFatal = useCallback(() => setFatal(true), []);
  const live = capable && near && !fatal;

  return (
    <div ref={host} className={cn("relative", className)}>
      {live && children({ active: visible && pageVisible && !underIntro, onReady, onFatal })}
      <div aria-hidden={live && ready} className={cn("absolute inset-0 transition-opacity duration-1000", live && ready ? "pointer-events-none opacity-0" : "opacity-100")}>
        {fallback}
      </div>
    </div>
  );
}
