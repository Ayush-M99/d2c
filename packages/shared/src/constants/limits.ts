export const LIMITS = {
  // Sessions
  SESSION_TTL: 300, // 5 minutes, refreshed on heartbeat
  HEARTBEAT_INTERVAL: 15_000, // 15 seconds
  HEARTBEAT_MISS_THRESHOLD: 3, // 3 misses = disconnect
  RECONNECT_GRACE: 60, // 60 seconds before cleanup

  // GeoSpaces
  GEOSPACE_EMPTY_TTL: 300, // 5 min after last user

  // Threads
  MAX_CONCURRENT_THREADS: 5, // per user
  THREAD_INACTIVITY_TTL: 1800, // 30 minutes
  THREAD_MAX_USERS: 500,
  THREAD_TITLE_MAX_LENGTH: 120,
  THREAD_MAX_TAGS: 5,
  THREAD_CREATE_RATE_LIMIT: 3, // per hour per fingerprint
  THREAD_DEDUP_SIMILARITY_THRESHOLD: 0.7,

  // Messages
  MESSAGE_MAX_LENGTH: 2000,
  MESSAGE_RATE_LIMIT: 1, // per second per thread
  MESSAGE_BURST_LIMIT: 5, // in 3 seconds
  RECONNECT_REPLAY_CAP: 50, // max messages replayed on reconnect
  REPLY_PREVIEW_MAX_LENGTH: 100,

  // Grace period
  EXIT_GRACE_PERIOD: 600, // 10 minutes

  // DMs
  DM_REQUEST_TTL: 300, // 5 minutes
  DM_AUTO_CLOSE_HOURS: 24,

  // Friend pairing
  PAIR_CODE_TTL: 300, // 5 minutes
  MAX_PAIRED_FRIENDS: 5,

  // Read-only
  MAX_REMOTE_THREADS: 3,

  // Peek
  PEEK_CACHE_TTL: 30, // seconds

  // Display names
  NAME_ADJECTIVE_POOL_SIZE: 500,
  NAME_NOUN_POOL_SIZE: 500,
} as const;
