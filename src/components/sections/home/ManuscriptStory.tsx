"use client";

import Link from "@/components/ui/SiteLink";
import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight, Check, Star } from "lucide-react";
import { services } from "@/data/services";
import { showcaseBySlug as bookBySlug } from "@/data/showcaseBooks";
import { cn, pad2 } from "@/lib/utils";
import { CssBook } from "@/components/library/CssBook";
import { Emblem } from "@/components/ui/Emblem";
import { LogoMark } from "@/components/layout/Logo";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const book = bookBySlug("circuit-of-stars")!;
const LINES = [92, 100, 86, 97, 74, 100, 90, 64, 98, 88, 95, 58];

/** The manuscript page with editor's marks. */
function Manuscript() {
  return (
    <div className="ms-stack absolute left-1/2 top-1/2 h-[380px] w-[290px] -translate-x-1/2 -translate-y-1/2">
      {[2, 1, 0].map((i) => (
        <div
          key={i}
          className={cn("ms-sheet absolute inset-0 rounded-[3px] bg-paper shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]", i === 0 && "ms-top")}
          style={{ transform: `rotate(${(i - 1) * 3}deg) translate(${i * 6}px, ${i * 4}px)` }}
        >
          {i === 0 && (
            <div className="p-7">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-black/40">Chapter One · Draft 3</p>
              <div className="mt-5 space-y-[9px]">
                {LINES.map((w, k) => (
                  <div key={k} className="ms-line h-[5px] origin-left rounded-full bg-black/15" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      <svg className="absolute inset-0 overflow-visible" viewBox="0 0 290 380" fill="none" aria-hidden>
        <path className="ms-mark" d="M28 96 C 90 92, 150 100, 232 94" stroke="var(--c-edit-mark)" strokeWidth="2.2" strokeLinecap="round" pathLength={1} />
        <path className="ms-mark" d="M30 152 q 40 18 80 0 t 80 0" stroke="var(--c-edit-mark)" strokeWidth="2" strokeLinecap="round" pathLength={1} />
        <path className="ms-mark" d="M206 196 c 22 -18 46 -6 40 16 c -6 20 -40 18 -46 -2" stroke="var(--c-edit-mark)" strokeWidth="2" strokeLinecap="round" pathLength={1} />
        <path className="ms-mark" d="M60 262 l 120 0 M 60 268 l 90 0" stroke="var(--c-edit-mark)" strokeWidth="1.6" strokeLinecap="round" pathLength={1} />
      </svg>
      <div className="ms-note absolute opacity-0 -right-24 top-10 w-44 rounded-lg border border-line-strong bg-surface p-3 text-xs text-muted shadow-lifted">
        <p className="font-semibold text-fg">Editor’s note</p>
        <p className="mt-1">“Open on the signal, not the scrapyard — it hooks the reader in line one.”</p>
      </div>
    </div>
  );
}

function Posters() {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="mk-card absolute opacity-0 -left-[230px] -top-[170px] h-[230px] w-[170px] rounded-lg border border-line-strong bg-linear-to-br from-raised to-hover p-4 shadow-lifted">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">Out now</p>
        <p className="mt-2 font-display text-2xl leading-none text-fg">Circuit of Stars</p>
        <div className="mt-4 grid h-24 place-items-center rounded bg-black/30">
          <Emblem name="circuit" className="size-16 text-accent" />
        </div>
      </div>
      <div className="mk-card absolute opacity-0 left-[70px] -top-[200px] w-[200px] rounded-lg border border-line-strong bg-surface p-4 shadow-lifted">
        <div className="flex gap-0.5 text-accent">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="size-3.5 fill-current" />
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">“A brilliant, big-hearted first-contact novel.”</p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-faint">Future Fiction India</p>
      </div>
      <div className="mk-card absolute opacity-0 left-[90px] top-[60px] w-[210px] overflow-hidden rounded-lg border border-line-strong bg-surface shadow-lifted">
        <div className="relative grid h-24 place-items-center bg-linear-to-br from-hover to-deep">
          <span className="grid size-10 place-items-center rounded-full bg-accent text-on-accent">▶</span>
        </div>
        <p className="p-3 text-xs text-muted">Book trailer · 12.4k views</p>
      </div>
    </div>
  );
}

function Checklist() {
  const rows = ["Agreement signed digitally", "ISBN & barcode registered", "Print-on-demand ready", "Live on 4 stores"];
  return (
    <div className="pm-card absolute opacity-0 bottom-[6%] right-[2%] w-[260px] rounded-xl border border-line-strong bg-surface/95 p-5 shadow-lifted backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Publication plan</p>
      <ul className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <li key={r} className="pm-row flex items-center gap-2.5 text-sm text-fg">
            <span className="pm-tick grid size-5 place-items-center rounded-full bg-success/20 text-success">
              <Check className="size-3" />
            </span>
            {r}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["Amazon", "Flipkart", "Google Play", "StoryShelf Store"].map((s) => (
          <span key={s} className="pm-badge rounded-pill border border-line-strong px-2.5 py-1 text-[10px] text-muted">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function SupportChat() {
  const bubbles = [
    { who: "Sana · Publication Manager", text: "Your final proofs are ready to review ✨", side: "left" },
    { who: "You", text: "Approved! Can we launch on the 15th?", side: "right" },
    { who: "Arjun · Publishing Consultant", text: "Done — launch plan & posters are in your dashboard.", side: "left" },
  ];
  return (
    <div className="absolute -left-[8%] top-[6%] w-[240px] space-y-2.5">
      {bubbles.map((b, i) => (
        <div key={i} className={cn("sp-bubble rounded-2xl opacity-0 border border-line-strong p-3 text-xs shadow-lifted", b.side === "right" ? "ml-10 rounded-br-sm bg-accent text-on-accent" : "rounded-bl-sm bg-surface text-fg")}>
          <p className={cn("font-semibold", b.side === "right" ? "text-on-accent/70" : "text-accent")}>{b.who}</p>
          <p className="mt-0.5">{b.text}</p>
        </div>
      ))}
    </div>
  );
}

export function ManuscriptStory() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(root);
        gsap.set(q(".ms-mark"), { strokeDasharray: 1, strokeDashoffset: 1 });
        gsap.set(q(".ms-line"), { scaleX: 0 });
        gsap.set(q(".ms-note"), { autoAlpha: 0, y: 20 });
        gsap.set(q(".st-book"), { autoAlpha: 0, rotateY: -95, rotateX: 8, z: -200 });
        gsap.set(q(".mk-card"), { autoAlpha: 0, scale: 0.6, x: 0, y: 40 });
        gsap.set(q(".pm-card"), { autoAlpha: 0, y: 60 });
        gsap.set(q(".pm-row"), { autoAlpha: 0, x: -10 });
        gsap.set(q(".pm-badge"), { autoAlpha: 0, scale: 0.6 });
        gsap.set(q(".sp-bubble"), { autoAlpha: 0, y: 24, scale: 0.92 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "+=420%",
            pin: q(".st-pin")[0],
            scrub: 0.8,
            onUpdate: (self) => setActive(Math.min(4, Math.floor(self.progress * 5 * 0.999))),
          },
        });
        // 1 · Writing & Editing
        tl.to(q(".ms-line"), { scaleX: 1, stagger: 0.04, duration: 0.5 }, 0)
          .to(q(".ms-mark"), { strokeDashoffset: 0, stagger: 0.12, duration: 0.4 }, 0.35)
          .to(q(".ms-note"), { autoAlpha: 1, y: 0, duration: 0.3 }, 0.6)
          // 2 · Book Production: pages gather, the bound book turns into view
          .to(q(".ms-note"), { autoAlpha: 0, y: -10, duration: 0.2 }, 1.05)
          .to(q(".ms-mark"), { autoAlpha: 0, duration: 0.2 }, 1.05)
          .to(q(".ms-sheet"), { rotate: 0, x: 0, y: 0, duration: 0.3 }, 1.1)
          .to(q(".ms-stack"), { scale: 0.62, autoAlpha: 0, rotateY: -30, duration: 0.45 }, 1.35)
          .to(q(".st-book"), { autoAlpha: 1, rotateY: -28, rotateX: 4, z: 0, duration: 0.6, ease: "power3.out" }, 1.4)
          // 3 · Marketing & Publicity
          .to(q(".mk-card"), { autoAlpha: 1, scale: 1, y: 0, stagger: 0.12, duration: 0.45, ease: "back.out(1.4)" }, 2.1)
          .to(q(".st-book"), { rotateY: -14, duration: 0.6 }, 2.1)
          // 4 · Publishing Management
          .to(q(".mk-card"), { autoAlpha: 0.18, scale: 0.92, duration: 0.3 }, 3.05)
          .to(q(".pm-card"), { autoAlpha: 1, y: 0, duration: 0.35 }, 3.1)
          .to(q(".pm-row"), { autoAlpha: 1, x: 0, stagger: 0.1, duration: 0.25 }, 3.25)
          .to(q(".pm-badge"), { autoAlpha: 1, scale: 1, stagger: 0.06, duration: 0.2, ease: "back.out(2)" }, 3.6)
          .to(q(".st-book"), { rotateY: -32, duration: 0.6 }, 3.1)
          // 5 · Author Support
          .to(q(".pm-card"), { autoAlpha: 0.25, duration: 0.3 }, 4.05)
          .to(q(".sp-bubble"), { autoAlpha: 1, y: 0, scale: 1, stagger: 0.18, duration: 0.35, ease: "back.out(1.6)" }, 4.1)
          .to(q(".st-book"), { rotateY: -20, rotateX: 2, duration: 0.8 }, 4.1)
          .to({}, { duration: 0.15 });
        return () => setActive(0);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="story-title" className="relative">
      {/* desktop: pinned, scroll-scrubbed story */}
      <div className="st-pin hidden h-screen items-center overflow-hidden lg:flex motion-reduce:!hidden">
        <div className="container-x grid w-full grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-12">
          <div>
            <p className="eyebrow">From manuscript to masterpiece</p>
            <h2 id="story-title" className="display-lg mt-4">
              Five crafts. <br />
              <em className="gold-text italic">One</em> finished book.
            </h2>
            <ol className="relative mt-10 space-y-1 border-l border-line pl-6">
              <span aria-hidden className="absolute -left-px top-0 w-px bg-accent transition-[height] duration-500 ease-book" style={{ height: `${((active + 1) / 5) * 100}%` }} />
              {services.map((s, i) => (
                <li key={s.slug} className={cn("transition-all duration-500 ease-book", i === active ? "opacity-100" : "opacity-35")}>
                  <div className="flex items-baseline gap-4 py-2">
                    <span className="font-mono text-xs text-accent">{s.number}</span>
                    <div>
                      <p className="font-serif text-xl text-fg">{s.title}</p>
                      <div className={cn("grid transition-[grid-template-rows] duration-500 ease-book", i === active ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                        <div className="overflow-hidden">
                          <p className="pt-2 text-sm leading-relaxed text-muted">{s.short}</p>
                          <Link href={`/services/${s.slug}`} className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline">
                            Explore {s.title.toLowerCase()} <ArrowUpRight className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative h-[min(640px,78vh)] [perspective:1600px]" aria-hidden>
            <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,var(--c-accent-soft),transparent_70%)]" />
            <Manuscript />
            <Posters />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d]">
              <div className="st-book opacity-0 [transform-style:preserve-3d]">
                <CssBook book={book} width={250} />
              </div>
            </div>
            <Checklist />
            <SupportChat />
            <div className="absolute bottom-0 left-0 font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
              Stage {pad2(active + 1)} / 05 · {services[active].title}
            </div>
          </div>
        </div>
      </div>

      {/* mobile / reduced motion: a calm, readable list */}
      <div className="container-x py-24 lg:hidden motion-reduce:lg:block">
        <p className="eyebrow">From manuscript to masterpiece</p>
        <h2 className="display-lg mt-4">
          Five crafts. <em className="gold-text italic">One</em> finished book.
        </h2>
        <ol className="mt-10 space-y-4">
          {services.map((s) => (
            <li key={s.slug}>
              <Link href={`/services/${s.slug}`} className="flex gap-4 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent">
                <Emblem name={s.emblem} className="size-10 shrink-0 text-accent" />
                <div>
                  <p className="font-mono text-xs text-accent">{s.number}</p>
                  <p className="font-serif text-xl">{s.title}</p>
                  <p className="mt-1 text-sm text-muted">{s.short}</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex items-center gap-3 text-sm text-muted">
          <LogoMark className="size-6 text-accent" /> Every pillar is included in every plan, at different depths.
        </div>
      </div>
    </section>
  );
}
