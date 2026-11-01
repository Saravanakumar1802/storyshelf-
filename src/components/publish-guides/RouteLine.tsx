"use client";

import { useId, useRef, type MouseEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { stages } from "@/data/publish/howItWorks";
import { getLenis } from "@/components/layout/SmoothScroll";
import { useScrollScene } from "@/components/motion/useScrollScene";
import { cn, pad2 } from "@/lib/utils";
import s from "./RouteLine.module.css";

type Pt = readonly [number, number];

interface Route {
  w: number;
  h: number;
  pts: Pt[];
  d: string;
  /** wide only: the region under the line, softly filled once it is drawn */
  area?: string;
  /** fraction of the route's length at which each stop sits */
  at: number[];
  /** point at fraction `f` (0–1) along the route */
  pointAt: (f: number) => Pt;
  /** wide only: label above (true) or below each stop, and how far to push it clear of the curve */
  above: boolean[];
  clear: number[];
  /** wide only: the short arrow that carries the line on, upward, past the last stop */
  tail?: { d: string; tip: Pt; angle: number };
}

const SAMPLES = 48;
const n = stages.length;

function bezier(a: Pt, b: Pt, c: Pt, d: Pt, t: number): Pt {
  const u = 1 - t;
  return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]];
}

/** Fritsch–Carlson slopes: a smooth curve through (u, v) that never doubles back between stops. */
function monotoneSlopes(u: number[], v: number[]) {
  const k = u.length;
  const d = u.slice(0, -1).map((_, i) => (v[i + 1] - v[i]) / (u[i + 1] - u[i]));
  const m = u.map((_, i) => {
    if (i === 0) return d[0];
    if (i === k - 1) return d[k - 2];
    return d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  });
  d.forEach((di, i) => {
    if (di === 0) return;
    const a = m[i] / di;
    const b = m[i + 1] / di;
    const h = a * a + b * b;
    if (h > 9) {
      m[i] = (3 / Math.sqrt(h)) * a * di;
      m[i + 1] = (3 / Math.sqrt(h)) * b * di;
    }
  });
  return m;
}

/**
 * A smooth, steadily progressing route through `pts` — monotone along its
 * direction of travel (x when wide, y when tall), so it only ever climbs —
 * measured once so the draw-in can reach each stop exactly.
 */
