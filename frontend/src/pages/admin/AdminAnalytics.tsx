import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, EmptyState } from "../../components/ui";
import { api, apiError } from "../../lib/api";
import { dateLabel, hourLabel, rupees } from "../../lib/format";
import { DemandAnalytics } from "../../lib/types";
import { useUI } from "../../store/ui";

const BRAND = "#2f7df6";
const PEAK = "#f97316";

export default function AdminAnalytics() {
  const toast = useUI((s) => s.toast);
  const [data, setData] = useState<DemandAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/admin/analytics")
      .then(({ data }) => setData(data.analytics))
      .catch((err) => toast(apiError(err), "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!data) return null;

  const { totals, peakHour } = data;

  const cards = [
    { label: "Rides requested", value: totals.totalRides },
    { label: "Completion rate", value: `${totals.completionRate}%` },
    { label: "Avg fare", value: rupees(totals.avgFare) },
    {
      label: "Peak hour",
      value: peakHour ? hourLabel(peakHour.hour) : "—",
      hint: peakHour ? `${peakHour.rides} rides` : undefined,
    },
  ];

  const hourData = data.byHour.map((h) => ({
    ...h,
    label: hourLabel(h.hour),
    isPeak: peakHour?.hour === h.hour,
  }));

  const dayData = data.byDay.map((d) => ({ ...d, label: dateLabel(d.date) }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Demand analytics</h2>
        <p className="text-sm text-slate-500">
          Where and when rides are requested across campus over the last{" "}
          {data.rangeDays} days.
        </p>
      </div>

      {totals.totalRides === 0 ? (
        <EmptyState
          title="No ride data yet"
          hint="Analytics appear here once passengers start requesting rides."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {cards.map((c) => (
              <Card key={c.label}>
                <p className="text-sm text-slate-500">{c.label}</p>
                <p className="mt-1 text-2xl font-semibold">{c.value}</p>
                {c.hint && <p className="text-xs text-slate-400">{c.hint}</p>}
              </Card>
            ))}
          </div>

          <Card>
            <h3 className="font-semibold">Peak demand hours</h3>
            <p className="mb-4 text-sm text-slate-500">
              Ride requests by time of day. The busiest hour is highlighted.
            </p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData} margin={{ left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    interval={2}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    fontSize={11}
                  />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="rides" radius={[4, 4, 0, 0]}>
                    {hourData.map((h) => (
                      <Cell key={h.hour} fill={h.isPeak ? PEAK : BRAND} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h3 className="mb-4 font-semibold">Daily ride volume</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dayData} margin={{ left: -16 }}>
                    <defs>
                      <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      interval={2}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                      fontSize={11}
                    />
                    <Tooltip cursor={{ stroke: BRAND }} />
                    <Area
                      type="monotone"
                      dataKey="rides"
                      stroke={BRAND}
                      strokeWidth={2}
                      fill="url(#vol)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 font-semibold">Demand by day of week</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byWeekday} margin={{ left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                      fontSize={11}
                    />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                    <Bar dataKey="rides" fill={BRAND} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <RankedList title="Popular pickup points" rows={data.topPickups} />
            <RankedList title="Popular destinations" rows={data.topDestinations} />
          </div>

          <RankedList title="Busiest routes" rows={data.topRoutes} />
        </>
      )}
    </div>
  );
}

// A simple horizontal bar list — clearer than a chart for long location names.
function RankedList({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; rides: number }[];
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.rides), 0) || 1;
  return (
    <Card>
      <h3 className="mb-3 font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <EmptyState title="Not enough data yet" />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.name}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-700">{r.name}</span>
                <span className="shrink-0 font-medium text-slate-500">
                  {r.rides}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${(r.rides / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
