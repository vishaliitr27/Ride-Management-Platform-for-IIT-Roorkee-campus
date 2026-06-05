import { prisma } from "../lib/prisma";

// IIT Roorkee runs on India Standard Time (UTC+5:30). Ride timestamps are stored
// in UTC, so we shift into IST before bucketing by hour and weekday — otherwise
// "peak demand hours" would be reported 5.5 hours off from when rides actually
// happen on campus. India has no DST, so a fixed offset is exact.
const IST_OFFSET_MIN = 5 * 60 + 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toIst(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MIN * 60_000);
}

function istDateKey(date: Date): string {
  return toIst(date).toISOString().slice(0, 10);
}

// Count how many times each label appears, then return the top `limit` as a
// sorted list. Used for popular pickups, destinations and routes.
function topCounts(
  values: string[],
  limit: number
): { name: string; rides: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, rides]) => ({ name, rides }))
    .sort((a, b) => b.rides - a.rides)
    .slice(0, limit);
}

// Campus-wide demand analytics over the trailing `days` window. Every ride is one
// unit of demand regardless of how it ended, so the time/location breakdowns count
// all rides; the money and reliability metrics only count completed ones.
export async function getDemandAnalytics(days = 14) {
  const since = new Date(Date.now() - days * DAY_MS);

  const rides = await prisma.ride.findMany({
    where: { requestedAt: { gte: since } },
    select: {
      status: true,
      requestedAt: true,
      pickupAddress: true,
      destAddress: true,
      distanceKm: true,
      fareEstimate: true,
    },
  });

  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, rides: 0 }));
  const weekdayCounts = Array.from({ length: 7 }, () => 0);
  const dayCounts = new Map<string, number>();

  for (const ride of rides) {
    const ist = toIst(ride.requestedAt);
    byHour[ist.getUTCHours()].rides += 1;
    weekdayCounts[ist.getUTCDay()] += 1;
    const key = istDateKey(ride.requestedAt);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  // A continuous run of the last `days` calendar days (IST) so the trend chart
  // shows zeros rather than skipping quiet days.
  const byDay: { date: string; rides: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = istDateKey(new Date(Date.now() - i * DAY_MS));
    byDay.push({ date: key, rides: dayCounts.get(key) ?? 0 });
  }

  const byWeekday = WEEKDAYS.map((day, i) => ({ day, rides: weekdayCounts[i] }));

  const completed = rides.filter((r) => r.status === "COMPLETED");
  const cancelled = rides.filter((r) => r.status === "CANCELLED").length;
  const faredRides = completed.filter((r) => r.fareEstimate != null);
  const fareSum = faredRides.reduce((s, r) => s + (r.fareEstimate ?? 0), 0);
  const distanceSum = completed.reduce((s, r) => s + (r.distanceKm ?? 0), 0);

  const peakHour = byHour.reduce(
    (best, h) => (h.rides > best.rides ? h : best),
    byHour[0]
  );

  return {
    rangeDays: days,
    totals: {
      totalRides: rides.length,
      completed: completed.length,
      cancelled,
      completionRate: rides.length
        ? Math.round((completed.length / rides.length) * 100)
        : 0,
      avgFare: faredRides.length ? Math.round(fareSum / faredRides.length) : 0,
      totalDistanceKm: Math.round(distanceSum * 10) / 10,
    },
    peakHour: rides.length ? peakHour : null,
    byHour,
    byWeekday,
    byDay,
    topPickups: topCounts(
      rides.map((r) => r.pickupAddress),
      8
    ),
    topDestinations: topCounts(
      rides.map((r) => r.destAddress),
      8
    ),
    topRoutes: topCounts(
      rides.map((r) => `${r.pickupAddress} → ${r.destAddress}`),
      6
    ),
  };
}
