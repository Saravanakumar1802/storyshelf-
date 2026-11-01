"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarCheck, Mail, PenLine } from "lucide-react";
import type { PublishRequest } from "@/types";
import { planById } from "@/data/plans";
import { errorMessage, getPublishRequest } from "@/lib/api";
import { formatINR2 } from "@/lib/utils";
import { useAuth } from "@/lib/store/auth";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/layout/Logo";

export function PublishSuccess() {
  const ref = useSearchParams().get("ref") ?? "";
  const user = useAuth((s) => s.user);
  const [req, setReq] = useState<PublishRequest | null>(null);
  const [error, setError] = useState<string | null>(ref ? null : "missing");

  useEffect(() => {
    if (!ref) return;
    let alive = true;
    getPublishRequest(ref)
      .then((r) => alive && setReq(r))
      .catch((e) => alive && setError(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [ref]);

  if (error)
    return (
      <div className="py-40 text-center">
        <h1 className="display-md">We couldn&rsquo;t find that request</h1>
        <p className="mt-3 text-muted">If you just submitted, check your email for confirmation — or start a new request.</p>
        <ButtonLink href="/publish" className="mt-8">
          Start publishing
        </ButtonLink>
      </div>
    );
  if (!req) return <div className="py-40 text-center text-muted">Confirming your request…</div>;

  const date = new Date(`${req.consultation.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="mx-auto max-w-2xl py-36 text-center">
      <LogoMark animated className="mx-auto size-24 text-accent" />
      <p className="eyebrow mt-8">Request received · {req.id}</p>
      <h1 className="display-lg mt-4">
        Your story is <em className="gold-text italic">on its way</em>.
      </h1>
      <p className="mt-5 text-muted">
        Thank you, {req.author.name.split(" ")[0]}. We can&rsquo;t wait to read <em className="text-fg">{req.manuscript.title}</em>.
      </p>
      <ol className="mt-12 space-y-4 text-left">
        {[
          { I: Mail, t: "Check your inbox", d: `We've sent your quote (${formatINR2(req.quote.total)} incl. GST, ${planById(req.plan).name} plan) to ${req.author.email}.` },
          { I: CalendarCheck, t: `Consultation on ${date} at ${req.consultation.slot} IST`, d: "Your Publishing Consultant will call you on the number you gave us." },
          { I: PenLine, t: "Sign & begin", d: "After the call, sign your non-exclusive agreement digitally and your Publication Manager takes it from there." },
        ].map(({ I, t, d }) => (
          <li key={t} className="flex gap-4 rounded-lg border border-line bg-surface p-5">
            <I className="mt-0.5 size-5 shrink-0 text-accent" />
            <div>
              <p className="font-medium text-fg">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {user?.role === "author" ? (
          <ButtonLink href="/dashboard">Follow it in your dashboard</ButtonLink>
        ) : (
          // signing up with the same email links this request to the new account
          <ButtonLink href="/signup?as=author&next=%2Fdashboard">Create your author account</ButtonLink>
        )}
        <ButtonLink href="/support/guides/preparing-your-manuscript" variant="ghost">
          Prepare your manuscript
        </ButtonLink>
      </div>
    </div>
  );
}
