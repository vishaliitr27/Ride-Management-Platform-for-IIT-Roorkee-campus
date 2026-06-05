// Great-circle distance between two points using the Haversine formula.
// Good enough for campus-scale matching; swap for PostGIS if this ever needs
// to scale to city-wide geo queries.

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

// Flat per-km fare, used only as a fallback for trips that don't match a fixed
// rule below. Base + distance.
const BASE_FARE = 20;
const PER_KM = 12;

export function estimateFare(distance: number): number {
  return Math.round(BASE_FARE + distance * PER_KM);
}

// --- Fixed fares ---
// Anywhere inside campus is a flat fare; trips touching a known outside point
// (railway station, bus stand…) have a fixed price. Distance is only used as a
// fallback for anything that matches neither.

const CAMPUS_CENTER = { lat: 29.8665, lng: 77.896 };
const CAMPUS_RADIUS_KM = 0.9; // within this of the centre counts as "inside campus"

export const CAMPUS_FLAT_FARE = 10;

// One-way fixed fares between campus and a specific outside point, matched on the
// address text (passengers pick these from a fixed list, so the text is stable).
const OUTSIDE_FARES: { match: RegExp; fare: number }[] = [
  { match: /railway station/i, fare: 50 },
  { match: /bus stand/i, fare: 40 },
  { match: /civil lines/i, fare: 30 },
  { match: /(bt ganj|market)/i, fare: 30 },
];

interface FarePoint {
  lat: number;
  lng: number;
  address: string;
}

function namedOutsideFare(address: string): number | undefined {
  return OUTSIDE_FARES.find((o) => o.match.test(address))?.fare;
}

function isInsideCampus(p: FarePoint): boolean {
  return (
    distanceKm(p.lat, p.lng, CAMPUS_CENTER.lat, CAMPUS_CENTER.lng) <=
    CAMPUS_RADIUS_KM
  );
}

// Authoritative fare for a trip. Used by the server when a ride is created.
export function computeFare(pickup: FarePoint, destination: FarePoint): number {
  const fixed = [
    namedOutsideFare(pickup.address),
    namedOutsideFare(destination.address),
  ].filter((f): f is number => f != null);
  if (fixed.length) return Math.max(...fixed);

  if (isInsideCampus(pickup) && isInsideCampus(destination)) {
    return CAMPUS_FLAT_FARE;
  }

  return estimateFare(
    distanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng)
  );
}
