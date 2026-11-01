import type { TicketStatus } from "@/types";
import { cn } from "@/lib/utils";

const label: Record<TicketStatus, string> = { open: "Open", "in-progress": "In progress", resolved: "Resolved" };

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        "rounded-pill px-2.5 py-0.5 text-xs",
        status === "open" && "bg-info/15 text-info",
        status === "in-progress" && "bg-warning/15 text-warning",
        status === "resolved" && "bg-success/15 text-success",
      )}
    >
      {label[status]}
    </span>
  );
}

/** Stable, timezone-safe display (client renders only). */
/** Where a ticket's conversation lives. */
export const ticketHref = (id: string) => `/support/ticket/view?id=${encodeURIComponent(id)}`;

export function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
