"use client";

import { useMemo, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { z } from "zod";
import { emailSchema, nameSchema, phoneSchema } from "@/lib/schemas";
import { ApiError, bookConsultation, errorMessage } from "@/lib/api";
import { useConsultationSlots } from "@/lib/hooks/useConsultationSlots";
import { SlotPicker } from "./SlotPicker";
import { useAuth } from "@/lib/store/auth";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/utils";
import { Field, FormError, Input, Select, Spinner } from "@/components/ui/Form";
import { Button, ButtonLink } from "@/components/ui/Button";

const topics = ["Choosing a plan", "My manuscript", "Cover & design", "Marketing my book", "Royalties & payments", "Something else"] as const;
const schema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  topic: z.enum(topics),
  date: z.string().min(1, "Choose a date"),
  slot: z.string().min(1, "Choose a time"),
});

function days() {
  const out: { iso: string; label: string; day: string }[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; out.length < 12 && i < 30; i++) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) continue;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ iso, label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), day: d.toLocaleDateString("en-IN", { weekday: "short" }) });
  }
  return out;
}

export function ConsultationBooking() {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const [form, setForm] = useState({ name: "", email: "", phone: "", topic: topics[0] as string, date: "", slot: "" });
  const [touchedUser, setTouchedUser] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; when: string } | null>(null);
  const dayList = useMemo(() => (hydrated ? days() : []), [hydrated]);
  const diary = useConsultationSlots(hydrated ? form.date : "");

  // pre-fill from the signed-in author once
  if (hydrated && user && !touchedUser) {
    setTouchedUser(true);
    setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || user.phone || "" }));
  }

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v, ...(k === "date" ? { slot: "" } : {}) }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setBusy(true);
    setServerError(null);
    try {
      const { id } = await bookConsultation(r.data);
      const when = `${new Date(`${r.data.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} at ${r.data.slot} IST`;
      setDone({ id, when });
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors((x) => ({ ...x, ...err.fields }));
      if (err instanceof ApiError && err.code === "CONFLICT") {
        set("slot", "");
        diary.refresh();
      }
      setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="animate-panel-in py-10 text-center" role="status">
        <CalendarCheck className="mx-auto size-12 text-success" />
        <p className="display-md mt-6">You&rsquo;re booked.</p>
        <p className="mt-3 text-muted">
          {done.when} · reference <span className="font-mono text-fg">{done.id}</span>
        </p>
        <p className="mt-2 text-sm text-faint">We&rsquo;ll call {form.phone}. A calendar invite is on its way to {form.email}.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/publish">Start your publishing request</ButtonLink>
          <Button variant="ghost" onClick={() => setDone(null)}>
            Book another time
          </Button>
        </div>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name}>
          {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />}
        </Field>
        <Field label="Mobile" required error={errors.phone}>
          {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />}
        </Field>
        <Field label="Email" required error={errors.email}>
          {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />}
        </Field>
        <Field label="What would you like to discuss?" required error={errors.topic}>
          {(a) => (
            <Select id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} value={form.topic} onChange={(e) => set("topic", e.target.value)}>
              {topics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">
          Date <span className="text-accent">*</span>
        </legend>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2" data-lenis-prevent-wheel>
          {dayList.map((d) => (
            <button
              key={d.iso}
              type="button"
              aria-pressed={form.date === d.iso}
              onClick={() => set("date", d.iso)}
              className={cn("flex w-16 shrink-0 flex-col items-center rounded-md border py-2 text-xs transition-colors", form.date === d.iso ? "border-accent bg-accent text-on-accent" : "border-line-strong hover:border-accent/60")}
            >
              <span className="opacity-70">{d.day}</span>
              <span className="mt-0.5 text-sm font-semibold">{d.label}</span>
            </button>
          ))}
        </div>
        {errors.date && <p className="mt-1.5 text-xs text-danger">{errors.date}</p>}
      </fieldset>
      {form.date && (
        <fieldset>
          <legend className="text-sm font-medium">
            Time (IST) <span className="text-accent">*</span>
          </legend>
          <SlotPicker slots={diary.slots} error={diary.error} value={form.slot} onChange={(s) => set("slot", s)} onRetry={diary.refresh} className="grid grid-cols-4 gap-2 sm:grid-cols-8" />
          {errors.slot && <p className="mt-1.5 text-xs text-danger">{errors.slot}</p>}
        </fieldset>
      )}
      <FormError message={serverError} />
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? (
          <>
            <Spinner /> Booking…
          </>
        ) : (
          "Book my free consultation"
        )}
      </Button>
    </form>
  );
}
