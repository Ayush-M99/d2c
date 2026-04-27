export const REDIS_KEYS = {
  // Sessions
  session: (sessionId: string) => `session:${sessionId}`,
  sessionFriends: (sessionId: string) => `session:${sessionId}:friends`,

  // GeoSpaces
  geospaceUsers: (geospaceId: string) => `geospace:${geospaceId}:users`,
  geospaceMeta: (geospaceId: string) => `geospace:${geospaceId}:meta`,
  geospacePeek: (geospaceId: string) => `geospace:${geospaceId}:peek`,

  // Threads
  threadMeta: (threadId: string) => `thread:${threadId}:meta`,
  threadMembers: (threadId: string) => `thread:${threadId}:members`,
  threadMessages: (threadId: string) => `thread:${threadId}:messages`,
  threadPreview: (threadId: string) => `thread:${threadId}:preview`,
  threadNames: (threadId: string) => `thread:${threadId}:names`,
  threadRemote: (threadId: string) => `thread:${threadId}:remote`,
  threadTraveling: (threadId: string) => `thread:${threadId}:traveling`,

  // User → Threads mapping
  userThreads: (sessionId: string) => `user:${sessionId}:threads`,

  // DMs
  dmMessages: (sortedPairId: string) => `dm:${sortedPairId}:messages`,

  // Rate limiting
  rateThreadCreate: (fingerprint: string) => `rate:thread_create:${fingerprint}`,
  rateMessage: (sessionId: string, threadId: string) => `rate:${sessionId}:${threadId}`,

  // Gamification
  gamification: (fingerprint: string) => `gamification:${fingerprint}`,

  // Friend pairing
  pairCode: (code: string) => `pair_code:${code}`,

  // Pub/Sub channels
  threadChannel: (threadId: string) => `thread:${threadId}:messages`,

  // Grace period
  graceTimer: (sessionId: string, geospaceId: string) => `grace:${sessionId}:${geospaceId}`,
} as const;
