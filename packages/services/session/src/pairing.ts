import { randomInt } from 'node:crypto';
import type { Redis } from 'ioredis';
import { REDIS_KEYS, LIMITS } from '@chatspaces/shared';

/** 6-digit numeric pair code, zero-padded. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export interface PairResult {
  success: boolean;
  friendSessionId?: string;
  /** Reason code when success is false. */
  reason?: 'invalid_code' | 'already_paired' | 'max_friends' | 'self_pair';
}

/**
 * PairingManager handles the QR / numeric-code friend-pairing flow.
 *
 * Flow:
 *  1. Session A calls generatePairCode() → gets a 6-digit code (TTL 5 min)
 *  2. Session B calls usePairCode(code) → both sessions are linked
 *
 * Storage:
 *  - pair_code:{code}       → STRING  sessionId  (TTL = PAIR_CODE_TTL)
 *  - session:{id}:friends   → SET     of paired session IDs
 */
export class PairingManager {
  constructor(private readonly redis: Redis) {}

  /**
   * Generate a unique pair code for the given session.
   * Retries up to 5 times to avoid collisions (extremely rare with 1M space).
   */
  async generatePairCode(sessionId: string): Promise<{ code: string; expiresAt: number }> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const key = REDIS_KEYS.pairCode(code);
      // NX = only set if not exists
      const set = await this.redis.set(key, sessionId, 'EX', LIMITS.PAIR_CODE_TTL, 'NX');
      if (set === 'OK') {
        return { code, expiresAt: Date.now() + LIMITS.PAIR_CODE_TTL * 1000 };
      }
    }
    throw new Error('Failed to generate unique pair code after 5 attempts');
  }

  /**
   * Consume a pair code and link the two sessions as friends.
   */
  async usePairCode(sessionId: string, code: string): Promise<PairResult> {
    const codeKey = REDIS_KEYS.pairCode(code);
    const ownerSessionId = await this.redis.get(codeKey);

    if (!ownerSessionId) {
      return { success: false, reason: 'invalid_code' };
    }

    if (ownerSessionId === sessionId) {
      return { success: false, reason: 'self_pair' };
    }

    const myFriendsKey = REDIS_KEYS.sessionFriends(sessionId);
    const theirFriendsKey = REDIS_KEYS.sessionFriends(ownerSessionId);

    // Check already paired
    const alreadyPaired = await this.redis.sismember(myFriendsKey, ownerSessionId);
    if (alreadyPaired) {
      return { success: false, reason: 'already_paired' };
    }

    // Check max friends
    const myFriendCount = await this.redis.scard(myFriendsKey);
    const theirFriendCount = await this.redis.scard(theirFriendsKey);
    if (myFriendCount >= LIMITS.MAX_PAIRED_FRIENDS || theirFriendCount >= LIMITS.MAX_PAIRED_FRIENDS) {
      return { success: false, reason: 'max_friends' };
    }

    // Link both sessions and consume the code atomically
    const pipeline = this.redis.pipeline();
    pipeline.sadd(myFriendsKey, ownerSessionId);
    pipeline.sadd(theirFriendsKey, sessionId);
    pipeline.del(codeKey);
    await pipeline.exec();

    return { success: true, friendSessionId: ownerSessionId };
  }

  /**
   * Return all paired friend session IDs for a session.
   */
  async getPairedFriends(sessionId: string): Promise<string[]> {
    return this.redis.smembers(REDIS_KEYS.sessionFriends(sessionId));
  }

  /**
   * Remove a friend pairing (unpair both sides).
   */
  async unpair(sessionId: string, friendSessionId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.srem(REDIS_KEYS.sessionFriends(sessionId), friendSessionId);
    pipeline.srem(REDIS_KEYS.sessionFriends(friendSessionId), sessionId);
    await pipeline.exec();
  }
}
