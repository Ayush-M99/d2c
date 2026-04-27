import type { Redis } from 'ioredis';
import { REDIS_KEYS, LIMITS, RADIUS_CONFIG } from '@chatspaces/shared';
import type { GeoSpace, Coordinates, RadiusTier } from '@chatspaces/shared';
import { computeGeospaceKey } from './spatial-index.js';

const DEFAULT_GEOSPACE_TTL = LIMITS.GEOSPACE_EMPTY_TTL;

// ─── Serialization ────────────────────────────────────────────────────────

function geospaceToHash(g: GeoSpace): Record<string, string> {
  return {
    geospaceId: g.geospaceId,
    centerLat: String(g.center.lat),
    centerLng: String(g.center.lng),
    radiusTier: g.radiusTier,
    geohash: g.geohash,
    activeUsers: String(g.activeUsers),
    historicalPeak: String(g.historicalPeak),
    createdAt: String(g.createdAt),
    ttl: String(g.ttl),
  };
}

function hashToGeospace(h: Record<string, string>): GeoSpace {
  return {
    geospaceId: h['geospaceId'] ?? '',
    center: { lat: Number(h['centerLat']), lng: Number(h['centerLng']) },
    radiusTier: (h['radiusTier'] as RadiusTier) ?? 'nearby',
    geohash: h['geohash'] ?? '',
    activeUsers: Number(h['activeUsers'] ?? 0),
    historicalPeak: Number(h['historicalPeak'] ?? 0),
    createdAt: Number(h['createdAt'] ?? 0),
    ttl: Number(h['ttl'] ?? DEFAULT_GEOSPACE_TTL),
  };
}

// ─── GeoSpaceManager ──────────────────────────────────────────────────────

export class GeoSpaceManager {
  constructor(private readonly redis: Redis) {}

  /**
   * Get or create the GeoSpace for the given coordinates + tier.
   * Returns the GeoSpace and whether it was newly created.
   */
  async getOrCreate(
    coords: Coordinates,
    tier: RadiusTier,
  ): Promise<{ geospace: GeoSpace; created: boolean }> {
    const { geohash, geospaceId } = computeGeospaceKey(coords, tier);
    const metaKey = REDIS_KEYS.geospaceMeta(geospaceId);

    const existing = await this.redis.hgetall(metaKey);
    if (existing && existing['geospaceId']) {
      return { geospace: hashToGeospace(existing), created: false };
    }

    const now = Date.now();
    const geospace: GeoSpace = {
      geospaceId,
      center: coords,
      radiusTier: tier,
      geohash,
      activeUsers: 0,
      historicalPeak: 0,
      createdAt: now,
      ttl: RADIUS_CONFIG[tier].meters, // ttl stored as configured meters for reference
    };

    await this.redis.hset(metaKey, geospaceToHash(geospace));
    await this.redis.expire(metaKey, DEFAULT_GEOSPACE_TTL);

    return { geospace, created: true };
  }

  /**
   * Retrieve a GeoSpace by ID. Returns null if not found.
   */
  async getGeospace(geospaceId: string): Promise<GeoSpace | null> {
    const hash = await this.redis.hgetall(REDIS_KEYS.geospaceMeta(geospaceId));
    if (!hash || !hash['geospaceId']) return null;
    return hashToGeospace(hash);
  }

  /**
   * Increment active user count and refresh the GeoSpace TTL.
   * Called when a session enters the GeoSpace.
   */
  async userEntered(geospaceId: string): Promise<void> {
    const metaKey = REDIS_KEYS.geospaceMeta(geospaceId);
    const pipeline = this.redis.pipeline();

    pipeline.hincrby(metaKey, 'activeUsers', 1);
    pipeline.expire(metaKey, DEFAULT_GEOSPACE_TTL);
    await pipeline.exec();

    // Update historicalPeak if current > stored peak
    const current = await this.redis.hget(metaKey, 'activeUsers');
    const peak = await this.redis.hget(metaKey, 'historicalPeak');
    if (Number(current) > Number(peak ?? 0)) {
      await this.redis.hset(metaKey, 'historicalPeak', current ?? '0');
    }
  }

  /**
   * Decrement active user count.
   * If the count reaches 0, let the key expire via GEOSPACE_EMPTY_TTL.
   */
  async userLeft(geospaceId: string): Promise<void> {
    const metaKey = REDIS_KEYS.geospaceMeta(geospaceId);
    const newCount = await this.redis.hincrby(metaKey, 'activeUsers', -1);
    if (newCount < 0) {
      await this.redis.hset(metaKey, 'activeUsers', '0');
    }
    await this.redis.expire(metaKey, DEFAULT_GEOSPACE_TTL);
  }

  /**
   * List all thread IDs in a GeoSpace (via ZSET sorted by lastActivity).
   */
  async getThreadIds(geospaceId: string): Promise<string[]> {
    // ZREVRANGEBYSCORE: most-active threads first
    return this.redis.zrevrange(`geospace:${geospaceId}:threads`, 0, -1);
  }

  /**
   * Register a thread under this GeoSpace (called by ThreadManager on create).
   */
  async addThread(geospaceId: string, threadId: string, lastActivity: number): Promise<void> {
    await this.redis.zadd(`geospace:${geospaceId}:threads`, lastActivity, threadId);
    await this.redis.expire(`geospace:${geospaceId}:threads`, LIMITS.THREAD_INACTIVITY_TTL);
  }

  /**
   * Update thread score (activity timestamp) in the GeoSpace index.
   */
  async touchThread(geospaceId: string, threadId: string): Promise<void> {
    await this.redis.zadd(
      `geospace:${geospaceId}:threads`,
      'XX', // only update, don't add
      Date.now(),
      threadId,
    );
  }

  /**
   * Remove a thread from this GeoSpace's index.
   */
  async removeThread(geospaceId: string, threadId: string): Promise<void> {
    await this.redis.zrem(`geospace:${geospaceId}:threads`, threadId);
  }
}
