"use client";

import Link from "@/components/ui/SiteLink";
import { useEffect, useState } from "react";
import { getAiStatus, type AiOverall } from "@/lib/api/ai";
import { cn } from "@/lib/utils";

const LOOK: Record<AiOverall | "unknown", { dot: string; label: string }> = {
  online: { dot: "bg-success", label: "AI online" },
  degraded: { dot: "bg-warning", label: "AI degraded" },
  offline: { dot: "bg-danger", label: "AI resting" },
  not_configured: { dot: "bg-faint", label: "AI not set up" },
  unknown: { dot: "bg-faint", label: "AI status" },
};
const REFRESH_MS = 60_000;

/** A small live indicator in the header that links to the AI status page. */
export function AiStatusDot() {
  const [overall, setOverall] = useState<AiOverall | "unknown">("unknown");

  useEffect(() => {
    let ctrl = new AbortController();
    const load = () => {
      ctrl.abort();
      ctrl = new AbortController();
      getAiStatus(ctrl.signal)
        .then((s) => setOverall(s.overall))
        .catch(() => !ctrl.signal.aborted && setOverall("unknown"));
    };
    load();
    // refresh only while the tab is visible, so idle tabs cost nothing
    const id = window.setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    return () => {
      window.clearInterval(id);
      ctrl.abort();
    };
  }, []);

  const look = LOOK[overall];
  return (
    <Link href="/ai" title={`${look.label}: see the models behind the library`} className="hidden items-center gap-2 rounded-pill border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-fg md:inline-flex">
      <span className="relative flex size-2">
        {overall === "online" && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", look.dot)} />}
        <span className={cn("relative inline-flex size-2 rounded-full", look.dot)} />
      </span>
      AI
    </Link>
  );
}
