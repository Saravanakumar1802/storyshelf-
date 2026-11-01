"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { Emblem } from "@/types";
import { yourBook } from "@/data/showcase";
import { SceneShell } from "@/components/three/SceneShell";
import { CssBook } from "@/components/library/CssBook";

const BookAssembly = dynamic(() => import("@/components/three/scenes/BookAssembly"), { ssr: false });

/** "Your book", in pieces, coming together as the visitor scrolls. */
export function BookAssemblyVisual({ variant }: { variant: { key: string; emblem: Emblem; swatch: number } }) {
  const { key, emblem, swatch } = variant;
  const book = useMemo(() => yourBook({ key, emblem, swatch }), [key, emblem, swatch]);
  return (
    <SceneShell
      className="size-full"
      fallback={
        <div className="grid size-full place-items-center [perspective:1400px]">
          <CssBook book={book} width={190} style={{ transform: "rotateY(-28deg) rotateX(4deg)" }} />
        </div>
      }
    >
      {({ active, onReady, onFatal }) => <BookAssembly book={book} active={active} onReady={onReady} onFatal={onFatal} />}
    </SceneShell>
  );
}
