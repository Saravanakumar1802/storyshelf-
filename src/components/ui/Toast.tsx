"use client";

import { create } from "zustand";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: Kind;
  title: string;
  body?: string;
}
interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => void;
  dismiss: (id: number) => void;
}

let seq = 0;
export const useToasts = create<ToastState>((set, get) => ({
  items: [],
  push: (t) => {
    const id = ++seq;
    set({ items: [...get().items.slice(-3), { ...t, id }] });
    window.setTimeout(() => get().dismiss(id), 5000);
  },
  dismiss: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
}));

export const toast = {
  success: (title: string, body?: string) => useToasts.getState().push({ kind: "success", title, body }),
  error: (title: string, body?: string) => useToasts.getState().push({ kind: "error", title, body }),
  info: (title: string, body?: string) => useToasts.getState().push({ kind: "info", title, body }),
};

const icons = { success: CheckCircle2, error: TriangleAlert, info: Info };

export function Toaster() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex flex-col items-center gap-2 px-4">
      {items.map((t) => {
        const Icon = icons[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className="glass pointer-events-auto flex w-full max-w-sm animate-panel-in items-start gap-3 rounded-lg border border-line-strong p-4 shadow-lifted"
          >
            <Icon className={cn("mt-0.5 size-5 shrink-0", t.kind === "success" && "text-success", t.kind === "error" && "text-danger", t.kind === "info" && "text-accent")} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">{t.title}</p>
              {t.body && <p className="mt-0.5 text-sm text-muted">{t.body}</p>}
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-faint hover:text-fg">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
