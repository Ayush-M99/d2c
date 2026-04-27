import type { RadiusTier } from '../types/geospace.js';

/**
 * Geohash precision per radius tier.
 * Precision 6 ≈ 610 m cell (covers 200 m radius comfortably)
 * Precision 7 ≈ 153 m cell (covers 50 m radius comfortably)
 */
export const GEOHASH_PRECISION: Record<RadiusTier, number> = {
  nearby: 7,
  around_me: 6,
};

/**
 * Approximate cell size in meters (shorter latitude dimension) per precision level.
 * Used for conservative radius checks.
 */
export const GEOHASH_CELL_SIZE_METERS: Record<number, number> = {
  1: 2_500_000,
  2: 630_000,
  3: 78_000,
  4: 20_000,
  5: 2_400,
  6: 610,
  7: 153,
  8: 19,
  9: 4,
};
