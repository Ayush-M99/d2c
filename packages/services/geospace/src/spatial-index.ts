import { createHash } from 'node:crypto';
import {
  coordinatesToGeohash,
  geohashToCoordinates,
  getNeighborGeohashes,
  haversineDistance,
  GEOHASH_PRECISION,
  RADIUS_CONFIG,
} from '@chatspaces/shared';
import type { Coordinates, RadiusTier } from '@chatspaces/shared';

/**
 * Derive a deterministic geospace ID from a geohash + radius tier.
 * Formatted as a UUID-like string for compatibility with existing ID fields.
 */
export function geospaceIdFromGeohash(geohash: string, tier: RadiusTier): string {
  const hash = createHash('sha256').update(`${geohash}:${tier}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`, // version 4 marker
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

/**
 * Given user coordinates and a radius tier, compute:
 *  - the canonical geohash cell they belong to
 *  - the deterministic geospaceId for that cell
 *
 * Boundary handling: if the user is within `radiusMeters` of a neighboring
 * cell center, they should also be considered for that cell (handled by the
 * caller using getNeighborCandidates).
 */
export function computeGeospaceKey(
  coords: Coordinates,
  tier: RadiusTier,
): { geohash: string; geospaceId: string } {
  const precision = GEOHASH_PRECISION[tier];
  const geohash = coordinatesToGeohash(coords, precision);
  const geospaceId = geospaceIdFromGeohash(geohash, tier);
  return { geohash, geospaceId };
}

/**
 * Return candidate geohash cells for boundary-straddling users.
 * Returns the primary cell plus any neighbor whose center is within
 * `radiusMeters` of the user's position.
 */
export function getBoundaryCandidates(
  coords: Coordinates,
  tier: RadiusTier,
): Array<{ geohash: string; geospaceId: string }> {
  const precision = GEOHASH_PRECISION[tier];
  const primary = coordinatesToGeohash(coords, precision);
  const allCells = getNeighborGeohashes(primary); // primary + 8 neighbors
  const radiusMeters = RADIUS_CONFIG[tier].meters;

  return allCells
    .filter((cell) => {
      if (cell === primary) return true;
      const cellCenter = geohashToCoordinates(cell);
      return haversineDistance(coords, cellCenter) <= radiusMeters * 2;
    })
    .map((cell) => ({ geohash: cell, geospaceId: geospaceIdFromGeohash(cell, tier) }));
}
