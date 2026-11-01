"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, getConsultationSlots } from "@/lib/api";

interface Result {
  key: string;
  slots: string[];
  error: string | null;
}

/**
 * Free consultation slots on a date, from the API's real diary. `slots` is
 * null while loading; call `refresh()` after a booking fails because someone
 * else just took the slot.
 */
export function useConsultationSlots(date: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${date}#${attempt}`;

  useEffect(() => {
    if (!date) return;
    const ctrl = new AbortController();
    getConsultationSlots(date, ctrl.signal)
      .then((slots) => setResult({ key, slots, error: null }))
      .catch((e) => {
        if (!ctrl.signal.aborted) setResult({ key, slots: [], error: errorMessage(e) });
      });
    return () => ctrl.abort();
  }, [date, key]);

  const refresh = useCallback(() => setAttempt((a) => a + 1), []);
  const current = result?.key === key ? result : null; // a result for another date is stale
  return { slots: current?.slots ?? null, error: current?.error ?? null, refresh };
}
