import { CampusSpot } from "./constants";
import { haversineKm } from "./geo";

// Display-only fare preview. Must mirror the backend rules in
// backend/src/lib/geo.ts (computeFare) — the server stays authoritative.

export const CAMPUS_FLAT_FARE = 10;

const OUTSIDE_FARES: { match: RegExp; fare: number }[] = [
  { match: /railway station/i, fare: 50 },
  { match: /bus stand/i, fare: 40 },
  { match: /civil lines/i, fare: 30 },
  { match: /(bt ganj|market)/i, fare: 30 },
];

function namedOutsideFare(name: string): number | undefined {
  return OUTSIDE_FARES.find((o) => o.match.test(name))?.fare;
}

export function previewFare(pickup: CampusSpot, dest: CampusSpot): number {
  const fixed = [namedOutsideFare(pickup.name), namedOutsideFare(dest.name)].filter(
    (f): f is number => f != null
  );
  if (fixed.length) return Math.max(...fixed);

  if (pickup.category !== "Outside campus" && dest.category !== "Outside campus") {
    return CAMPUS_FLAT_FARE;
  }
  return Math.round(20 + haversineKm(pickup, dest) * 12);
}
