export interface Geofence {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}

export const DEFAULT_GEOFENCE: Geofence = {
  name: 'House of Kaala Office',
  lat: 12.9716,
  lng: 77.5946,
  radiusMeters: 500,
};

/** Haversine distance in meters between two lat/lng points. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function validateGeofence(
  lat: number | undefined,
  lng: number | undefined,
  fence: Geofence,
  requireGeo: boolean,
): { ok: boolean; message?: string; distance?: number } {
  if (!requireGeo) return { ok: true };
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, message: 'Location permission required to clock in. Enable GPS and try again.' };
  }
  const dist = distanceMeters(lat, lng, fence.lat, fence.lng);
  if (dist > fence.radiusMeters) {
    return {
      ok: false,
      message: `You are ${Math.round(dist)}m from ${fence.name}. Must be within ${fence.radiusMeters}m to clock in.`,
      distance: dist,
    };
  }
  return { ok: true, distance: dist };
}