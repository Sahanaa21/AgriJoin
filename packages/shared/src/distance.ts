/**
 * Geographic helpers. Distances are approximate (great-circle / haversine)
 * and are ONLY computed when both the viewer and the target have real
 * coordinates. Callers must treat a `null` result as "distance unknown"
 * and fall back to showing the textual location — never invent a number.
 */

const EARTH_RADIUS_KM = 6371;

export interface LatLng {
  lat: number;
  lng: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle distance in kilometres between two points.
 * Returns `null` if either coordinate is missing/invalid, so the UI can
 * fall back to the textual location instead of showing a fake distance.
 */
export function haversineKm(
  a: Partial<LatLng> | null | undefined,
  b: Partial<LatLng> | null | undefined,
): number | null {
  if (!a || !b) return null;
  const { lat: lat1, lng: lng1 } = a;
  const { lat: lat2, lng: lng2 } = b;
  if (
    lat1 == null ||
    lng1 == null ||
    lat2 == null ||
    lng2 == null ||
    Number.isNaN(lat1) ||
    Number.isNaN(lng1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lng2)
  ) {
    return null;
  }

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/** Human-friendly distance label, or null when distance is unknown. */
export function formatDistance(km: number | null | undefined): string | null {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}
