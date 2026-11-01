"use client";

import type { CSSProperties } from "react";
import type { Book } from "@/types";
import { theme } from "@/theme";
import { bookDims } from "@/lib/cover/dims";
import { cn } from "@/lib/utils";
import { BookCover } from "./BookCover";
import { bookSwatch } from "@/lib/cover/swatch";

/**
 * Lightweight CSS-3D book (front, spine, page edges, back) for DOM scenes
 * where a WebGL canvas would be overkill. Rotate the wrapper to turn it.
 */
export function CssBook({ book, width = 220, className, style }: { book: Book; width?: number; className?: string; style?: CSSProperties }) {
  const d = bookDims(book);
  const h = (width * d.H) / d.lenFront;
  const t = Math.max(18, (width * d.T) / d.lenFront);
  const sw = bookSwatch(theme, book);
  const face = "absolute left-0 top-0 [backface-visibility:hidden]";
  return (
    <div className={cn("relative [transform-style:preserve-3d]", className)} style={{ width, height: h, ...style }}>
      {/* front */}
      <div className={face} style={{ width, height: h, transform: `translateZ(${t / 2}px)` }}>
        <BookCover book={book} className="w-full !rounded-[1px_4px_4px_1px]" />
      </div>
      {/* back */}
      <div className={face} style={{ width, height: h, background: sw.base, transform: `rotateY(180deg) translateZ(${t / 2}px)`, borderRadius: "4px 1px 1px 4px" }} />
      {/* spine */}
      <div
        className={cn(face, "flex items-center justify-center overflow-hidden")}
        style={{
          width: t,
          height: h,
          left: width / 2 - t / 2,
          background: `linear-gradient(90deg, rgba(0,0,0,0.35), rgba(255,255,255,0.12) 45%, rgba(0,0,0,0.3)), ${sw.base}`,
          transform: `rotateY(-90deg) translateZ(${width / 2}px)`,
        }}
      >
        <span className="whitespace-nowrap font-serif text-[11px] font-semibold [writing-mode:vertical-rl]" style={{ color: book.finish === "cloth" ? sw.foil : sw.ink }}>
          {book.title}
        </span>
      </div>
      {/* fore-edge pages */}
      <div
        className={face}
        style={{
          width: t - 4,
          height: h - 6,
          top: 3,
          left: width / 2 - (t - 4) / 2,
          background: `repeating-linear-gradient(90deg, ${theme.scene.page.color} 0 1.5px, ${theme.scene.page.edgeShade} 1.5px 2px)`,
          transform: `rotateY(90deg) translateZ(${width / 2 - 3}px)`,
        }}
      />
      {/* head (top pages) */}
      <div
        className={face}
        style={{
          width: width - 6,
          height: t - 4,
          left: 0,
          top: -(t - 4) / 2,
          background: `repeating-linear-gradient(0deg, ${theme.scene.page.color} 0 1.5px, ${theme.scene.page.edgeShade} 1.5px 2px)`,
          transform: `rotateX(90deg)`,
        }}
      />
    </div>
  );
}
