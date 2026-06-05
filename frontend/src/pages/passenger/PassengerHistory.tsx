import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Stars } from "../../components/Stars";
import { StatusBadge } from "../../components/StatusBadge";
import { Card, EmptyState } from "../../components/ui";
import { api } from "../../lib/api";
import { rupees, shortDateTime } from "../../lib/format";
import { Ride } from "../../lib/types";

const ACTIVE = ["REQUESTED", "ACCEPTED", "IN_PROGRESS"];

export default function PassengerHistory() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/rides")
      .then(({ data }) => setRides(data.rides))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading…</div>;
  }
  if (rides.length === 0) {
    return <EmptyState title="No rides yet" hint="Your past rides will appear here." />;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">My rides</h2>
      {rides.map((r) => (
        <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">
                {r.pickupAddress} → {r.destAddress}
              </p>
              <StatusBadge status={r.status} />
            </div>
            <p className="text-sm text-slate-500">
              {shortDateTime(r.requestedAt)} · {rupees(r.fareEstimate)} ·{" "}
              {r.driver?.name ?? "Unassigned"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {r.status === "COMPLETED" ? (
              <>
                {r.rating ? (
                  <Stars value={r.rating.score} size="text-base" />
                ) : (
                  <Link
                    to={`/passenger/ride/${r.id}`}
                    className="text-sm font-medium text-brand-700"
                  >
                    Rate ride →
                  </Link>
                )}
                <Link
                  to={`/passenger/ride/${r.id}/pay`}
                  className="text-sm font-medium text-brand-700"
                >
                  Payment →
                </Link>
              </>
            ) : r.status === "REQUESTED" && r.scheduledFor && !r.dispatchedAt ? (
              <span className="text-sm text-slate-500">
                Scheduled · {shortDateTime(r.scheduledFor)}
              </span>
            ) : ACTIVE.includes(r.status) ? (
              <Link
                to={`/passenger/ride/${r.id}`}
                className="text-sm font-medium text-brand-700"
              >
                Track →
              </Link>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
