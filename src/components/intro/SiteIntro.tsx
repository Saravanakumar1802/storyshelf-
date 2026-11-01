"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { IntroControls } from "@/components/three/scenes/IntroBook";
import { LogoMark } from "@/components/layout/Logo";
import { getLenis } from "@/components/layout/SmoothScroll";
import { useShelf } from "@/lib/store/shelf";
import { INTRO_DONE_EVENT, INTRO_SEEN_KEY, introPlaying, setIntroMotion } from "@/lib/intro";
import { isLowEndDevice, supportsWebGL } from "@/lib/webgl";
import { cn } from "@/lib/utils";
import { theme } from "@/theme";
import s from "./Intro.module.css";

const IntroBook = dynamic(() => import("@/components/three/scenes/IntroBook"), { ssr: false });

/** The 3D scene must be on screen this long after hydration, or the CSS book plays instead. */
const READY_TIMEOUT_MS = 6500;
/** Never hold the visitor longer than this (from navigation start), whatever happens. */
const MAX_MS = 13000;
/** Length of the CSS fallback book's choreography (see Intro.module.css). */
const CSS_SEQUENCE_MS = 3300;
/** Paper overlay fade-in, then the leaves swing open. */
const DOORS_FADE_MS = 260;
/** Hold on the open book (with the tagline) before the reveal. */
const HOLD_MS = 1100;
const DOORS_OPEN_MS = 1150;
const LEAVES = 5;

type Stage = "play" | "doors" | "open" | "gone";
const noop = () => () => {};

