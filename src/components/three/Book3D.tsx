"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { easing } from "maath";
import gsap from "gsap";
import type { Book } from "@/types";
import { useTheme } from "@/theme";
import { useShelf } from "@/lib/store/shelf";
import type { BookDims } from "@/lib/three/bookGeometry";
import { coverTextures, firstPageTexture, releaseCoverTextures, type CanvasFonts, type CoverTextures } from "@/lib/three/textures";
import { BookMeshes, useBookGeometry, useBookMaterials } from "./BookModel";
import { shelfPointer, type ShelfRig } from "./rig";

interface Props {
  book: Book;
  dims: BookDims;
  index: number;
  /** resting lean (radians) */
  restRz: number;
  fonts: CanvasFonts;
  textures: CoverTextures;
  rig: React.RefObject<ShelfRig>;
}

const _m = new THREE.Matrix4();
const _t = new THREE.Matrix4();
const _shelfPos = new THREE.Vector3();
const _shelfQuat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _featQuat = new THREE.Quaternion();
const _featPos = new THREE.Vector3();
const _euler = new THREE.Euler();

export function Book3D({ book, dims, index, restRz, fonts, textures, rig }: Props) {
  const theme = useTheme();
  const root = useRef<THREE.Group>(null);
  const frontHinge = useRef<THREE.Group>(null);
  const featured = useShelf((s) => s.featured === index);
  const hovered = useShelf((s) => s.hovered === index);
  const spotlit = useShelf((s) => s.spotlight === index);
  const coverOpen = useShelf((s) => s.featured === index && s.coverOpen);
  const hover = useShelf((s) => s.hover);
  const feature = useShelf((s) => s.feature);
  const toggleCover = useShelf((s) => s.toggleCover);
  useCursor(hovered, featured ? "grab" : "pointer", "auto");

  const pose = useRef({ sy: 0.32, sz: 0.12, rx: -0.05, rz: restRz, detach: 0, open: 0 });
  const live = useRef({ hover: 0, slot: Number.NaN, open: 0 });
  const tl = useRef<gsap.core.Timeline | null>(null);

  const geo = useBookGeometry(dims);
  const mats = useBookMaterials(book, textures);

  // ── hi-res swap & first page when featured ──
  useEffect(() => {
    if (!featured) return;
    let cancelled = false;
    const r = rig.current;
    const aspect = (dims.D - dims.oh) / dims.Hp;
    // first page: cheap, do it right away so an early "open cover" shows it
    if (!mats.firstPage.map) {
      mats.firstPage.map = firstPageTexture(book, theme, fonts, aspect);
      mats.firstPage.color.set("#ffffff");
      mats.firstPage.needsUpdate = true;
    }
    // hi-res cover: generated after the flight so it never janks the animation
    const id = window.setTimeout(() => {
      if (cancelled || r.hiResSize <= r.baseSize) return;
      const hi = coverTextures(book, dims, theme, fonts, r.hiResSize, r.anisotropy);
      if (cancelled) return;
      mats.wrap.map = hi.map;
      mats.wrap.roughnessMap = hi.orm;
      mats.wrap.metalnessMap = hi.orm;
      r.hiResLru = [index, ...r.hiResLru.filter((i) => i !== index)];
      // evict old hi-res sets (keep 2) to bound GPU memory
      while (r.hiResLru.length > 2) {
        const evict = r.hiResLru.pop()!;
        r.revertHiRes[evict]?.();
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [featured, book, dims, fonts, index, mats, rig, theme]);

  useEffect(() => {
    const r = rig.current;
    r.revertHiRes[index] = () => {
      mats.wrap.map = textures.map;
      mats.wrap.roughnessMap = textures.orm;
      mats.wrap.metalnessMap = textures.orm;
      releaseCoverTextures(book, theme, r.hiResSize);
    };
    return () => {
      delete r.revertHiRes[index];
    };
  }, [book, index, mats, rig, textures, theme]);

  // ── intro: books are set down onto the shelf one by one ──
  useEffect(() => {
    const r = rig.current;
    const p = pose.current;
    const d = r.reduced ? 0.01 : 1;
    const tween = gsap.to(p, {
      sy: 0,
      sz: 0,
      rx: 0,
      duration: 1.1 * d,
      delay: r.reduced ? 0 : 0.25 + index * 0.07,
      ease: "power3.out",
    });
    return () => {
      tween.kill();
    };
  }, [index, rig]);

  // ── feature / return choreography ──
  useEffect(() => {
    const r = rig.current;
    const p = pose.current;
    const k = r.reduced ? 0.01 : 1;
    tl.current?.kill();
    if (featured) {
      const pull = dims.D + 0.25;
      tl.current = gsap
        .timeline()
        .to(p, { sz: pull * 0.35, rx: 0.16, sy: 0.02, rz: 0, duration: 0.32 * k, ease: "power2.out" })
        .to(p, { sz: pull, rx: 0.03, sy: 0.06, duration: 0.45 * k, ease: "power2.inOut" }, ">-0.05")
        .to(p, { detach: 1, duration: 1.05 * k, ease: "power3.inOut" }, ">-0.12")
        .to(p, { open: 0.32, duration: 0.7 * k, ease: "power2.out" }, ">-0.2")
        .to(p, { open: 0, duration: 0.9 * k, ease: "power2.inOut" }, ">+0.25");
    } else if (p.detach > 0.0001 || p.sz > 0.0001) {
      tl.current = gsap
        .timeline()
        .to(p, { detach: 0, open: 0, rx: 0.02, duration: 0.95 * k, ease: "power3.inOut" })
        .to(p, { sz: 0, sy: 0, rx: 0, rz: restRz, duration: 0.6 * k, ease: "power2.inOut" }, ">-0.12");
    }
    return () => {
      tl.current?.kill();
    };
  }, [featured, dims, restRz, rig]);

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const r = rig.current;
    const p = pose.current;
    const L = live.current;
    const delta = Math.min(dt, 1 / 20);

    if (Number.isNaN(L.slot)) L.slot = r.layoutX[index] ?? 0;
    easing.damp(L, "slot", r.layoutX[index] ?? 0, 0.28, delta);
    const hoverTarget = featured ? 0 : hovered ? 1 : spotlit ? 0.6 : 0;
    easing.damp(L, "hover", hoverTarget, hovered ? 0.14 : 0.22, delta);

    // shelf pose: pivot about the bottom-left corner (lean) and the bottom
    // spine edge (finger tip-out), then move to the book's centre.
    const h = L.hover;
    const rx = p.rx + h * 0.15;
    const sy = p.sy + h * 0.012;
    const sz = p.sz + h * 0.3 + (r.depthJitter[index] ?? 0);
    const halfT = dims.T / 2;
    const zFront = dims.D / 2;
    _m.makeTranslation(L.slot, sy, sz);
    _m.multiply(_t.makeTranslation(-halfT, 0, 0));
    _m.multiply(_t.makeRotationZ(p.rz));
    _m.multiply(_t.makeTranslation(halfT, 0, zFront));
    _m.multiply(_t.makeRotationX(rx));
    _m.multiply(_t.makeTranslation(0, dims.H / 2, -zFront));
    _m.decompose(_shelfPos, _shelfQuat, _scale);

    let px = _shelfPos.x;
    let py = _shelfPos.y;
    let pz = _shelfPos.z;
    let s = 1;
    if (p.detach > 0.0001) {
      const t = state.clock.elapsedTime;
      const spin = r.spin;
      const idle = r.reduced ? 0 : 1;
      _featPos.copy(r.anchor);
      _featPos.y += Math.sin(t * 0.9) * 0.025 * idle;
      // when the cover is open, square the book up so the spread faces the viewer
      const turn = -0.5 * THREE.MathUtils.clamp(L.open / 1.9, 0, 1);
      _euler.set(spin.x + 0.05 + Math.sin(t * 0.6) * 0.02 * idle, -Math.PI / 2 + 0.52 + turn + spin.y + Math.sin(t * 0.45) * 0.035 * idle, 0);
      _featQuat.setFromEuler(_euler);
      const d = p.detach;
      px += (_featPos.x - px) * d;
      py += (_featPos.y - py) * d;
      pz += (_featPos.z - pz) * d;
      _shelfQuat.slerp(_featQuat, d);
      s = 1 + (r.featureHeight / dims.H - 1) * d;
    }
    g.position.set(px, py, pz);
    g.quaternion.copy(_shelfQuat);
    g.scale.setScalar(s);

    // cover hinge
    const openTarget = coverOpen ? 1.9 : featured && hovered ? 0.28 : 0;
    easing.damp(L, "open", openTarget, coverOpen ? 0.5 : 0.35, delta);
    if (frontHinge.current) frontHinge.current.rotation.y = -Math.max(p.open, L.open);
  });

  // ── pointer handling ──
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.pointerType === "touch") return;
    hover(index);
  };
  const onOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (useShelf.getState().hovered === index) hover(null);
  };
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const r = rig.current;
    if (featured) {
      r.spin.active = true;
      r.spin.lastX = e.clientX;
      r.spin.lastY = e.clientY;
      r.spin.vx = 0;
      r.spin.vy = 0;
    }
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (shelfPointer.dragMoved) return;
    if (!useShelf.getState().ready) return;
    if (featured) toggleCover();
    else feature(index);
  };

  return (
    <group ref={root} onPointerOver={onOver} onPointerOut={onOut} onPointerDown={onDown} onClick={onClick}>
      <BookMeshes ref={frontHinge} dims={dims} geo={geo} mats={mats} />
    </group>
  );
}
