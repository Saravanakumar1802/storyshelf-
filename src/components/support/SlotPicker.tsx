"use client";

import { cn } from "@/lib/utils";
import { FormError } from "@/components/ui/Form";

/** The free call slots on a day, as toggle buttons (loading, error and fully-booked states included). */
export function SlotPicker({
  slots,
  error,
  value,
  onChange,
  onRetry,
  className,
}: {
  slots: string[] | null;
  error: string | null;
  value: string;
  onChange: (slot: string) => void;
  onRetry: () => void;
  className: string;
}) {
  if (error) return <div className="mt-3"><FormError message={error} onRetry={onRetry} /></div>;
  if (!slots)
    return (
      <div className={cn("mt-3", className)} aria-busy="true" aria-label="Checking the diary">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-10 rounded-md" />
        ))}
      </div>
    );
  if (!slots.length) return <p className="mt-3 text-sm text-muted">Fully booked that day — please choose another date.</p>;
  return (
    <div className={cn("mt-3", className)}>
      {slots.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={value === s}
          onClick={() => onChange(s)}
          className={cn("rounded-md border py-2.5 text-sm transition-colors", value === s ? "border-accent bg-accent text-on-accent" : "border-line-strong hover:border-accent/60")}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