/** Resolves when the page under the intro is worth revealing. */
function waitForPage(pathname: string, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    // the home page builds a WebGL shelf: reveal it once its books are prepared
    if (pathname !== "/") return resolve();
    const done = (st: { ready: boolean; progress: number }) => st.ready || st.progress >= 1;
    if (done(useShelf.getState())) return resolve();
    const unsub = useShelf.subscribe((st) => {
      if (done(st)) {
        unsub();
        resolve();
      }
    });
    signal.addEventListener("abort", unsub);
  });
}

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[intro] 3D scene failed, using the CSS book", err);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Lightweight CSS-3D book: the fallback without WebGL or on weak hardware. */
function CssIntroBook() {
  return (
    <div className={s.stage} aria-hidden>
      <div className={s.camera}>
        <div className={s.shadow} />
        <div className={s.book}>
          <div className={cn(s.face, s.back)} />
          <div className={cn(s.face, s.spine)} />
          <div className={cn(s.face, s.head)} />
          <div className={cn(s.face, s.fore)} />
          <div className={cn(s.face, s.titlePage)}>
            <LogoMark className={s.mark} />
            <span className={s.word}>Story</span>
            <span className={s.sub}>SHELF</span>
            <span className={s.rule} />
            <span className={s.tag}>Every story deserves a shelf.</span>
          </div>
          {Array.from({ length: LEAVES }, (_, i) => (
            <div key={i} className={s.leaf} style={{ "--z": `${-(i + 1) * 0.8}px`, "--delay": `${1.5 + i * 0.15}s` } as CSSProperties}>
              <div className={s.seg}>
                <div className={cn(s.face, s.paper, s.segFront)} />
                <div className={cn(s.face, s.paper, s.segBack)} />
              </div>
              <div className={s.tip}>
                <div className={cn(s.face, s.paper, s.tipFront)} />
                <div className={cn(s.face, s.paper, s.tipBack)} />
              </div>
            </div>
          ))}
          <div className={s.cover}>
            <div className={cn(s.face, s.coverFront)}>
              <LogoMark className={s.coverMark} />
              <span className={s.coverWord}>Story</span>
              <span className={s.coverSub}>SHELF</span>
              <span className={s.coverShade} />
            </div>
            <div className={cn(s.face, s.coverInside)} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * First-visit intro (once per session):
 *   poster (instant, server-rendered) → full-screen 3D hardcover opens and
 *   holds on its title page → the page parts at the gutter and its halves
 *   swing open to reveal the website.
 * Falls back to a CSS book without WebGL / on weak devices / if the 3D scene
 * is slow, and always hands over within MAX_MS.
 */
export function SiteIntro() {
  const pathname = usePathname();
  const [initialPath] = useState(pathname);
  const playing = useSyncExternalStore(noop, introPlaying, () => false);
  const capable = useSyncExternalStore(noop, () => supportsWebGL() && !isLowEndDevice(), () => false);
  const [fallback, setFallback] = useState(false);
  const [ready3d, setReady3d] = useState(false);
  const [stage, setStage] = useState<Stage>("play");
  const [held, setHeld] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const controls = useRef<IntroControls | null>(null);
  const flow = useRef({ sequence: false, page: false, revealed: false, doors: false });
  const mode = capable && !fallback ? "webgl" : "css";

  const openDoors = useCallback(() => {
    if (flow.current.doors) return;
    flow.current.doors = true;
    setStage("doors");
  }, []);

  /** Reveal once the choreography has finished AND the page is ready. */
  const tryReveal = useCallback(() => {
    const f = flow.current;
    if (f.revealed || !f.sequence || !f.page) return;
    f.revealed = true;
    setRevealing(true);
    if (controls.current) controls.current.reveal();
    else openDoors();
  }, [openDoors]);

  const onSceneReady = useCallback(() => {
    setReady3d(true);
    setIntroMotion("busy");
  }, []);
  const onSequenceDone = useCallback(() => {
    setIntroMotion("idle");
    setHeld(true);
    // a beat on the finished spread (and the tagline) before the reveal
    window.setTimeout(() => {
      flow.current.sequence = true;
      tryReveal();
    }, HOLD_MS);
  }, [tryReveal]);
  const onSceneError = useCallback(() => {
    setIntroMotion("idle");
    setFallback(true);
  }, []);

  // lifecycle: scroll lock, page readiness, hard cap, Esc to skip
  useEffect(() => {
    if (!playing) return;
    const lenis = getLenis();
    lenis?.stop();
    const ac = new AbortController();
    waitForPage(initialPath, ac.signal).then(() => {
      flow.current.page = true;
      tryReveal();
    });
    const cap = window.setTimeout(openDoors, Math.max(0, MAX_MS - performance.now()));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openDoors();
    window.addEventListener("keydown", onKey);
    return () => {
      ac.abort();
      window.clearTimeout(cap);
      window.removeEventListener("keydown", onKey);
      setIntroMotion("idle");
      // unmounted mid-intro (should not happen in the root layout): never leave the page locked
      if (document.documentElement.dataset.intro === "on") document.documentElement.dataset.intro = "done";
      getLenis()?.start();
    };
  }, [playing, initialPath, openDoors, tryReveal]);

  // the 3D scene gets a bounded time to appear
  useEffect(() => {
    if (!playing || mode !== "webgl" || ready3d) return;
    const id = window.setTimeout(() => setFallback(true), READY_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [playing, mode, ready3d]);

  // the CSS book has a fixed-length choreography
  useEffect(() => {
    if (!playing || mode !== "css" || stage !== "play") return;
    const id = window.setTimeout(onSequenceDone, CSS_SEQUENCE_MS);
    return () => window.clearTimeout(id);
  }, [playing, mode, stage, onSequenceDone]);

  // reveal: paper overlay → leaves swing open → hand over → unmount
  useEffect(() => {
    if (stage === "doors") {
      const id = window.setTimeout(() => setStage("open"), DOORS_FADE_MS);
      return () => window.clearTimeout(id);
    }
    if (stage === "open") {
      const html = document.documentElement;
      html.dataset.intro = "done";
      setIntroMotion("idle");
      try {
        sessionStorage.setItem(INTRO_SEEN_KEY, "1");
      } catch {
        /* private mode: the intro simply plays again next time */
      }
      getLenis()?.start();
      window.dispatchEvent(new Event(INTRO_DONE_EVENT));
      const id = window.setTimeout(() => setStage("gone"), DOORS_OPEN_MS);
      return () => window.clearTimeout(id);
    }
  }, [stage]);

  if (stage === "gone") return null;
  const posterHidden = playing && (mode === "css" || ready3d);

  return (
    <div className={cn(s.root, playing && s.managed, stage === "open" && s.opening)}>
      <div className={cn(s.poster, posterHidden && s.hidden)} aria-hidden>
        <div className={s.glow} />
        <LogoMark animated className={s.posterMark} />
      </div>

      {playing && mode === "webgl" && stage !== "open" && (
        <div className={cn(s.canvas, ready3d && s.visible)}>
          <SceneBoundary onError={onSceneError}>
            <IntroBook onReady={onSceneReady} onSequenceDone={onSequenceDone} onDived={openDoors} controls={controls} reducedQuality={isLowEndDevice()} />
          </SceneBoundary>
          <div className={s.vignette} />
        </div>
      )}
      {playing && mode === "css" && stage === "play" && <CssIntroBook />}

      {stage === "play" && !posterHidden && (
        <div className={s.caption} aria-hidden>
          <span>Read freely · Publish proudly</span>
          <span className={s.bar} />
        </div>
      )}

      {held && stage === "play" && (
        <p className={cn(s.tagline, revealing && s.taglineOut)} aria-hidden>
          Your story starts here.
        </p>
      )}

      {/* paper in the 3D page's own tone, so the hand-over doesn't change colour */}
      <div className={cn(s.doors, stage !== "play" && s.shown, stage === "open" && s.open)} style={{ "--page": theme.scene.page.color } as CSSProperties} aria-hidden>
        <div className={cn(s.door, s.doorLeft)} />
        <div className={cn(s.door, s.doorRight)} />
      </div>

      <p role="status" className="sr-only">
        Opening StoryShelf…
      </p>
      {playing && stage === "play" && (
        <button type="button" className={s.skip} onClick={openDoors}>
          Skip intro
        </button>
      )}
    </div>
  );
}

/** Compact looping version (pages turning) used as an in-page loader. */
export function BookLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-5" role="status" aria-label={label}>
      <div className={s.mini} aria-hidden>
        <div className={s.miniStack}>
          <div className={s.miniLeft} />
          <div className={s.miniRight} />
          {[0, 0.4, 0.8].map((d) => (
            <div key={d} className={s.miniPage} style={{ "--delay": `${d}s` } as CSSProperties} />
          ))}
        </div>
      </div>
      <span className="eyebrow">{label}</span>
    </div>
  );
}
