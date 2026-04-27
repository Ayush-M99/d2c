import { distance } from 'fastest-levenshtein';
import type { Thread } from '@chatspaces/shared';
import { LIMITS } from '@chatspaces/shared';
import { ThreadManager } from './thread-manager.js';
import type { Redis } from 'ioredis';

/**
 * ThreadDedup prevents near-duplicate threads from being created.
 *
 * Uses Levenshtein edit distance normalised to [0, 1]:
 *   similarity = 1 - (editDistance / max(len_a, len_b))
 *
 * Threads are considered duplicates when similarity ≥ THREAD_DEDUP_SIMILARITY_THRESHOLD (0.7).
 */
export class ThreadDedup {
  private readonly manager: ThreadManager;

  constructor(private readonly redis: Redis) {
    this.manager = new ThreadManager(redis);
  }

  /**
   * Find existing threads in `geospaceId` whose title is similar to `candidateTitle`.
   * Returns threads above the similarity threshold, sorted most-similar first.
   *
   * Call this BEFORE createThread. If results are non-empty, surface them to the
   * client so the user can join an existing thread rather than creating a duplicate.
   */
  async findSimilarThreads(
    geospaceId: string,
    candidateTitle: string,
  ): Promise<Thread[]> {
    const threadIds = await this.redis.zrevrange(
      `geospace:${geospaceId}:threads`,
      0,
      -1,
    );
    if (threadIds.length === 0) return [];

    const threads = (
      await Promise.all(threadIds.map((id) => this.manager.getThread(id)))
    ).filter((t): t is Thread => t !== null);

    const candidate = candidateTitle.toLowerCase().trim();

    const withSimilarity = threads
      .map((thread) => {
        const existing = thread.title.toLowerCase().trim();
        const maxLen = Math.max(candidate.length, existing.length);
        const similarity = maxLen === 0 ? 1 : 1 - distance(candidate, existing) / maxLen;
        return { thread, similarity };
      })
      .filter((x) => x.similarity >= LIMITS.THREAD_DEDUP_SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity);

    return withSimilarity.map((x) => x.thread);
  }
}
