"use client";

import Link from "@/components/ui/SiteLink";
import { useRef } from "react";
import gsap from "gsap";
import { ArrowUpRight, CalendarDays, Clock, LifeBuoy, Mail, MessageCircle, Phone, Ticket } from "lucide-react";
import { guides, supportChannels } from "@/data/support";
import { journey } from "@/data/services";
import { useScrollScene } from "@/components/motion/useScrollScene";
import { pad2 } from "@/lib/utils";

const channels = [
  { I: Ticket, t: "Raise a request", d: "Tracked to resolution, reply within 1 working day.", href: "/support/ticket" },
  { I: CalendarDays, t: "Book a call", d: "30 minutes with a Publishing Consultant.", href: "/support/consultation" },
  { I: MessageCircle, t: "WhatsApp", d: supportChannels.whatsapp, href: `https://wa.me/${supportChannels.whatsapp.replace(/\D/g, "")}` },
  { I: Phone, t: "Call us", d: supportChannels.phone, href: `tel:${supportChannels.phone.replace(/\s/g, "")}` },
  { I: Mail, t: "Email", d: supportChannels.email, href: `mailto:${supportChannels.email}` },
  { I: LifeBuoy, t: "FAQs", d: "Answers to the questions authors ask most.", href: "/support/faq" },
];

/** Contact channels: cards flip up into place, like pages being turned up. */
export function ChannelGrid() {
  const root = useRef<HTMLUListElement>(null);
  useScrollScene(root, () => {
    gsap.from(".ch-card", {
      rotateX: -70,
      y: 40,
      autoAlpha: 0,
      transformOrigin: "50% 0%",
      transformPerspective: 1000,
      duration: 1.1,
      ease: "expo.out",
      stagger: { each: 0.08, grid: "auto", from: "start" },
      scrollTrigger: { trigger: root.current, start: "top 82%", once: true },
    });
  });
  return (
    <ul ref={root} className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {channels.map(({ I, t, d, href }) => (
        <li key={t} className="ch-card">
          <Link
            href={href}
            {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
            className="group flex h-full items-start gap-4 rounded-xl border border-line bg-surface p-6 transition-[border-color,transform] duration-500 ease-book hover:-translate-y-1 hover:border-accent"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent transition-transform duration-500 ease-book group-hover:rotate-[-8deg] group-hover:scale-110">
              <I className="size-5" />
            </span>
            <span className="flex-1">
              <span className="flex items-center justify-between font-serif text-lg text-fg">
                {t} <ArrowUpRight className="size-4 text-faint transition-colors group-hover:text-accent" />
              </span>
              <span className="mt-1 block text-sm text-muted">{d}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const stages = ["Before you start", "Production", "Launch", "After launch"] as const;

/**
 * Guides by stage. On large screens the section pins and the stages travel
 * sideways as you scroll (a gold line tracks progress); elsewhere it's a
 * normal stacked list.
 */
export function GuidesTrack() {
  const root = useRef<HTMLElement>(null);
  useScrollScene(root, () => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const track = root.current?.querySelector<HTMLElement>(".gt-track");
      if (!track) return;
      const distance = () => Math.max(0, track.scrollWidth - track.clientWidth);
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top top", end: () => `+=${distance() + window.innerHeight * 0.4}`, pin: true, scrub: 0.7, invalidateOnRefresh: true },
      });
      tl.to(".gt-row", { x: () => -distance(), ease: "none" }, 0).fromTo(".gt-progress", { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0);
    });
    gsap.from(".gt-col", { y: 50, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: root.current, start: "top 80%", once: true } });
    return () => mm.revert();
  });

  return (
    <section ref={root} className="overflow-hidden border-y border-line bg-surface py-24 lg:flex lg:min-h-[100svh] lg:flex-col lg:justify-center lg:py-16">
      <div className="container-x">
        <p className="eyebrow">Guides</p>
        <h2 className="display-lg mt-4">Step-by-step, stage by stage.</h2>
        <div className="mt-8 hidden h-px bg-line lg:block">
          <div className="gt-progress h-full origin-left bg-accent" />
        </div>
      </div>
      <div className="gt-track container-x mt-12 lg:overflow-visible">
        <div className="gt-row grid gap-10 lg:flex lg:w-max lg:gap-8">
          {stages.map((st, i) => (
            <div key={st} className="gt-col lg:w-[440px] lg:shrink-0">
              <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
                <span className="num grid size-8 place-items-center rounded-full border border-accent/60 text-xs">{pad2(i + 1)}</span>
                {st}
              </p>
              <ul className="mt-5 space-y-3">
                {guides
                  .filter((g) => g.stage === st)
                  .map((g) => (
                    <li key={g.slug}>
                      <Link href={`/support/guides/${g.slug}`} className="group block rounded-lg border border-line bg-bg p-6 transition-[border-color,transform] duration-500 ease-book hover:-translate-y-1 hover:border-accent">
                        <span className="font-serif text-xl text-fg group-hover:text-accent">{g.title}</span>
                        <span className="mt-2 block text-sm leading-relaxed text-muted">{g.summary}</span>
                        <span className="mt-4 flex items-center gap-1 text-xs text-faint">
                          <Clock className="size-3" /> <span className="num">{g.readMinutes}</span> min read
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const roles = [
  { r: "Publishing Consultant", d: "Helps you choose the right plan and shape your goals — before you sign anything.", s: journey.slice(0, 2) },
  { r: "Publication Manager", d: "Owns your timeline and coordinates editors, designers and printers.", s: journey.slice(2, 6) },
  { r: "Author Support & Marketing", d: "Launch help, listings, royalties and post-publication care.", s: journey.slice(6) },
];

/** The three people who hand your book along, joined by a line drawn on scroll. */
export function TeamRelay() {
  const root = useRef<HTMLDivElement>(null);
  useScrollScene(root, () => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 75%", end: "bottom 60%", scrub: 0.6 } });
    tl.fromTo(".tr-line", { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0);
    gsap.utils.toArray<HTMLElement>(".tr-card").forEach((el, i) => {
      tl.fromTo(el, { autoAlpha: 0.15, y: 30 }, { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.35 }, i * 0.3);
      tl.fromTo(el.querySelector(".tr-dot"), { scale: 0 }, { scale: 1, ease: "back.out(3)", duration: 0.2 }, i * 0.3);
    });
  });
  return (
    <div ref={root} className="relative mt-14">
      <span aria-hidden className="tr-line absolute left-[16%] right-[16%] top-[22px] hidden h-px origin-left bg-[linear-gradient(90deg,var(--c-accent),var(--c-accent-bright),var(--c-accent))] md:block" />
      <ol className="grid gap-8 md:grid-cols-3">
        {roles.map((x, i) => (
          <li key={x.r} className="tr-card relative text-center">
            <span className="tr-dot relative z-10 mx-auto grid size-11 place-items-center rounded-full border border-accent bg-bg font-mono text-xs text-accent">
              <span className="num">{pad2(i + 1)}</span>
            </span>
            <div className="mt-6 rounded-xl border border-line bg-surface p-8 text-left">
              <h3 className="font-display text-3xl">{x.r}</h3>
              <p className="mt-3 text-sm text-muted">{x.d}</p>
              <p className="mt-5 flex flex-wrap gap-1.5">
                {x.s.map((j) => (
                  <span key={j.stage} className="rounded-pill border border-line-strong px-2.5 py-0.5 text-[11px] text-faint">
                    {j.stage}
                  </span>
                ))}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
