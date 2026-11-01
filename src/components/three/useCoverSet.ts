"use client";

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import type { Book } from "@/types";
import { useTheme } from "@/theme";
import { whenIntroIdle } from "@/lib/intro";
import { bookDims } from "@/lib/three/bookGeometry";
import { coverTextures, loadCanvasFonts, textureQuality, type CanvasFonts, type CoverTextures } from "@/lib/three/textures";

/**
 * Paints cover textures for `books`, yielding to the browser between books so
 * input and animation stay smooth. Resolves all at once (null until then).
 * Textures are cached, so scenes showing the same book share them.
 */
export function useCoverSet(books: Book[], quality: "base" | "hi" = "base") {
  const theme = useTheme();
  const gl = useThree((s) => s.gl);
  const [set, setSet] = useState<{ books: Book[]; fonts: CanvasFonts; textures: CoverTextures[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fonts = await loadCanvasFonts();
      const size = textureQuality()[quality];
      const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
      const out: CoverTextures[] = [];
      for (const b of books) {
        await whenIntroIdle();
        if (cancelled) return;
        out.push(coverTextures(b, bookDims(b), theme, fonts, size, aniso));
        await new Promise((r) => setTimeout(r, 0));
      }
      if (!cancelled) setSet({ books, fonts, textures: out });
    })().catch((err) => console.error("[3d] cover generation failed", err));
    return () => {
      cancelled = true;
    };
  }, [books, gl, quality, theme]);

  return set && set.books === books ? set : null;
}
