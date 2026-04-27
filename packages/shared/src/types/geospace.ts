import type { Coordinates } from './session.js';

export type RadiusTier = 'nearby' | 'around_me';

export const RADIUS_CONFIG: Record<RadiusTier, { meters: number; geohashPrecision: number }> = {
  nearby: { meters: 50, geohashPrecision: 7 },
  around_me: { meters: 200, geohashPrecision: 6 },
};

export interface GeoSpace {
  geospaceId: string; // UUID derived from geohash + tier
  center: Coordinates;
  radiusTier: RadiusTier;
  geohash: string;
  activeUsers: number;
  historicalPeak: number;
  createdAt: number;
  ttl: number; // seconds, default 300
}
