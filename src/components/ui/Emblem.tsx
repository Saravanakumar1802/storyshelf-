"use client";

import { useEffect, useRef } from "react";
import type { Emblem as EmblemName } from "@/types";
import { drawEmblem } from "@/lib/cover/emblems";
import { cn } from "@/lib/utils";

/** The cover emblems as crisp DOM icons (canvas, DPR-aware, tinted with currentColor). */
export function Emblem({ name, className, stroke = 2.4 }: { name: EmblemName; className?: string; stroke?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const rect = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const color = getComputedStyle(c).color;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      const size = Math.min(w, h) * 0.92;
      drawEmblem(ctx, name, w / 2, h / 2, size, stroke);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [name, stroke]);
  return <canvas ref={ref} aria-hidden className={cn("block", className)} />;
}
