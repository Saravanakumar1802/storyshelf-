"use client";

import Link from "@/components/ui/SiteLink";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Eye, EyeOff, PenLine, Sparkles } from "lucide-react";
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from "@/lib/schemas";
import { ApiError, DEMO_ACCOUNT, errorMessage, login, signup } from "@/lib/api";
import { homeFor } from "@/lib/store/auth";
import { cn } from "@/lib/utils";
import { Checkbox, Field, FormError, Input, Spinner } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

/** Only allow same-origin relative redirects (no open redirects). */
export function safeNext(next: string | null, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-11" />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-fg">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const nextParam = useSearchParams().get("next");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      const user = await login(v);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      router.replace(safeNext(nextParam, homeFor(user)));
    } catch (e) {
      setServerError(errorMessage(e));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field label="Email" required error={errors.email?.message}>
        {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="email" autoComplete="email" {...register("email")} />}
      </Field>
      <Field label="Password" required error={errors.password?.message}>
        {(a) => <PasswordInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="current-password" {...register("password")} />}
      </Field>
      <FormError message={serverError} />
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Spinner /> Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
      <button
        type="button"
        onClick={() => {
          setValue("email", DEMO_ACCOUNT.email, { shouldValidate: true });
          setValue("password", DEMO_ACCOUNT.password, { shouldValidate: true });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-accent/50 px-4 py-3 text-sm text-accent hover:bg-accent-soft"
      >
        <Sparkles className="size-4" /> Use the demo author account
      </button>
      <p className="text-center text-sm text-muted">
        New to StoryShelf?{" "}
        <Link href={`/signup${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`} className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

const ROLES = [
  { v: "reader", l: "I'm here to read", d: "Free library, AI picks and Ask My Library", I: BookOpen },
  { v: "author", l: "I'm an author", d: "Publishing dashboard — plus the library", I: PenLine },
] as const;
type SignupRole = (typeof ROLES)[number]["v"];

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next");
  const [role, setRole] = useState<SignupRole>(params.get("as") === "author" ? "author" : "reader");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema), defaultValues: { name: "", email: "", password: "", confirm: "", terms: false as unknown as true } });

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null);
    try {
      const user = await signup(v, role);
      toast.success("Welcome to StoryShelf", user.role === "author" ? "Your author dashboard is ready." : "Your library card is ready.");
      router.replace(safeNext(nextParam, homeFor(user)));
    } catch (e) {
      if (e instanceof ApiError && e.fields) for (const [k, m] of Object.entries(e.fields)) setError(k as keyof SignupInput, { message: m });
      setServerError(errorMessage(e));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <fieldset>
        <legend className="text-sm font-medium">Account type</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ROLES.map(({ v, l, d, I }) => (
            <label key={v} className={cn("flex cursor-pointer gap-3 rounded-md border p-3 transition-colors", role === v ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent/60")}>
              <input type="radio" name="role" value={v} checked={role === v} onChange={() => setRole(v)} className="sr-only" />
              <I className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>
                <span className="block text-sm font-medium text-fg">{l}</span>
                <span className="block text-xs text-muted">{d}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Full name" required error={errors.name?.message}>
        {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="name" {...register("name")} />}
      </Field>
      <Field label="Email" required error={errors.email?.message}>
        {(a) => <Input id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} type="email" autoComplete="email" {...register("email")} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Password" required error={errors.password?.message} hint="8+ characters, a letter and a number">
          {(a) => <PasswordInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="new-password" {...register("password")} />}
        </Field>
        <Field label="Confirm password" required error={errors.confirm?.message}>
          {(a) => <PasswordInput id={a.id} aria-describedby={a.describedBy} aria-invalid={a.invalid} autoComplete="new-password" {...register("confirm")} />}
        </Field>
      </div>
      <Checkbox {...register("terms")} error={errors.terms?.message} label="I agree to the terms of service and privacy policy." />
      <FormError message={serverError} />
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Spinner /> Creating your account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
