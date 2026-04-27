import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import { REDIS_KEYS, LIMITS, generateDisplayName } from '@chatspaces/shared';
import type { Thread, ThreadType, MessagePreview } from '@chatspaces/shared';

// ─── Serialization ────────────────────────────────────────────────────────

function threadToHash(t: Thread): Record<string, string> {
  return {
    threadId: t.threadId,
    geospaceId: t.geospaceId,
    title: t.title,
    threadType: t.threadType,
    tags: JSON.stringify(t.tags),
    creatorSession: t.creatorSession,
    activeUsers: String(t.activeUsers),
    messageCount: String(t.messageCount),
    previewMessages: JSON.stringify(t.previewMessages),
    createdAt: String(t.createdAt),
    lastActivity: String(t.lastActivity),
    ttl: String(t.ttl),
    maxUsers: String(t.maxUsers),
  };
}

function hashToThread(h: Record<string, string>): Thread {
  return {
    threadId: h['threadId'] ?? '',
    geospaceId: h['geospaceId'] ?? '',
    title: h['title'] ?? '',
    threadType: (h['threadType'] as ThreadType) ?? 'text',
    tags: h['tags'] ? JSON.parse(h['tags']) : [],
    creatorSession: h['creatorSession'] ?? '',
    activeUsers: Number(h['activeUsers'] ?? 0),
    messageCount: Number(h['messageCount'] ?? 0),
    previewMessages: h['previewMessages'] ? JSON.parse(h['previewMessages']) : [],
    createdAt: Number(h['createdAt'] ?? 0),
    lastActivity: Number(h['lastActivity'] ?? 0),
    ttl: Number(h['ttl'] ?? LIMITS.THREAD_INACTIVITY_TTL),
    maxUsers: Number(h['maxUsers'] ?? LIMITS.THREAD_MAX_USERS),
  };
}

// ─── ThreadManager ────────────────────────────────────────────────────────

export class ThreadManager {
  constructor(private readonly redis: Redis) {}

  /**
   * Create a new thread in the given GeoSpace.
   * Does NOT check for duplicates — call dedup.findSimilarThreads first.
   */
  async createThread(
    geospaceId: string,
    title: string,
    threadType: ThreadType,
    tags: string[],
    creatorSession: string,
  ): Promise<Thread> {
    const now = Date.now();
    const thread: Thread = {
      threadId: randomUUID(),
      geospaceId,
      title: title.slice(0, LIMITS.THREAD_TITLE_MAX_LENGTH),
      threadType,
      tags: tags.slice(0, LIMITS.THREAD_MAX_TAGS),
      creatorSession,
      activeUsers: 0,
      messageCount: 0,
      previewMessages: [],
      createdAt: now,
      lastActivity: now,
      ttl: LIMITS.THREAD_INACTIVITY_TTL,
      maxUsers: LIMITS.THREAD_MAX_USERS,
    };

    const metaKey = REDIS_KEYS.threadMeta(thread.threadId);
    await this.redis.hset(metaKey, threadToHash(thread));
    await this.redis.expire(metaKey, LIMITS.THREAD_INACTIVITY_TTL);

    // Index under the GeoSpace
    await this.redis.zadd(`geospace:${geospaceId}:threads`, now, thread.threadId);
    await this.redis.expire(
      `geospace:${geospaceId}:threads`,
      LIMITS.THREAD_INACTIVITY_TTL,
    );

    return thread;
  }

  async getThread(threadId: string): Promise<Thread | null> {
    const hash = await this.redis.hgetall(REDIS_KEYS.threadMeta(threadId));
    if (!hash || !hash['threadId']) return null;
    return hashToThread(hash);
  }

  /**
   * Add a session to a thread. Returns the assigned display name, or null
   * if the thread is at capacity or doesn't exist.
   */
  async joinThread(
    threadId: string,
    sessionId: string,
  ): Promise<{ displayName: string } | null> {
    const thread = await this.getThread(threadId);
    if (!thread) return null;
    if (thread.activeUsers >= thread.maxUsers) return null;

    const displayName = generateDisplayName(threadId, sessionId);
    const wasMember = await this.redis.sismember(REDIS_KEYS.threadMembers(threadId), sessionId);

    const pipeline = this.redis.pipeline();
    pipeline.sadd(REDIS_KEYS.threadMembers(threadId), sessionId);
    pipeline.hset(REDIS_KEYS.threadNames(threadId), sessionId, displayName);
    if (!wasMember) {
      pipeline.hincrby(REDIS_KEYS.threadMeta(threadId), 'activeUsers', 1);
    }
    pipeline.expire(REDIS_KEYS.threadMeta(threadId), LIMITS.THREAD_INACTIVITY_TTL);
    pipeline.expire(REDIS_KEYS.threadMembers(threadId), LIMITS.THREAD_INACTIVITY_TTL);
    pipeline.expire(REDIS_KEYS.threadNames(threadId), LIMITS.THREAD_INACTIVITY_TTL);
    await pipeline.exec();

    return { displayName };
  }

