"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, RotateCcw, UploadCloud, X } from "lucide-react";
import type { PlanId } from "@/types";
import { addons, plans } from "@/data/plans";
import {
  ACCEPTED_MANUSCRIPT,
  MAX_MANUSCRIPT_MB,
  genresList,
  publishAuthorSchema,
  publishConsultSchema,
  publishManuscriptSchema,
  publishPlanSchema,
} from "@/lib/schemas";
import { ApiError, errorMessage, submitPublishRequest } from "@/lib/api";
import { useConsultationSlots } from "@/lib/hooks/useConsultationSlots";
import { SlotPicker } from "@/components/support/SlotPicker";
import { calcQuote, INCLUDED_PAGES } from "@/lib/pricing";
import { usePublishDraft, isDraftStarted } from "@/lib/store/publishDraft";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { planColor } from "@/lib/planColor";
import { cn, formatINR, formatINR2 } from "@/lib/utils";
import { Checkbox, Field, FormError, Input, Select, Spinner, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import type { z } from "zod";

const STEPS = ["About you", "Your manuscript", "Choose a plan", "Add-ons", "Review & quote", "Consultation"] as const;

type Errors = Record<string, string>;
const toErrors = (e: z.ZodError): Errors => Object.fromEntries(e.issues.map((i) => [i.path.join("."), i.message]));

/** Next 14 bookable days (Sundays closed). Client-only. */
function upcomingDays() {
  const out: { iso: string; label: string; day: string }[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (out.length < 14) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) continue;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ iso, label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), day: d.toLocaleDateString("en-IN", { weekday: "short" }) });
  }
  return out;
}

