export interface LatLng {
  lat: number;
  lng: number;
}

// Great-circle distance in km (Haversine). Mirrors the backend helper.
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// Rough average e-rickshaw speed on campus roads, used for arrival estimates.
export const AVG_SPEED_KMPH = 18;

// Minutes to cover a distance at the average speed, floored at 1.
export function etaMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / AVG_SPEED_KMPH) * 60));
}