function buildRoute(w: number, h: number, pts: Pt[], vertical: boolean): Route {
  // work in (u, v): u = direction of travel, v = the climbing axis
  const uv = pts.map(([x, y]) => (vertical ? [y, x] : [x, y]) as Pt);
  const toXY = ([u, v]: Pt): Pt => (vertical ? [v, u] : [u, v]);
  // softened slopes: each stage eases in and out of its stop, so the climb reads as a series of gentle steps up
  const m = monotoneSlopes(
    uv.map((p) => p[0]),
    uv.map((p) => p[1]),
  ).map((k) => k * EASE_STOPS);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  const xs = [pts[0][0]];
  const ys = [pts[0][1]];
  const ls = [0];
  const stopLen = [0];
  let [px, py] = pts[0];
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const [u0, v0] = uv[i - 1];
    const [u1, v1] = uv[i];
    const du = (u1 - u0) / 3;
    const c1 = toXY([u0 + du, v0 + m[i - 1] * du]);
    const c2 = toXY([u1 - du, v1 - m[i] * du]);
    const p = pts[i - 1];
    const q = pts[i];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${q[0]} ${q[1]}`;
    for (let k = 1; k <= SAMPLES; k++) {
      const [x, y] = bezier(p, c1, c2, q, k / SAMPLES);
      len += Math.hypot(x - px, y - py);
      xs.push(x);
      ys.push(y);
      ls.push(len);
      [px, py] = [x, y];
    }
    stopLen.push(len);
  }
  const total = len;
  const pointAt = (f: number): Pt => {
    const target = Math.min(1, Math.max(0, f)) * total;
    let lo = 0;
    let hi = ls.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ls[mid] < target) lo = mid;
      else hi = mid;
    }
    const t = (target - ls[lo]) / (ls[hi] - ls[lo] || 1);
    return [xs[lo] + (xs[hi] - xs[lo]) * t, ys[lo] + (ys[hi] - ys[lo]) * t];
  };

  // labels alternate above / below; each is pushed just clear of the curve across its width
  const above = pts.map((_, i) => i % 2 === 0);
  const clear = pts.map(([x0, y0], i) => {
    let c = 0;
    xs.forEach((x, k) => {
      if (Math.abs(x - x0) <= LABEL_HALF) c = Math.max(c, above[i] ? y0 - ys[k] : ys[k] - y0);
    });
    return c;
  });

  let tail: Route["tail"];
  if (!vertical) {
    const [lx, ly] = pts[pts.length - 1];
    const slope = m[m.length - 1];
    const angle = Math.atan2(slope, 1);
    const tip: Pt = [lx + TAIL * Math.cos(angle), ly + TAIL * Math.sin(angle)];
    tail = { d: `M ${lx} ${ly} L ${tip[0]} ${tip[1]}`, tip, angle: (angle * 180) / Math.PI };
  }
  const [fx] = pts[0];
  const [lx] = pts[pts.length - 1];
  const area = vertical ? undefined : `${d} L ${lx} ${h} L ${fx} ${h} Z`;
  return { w, h, pts, d, area, at: stopLen.map((l) => l / total), pointAt, above, clear, tail };
}

/** half the width a label can take, in viewBox units */
const LABEL_HALF = 66;
const TAIL = 46;
const EASE_STOPS = 0.45;
/** gentle acceleration: each stage climbs a little more than the one before */
const climb = (i: number) => Math.pow(i / (n - 1), 1.45);

/** Desktop: a growth line, rising left → right through every stage. */
const WIDE = buildRoute(
  1000,
  300,
  stages.map((_, i) => [70 + (i * 830) / (n - 1), 238 - climb(i) * 178] as const),
  false,
);
/** Phones: the same progression running top → bottom, drifting steadily forward, labels alongside. */
const TALL = buildRoute(
  340,
  56 + (n - 1) * 92,
  stages.map((_, i) => [26 + climb(i) * 40, 28 + i * 92] as const),
  true,
);

const DRAW_S = 3.6;
/** time at which a sine.inOut draw reaches fraction `f` of the route */
const timeAt = (f: number) => (Math.acos(1 - 2 * f) / Math.PI) * DRAW_S;

/** Scroll smoothly to a stage's panel in the journey below. */
function goToStage(e: MouseEvent, i: number) {
  const el = document.getElementById(`stage-${i + 1}`);
  if (!el) return;
  e.preventDefault();
  const y = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + el.offsetHeight / 2;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(y, { duration: 1.3 });
  else window.scrollTo({ top: y, behavior: "smooth" });
}

function RouteSvg({ route, variant, glowId }: Readonly<{ route: Route; variant: "wide" | "tall"; glowId: string }>) {
  const wide = variant === "wide";
  return (
    <svg viewBox={`0 0 ${route.w} ${route.h}`} role="group" aria-label="Stage route" className={cn(s.svg, s.await, `rl-${variant}`)}>
      <defs>
        <linearGradient id={`${glowId}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--c-accent)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--c-accent)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={glowId}>
          <stop offset="0" stopColor="var(--c-accent-bright)" stopOpacity="0.9" />
          <stop offset="0.35" stopColor="var(--c-accent)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--c-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {route.area && <path className={cn(s.area, "rl-area")} d={route.area} fill={`url(#${glowId}a)`} />}
      <path className={s.track} d={route.d} />
      <path className={cn(s.line, "rl-line")} d={route.d} pathLength={1} strokeDasharray="1 1" />
      <path className={cn(s.shine, "rl-shine")} d={route.d} pathLength={1} strokeDasharray="0.06 2" strokeDashoffset="0.06" />

      {route.pts.map(([x, y], i) => {
        const st = stages[i];
        const above = route.above[i];
        const clear = route.clear[i];
        return (
          <a key={st.stage} href={`#stage-${i + 1}`} className={s.stop} aria-label={`Stage ${i + 1}: ${st.stage}, ${st.weeks}`} onClick={(e) => goToStage(e, i)}>
            <g transform={`translate(${x} ${y})`}>
              <circle className={cn(s.ripple, "rl-ripple")} r="10" />
              <g className={cn(s.knobWrap, "rl-knob")}>
                <g className={s.knob}>
                  <circle r="20" fill="transparent" />
                  <circle className={s.focus} r="15" />
                  <circle className={s.ring} r="10" />
                  <circle className={s.core} r="4" />
                </g>
              </g>
              <g className={cn(s.label, "rl-label")} aria-hidden>
                {wide ? (
                  <>
                    <text className={s.meta} y={above ? -46 - clear : 36 + clear} textAnchor="middle">
                      {pad2(i + 1)} · {st.weeks}
                    </text>
                    <text className={s.name} y={above ? -25 - clear : 57 + clear} textAnchor="middle">
                      {st.stage}
                    </text>
                  </>
                ) : (
                  <>
                    <text className={s.meta} x={92 - x} y={-7}>
                      {pad2(i + 1)} · {st.weeks}
                    </text>
                    <text className={s.name} x={92 - x} y={15}>
                      {st.stage}
                    </text>
                  </>
                )}
              </g>
            </g>
          </a>
        );
      })}

      {route.tail && (
        <g aria-hidden>
          <path className={cn(s.tail, "rl-tail")} d={route.tail.d} pathLength={1} strokeDasharray="1 1" />
          <g transform={`translate(${route.tail.tip[0]} ${route.tail.tip[1]}) rotate(${route.tail.angle})`}>
            <path className={cn(s.arrow, "rl-arrow")} d="M -9 -7 L 1 0 L -9 7" />
          </g>
        </g>
      )}

      {/* outer group is positioned along the route; the inner one fades/scales */}
      <g className="rl-head" transform={`translate(${route.pts[0][0]} ${route.pts[0][1]})`}>
        <g className={cn(s.head, "rl-head-dot")}>
          <circle r="22" fill={`url(#${glowId})`} />
          <circle r="4.5" fill="var(--c-accent-bright)" />
        </g>
      </g>
    </svg>
  );
}

