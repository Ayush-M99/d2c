import type { Redis } from 'ioredis';
import { REDIS_KEYS, LIMITS } from '@chatspaces/shared';

/**
 * PresenceTracker manages membership sets for GeoSpaces and Threads.
 *
 * GeoSpace presence  → Redis SET  geospace:{id}:users
 * Thread presence    → Redis SET  thread:{id}:members
 *
 * These are separate from the session hash so they can be queried
 * efficiently by the GeoSpace and Thread services without loading
 * full session objects.
 */
export class PresenceTracker {
  constructor(private readonly redis: Redis) {}

  // ─── GeoSpace presence ───────────────────────────────────────────────

  async enterGeospace(sessionId: string, geospaceId: string): Promise<void> {
    const key = REDIS_KEYS.geospaceUsers(geospaceId);
    await this.redis.sadd(key, sessionId);
    // GeoSpace TTL is managed by GeoSpaceManager; we just extend it here
    await this.redis.expire(key, LIMITS.GEOSPACE_EMPTY_TTL);
  }

  async leaveGeospace(sessionId: string, geospaceId: string): Promise<void> {
    const key = REDIS_KEYS.geospaceUsers(geospaceId);
    await this.redis.srem(key, sessionId);
    // If the set is now empty, let it expire naturally (GEOSPACE_EMPTY_TTL)
  }

  async getGeospaceMembers(geospaceId: string): Promise<string[]> {
    return this.redis.smembers(REDIS_KEYS.geospaceUsers(geospaceId));
  }

  async getGeospaceCount(geospaceId: string): Promise<number> {
    return this.redis.scard(REDIS_KEYS.geospaceUsers(geospaceId));
  }

  async isInGeospace(sessionId: string, geospaceId: string): Promise<boolean> {
    return (await this.redis.sismember(REDIS_KEYS.geospaceUsers(geospaceId), sessionId)) === 1;
  }

  // ─── Thread presence ─────────────────────────────────────────────────

  async enterThread(sessionId: string, threadId: string): Promise<void> {
    const key = REDIS_KEYS.threadMembers(threadId);
    await this.redis.sadd(key, sessionId);
    await this.redis.expire(key, LIMITS.THREAD_INACTIVITY_TTL);
  }

  async leaveThread(sessionId: string, threadId: string): Promise<void> {
    await this.redis.srem(REDIS_KEYS.threadMembers(threadId), sessionId);
  }

  async getThreadMembers(threadId: string): Promise<string[]> {
    return this.redis.smembers(REDIS_KEYS.threadMembers(threadId));
  }

  async getThreadCount(threadId: string): Promise<number> {
    return this.redis.scard(REDIS_KEYS.threadMembers(threadId));
  }

  async isInThread(sessionId: string, threadId: string): Promise<boolean> {
    return (await this.redis.sismember(REDIS_KEYS.threadMembers(threadId), sessionId)) === 1;
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────

  /**
   * Remove a session from all presence sets it belongs to.
   * Called when a session is destroyed or expires.
   */
  async removeFromAll(
    sessionId: string,
    geospaceId: string | null,
    threadIds: string[],
  ): Promise<void> {
    const pipeline = this.redis.pipeline();

    if (geospaceId) {
      pipeline.srem(REDIS_KEYS.geospaceUsers(geospaceId), sessionId);
    }

    for (const threadId of threadIds) {
      pipeline.srem(REDIS_KEYS.threadMembers(threadId), sessionId);
    }

    await pipeline.exec();
  }
}
