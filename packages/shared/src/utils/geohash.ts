import ngeohash from 'ngeohash';
import type { Coordinates } from '../types/session.js';

/**
 * Encode coordinates to a geohash string at the given precision.
 * Precision 6 ≈ 200 m radius tier; Precision 7 ≈ 50 m radius tier.
 */
export function coordinatesToGeohash(coords: Coordinates, precision: number): string {
  return ngeohash.encode(coords.lat, coords.lng, precision);
}

/**
 * Decode a geohash string back to approximate center coordinates.
 */
export function geohashToCoordinates(hash: string): Coordinates {
  const { latitude, longitude } = ngeohash.decode(hash);
  return { lat: latitude, lng: longitude };
}

/**
 * Return the 8 neighboring geohash cells plus the cell itself (9 total).
 * Essential for boundary users who straddle cell edges.
 */
export function getNeighborGeohashes(hash: string): string[] {
  const neighbors = ngeohash.neighbors(hash);
  return [hash, ...neighbors];
}

/**
 * Decode a geohash to its bounding box [minLat, minLng, maxLat, maxLng].
 */
export function geohashBbox(hash: string): [number, number, number, number] {
  return ngeohash.decode_bbox(hash) as [number, number, number, number];
}
