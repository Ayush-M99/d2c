import type { Redis } from 'ioredis';
import { REDIS_KEYS, LIMITS, ulid, generateDisplayName } from '@chatspaces/shared';
import type { Message, MessageType, MessagePreview } from '@chatspaces/shared';
import { filterMessage } from './inline-filter.js';
import { FanoutPublisher } from './fanout.js';

export interface IncomingMessage {
  threadId: string;
  geospaceId: string;
  senderSession: string;
  content: string;
  type: MessageType;
  replyToMessageId?: string | null;
  replyPreview?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ProcessResult {
  ok: true;
  message: Message;
  streamId: string;
}

export interface ProcessError {
  ok: false;
  reason: string;
}

export type ProcessOutcome = ProcessResult | ProcessError;

/**
 * MessageHandler is the single entry point for inbound messages.
 *
 * Pipeline per message:
 *   1. Content validation (length + inline filter)
 *   2. Rate-limit check  (1/s with 5-msg burst per session×thread)
 *   3. Build Message record (ULID, server timestamp, display name)
 *   4. Persist to Redis Stream
 *   5. Fanout (Pub/Sub + Kafka)
 *   6. Touch thread metadata (lastActivity, messageCount, ZSET score)
 *   7. Refresh preview cache (last 3 messages)
 */
export class MessageHandler {
  constructor(
    private readonly redis: Redis,
    private readonly fanout: FanoutPublisher,
  ) {}

  async process(incoming: IncomingMessage): Promise<ProcessOutcome> {
    // ── 1. Content validation ──────────────────────────────────────────────
    const filter = filterMessage(incoming.content);
    if (!filter.allowed) {
      return { ok: false, reason: filter.reason ?? 'Message rejected by filter' };
    }

    // ── 2. Rate limiting ───────────────────────────────────────────────────
    const ratePassed = await this.checkRateLimit(incoming.senderSession, incoming.threadId);
    if (!ratePassed) {
      return { ok: false, reason: 'Rate limit exceeded' };
    }

    // ── 3. Build Message record ────────────────────────────────────────────
    const messageId = ulid();
    const now = Date.now();
    const displayName = await this.getDisplayName(incoming.threadId, incoming.senderSession);

    const message: Message = {
      messageId,
      threadId: incoming.threadId,
      senderSession: incoming.senderSession,
      senderDisplayName: displayName,
      content: incoming.content.slice(0, LIMITS.MESSAGE_MAX_LENGTH),
      type: incoming.type,
      replyToMessageId: incoming.replyToMessageId ?? null,
      replyPreview: incoming.replyPreview
        ? incoming.replyPreview.slice(0, LIMITS.REPLY_PREVIEW_MAX_LENGTH)
        : null,
      timestamp: now,
      metadata: incoming.metadata ?? {},
    };

    // ── 4. Persist to Redis Stream ─────────────────────────────────────────
    const streamKey = REDIS_KEYS.threadMessages(message.threadId);
    const streamId = await this.redis.xadd(
      streamKey,
      '*',
      'data',
      JSON.stringify(message),
    );

    if (!streamId) {
      return { ok: false, reason: 'Failed to persist message' };
    }

    // Keep stream from growing unbounded (trim to last 1000 messages)
    await this.redis.xtrim(streamKey, 'MAXLEN', '~', 1000);

    // ── 5. Fanout ──────────────────────────────────────────────────────────
    await this.fanout.publish(message);

    // ── 6. Touch thread metadata ───────────────────────────────────────────
    await this.touchThread(message.threadId, incoming.geospaceId, now);

    // ── 7. Refresh preview cache ───────────────────────────────────────────
    await this.updatePreview(message);

    return { ok: true, message, streamId };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Sliding-window rate limit: max MESSAGE_RATE_LIMIT (1) per second,
   * with a burst allowance of MESSAGE_BURST_LIMIT (5) over 3 seconds.
   * Uses a simple INCR + EXPIRE approach on a short-window key.
   */
  private async checkRateLimit(sessionId: string, threadId: string): Promise<boolean> {
    const key = `${REDIS_KEYS.rateMessage(sessionId, threadId)}:${Math.floor(Date.now() / 1000)}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 3); // 3-second window for burst
    }
    return count <= LIMITS.MESSAGE_BURST_LIMIT;
  }

  private async getDisplayName(threadId: string, sessionId: string): Promise<string> {
    const stored = await this.redis.hget(REDIS_KEYS.threadNames(threadId), sessionId);
    if (stored) return stored;
    return generateDisplayName(threadId, sessionId);
  }

  private async touchThread(
    threadId: string,
    geospaceId: string,
    now: number,
  ): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.hset(REDIS_KEYS.threadMeta(threadId), 'lastActivity', String(now));
    pipeline.hincrby(REDIS_KEYS.threadMeta(threadId), 'messageCount', 1);
    pipeline.expire(REDIS_KEYS.threadMeta(threadId), LIMITS.THREAD_INACTIVITY_TTL);
    // Update geospace ZSET score so hot threads surface first
    pipeline.zadd(`geospace:${geospaceId}:threads`, 'XX', now, threadId);
    await pipeline.exec();
  }

  private async updatePreview(message: Message): Promise<void> {
    const previewKey = REDIS_KEYS.threadPreview(message.threadId);
    const raw = await this.redis.get(previewKey);
    const existing: MessagePreview[] = raw ? JSON.parse(raw) : [];

    const newPreview: MessagePreview = {
      messageId: message.messageId,
      senderDisplayName: message.senderDisplayName,
      content: message.content.slice(0, 100),
      timestamp: message.timestamp,
    };

    const updated = [...existing, newPreview].slice(-3);
    await this.redis.set(
      previewKey,
      JSON.stringify(updated),
      'EX',
      LIMITS.THREAD_INACTIVITY_TTL,
    );
  }
}
