"use client";

import Link from "@/components/ui/SiteLink";
import { useState } from "react";
import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { CONSULT_HREF, footerNav } from "@/data/site";
import { supportChannels } from "@/data/support";
import { emailSchema } from "@/lib/schemas";
import { ButtonLink } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { LogoMark } from "./Logo";

function Newsletter() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = emailSchema.safeParse(email);
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }
    setBusy(true);
    await new Promise((res) => setTimeout(res, 600));
    setBusy(false);
    setEmail("");
    setError(null);
    toast.success("You're on the list", "Expect one thoughtful letter a month about writing and publishing.");
  };
  return (
    <form onSubmit={submit} noValidate className="w-full max-w-sm">
      <label htmlFor="newsletter" className="eyebrow">
        The Author’s Letter
      </label>
      <div className="mt-3 flex items-center gap-2 border-b border-line-strong pb-2 focus-within:border-accent">
        <input
          id="newsletter"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="you@example.com"
          aria-invalid={!!error}
          aria-describedby={error ? "newsletter-error" : undefined}
          className="min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-faint focus:outline-none"
        />
        <button type="submit" disabled={busy} aria-label="Subscribe" className="grid size-9 place-items-center rounded-full bg-accent text-on-accent transition hover:bg-accent-bright disabled:opacity-50">
          <ArrowRight className="size-4" />
        </button>
      </div>
      {error && (
        <p id="newsletter-error" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line bg-deep">
      <div className="container-x py-20">
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow">Your story, finished</p>
            <h2 className="display-lg mt-4 max-w-[14ch]">
              Your book belongs on a <em className="gold-text italic">shelf</em>.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/publish" size="lg">
              Start publishing <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href={CONSULT_HREF} size="lg" variant="ghost">
              Book a free consultation
            </ButtonLink>
          </div>
        </div>
        <div className="hairline my-14" />
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3" aria-label="StoryShelf home">
              <LogoMark className="h-12 w-12 text-accent" />
              <span className="font-serif text-2xl">
                Story<span className="text-accent">Shelf</span>
              </span>
            </Link>
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-accent" /> <a href={`tel:${supportChannels.phone.replace(/\s/g, "")}`} className="hover:text-fg">{supportChannels.phone}</a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="size-4 text-accent" />{" "}
                <a href={`https://wa.me/${supportChannels.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="hover:text-fg">
                  WhatsApp {supportChannels.whatsapp}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-accent" /> <a href={`mailto:${supportChannels.email}`} className="hover:text-fg">{supportChannels.email}</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" /> {supportChannels.address}
              </li>
            </ul>
            <Newsletter />
          </div>
          {footerNav.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="eyebrow">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted transition-colors hover:text-fg">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-xs text-faint md:flex-row">
          <p>© 2026 StoryShelf. Authors keep 100% of their copyright.</p>
          <p className="font-mono uppercase tracking-[0.2em]">Read freely · Publish proudly</p>
        </div>
      </div>
      <p aria-hidden className="pointer-events-none select-none whitespace-nowrap text-center font-display text-[19vw] font-light leading-[0.75] text-fg/[0.04]">
        StoryShelf
      </p>
    </footer>
  );
}
