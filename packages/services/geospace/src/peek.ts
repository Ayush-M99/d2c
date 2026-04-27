import type { Redis } from 'ioredis';
import { REDIS_KEYS, LIMITS, GEOHASH_PRECISION, coordinatesToGeohash, getNeighborGeohashes } from '@chatspaces/shared';
import type { Coordinates } from '@chatspaces/shared';
import { geospaceIdFromGeohash } from './spatial-index.js';

export interface PeekCell {
  geospaceId: string;
  geohash: string;
  activeUsers: number;
  threadCount: number;
}

export interface PeekData {
  cells: PeekCell[];
  totalUsers: number;
  cachedAt: number;
}

/**
 * PeekAggregator provides coarse activity data for Peek Mode.
 *
 * Uses precision-6 geohashes (≈200 m cells) regardless of tier,
 * so users without precise GPS can still see aggregate activity.
 * Results are cached per-cell for PEEK_CACHE_TTL seconds.
 */
export class PeekAggregator {
  constructor(private readonly redis: Redis) {}

  /**
   * Return aggregate activity data for cells near `coords`.
   * Covers the cell containing coords + its 8 neighbors.
   */
  async getPeekData(coords: Coordinates): Promise<PeekData> {
    const precision = GEOHASH_PRECISION['around_me']; // 6 — coarse view
    const primaryHash = coordinatesToGeohash(coords, precision);
    const cells = getNeighborGeohashes(primaryHash);

    const results: PeekCell[] = [];
    let totalUsers = 0;

    await Promise.all(
      cells.map(async (geohash) => {
        const geospaceId = geospaceIdFromGeohash(geohash, 'around_me');
        const cacheKey = REDIS_KEYS.geospacePeek(geospaceId);

        // Check cache first
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const cell: PeekCell = JSON.parse(cached);
          results.push(cell);
          totalUsers += cell.activeUsers;
          return;
        }

        // Compute fresh
        const [activeUsers, threadCount] = await Promise.all([
          this.redis.scard(REDIS_KEYS.geospaceUsers(geospaceId)),
          this.redis.zcard(`geospace:${geospaceId}:threads`),
        ]);

        if (activeUsers > 0 || threadCount > 0) {
          const cell: PeekCell = { geospaceId, geohash, activeUsers, threadCount };
          results.push(cell);
          totalUsers += activeUsers;

          // Cache it
          await this.redis.set(cacheKey, JSON.stringify(cell), 'EX', LIMITS.PEEK_CACHE_TTL);
        }
      }),
    );

    return { cells: results, totalUsers, cachedAt: Date.now() };
  }
}
