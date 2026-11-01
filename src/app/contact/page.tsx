import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { supportChannels } from "@/data/support";
import { PageHero } from "@/components/ui/PageHero";
import { ContactForm } from "@/components/support/ContactForm";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to StoryShelf — publishing enquiries, existing authors, library questions and press.",
};

export default function ContactPage() {
  const rows = [
    { I: Phone, l: "Call", v: supportChannels.phone, href: `tel:${supportChannels.phone.replace(/\s/g, "")}` },
    { I: MessageCircle, l: "WhatsApp", v: supportChannels.whatsapp, href: `https://wa.me/${supportChannels.whatsapp.replace(/\D/g, "")}` },
    { I: Mail, l: "Email", v: supportChannels.email, href: `mailto:${supportChannels.email}` },
    { I: Clock, l: "Hours", v: supportChannels.hours },
    { I: MapPin, l: "Studio", v: supportChannels.address },
  ];
  return (
    <main>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Let&rsquo;s talk about <em className="gold-text italic">your</em> book.
          </>
        }
        intro="Whether you have a finished manuscript or just an idea, we'd love to hear from you."
      />
      <section className="container-x grid gap-16 py-24 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <ul className="space-y-6">
            {rows.map(({ I, l, v, href }) => (
              <li key={l} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line-strong text-accent">
                  <I className="size-5" />
                </span>
                <span>
                  <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-faint">{l}</span>
                  {href ? (
                    <a href={href} className="text-fg hover:text-accent" {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                      {v}
                    </a>
                  ) : (
                    <span className="text-fg">{v}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={120} className="rounded-xl border border-line bg-surface p-6 md:p-10">
          <ContactForm />
        </Reveal>
      </section>
    </main>
  );
}
