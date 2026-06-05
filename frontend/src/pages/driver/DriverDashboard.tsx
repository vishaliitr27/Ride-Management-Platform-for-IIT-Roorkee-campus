import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Stars } from "../../components/Stars";
import { StatusBadge } from "../../components/StatusBadge";
import { Card, EmptyState } from "../../components/ui";
import { api } from "../../lib/api";
import { dayLabel, rupees, shortDateTime } from "../../lib/format";
import { DriverRating, DriverStats, Ride } from "../../lib/types";

export default function DriverDashboard() {
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [history, setHistory] = useState<Ride[]>([]);
  const [ratings, setRatings] = useState<DriverRating[]>([]);

  useEffect(() => {
    api.get("/api/drivers/me/stats").then(({ data }) => setStats(data.stats)).catch(() => {});
    api.get("/api/drivers/me/history").then(({ data }) => setHistory(data.rides)).catch(() => {});
    api.get("/api/drivers/me/ratings").then(({ data }) => setRatings(data.ratings)).catch(() => {});
  }, []);

  const cards = [
    { label: "Completed rides", value: stats?.totalCompleted ?? 0 },
    { label: "Active rides", value: stats?.activeRides ?? 0 },
    { label: "Earnings", value: rupees(stats?.earnings ?? 0) },
    {
      label: "Rating",
      value: `${(stats?.ratingAvg ?? 0).toFixed(1)} ★ (${stats?.ratingCount ?? 0})`,
    },
  ];

  const chartData = (stats?.ridesPerDay ?? []).map((d) => ({
    name: dayLabel(d.date),
    rides: d.rides,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Dashboard</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="mb-4 font-semibold">Rides over the last 7 days</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
              <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="rides" fill="#2f7df6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Recent rides</h3>
          {history.length === 0 ? (
            <EmptyState title="No rides yet" />
          ) : (
            <div className="divide-y divide-slate-100">
              {history.slice(0, 8).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {r.pickupAddress} → {r.destAddress}
                    </p>
                    <p className="text-xs text-slate-500">
                      {shortDateTime(r.completedAt ?? r.requestedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{rupees(r.fareEstimate)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Ratings &amp; feedback</h3>
          {ratings.length === 0 ? (
            <EmptyState title="No ratings yet" />
          ) : (
            <ul className="space-y-3">
              {ratings.slice(0, 8).map((rt) => (
                <li key={rt.id} className="border-b border-slate-100 pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <Stars value={rt.score} size="text-base" />
                    <span className="text-xs text-slate-400">{rt.passenger?.name}</span>
                  </div>
                  {rt.feedback && (
                    <p className="text-sm text-slate-600">“{rt.feedback}”</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
