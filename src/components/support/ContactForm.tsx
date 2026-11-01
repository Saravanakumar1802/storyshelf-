"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { contactSchema, type ContactInput } from "@/lib/schemas";
import { errorMessage, sendContactMessage, ApiError } from "@/lib/api";
import { Field, FormError, Input, Select, Spinner, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

const topics = contactSchema.shape.topic.options;

export function ContactForm({ defaultTopic }: { defaultTopic?: ContactInput["topic"] }) {
  const [sent, setSent] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", topic: defaultTopic ?? "Publishing enquiry", message: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const { id } = await sendContactMessage(values);
      setSent(id);
      reset();
    } catch (e) {
      if (e instanceof ApiError && e.fields) for (const [k, v] of Object.entries(e.fields)) setError(k as keyof ContactInput, { message: v });
      setServerError(errorMessage(e));
    }
  });

  if (sent)
    return (
      <div className="animate-panel-in rounded-xl border border-success/40 bg-success/10 p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <p className="mt-4 font-display text-3xl">Message received</p>
        <p className="mt-2 text-sm text-muted">
          Thank you — we&rsquo;ll reply within one working day. Your reference is <span className="font-mono text-fg">{sent}</span>.
        </p>
        <Button variant="ghost" className="mt-6" onClick={() => setSent(null)}>
          Send another message
        </Button>
      </div>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name?.message}>
          {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="name" {...register("name")} />}
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="email" inputMode="email" autoComplete="email" {...register("email")} />}
        </Field>
        <Field label="Mobile (optional)" error={errors.phone?.message} hint="10-digit Indian mobile">
          {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />}
        </Field>
        <Field label="Topic" required error={errors.topic?.message}>
          {(a) => (
            <Select id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} {...register("topic")}>
              {topics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Message" required error={errors.message?.message}>
        {(a) => <Textarea id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} maxLength={2000} placeholder="Tell us about your book or your question…" {...register("message")} />}
      </Field>
      <FormError message={serverError} onRetry={() => onSubmit()} />
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? (
          <>
            <Spinner /> Sending…
          </>
        ) : (
          "Send message"
        )}
      </Button>
    </form>
  );
}
