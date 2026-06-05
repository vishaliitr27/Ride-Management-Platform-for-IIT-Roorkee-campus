import { useEffect, useState } from "react";
import { Button, Card, EmptyState } from "../../components/ui";
import { api, apiError } from "../../lib/api";
import { shortDateTime } from "../../lib/format";
import { AdminDriver, VerificationStatus } from "../../lib/types";
import { useUI } from "../../store/ui";

type Filter = VerificationStatus | "ALL";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const STATUS_STYLE: Record<VerificationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  VERIFIED: "bg-green-100 text-green-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

const VEHICLE_LABEL: Record<string, string> = {
  E_RICKSHAW: "E-Rickshaw",
  CAR: "Car",
  BIKE: "Bike",
};

export default function AdminDrivers() {
  const toast = useUI((s) => s.toast);
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load(f: Filter) {
    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/drivers", {
        params: f === "ALL" ? {} : { status: f },
      });
      setDrivers(data.drivers);
    } catch (err) {
      toast(apiError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function decide(userId: string, status: "VERIFIED" | "REJECTED") {
    setBusy(userId);
    try {
      await api.patch(`/api/admin/drivers/${userId}/verification`, { status });
      toast(
        status === "VERIFIED" ? "Driver verified" : "Driver rejected",
        status === "VERIFIED" ? "success" : "info"
      );
      // Drop the row if it no longer matches the active filter.
      setDrivers((prev) =>
        filter === "ALL"
          ? prev.map((d) =>
              d.userId === userId ? { ...d, verificationStatus: status } : d
            )
          : prev.filter((d) => d.userId !== userId)
      );
    } catch (err) {
      toast(apiError(err), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Driver verification</h2>
        <p className="text-sm text-slate-500">
          Review driver profiles. Only verified drivers can go online and appear
          to passengers.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              filter === f.value
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : drivers.length === 0 ? (
        <EmptyState
          title="Nothing here"
          hint="No drivers match this filter right now."
        />
      ) : (
        <div className="space-y-3">
          {drivers.map((d) => (
            <Card key={d.userId} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{d.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[d.verificationStatus]
                      }`}
                    >
                      {d.verificationStatus}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {d.email}
                    {d.phone ? ` · ${d.phone}` : ""}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  Applied {shortDateTime(d.createdAt)}
                </p>
              </div>

              <div className="grid gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-2">
                <Detail label="Vehicle">
                  {VEHICLE_LABEL[d.vehicleType] ?? d.vehicleType}
                  {d.vehicleModel ? ` · ${d.vehicleModel}` : ""}
                </Detail>
                <Detail label="Vehicle number">{d.vehicleNumber}</Detail>
                <Detail label="License">{d.licenseNumber}</Detail>
                <Detail label="Rating">
                  {d.ratingCount > 0 ? `${d.ratingAvg} (${d.ratingCount})` : "—"}
                </Detail>
              </div>

              <div className="flex gap-2 border-t border-slate-100 pt-3">
                {d.verificationStatus !== "VERIFIED" && (
                  <Button
                    disabled={busy === d.userId}
                    onClick={() => decide(d.userId, "VERIFIED")}
                  >
                    Verify
                  </Button>
                )}
                {d.verificationStatus !== "REJECTED" && (
                  <Button
                    variant="danger"
                    disabled={busy === d.userId}
                    onClick={() => decide(d.userId, "REJECTED")}
                  >
                    Reject
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="text-slate-400">{label}: </span>
      {children}
    </p>
  );
}
