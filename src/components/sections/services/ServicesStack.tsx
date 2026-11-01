"use client";

import { useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import gsap from "gsap";
import { ArrowUpRight, Check } from "lucide-react";
import { services } from "@/data/services";
import { serviceSwatch } from "@/data/showcase";
import { theme } from "@/theme";
import { getLenis } from "@/components/layout/SmoothScroll";
import { useScrollScene } from "@/components/motion/useScrollScene";
import { ButtonLink } from "@/components/ui/Button";
import { cn, pad2 } from "@/lib/utils";
import { ServiceScene } from "./ServiceScene";
import s from "./Services.module.css";

/** Tall desktop screens stack the cards (see Services.module.css). */
const STACKED = "(min-width: 1024px) and (min-height: 820px)";

/** Where a (possibly pinned) list item would sit in the page if it weren't pinned. */
function naturalTop(items: HTMLElement[], i: number) {
  const list = items[0].parentElement;
  if (!list) return 0;
  let y = list.getBoundingClientRect().top + window.scrollY;
  for (let j = 0; j < i; j++) y += items[j].offsetHeight + parseFloat(getComputedStyle(items[j + 1]).marginTop);
  return y;
}

/**
 * The five services as chapters of one book. Each card pairs a live little
 * scene (your book in that service's cloth, with the work happening around
 * it) with what the service includes and how it runs. On tall desktop
 * screens the cards pin and stack: each new chapter slides over the last,
 * which sinks back and dims, leaving its gilt top edge in view.
 */
export function ServicesStack() {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);

  // floating details only animate while their card is on screen
  useEffect(() => {
    const cards = root.current?.querySelectorAll<HTMLElement>(".svc-card");
    if (!cards?.length) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle(s.live, e.isIntersecting)), { rootMargin: "80px 0px" });
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  useScrollScene(root, () => {
    gsap.from(".svh-in", { y: 30, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: root.current, start: "top 80%", once: true } });

    const items = gsap.utils.toArray<HTMLElement>(".svc-item");
    const cleanups: (() => void)[] = [];
    items.forEach((item) => {
      const q = gsap.utils.selector(item);
      const st = { trigger: item, start: "top 78%", once: true };
      gsap.fromTo(q(".svc-book"), { rotationY: -95, rotationX: 10, autoAlpha: 0 }, { rotationY: -26, rotationX: 6, autoAlpha: 1, duration: 1.5, ease: "expo.out", scrollTrigger: st });
      gsap.from(q(".svc-pop"), { autoAlpha: 0, scale: 0.82, y: 26, duration: 1, ease: "back.out(1.6)", stagger: 0.12, delay: 0.25, scrollTrigger: st });
      gsap.from(q(".svc-bar"), { scaleY: 0, duration: 0.9, ease: "expo.out", stagger: 0.06, delay: 0.7, scrollTrigger: st });
      gsap.from(q(".svc-in"), { y: 28, autoAlpha: 0, duration: 0.9, ease: "expo.out", stagger: 0.06, delay: 0.1, scrollTrigger: st });

      // depth: floating cards drift at different speeds as the card passes
      q(".svc-float").forEach((el) => {
        const depth = Number((el as HTMLElement).dataset.depth ?? 0.5);
        gsap.fromTo(el, { y: depth * 34 }, { y: -depth * 34, ease: "none", scrollTrigger: { trigger: item, start: "top bottom", end: "bottom top", scrub: true } });
      });

      // the scene leans toward the pointer (fine pointers only)
      const stage = q(".svc-stage")[0] as HTMLElement | undefined;
      const rig = q(".svc-rig")[0];
      if (stage && rig && window.matchMedia("(pointer: fine)").matches) {
        const rx = gsap.quickTo(rig, "rotationX", { duration: 0.8, ease: "power3.out" });
        const ry = gsap.quickTo(rig, "rotationY", { duration: 0.8, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          const r = stage.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 8);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 5);
        };
        const leave = () => {
          rx(0);
          ry(0);
        };
        stage.addEventListener("pointermove", move);
        stage.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          stage.removeEventListener("pointermove", move);
          stage.removeEventListener("pointerleave", leave);
        });
      }
    });

    // stacked: each chapter sinks back and dims as the next slides over it
    const mm = gsap.matchMedia();
    mm.add(STACKED, () => {
      items.slice(0, -1).forEach((item, i) => {
        const next = items[i + 1];
        const scrollTrigger = { trigger: next, start: "top bottom", end: () => `top ${parseFloat(getComputedStyle(next).top) || 0}px`, scrub: true, invalidateOnRefresh: true };
        gsap.fromTo(item.querySelector(".svc-card"), { scale: 1 }, { scale: 0.95, ease: "none", scrollTrigger });
        gsap.fromTo(item.querySelector(".svc-dim"), { opacity: 0 }, { opacity: 0.55, ease: "none", scrollTrigger });
      });
    });
    return () => {
      mm.revert();
      cleanups.forEach((c) => c());
    };
  });

  const jump = (e: MouseEvent, i: number) => {
    const items = Array.from(list.current?.children ?? []) as HTMLElement[];
    if (!items[i]) return;
    e.preventDefault();
    const pinned = window.matchMedia(STACKED).matches;
    const offset = pinned ? parseFloat(getComputedStyle(items[i]).top) || 0 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 80;
    const y = naturalTop(items, i) - offset - (pinned ? 0 : 16);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <section ref={root} aria-labelledby="services-heading" className="pb-16 pt-20 md:pt-28">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="svh-in eyebrow">Five crafts · one team</p>
            <h2 id="services-heading" className="svh-in display-lg mt-4 max-w-[17ch]">
              Everything your book needs, <em className="gold-text italic">under one roof</em>.
            </h2>
          </div>
          <nav aria-label="Jump to a service" className="svh-in">
            <ol className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
              {services.map((sv, i) => (
                <li key={sv.slug}>
                  <a
                    href={`#${sv.slug}`}
                    onClick={(e) => jump(e, i)}
                    className="group inline-flex items-center gap-2 rounded-pill border border-line-strong px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-fg"
                  >
                    <span className="num text-[11px] text-accent">{sv.number}</span>
                    {sv.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <ol ref={list} className="mt-14 lg:mt-20">
          {services.map((sv, i) => (
            <li key={sv.slug} id={sv.slug} className={cn(s.item, "svc-item scroll-mt-28")} style={{ "--i": i } as CSSProperties}>
              <article
                aria-labelledby={`svc-${sv.slug}`}
                className={cn(s.card, "svc-card")}
                style={{ "--svc": theme.scene.books[(serviceSwatch[sv.slug] ?? 0) % theme.scene.books.length].art } as CSSProperties}
              >
                <div className={cn(s.dim, "svc-dim")} />
                <div className="grid gap-2 p-2.5 sm:p-3 lg:grid-cols-[1.02fr_1fr] lg:gap-6">
                  <ServiceScene service={sv} />
                  <div className="flex flex-col px-3 pb-5 pt-5 sm:px-5 lg:py-8 lg:pl-2 lg:pr-8">
                    <div className="svc-in flex items-center justify-between gap-4">
                      <p className="eyebrow">
                        Service {sv.number} <span className="text-faint">/ {pad2(services.length)}</span>
                      </p>
                      <span aria-hidden className="flex gap-1">
                        {services.map((x, j) => (
                          <span key={x.slug} className={cn("h-1 w-5 rounded-full", j <= i ? "bg-accent" : "bg-line-strong")} />
                        ))}
                      </span>
                    </div>
                    <h3 id={`svc-${sv.slug}`} className="svc-in mt-4 font-display text-[clamp(2.2rem,3.3vw,3.3rem)] font-light leading-[1.02] tracking-[-0.01em]">
                      {sv.title}
                    </h3>
                    <p className="svc-in mt-3 font-serif text-lg italic leading-snug text-accent">{sv.short}</p>
                    <p className="svc-in mt-4 text-[15px] leading-relaxed text-muted">{sv.description}</p>
                    <ul className="mt-6 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
                      {sv.includes.map((inc) => (
                        <li key={inc.title} className="svc-in flex items-start gap-2.5 text-fg">
                          <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                            <Check className="size-2.5" strokeWidth={3.5} />
                          </span>
                          {inc.title}
                        </li>
                      ))}
                    </ul>
                    <div className="svc-in mt-7">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">How we work</p>
                      <ol className="mt-3 grid grid-cols-4 gap-2">
                        {sv.process.map((p, k) => (
                          <li key={p.title}>
                            <div className="flex items-center gap-2">
                              <span className="num grid size-6 shrink-0 place-items-center rounded-full border border-accent/60 text-[11px] text-accent">{k + 1}</span>
                              {k < sv.process.length - 1 && <span aria-hidden className="h-px flex-1 bg-[linear-gradient(90deg,var(--c-accent),var(--c-border-strong))] opacity-60" />}
                            </div>
                            <p className="mt-2 text-[13px] text-fg">{p.title}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="svc-in mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-7">
                      <ButtonLink href={`/services/${sv.slug}`} variant="ghost" size="sm">
                        Explore {sv.title.toLowerCase()} <ArrowUpRight className="size-3.5" />
                      </ButtonLink>
                      <p className="max-w-xs text-xs leading-relaxed text-faint">{sv.planNote}</p>
                    </div>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