  /**
   * Remove a session from a thread.
   */
  async leaveThread(threadId: string, sessionId: string): Promise<void> {
    const wasMember = await this.redis.sismember(REDIS_KEYS.threadMembers(threadId), sessionId);
    const pipeline = this.redis.pipeline();
    pipeline.srem(REDIS_KEYS.threadMembers(threadId), sessionId);
    pipeline.hdel(REDIS_KEYS.threadNames(threadId), sessionId);
    if (wasMember) {
      pipeline.hincrby(REDIS_KEYS.threadMeta(threadId), 'activeUsers', -1);
    }
    pipeline.expire(REDIS_KEYS.threadMeta(threadId), LIMITS.THREAD_INACTIVITY_TTL);
    await pipeline.exec();
  }

  /**
   * Get the display name assigned to a session in a specific thread.
   */
  async getDisplayName(threadId: string, sessionId: string): Promise<string> {
    const stored = await this.redis.hget(REDIS_KEYS.threadNames(threadId), sessionId);
    if (stored) return stored;
    // Fallback: deterministic derivation (should always match stored)
    return generateDisplayName(threadId, sessionId);
  }

  /**
   * Bump lastActivity, increment messageCount, and refresh TTL.
   * Called by MessageService on every new message.
   */
  async touch(threadId: string, geospaceId: string): Promise<void> {
    const now = Date.now();
    const pipeline = this.redis.pipeline();
    pipeline.hset(REDIS_KEYS.threadMeta(threadId), 'lastActivity', String(now));
    pipeline.hincrby(REDIS_KEYS.threadMeta(threadId), 'messageCount', 1);
    pipeline.expire(REDIS_KEYS.threadMeta(threadId), LIMITS.THREAD_INACTIVITY_TTL);
    // Update geospace ZSET score
    pipeline.zadd(`geospace:${geospaceId}:threads`, 'XX', now, threadId);
    await pipeline.exec();
  }

  /**
   * Update the preview cache (last 3 messages) for a thread.
   */
  async updatePreview(threadId: string, preview: MessagePreview[]): Promise<void> {
    const key = REDIS_KEYS.threadPreview(threadId);
    await this.redis.set(key, JSON.stringify(preview.slice(-3)), 'EX', LIMITS.THREAD_INACTIVITY_TTL);
  }

  async getPreview(threadId: string): Promise<MessagePreview[]> {
    const raw = await this.redis.get(REDIS_KEYS.threadPreview(threadId));
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Fetch all threads in a GeoSpace, sorted by lastActivity descending.
   */
  async getGeospaceThreads(geospaceId: string): Promise<Thread[]> {
    const threadIds = await this.redis.zrevrange(`geospace:${geospaceId}:threads`, 0, -1);
    if (threadIds.length === 0) return [];

    const threads = await Promise.all(threadIds.map((id) => this.getThread(id)));
    return threads.filter((t): t is Thread => t !== null);
  }

  /**
   * Delete a thread and all associated keys.
   */
  async closeThread(threadId: string, geospaceId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(REDIS_KEYS.threadMeta(threadId));
    pipeline.del(REDIS_KEYS.threadMembers(threadId));
    pipeline.del(REDIS_KEYS.threadNames(threadId));
    pipeline.del(REDIS_KEYS.threadPreview(threadId));
    pipeline.del(REDIS_KEYS.threadMessages(threadId));
    pipeline.zrem(`geospace:${geospaceId}:threads`, threadId);
    await pipeline.exec();
  }

  /**
   * Check the per-fingerprint thread creation rate limit (3/hr).
   * Returns true if the action is allowed.
   */
  async checkCreateRateLimit(fingerprint: string): Promise<boolean> {
    const key = REDIS_KEYS.rateThreadCreate(fingerprint);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 3600); // 1 hour window
    }
    return count <= LIMITS.THREAD_CREATE_RATE_LIMIT;
  }
}