function SpineProgress({ step, maxStep, onJump }: { step: number; maxStep: number; onJump: (i: number) => void }) {
  return (
    <nav aria-label="Publishing steps" className="relative">
      <div className="relative h-2 overflow-hidden rounded-pill bg-hover">
        <div
          className="absolute inset-y-0 left-0 rounded-pill bg-[linear-gradient(90deg,var(--c-accent),var(--c-accent-bright))] transition-[width] duration-700 ease-book"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="mt-4 hidden grid-cols-6 gap-2 md:grid">
        {STEPS.map((s, i) => {
          const reachable = i <= maxStep;
          return (
            <li key={s}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onJump(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn("flex w-full items-center gap-2 text-left text-xs transition-colors", i === step ? "text-fg" : reachable ? "text-muted hover:text-accent" : "cursor-not-allowed text-faint")}
              >
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[10px]", i < step ? "border-accent bg-accent text-on-accent" : i === step ? "border-accent text-accent" : "border-line-strong")}>
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                {s}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted md:hidden">
        Step {step + 1} of {STEPS.length} · <span className="text-fg">{STEPS[step]}</span>
      </p>
    </nav>
  );
}

export function PublishWizard() {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const d = usePublishDraft();
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // ?plan= from the plans page / quiz pre-selects (only if no plan chosen yet)
  const planParam = params.get("plan") as PlanId | null;
  useEffect(() => {
    if (!hydrated) return;
    if (planParam && plans.some((p) => p.id === planParam) && !usePublishDraft.getState().plan) usePublishDraft.getState().patch("plan", planParam);
  }, [hydrated, planParam]);

  const days = useMemo(() => (hydrated ? upcomingDays() : []), [hydrated]);
  const diary = useConsultationSlots(hydrated ? d.consultation.date : "");
  const pages = Number(d.manuscript.pages) || 0;
  const quote = d.plan ? calcQuote(d.plan, d.addons, pages) : null;

  const scrollTop = () => top.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const validateStep = (i: number): Errors => {
    switch (i) {
      case 0: {
        const r = publishAuthorSchema.safeParse(d.author);
        return r.success ? {} : prefix("author", toErrors(r.error));
      }
      case 1: {
        const r = publishManuscriptSchema.safeParse(d.manuscript);
        return r.success ? {} : prefix("manuscript", toErrors(r.error));
      }
      case 2:
      case 3:
      case 4: {
        const r = publishPlanSchema.safeParse({ plan: d.plan, addons: d.addons });
        return r.success ? {} : { plan: "Choose a plan to continue" };
      }
      case 5: {
        const r = publishConsultSchema.safeParse(d.consultation);
        return r.success ? {} : prefix("consultation", toErrors(r.error));
      }
    }
    return {};
  };

  const next = () => {
    const e = validateStep(d.step);
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    d.goTo(d.step + 1);
    scrollTop();
  };
  const back = () => {
    setErrors({});
    d.goTo(d.step - 1);
    scrollTop();
  };
  const jump = (i: number) => {
    if (i > d.maxStep) return;
    // can only move forward past steps that are valid
    for (let k = 0; k < i; k++) {
      const e = validateStep(k);
      if (Object.keys(e).length) {
        setErrors(e);
        d.goTo(k);
        return;
      }
    }
    setErrors({});
    d.goTo(i);
  };

  const submit = async () => {
    for (let k = 0; k <= 5; k++) {
      const e = validateStep(k);
      if (Object.keys(e).length) {
        setErrors(e);
        d.goTo(k);
        return;
      }
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const req = await submitPublishRequest({
        author: d.author,
        manuscript: d.manuscript,
        plan: { plan: d.plan, addons: d.addons },
        consultation: d.consultation,
      });
      d.reset();
      router.push(`/publish/success?ref=${encodeURIComponent(req.id)}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "VALIDATION") toast.error("Some details need another look");
      if (e instanceof ApiError && e.code === "CONFLICT") {
        d.patch("consultation", { ...d.consultation, slot: "" });
        diary.refresh();
      }
      setServerError(errorMessage(e));
      setSubmitting(false);
    }
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    const ext = `.${f.name.split(".").pop()?.toLowerCase()}`;
    const m = { ...d.manuscript };
    if (!ACCEPTED_MANUSCRIPT.includes(ext as (typeof ACCEPTED_MANUSCRIPT)[number])) {
      setErrors((e) => ({ ...e, "manuscript.file": `Please upload a PDF or Word document (${ACCEPTED_MANUSCRIPT.join(", ")}).` }));
      return;
    }
    if (f.size === 0) {
      setErrors((e) => ({ ...e, "manuscript.file": "That file is empty." }));
      return;
    }
    if (f.size > MAX_MANUSCRIPT_MB * 1024 * 1024) {
      setErrors((e) => ({ ...e, "manuscript.file": `Files must be ${MAX_MANUSCRIPT_MB} MB or smaller.` }));
      return;
    }
    setErrors((e) => {
      const { ["manuscript.file"]: _omit, ...rest } = e;
      void _omit;
      return rest;
    });
    d.patch("manuscript", { ...m, fileName: f.name, fileSize: f.size });
  };

  if (!hydrated) return <div className="py-32 text-center text-muted">Preparing your publishing desk…</div>;

  const setAuthor = (k: keyof typeof d.author, v: string) => d.patch("author", { ...d.author, [k]: v });
  const setMs = (k: keyof typeof d.manuscript, v: string) => d.patch("manuscript", { ...d.manuscript, [k]: v });
  const err = (k: string) => errors[k];

  return (
    <div ref={top} className="scroll-mt-28">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1">
          <SpineProgress step={d.step} maxStep={d.maxStep} onJump={jump} />
        </div>
        {isDraftStarted(d) && (
          <div className="flex items-center gap-2 text-xs">
            {confirmReset ? (
              <>
                <span className="text-muted">Discard this draft?</span>
                <button
                  type="button"
                  className="rounded-pill bg-danger/15 px-3 py-1 text-danger"
                  onClick={() => {
                    d.reset();
                    setErrors({});
                    setConfirmReset(false);
                  }}
                >
                  Yes, start over
                </button>
                <button type="button" className="px-2 text-muted hover:text-fg" onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmReset(true)} className="flex items-center gap-1 text-muted hover:text-fg">
                <RotateCcw className="size-3.5" /> Start over
              </button>
            )}
          </div>
        )}
      </div>

      <div key={d.step} className="animate-panel-in rounded-xl border border-line bg-surface p-6 md:p-10">
        <h2 className="font-display text-4xl font-light">{STEPS[d.step]}</h2>

        {d.step === 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Field label="Full name" required error={err("author.name")}>
              {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="name" value={d.author.name} onChange={(e) => setAuthor("name", e.target.value)} />}
            </Field>
            <Field label="Email" required error={err("author.email")}>
              {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="email" autoComplete="email" value={d.author.email} onChange={(e) => setAuthor("email", e.target.value)} />}
            </Field>
            <Field label="Mobile" required error={err("author.phone")} hint="We'll call you for your consultation">
              {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="tel" inputMode="tel" autoComplete="tel" value={d.author.phone} onChange={(e) => setAuthor("phone", e.target.value)} />}
            </Field>
            <Field label="City" required error={err("author.city")}>
              {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="address-level2" value={d.author.city} onChange={(e) => setAuthor("city", e.target.value)} />}
            </Field>
            <Field label="A little about you (optional)" error={err("author.bio")} hint={`${d.author.bio.length}/600`} className="sm:col-span-2">
              {(a) => <Textarea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} maxLength={600} value={d.author.bio} onChange={(e) => setAuthor("bio", e.target.value)} placeholder="What do you write, and who do you write for?" />}
            </Field>
          </div>
        )}

        {d.step === 1 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Field label="Working title" required error={err("manuscript.title")} className="sm:col-span-2">
              {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} value={d.manuscript.title} onChange={(e) => setMs("title", e.target.value)} />}
            </Field>
            <Field label="Genre" required error={err("manuscript.genre")}>
              {(a) => (
                <Select id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} value={d.manuscript.genre} onChange={(e) => setMs("genre", e.target.value)}>
                  <option value="">Choose a genre</option>
                  {genresList.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Language" required error={err("manuscript.language")}>
              {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} value={d.manuscript.language} onChange={(e) => setMs("language", e.target.value)} />}
            </Field>
            <Field label="Approximate pages" required error={err("manuscript.pages")} hint={pages > INCLUDED_PAGES ? `Formatting beyond ${INCLUDED_PAGES} pages is added to your quote` : `Plans include formatting for ~${INCLUDED_PAGES} pages`}>
              {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} inputMode="numeric" value={d.manuscript.pages} onChange={(e) => setMs("pages", e.target.value.replace(/[^\d]/g, "").slice(0, 4))} />}
            </Field>
            <fieldset className="sm:col-span-1">
              <legend className="text-sm font-medium">
                Where is it today? <span className="text-accent">*</span>
              </legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    ["idea", "Idea"],
                    ["draft", "Draft"],
                    ["final", "Final"],
                  ] as const
                ).map(([v, l]) => (
                  <label key={v} className={cn("cursor-pointer rounded-md border px-3 py-3 text-center text-sm transition-colors", d.manuscript.stage === v ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent/60")}>
                    <input type="radio" name="stage" className="sr-only" checked={d.manuscript.stage === v} onChange={() => setMs("stage", v)} />
                    {l}
                  </label>
                ))}
              </div>
              {err("manuscript.stage") && <p className="mt-1.5 text-xs text-danger">{err("manuscript.stage")}</p>}
            </fieldset>
            <div className="sm:col-span-2">
              <p className="text-sm font-medium">Manuscript file (optional)</p>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInput.current?.click()}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  onFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors",
                  dragOver ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent/60",
                )}
              >
                {d.manuscript.fileName ? (
                  <div className="flex items-center gap-3 text-sm">
                    <FileText className="size-6 text-accent" />
                    <span className="text-fg">{d.manuscript.fileName}</span>
                    <span className="text-faint">{((d.manuscript.fileSize ?? 0) / 1024 / 1024).toFixed(2)} MB</span>
                    <button
                      type="button"
                      aria-label="Remove file"
                      onClick={(e) => {
                        e.stopPropagation();
                        d.patch("manuscript", { ...d.manuscript, fileName: undefined, fileSize: undefined });
                      }}
                      className="grid size-7 place-items-center rounded-full hover:bg-hover"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="size-8 text-accent" />
                    <p className="text-sm text-fg">Drop your manuscript here, or click to browse</p>
                    <p className="text-xs text-faint">PDF, DOC or DOCX · up to {MAX_MANUSCRIPT_MB} MB · you can also send it later</p>
                  </>
                )}
              </div>
              <input ref={fileInput} type="file" accept={ACCEPTED_MANUSCRIPT.join(",")} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} tabIndex={-1} />
              {err("manuscript.file") && (
                <p role="alert" className="mt-1.5 text-xs text-danger">
                  {err("manuscript.file")}
                </p>
              )}
            </div>
          </div>
        )}

        {d.step === 2 && (
          <div className="mt-8">
            <div role="radiogroup" aria-label="Plans" className="grid gap-4 md:grid-cols-3">
              {plans.map((p) => {
                const sel = d.plan === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => {
                      d.patch("plan", p.id);
                      setErrors({});
                    }}
                    className={cn("relative flex flex-col rounded-xl border p-6 text-left transition-all duration-300", sel ? "border-accent bg-accent-soft shadow-glow" : "border-line-strong hover:border-accent/60")}
                  >
                    <span aria-hidden className="absolute inset-x-0 top-0 h-1 rounded-t-xl" style={{ background: planColor[p.id] }} />
                    <span className="font-serif text-2xl" style={{ color: planColor[p.id] }}>
                      {p.name}
                    </span>
                    <span className="num mt-1 text-3xl font-light">{formatINR(p.price)}</span>
                    <span className="text-xs text-faint">+ 18% GST</span>
                    <ul className="mt-4 space-y-1.5 text-xs text-muted">
                      {p.highlights.slice(0, 4).map((h) => (
                        <li key={h} className="flex gap-1.5">
                          <Check className="mt-0.5 size-3 shrink-0 text-accent" /> {h}
                        </li>
                      ))}
                    </ul>
                    {sel && (
                      <span className="absolute right-4 top-4 grid size-6 place-items-center rounded-full bg-accent text-on-accent">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {err("plan") && <p className="mt-3 text-sm text-danger">{err("plan")}</p>}
          </div>
        )}

        {d.step === 3 && d.plan && (
          <div className="mt-8">
            <p className="text-sm text-muted">Add anything your {plans.find((p) => p.id === d.plan)!.name} plan doesn&rsquo;t already include. Prices are indicative, GST extra.</p>
            <ul className="mt-6 grid gap-3 md:grid-cols-2">
              {addons
                .filter((a) => a.id !== "extraPages")
                .map((a) => {
                  const included = a.includedIn.includes(d.plan as PlanId);
                  const checked = included || d.addons.includes(a.id);
                  return (
                    <li key={a.id}>
                      <label className={cn("flex h-full cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors", included ? "cursor-default border-line opacity-70" : checked ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent/60")}>
                        <input
                          type="checkbox"
                          className="mt-1 accent-[var(--c-accent)]"
                          checked={checked}
                          disabled={included}
                          onChange={(e) => d.patch("addons", e.target.checked ? [...d.addons, a.id] : d.addons.filter((x) => x !== a.id))}
                        />
                        <span className="flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="font-medium text-fg">{a.name}</span>
                            <span className="num shrink-0 text-sm text-accent">{included ? "Included" : formatINR(a.price)}</span>
                          </span>
                          <span className="mt-1 block text-xs text-muted">{a.description}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}

        {d.step === 4 && quote && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <dl className="space-y-4 text-sm">
              {[
                ["Author", `${d.author.name} · ${d.author.email}`],
                ["Book", `${d.manuscript.title} · ${d.manuscript.genre} · ${d.manuscript.language}`],
                ["Length", `~${pages} pages · ${d.manuscript.stage}`],
                ["Manuscript", d.manuscript.fileName ?? "To be sent later"],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-line pb-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{k}</dt>
                  <dd className="mt-1 text-fg">{v}</dd>
                </div>
              ))}
              <Button variant="link" type="button" onClick={() => jump(0)}>
                Edit details
              </Button>
            </dl>
            <div className="rounded-lg border border-line-strong bg-raised p-6">
              <p className="eyebrow">Your quote</p>
              <ul className="mt-4 space-y-2 text-sm">
                {quote.lines.map((l) => (
                  <li key={l.label} className="flex justify-between gap-4">
                    <span className="text-muted">
                      {l.label}
                      {l.note && <span className="block text-xs text-faint">{l.note}</span>}
                    </span>
                    <span className="num">{formatINR(l.amount)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex justify-between text-muted">
                  <dt>Subtotal</dt>
                  <dd className="num">{formatINR2(quote.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-muted">
                  <dt>GST (18%)</dt>
                  <dd className="num">{formatINR2(quote.gst)}</dd>
                </div>
                <div className="flex justify-between pt-2 font-serif text-2xl">
                  <dt>Total</dt>
                  <dd className="num">{formatINR2(quote.total)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-faint">Pay in two instalments: on signing and on approving final proofs. Nothing is charged today.</p>
            </div>
          </div>
        )}

        {d.step === 5 && (
          <div className="mt-8 space-y-8">
            <p className="text-sm text-muted">Pick a time for a free 30-minute call with your Publishing Consultant. We&rsquo;ll walk through your plan, timeline and agreement.</p>
            <fieldset>
              <legend className="text-sm font-medium">
                Date <span className="text-accent">*</span>
              </legend>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2" data-lenis-prevent-wheel>
                {days.map((day) => (
                  <button
                    key={day.iso}
                    type="button"
                    onClick={() => d.patch("consultation", { ...d.consultation, date: day.iso, slot: "" })}
                    aria-pressed={d.consultation.date === day.iso}
                    className={cn("flex w-16 shrink-0 flex-col items-center rounded-md border py-2 text-xs transition-colors", d.consultation.date === day.iso ? "border-accent bg-accent text-on-accent" : "border-line-strong hover:border-accent/60")}
                  >
                    <span className="opacity-70">{day.day}</span>
                    <span className="mt-0.5 text-sm font-semibold">{day.label}</span>
                  </button>
                ))}
              </div>
              {err("consultation.date") && <p className="mt-1.5 text-xs text-danger">{err("consultation.date")}</p>}
            </fieldset>
            {d.consultation.date && (
              <fieldset>
                <legend className="text-sm font-medium">
                  Time (IST) <span className="text-accent">*</span>
                </legend>
                <SlotPicker
                  slots={diary.slots}
                  error={diary.error}
                  value={d.consultation.slot}
                  onChange={(slot) => d.patch("consultation", { ...d.consultation, slot })}
                  onRetry={diary.refresh}
                  className="grid grid-cols-3 gap-2 sm:grid-cols-6"
                />
                {err("consultation.slot") && <p className="mt-1.5 text-xs text-danger">{err("consultation.slot")}</p>}
              </fieldset>
            )}
            <Checkbox
              checked={d.consultation.agree}
              onChange={(e) => d.patch("consultation", { ...d.consultation, agree: e.target.checked })}
              error={err("consultation.agree")}
              label={<>I agree to be contacted about my book and accept the terms. My copyright remains mine; the agreement is non-exclusive.</>}
            />
            <FormError message={serverError} onRetry={submit} />
          </div>
        )}

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
          <Button type="button" variant="ghost" onClick={back} disabled={d.step === 0 || submitting}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          {d.step < 5 ? (
            <Button type="button" onClick={next}>
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner /> Sending…
                </>
              ) : (
                <>
                  Submit & book my call <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-faint">Your progress is saved on this device automatically.</p>
    </div>
  );
}

function prefix(p: string, e: Errors): Errors {
  return Object.fromEntries(Object.entries(e).map(([k, v]) => [`${p}.${k}`, v]));
}