/**
 * The eight stages as one gold growth line that climbs at every stage and
 * carries on upward past the last. When it comes into view the line draws
 * itself stop to stop: a glowing head travels the curve and each
 * stop pops, ripples and reveals its label at the exact moment the line
 * reaches it. Afterwards a soft light keeps travelling the route (paused
 * off-screen). Click a stop to jump to that stage below. Reduced motion:
 * shown fully drawn.
 */
export function RouteLine() {
  const root = useRef<HTMLElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  useScrollScene(root, () => {
    const mm = gsap.matchMedia();
    mm.add({ wide: "(min-width: 1024px)", tall: "(max-width: 1023.98px)" }, (ctx) => {
      const variant = ctx.conditions?.wide ? "wide" : "tall";
      const route = variant === "wide" ? WIDE : TALL;
      const svg = root.current?.querySelector<SVGSVGElement>(`.rl-${variant}`);
      if (!svg) return;
      const q = gsap.utils.selector(svg);
      const head = svg.querySelector<SVGGElement>(".rl-head");
      if (!head) return;
      const dot = q(".rl-head-dot");
      const knobs = q(".rl-knob");
      const ripples = q(".rl-ripple");
      const labels = q(".rl-label");
      const offset = variant === "wide" ? (i: number) => ({ y: route.above[i] ? 12 : -12 }) : () => ({ x: -14 });

      const line = q(".rl-line")[0];
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(
        line,
        { strokeDashoffset: 1 },
        {
          strokeDashoffset: 0,
          // pathLength=1 makes this a 0–1 fraction; GSAP would round "px" values to whole numbers
          autoRound: false,
          duration: DRAW_S,
          ease: "sine.inOut",
          onUpdate: () => {
            const [x, y] = route.pointAt(1 - Number(gsap.getProperty(line, "strokeDashoffset")));
            head.setAttribute("transform", `translate(${x} ${y})`);
          },
        },
        0,
      );
      tl.fromTo(dot, { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%" }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power2.out" }, 0);
      tl.to(dot, { autoAlpha: 0, scale: 0.4, duration: 0.5, ease: "power2.in" }, DRAW_S - 0.15);

      route.at.forEach((f, i) => {
        const t = timeAt(f);
        const last = i === n - 1;
        tl.fromTo(knobs[i], { autoAlpha: 0, scale: 0, transformOrigin: "50% 50%" }, { autoAlpha: 1, scale: 1, duration: 0.75, ease: "back.out(2.6)" }, Math.max(0, t - 0.06));
        // immediateRender off: the ring must stay invisible until the line arrives
        tl.fromTo(
          ripples[i],
          { autoAlpha: 0.9, scale: 0.8, transformOrigin: "50% 50%" },
          {
            autoAlpha: 0,
            scale: last ? 4.2 : 3,
            duration: last ? 1.6 : 1.1,
            ease: "power2.out",
            immediateRender: false,
          },
          t,
        );
        tl.fromTo(labels[i], { autoAlpha: 0, ...offset(i) }, { autoAlpha: 1, x: 0, y: 0, duration: 0.9, ease: "expo.out" }, t + 0.04);
      });

      // …and the line carries on, upward, over a soft rising glow
      if (route.area) tl.fromTo(q(".rl-area"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: "power1.out" }, DRAW_S - 0.4);
      if (route.tail) {
        tl.fromTo(q(".rl-tail"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, autoRound: false, duration: 0.55, ease: "power2.out" }, DRAW_S);
        tl.fromTo(q(".rl-arrow"), { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: "back.out(2)" }, DRAW_S + 0.35);
      }

      // a soft light that keeps travelling the finished route
      const shine = gsap.fromTo(
        q(".rl-shine"),
        { autoAlpha: 0.85, strokeDashoffset: 0.06 },
        {
          strokeDashoffset: -1,
          autoRound: false,
          duration: 3.4,
          ease: "power1.inOut",
          repeat: -1,
          repeatDelay: 2.2,
          paused: true,
          immediateRender: false,
        },
      );
      const onScreen = ScrollTrigger.create({
        trigger: svg,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          if (tl.progress() < 1) return;
          if (self.isActive) shine.resume();
          else shine.pause();
        },
      });
      tl.call(() => void (onScreen.isActive && shine.play()), undefined, DRAW_S + 0.6);
      ScrollTrigger.create({
        trigger: svg,
        start: "top 88%",
        once: true,
        onEnter: () => void tl.play(),
      });
    });
    return () => mm.revert();
  });

  return (
    <nav ref={root} aria-label="The eight publishing stages">
      <div className="hidden lg:block">
        <RouteSvg route={WIDE} variant="wide" glowId={`rlw${uid}`} />
      </div>
      {/* drawn 1:1 so its labels stay a readable size */}
      <div className="max-w-85 lg:hidden">
        <RouteSvg route={TALL} variant="tall" glowId={`rlt${uid}`} />
      </div>
    </nav>
  );
}
