"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false during SSR and the hydration render, true afterwards. Use it to gate
 *  UI that depends on localStorage-backed state, avoiding hydration mismatch. */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
