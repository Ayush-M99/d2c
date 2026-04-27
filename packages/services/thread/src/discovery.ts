import type { Redis } from 'ioredis';
import type { Thread } from '@chatspaces/shared';
import { ThreadManager } from './thread-manager.js';

/**
 * ThreadDiscovery provides hot/forYou/search queries over threads in a GeoSpace.
 * All queries are scoped to a single GeoSpace — the ZSET `geospace:{id}:threads`
 * is the source of truth for ordering (score = lastActivity).
 */
export class ThreadDiscovery {
  private readonly manager: ThreadManager;

  constructor(private readonly redis: Redis) {
    this.manager = new ThreadManager(redis);
  }

  /**
   * Return up to `limit` threads sorted by lastActivity descending.
   * These are the "hottest" (most recently active) threads.
   */
  async getHotThreads(geospaceId: string, limit = 20): Promise<Thread[]> {
    const threadIds = await this.redis.zrevrange(
      `geospace:${geospaceId}:threads`,
      0,
      limit - 1,
    );
    if (threadIds.length === 0) return [];

    const threads = await Promise.all(threadIds.map((id) => this.manager.getThread(id)));
    return threads.filter((t): t is Thread => t !== null);
  }

  /**
   * Return threads whose tags overlap with the given interest tags.
   * Falls back to hot threads if no matches (personalisation degrades gracefully).
   * Sorted by tag match count desc, then lastActivity desc.
   */
  async getForYouThreads(
    geospaceId: string,
    interestTags: string[],
    limit = 20,
  ): Promise<Thread[]> {
    if (interestTags.length === 0) {
      return this.getHotThreads(geospaceId, limit);
    }

    // Pull a wider candidate window to filter from
    const threadIds = await this.redis.zrevrange(
      `geospace:${geospaceId}:threads`,
      0,
      99,
    );
    if (threadIds.length === 0) return [];

    const threads = (
      await Promise.all(threadIds.map((id) => this.manager.getThread(id)))
    ).filter((t): t is Thread => t !== null);

    const tagSet = new Set(interestTags.map((t) => t.toLowerCase()));

    const scored = threads.map((thread) => {
      const matchCount = thread.tags.filter((tag) => tagSet.has(tag.toLowerCase())).length;
      return { thread, matchCount };
    });

    // Threads with at least one match come first, sorted by match count then lastActivity
    const matched = scored
      .filter((x) => x.matchCount > 0)
      .sort((a, b) =>
        b.matchCount !== a.matchCount
          ? b.matchCount - a.matchCount
          : b.thread.lastActivity - a.thread.lastActivity,
      )
      .map((x) => x.thread)
      .slice(0, limit);

    if (matched.length >= limit) return matched;

    // Pad with hot threads not already in the matched list
    const matchedIds = new Set(matched.map((t) => t.threadId));
    const padding = threads
      .filter((t) => !matchedIds.has(t.threadId))
      .slice(0, limit - matched.length);

    return [...matched, ...padding];
  }

  /**
   * Search threads in a GeoSpace by title substring (case-insensitive).
   * Returns up to `limit` results sorted by lastActivity descending.
   */
  async searchThreads(
    geospaceId: string,
    query: string,
    limit = 20,
  ): Promise<Thread[]> {
    if (!query.trim()) return [];

    const threadIds = await this.redis.zrevrange(
      `geospace:${geospaceId}:threads`,
      0,
      -1,
    );
    if (threadIds.length === 0) return [];

    const threads = (
      await Promise.all(threadIds.map((id) => this.manager.getThread(id)))
    ).filter((t): t is Thread => t !== null);

    const lowerQuery = query.toLowerCase();
    return threads
      .filter((t) => t.title.toLowerCase().includes(lowerQuery))
      .slice(0, limit);
  }
}
