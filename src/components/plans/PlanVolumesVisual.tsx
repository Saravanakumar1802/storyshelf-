"use client";

import dynamic from "next/dynamic";
import { planBooks } from "@/data/planBooks";
import { plans } from "@/data/plans";
import { SceneShell } from "@/components/three/SceneShell";
import { CssBook } from "@/components/library/CssBook";

const PlanVolumes = dynamic(() => import("@/components/three/scenes/PlanVolumes"), { ssr: false });

const featuredId = `plan-${plans.find((p) => p.popular)?.id ?? "levelUp"}`;

/** CSS-3D stand-in while the scene loads (and without WebGL). */
function Fallback() {
  return (
    <div className="flex size-full items-center justify-center gap-6 [perspective:1400px] sm:gap-10">
      {planBooks.map((b, i) => (
        <CssBook key={b.id} book={b} width={i === 1 ? 150 : 128} className="max-sm:scale-75" style={{ transform: `rotateY(${(1 - i) * 22}deg) translateZ(${i === 1 ? 40 : 0}px)` }} />
      ))}
    </div>
  );
}

export function PlanVolumesVisual() {
  return (
    <SceneShell className="size-full" fallback={<Fallback />}>
      {({ active, onReady, onFatal }) => <PlanVolumes books={planBooks} featuredId={featuredId} active={active} onReady={onReady} onFatal={onFatal} />}
    </SceneShell>
  );
}
