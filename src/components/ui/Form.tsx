"use client";

import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border border-line-strong bg-raised px-4 py-3 text-sm text-fg placeholder:text-faint transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/25";

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

/** Label + control + hint/error with correct aria wiring. */
export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required && <span className="ml-0.5 text-accent" aria-hidden>*</span>}
      </label>
      {children({ id, describedBy: [hintId, errId].filter(Boolean).join(" ") || undefined, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="size-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(control, className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(control, "min-h-32 resize-y leading-relaxed", className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select({ className, children, ...p }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, "cursor-pointer appearance-none pr-10", className)} {...p}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
    </div>
  );
});

export const Checkbox = forwardRef<HTMLInputElement, ComponentProps<"input"> & { label: ReactNode; error?: string }>(function Checkbox({ label, error, className, id, ...p }, ref) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={cid} className="flex cursor-pointer items-start gap-3 text-sm text-muted">
        <input ref={ref} id={cid} type="checkbox" aria-invalid={!!error} className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--c-accent)]" {...p} />
        <span>{label}</span>
      </label>
      {error && (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="size-3.5" /> {error}
        </p>
      )}
    </div>
  );
});

export function FormError({ message, onRetry }: { message: string | null; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-fg">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
      <p className="flex-1">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 text-accent underline-offset-4 hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}
