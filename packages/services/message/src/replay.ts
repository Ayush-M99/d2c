import type { Redis } from 'ioredis';
import { REDIS_KEYS, LIMITS } from '@chatspaces/shared';
import type { Message } from '@chatspaces/shared';

/**
 * MessageReplayer fetches historical messages from a Redis Stream.
 *
 * Stream key: `thread:{id}:messages` (same as Pub/Sub channel — different namespaces in Redis)
 * Each stream entry stores the serialised Message JSON in a single `data` field.
 *
 * The `streamId` cursor returned with each batch is the Redis Stream entry ID
 * (e.g. `1714000000000-0`). The client must persist and send this back on
 * reconnect to get only messages it missed.
 */
export interface ReplayBatch {
  messages: Message[];
  /** The Redis stream entry ID of the last message in this batch. Null if empty. */
  nextCursor: string | null;
}

export class MessageReplayer {
  constructor(private readonly redis: Redis) {}

  /**
   * Fetch up to `limit` messages after `afterStreamId` (exclusive).
   *
   * @param threadId    — The thread to replay from
   * @param afterStreamId — Last stream entry ID the client has seen. Pass '0' to
   *                        start from the beginning.
   * @param limit       — Max messages to return (capped at RECONNECT_REPLAY_CAP)
   */
  async replay(
    threadId: string,
    afterStreamId: string = '0',
    limit: number = LIMITS.RECONNECT_REPLAY_CAP,
  ): Promise<ReplayBatch> {
    const cap = Math.min(limit, LIMITS.RECONNECT_REPLAY_CAP);
    const key = REDIS_KEYS.threadMessages(threadId);

    // XRANGE start end COUNT n
    // Exclusive start: Redis 6.2+ supports `(id` prefix. For broader compatibility
    // we use `afterStreamId` as-is (inclusive) and skip the first entry if it
    // matches, but a cleaner approach is to increment the sequence number.
    const startId = afterStreamId === '0' ? '0' : incrementStreamId(afterStreamId);

    const entries = await this.redis.xrange(key, startId, '+', 'COUNT', cap);

    if (!entries || entries.length === 0) {
      return { messages: [], nextCursor: null };
    }

    const messages: Message[] = [];
    let lastEntryId: string | null = null;

    for (const [entryId, fields] of entries) {
      lastEntryId = entryId;
      // Fields come as flat array: [field1, value1, field2, value2, ...]
      const dataIdx = fields.indexOf('data');
      if (dataIdx === -1) continue;
      const raw = fields[dataIdx + 1];
      if (!raw) continue;
      try {
        messages.push(JSON.parse(raw) as Message);
      } catch {
        // Corrupt entry — skip silently
      }
    }

    return { messages, nextCursor: lastEntryId };
  }
}

/**
 * Increment a Redis Stream ID to produce an exclusive lower bound.
 * Format: `<millis>-<seq>` → `<millis>-<seq+1>` or `<millis+1>-0` on overflow.
 */
function incrementStreamId(id: string): string {
  const parts = id.split('-');
  if (parts.length !== 2) return id;
  const millis = parseInt(parts[0]!, 10);
  const seq = parseInt(parts[1]!, 10);
  if (isNaN(millis) || isNaN(seq)) return id;
  return `${millis}-${seq + 1}`;
}
