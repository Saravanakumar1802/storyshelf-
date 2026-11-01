"use client";

import dynamic from "next/dynamic";
import { brandBook } from "@/data/showcase";
import { SceneShell } from "@/components/three/SceneShell";
import { CssBook } from "@/components/library/CssBook";

const OpenBook = dynamic(() => import("@/components/three/scenes/OpenBook"), { ssr: false });

/** The StoryShelf house volume, open, quietly turning its pages (static book without WebGL). */
export function OpenBookVisual() {
  return (
    <SceneShell
      className="size-full"
      fallback={
        <div className="grid size-full place-items-center [perspective:1400px]">
          <CssBook book={brandBook} width={200} style={{ transform: "rotateY(-26deg) rotateX(4deg)" }} />
        </div>
      }
    >
      {({ active, onReady, onFatal }) => <OpenBook active={active} onReady={onReady} onFatal={onFatal} />}
    </SceneShell>
  );
}
