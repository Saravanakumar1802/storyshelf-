import { createJSONStorage, type PersistOptions } from "zustand/middleware";
import type { z } from "zod";

/** Persist options that validate stored state on load and silently drop
 *  anything corrupt or from an incompatible version. */
export function validatedPersist<S, P extends Partial<S>>(name: string, schema: z.ZodType<P>, pick: (s: S) => P, version = 1): PersistOptions<S, P> {
  return {
    name: `8085:${name}`,
    version,
    storage: createJSONStorage(() => localStorage),
    partialize: pick,
    migrate: () => ({}) as P,
    merge: (persisted, current) => {
      const r = schema.safeParse(persisted);
      return r.success ? { ...current, ...r.data } : current;
    },
  };
}
