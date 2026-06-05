import { STATUS_META } from "../lib/format";

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
