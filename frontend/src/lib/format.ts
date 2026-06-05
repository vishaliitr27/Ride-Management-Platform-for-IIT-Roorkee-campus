export const STATUS_META: Record<string, { label: string; className: string }> = {
  REQUESTED: { label: "Requested", className: "bg-amber-100 text-amber-700" },
  ACCEPTED: { label: "Accepted", className: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "In progress", className: "bg-indigo-100 text-indigo-700" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", className: "bg-rose-100 text-rose-700" },
};

export function rupees(n?: number | null): string {
  return n == null ? "—" : `₹${n}`;
}

export function shortDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function timeOnly(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: "short" });
}

export function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

// 0 -> "12 AM", 8 -> "8 AM", 18 -> "6 PM". Hours are campus-local (IST), already
// bucketed on the server.
export function hourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${period}`;
}
