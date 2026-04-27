import { createHash, randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import { REDIS_KEYS, LIMITS } from '@chatspaces/shared';
import type { Session, Coordinates } from '@chatspaces/shared';

// ─── Helpers ─────────────────────────────────────────────────────────────

const FINGERPRINT_SALT = process.env['FINGERPRINT_SALT'] ?? 'chatspaces_dev_salt';

function hashFingerprint(raw: string): string {
  return createHash('sha256').update(`${FINGERPRINT_SALT}:${raw}`).digest('hex');
}

/** Serialize a Session to a flat Redis hash (arrays → JSON strings). */
function sessionToHash(s: Session): Record<string, string> {
  return {
    sessionId: s.sessionId,
    deviceFingerprint: s.deviceFingerprint,
    currentLocation: JSON.stringify(s.currentLocation),
    activeGeospace: s.activeGeospace ?? '',
    activeThreads: JSON.stringify(s.activeThreads),
    interestTags: JSON.stringify(s.interestTags),
    pairedFriends: JSON.stringify(s.pairedFriends),
    connectedAt: String(s.connectedAt),
    lastHeartbeat: String(s.lastHeartbeat),
    attestationStatus: s.attestationStatus,
  };
}

/** Deserialize a Redis hash back to a Session. */
function hashToSession(h: Record<string, string>): Session {
  return {
    sessionId: h['sessionId'] ?? '',
    deviceFingerprint: h['deviceFingerprint'] ?? '',
    currentLocation: h['currentLocation'] ? JSON.parse(h['currentLocation']) : null,
    activeGeospace: h['activeGeospace'] || null,
    activeThreads: h['activeThreads'] ? JSON.parse(h['activeThreads']) : [],
    interestTags: h['interestTags'] ? JSON.parse(h['interestTags']) : [],
    pairedFriends: h['pairedFriends'] ? JSON.parse(h['pairedFriends']) : [],
    connectedAt: Number(h['connectedAt']),
    lastHeartbeat: Number(h['lastHeartbeat']),
    attestationStatus: (h['attestationStatus'] as Session['attestationStatus']) ?? 'unverified',
  };
}

// ─── SessionManager ───────────────────────────────────────────────────────

export class SessionManager {
  constructor(private readonly redis: Redis) {}

  /**
   * Create a new anonymous session.
   * @param rawFingerprint - Device fingerprint from the client (stored hashed).
   * @param interestTags   - Optional initial interest tags (max 10).
   */
  async createSession(rawFingerprint: string, interestTags: string[] = []): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      sessionId: randomUUID(),
      deviceFingerprint: hashFingerprint(rawFingerprint),
      currentLocation: null,
      activeGeospace: null,
      activeThreads: [],
      interestTags: interestTags.slice(0, 10),
      pairedFriends: [],
      connectedAt: now,
      lastHeartbeat: now,
      attestationStatus: 'unverified',
    };

    const key = REDIS_KEYS.session(session.sessionId);
    await this.redis.hset(key, sessionToHash(session));
    await this.redis.expire(key, LIMITS.SESSION_TTL);

    return session;
  }

  /**
   * Retrieve a session by ID. Returns null if not found or expired.
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const key = REDIS_KEYS.session(sessionId);
    const hash = await this.redis.hgetall(key);
    if (!hash || !hash['sessionId']) return null;
    return hashToSession(hash);
  }

  /**
   * Validate that a session exists and is alive.
   * Equivalent to getSession but semantically communicates auth intent.
   */
  async validateSession(sessionId: string): Promise<Session | null> {
    return this.getSession(sessionId);
  }

  /**
   * Refresh the session TTL and update lastHeartbeat.
   * Called every HEARTBEAT_INTERVAL ms from the WebSocket gateway.
   */
  async heartbeat(sessionId: string): Promise<boolean> {
    const key = REDIS_KEYS.session(sessionId);
    const exists = await this.redis.exists(key);
    if (!exists) return false;

    const now = Date.now();
    await this.redis.hset(key, 'lastHeartbeat', String(now));
    await this.redis.expire(key, LIMITS.SESSION_TTL);
    return true;
  }

  /**
   * Update the session's current GPS location.
   */
  async updateLocation(sessionId: string, coords: Coordinates): Promise<void> {
    const key = REDIS_KEYS.session(sessionId);
    await this.redis.hset(key, 'currentLocation', JSON.stringify(coords));
    await this.redis.expire(key, LIMITS.SESSION_TTL);
  }

  /**
   * Set the active GeoSpace for this session.
   */
  async setActiveGeospace(sessionId: string, geospaceId: string | null): Promise<void> {
    const key = REDIS_KEYS.session(sessionId);
    await this.redis.hset(key, 'activeGeospace', geospaceId ?? '');
    await this.redis.expire(key, LIMITS.SESSION_TTL);
  }

  /**
   * Add a thread to the session's active thread list.
   * Returns false if the user is already at MAX_CONCURRENT_THREADS.
   */
  async joinThread(sessionId: string, threadId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;
    if (session.activeThreads.includes(threadId)) return true; // already joined
    if (session.activeThreads.length >= LIMITS.MAX_CONCURRENT_THREADS) return false;

    const updated = [...session.activeThreads, threadId];
    const key = REDIS_KEYS.session(sessionId);
    await this.redis.hset(key, 'activeThreads', JSON.stringify(updated));
    await this.redis.expire(key, LIMITS.SESSION_TTL);

    // Track in the user→threads set
    await this.redis.sadd(REDIS_KEYS.userThreads(sessionId), threadId);
    return true;
  }

  /**
   * Remove a thread from the session's active thread list.
   */
  async leaveThread(sessionId: string, threadId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const updated = session.activeThreads.filter((t) => t !== threadId);
    const key = REDIS_KEYS.session(sessionId);
    await this.redis.hset(key, 'activeThreads', JSON.stringify(updated));
    await this.redis.expire(key, LIMITS.SESSION_TTL);

    await this.redis.srem(REDIS_KEYS.userThreads(sessionId), threadId);
  }

  /**
   * Update interest tags (replaces the existing list).
   */
  async setInterestTags(sessionId: string, tags: string[]): Promise<void> {
    const key = REDIS_KEYS.session(sessionId);
    await this.redis.hset(key, 'interestTags', JSON.stringify(tags.slice(0, 10)));
    await this.redis.expire(key, LIMITS.SESSION_TTL);
  }

  /**
   * Mark a session as having a verified attestation status.
   */
  async setAttestationStatus(
    sessionId: string,
    status: Session['attestationStatus'],
  ): Promise<void> {
    const key = REDIS_KEYS.session(sessionId);
    await this.redis.hset(key, 'attestationStatus', status);
    await this.redis.expire(key, LIMITS.SESSION_TTL);
  }

  /**
   * Destroy a session and clean up associated keys.
   * Called on explicit disconnect or after RECONNECT_GRACE period expires.
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const pipeline = this.redis.pipeline();
    pipeline.del(REDIS_KEYS.session(sessionId));
    pipeline.del(REDIS_KEYS.userThreads(sessionId));
    await pipeline.exec();
  }
}
