import type { Coordinates } from '../types/session.js';

const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Calculate the great-circle distance between two coordinates using the
 * Haversine formula. Returns distance in meters.
 */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const x =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Returns true if point `p` is within `radiusMeters` of `center`.
 */
export function isWithinRadius(
  center: Coordinates,
  p: Coordinates,
  radiusMeters: number,
): boolean {
  return haversineDistance(center, p) <= radiusMeters;
}
