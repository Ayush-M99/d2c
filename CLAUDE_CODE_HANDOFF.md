# ChatSpaces — Claude Code Handoff Document
## Complete Architecture Context & Implementation Guide

> **Purpose**: This document contains the full product context, architecture decisions, data models, and implementation plan for ChatSpaces. It is the single source of truth for building the system. Read this entirely before writing any code.

---

## 1. PRODUCT SUMMARY

ChatSpaces is a proximity-based, anonymous, real-time communication platform. Users in physical proximity join shared communication spaces (GeoSpaces), participate in structured topic-based conversations (Threads), and interact anonymously. The system supports transition to private conversations (DMs) via mutual consent.

**Core User Flow:**
1. User opens app → Peek Mode (coarse location, sees aggregate activity, no GPS yet)
2. User grants precise location → placed into a GeoSpace based on coordinates
3. User sees threads via 3-tier discovery (Hot Now → For You → Search)
4. User joins a thread → assigned random display name → real-time chat
5. User can request DM with another user (mutual consent required)
6. User leaves GeoSpace physically → grace period (10 min) → force exit or convert to DM

---

## 2. TECH STACK (DECIDED)

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ with TypeScript |
| WebSocket | Socket.IO (already used in MVP) |
| HTTP Framework | Express.js with TypeScript |
| Database (ephemeral state) | Redis Cluster (sessions, geo, threads, messages, pub/sub) |
| Database (persistent) | PostgreSQL 16 with PostGIS (venues, compliance, nominations) |
| Message Broker | Apache Kafka (async: moderation, analytics, notifications) |
| Object Storage | S3-compatible (ephemeral DM media) |
| Package Manager | pnpm (fast, monorepo-native with workspaces) |
| Build Tool | tsup or tsx for fast builds |
| Testing | Vitest |
| Linting | ESLint + Prettier |
| Container | Docker + docker-compose for local dev |

---

## 3. MONOREPO STRUCTURE

```
chatspaces/
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml
├── tsconfig.base.json              # Shared TS config
├── docker-compose.yml              # Redis, Postgres, Kafka, Zookeeper
├── .env.example
│
├── packages/
│   ├── shared/                     # Shared types, constants, utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── session.ts      # Session types
│   │   │   │   ├── geospace.ts     # GeoSpace types
│   │   │   │   ├── thread.ts       # Thread types (includes thread_type enum)
│   │   │   │   ├── message.ts      # Message types (includes reply_to_message_id)
│   │   │   │   ├── ws-frames.ts    # All WebSocket frame type definitions
│   │   │   │   ├── dm.ts           # DM types
│   │   │   │   └── venue.ts        # Venue types
│   │   │   ├── constants/
│   │   │   │   ├── redis-keys.ts   # All Redis key patterns as template functions
│   │   │   │   ├── limits.ts       # Rate limits, caps, TTLs
│   │   │   │   └── geohash.ts      # Geohash precision mappings
│   │   │   ├── utils/
│   │   │   │   ├── ulid.ts         # ULID generation
│   │   │   │   ├── geohash.ts      # Geohash encoding/decoding
│   │   │   │   ├── haversine.ts    # Distance calculation
│   │   │   │   └── name-generator.ts  # Random display name generation
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── gateway/                    # WebSocket Gateway + HTTP API
│   │   ├── src/
│   │   │   ├── server.ts           # Express + Socket.IO setup
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts         # Session token validation
│   │   │   │   ├── rate-limiter.ts # Rate limiting middleware
│   │   │   │   └── attestation.ts  # Device attestation check
│   │   │   ├── http/
│   │   │   │   ├── routes/
│   │   │   │   │   ├── session.ts      # POST /api/v1/session
│   │   │   │   │   ├── peek.ts         # GET /api/v1/peek
│   │   │   │   │   ├── geospace.ts      # GET /api/v1/geospaces/discover
│   │   │   │   │   ├── thread.ts        # POST /api/v1/threads, GET preview, GET messages
│   │   │   │   │   ├── dm.ts            # POST request, POST accept
│   │   │   │   │   ├── venue.ts         # GET nearby, POST nominate
│   │   │   │   │   ├── report.ts        # POST /api/v1/report
│   │   │   │   │   └── gamification.ts  # GET /api/v1/gamification/me
│   │   │   │   └── index.ts
│   │   │   ├── ws/
│   │   │   │   ├── handler.ts          # Main Socket.IO event router
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── location.ts     # location_update handler
│   │   │   │   │   ├── thread.ts       # join_thread, leave_thread, create_thread
│   │   │   │   │   ├── message.ts      # send_message handler
│   │   │   │   │   ├── dm.ts           # dm_request, dm_accept
│   │   │   │   │   ├── pairing.ts      # generate_pair_code, use_pair_code
│   │   │   │   │   └── heartbeat.ts    # heartbeat handler
│   │   │   │   └── fanout.ts           # Redis Pub/Sub → local client delivery
│   │   │   └── config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── services/
│   │   ├── session/                # Session Service
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── session-manager.ts   # Create, validate, heartbeat, cleanup
│   │   │   │   ├── presence.ts          # Presence tracking (GeoSpace + Thread level)
│   │   │   │   └── pairing.ts           # Friend pairing logic
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── geospace/               # GeoSpace Service
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── geospace-manager.ts  # Create, assign user, transition, cleanup
│   │   │   │   ├── spatial-index.ts     # Geohash computation, neighbor lookup
│   │   │   │   ├── peek.ts             # Peek mode aggregation
│   │   │   │   └── venue-check.ts      # PostGIS venue boundary check
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── thread/                 # Thread Service
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── thread-manager.ts    # CRUD, join, leave, TTL
│   │   │   │   ├── discovery.ts         # 3-tier discovery (hot, for-you, search)
│   │   │   │   ├── dedup.ts            # Fuzzy title matching for pre-creation suggestions
│   │   │   │   ├── preview.ts          # Preview cache (last 3 messages)
│   │   │   │   └── types.ts            # Thread type-specific logic (poll, qna, countdown)
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   ├── message/                # Message Service
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── message-handler.ts   # Ingest, validate, assign ULID, publish
│   │   │   │   ├── inline-filter.ts     # Synchronous keyword/regex filter (5ms budget)
│   │   │   │   ├── replay.ts           # Reconnect replay (50-msg cap)
│   │   │   │   └── fanout.ts           # Redis Pub/Sub publish + Kafka produce
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   │
│   │   └── moderation/             # Moderation Service (Kafka consumer, Phase 4)
│   │       ├── src/
│   │       │   ├── index.ts
│   │       │   ├── toxicity.ts
│   │       │   └── compliance.ts
│   │       ├── package.json
│   │       └── tsconfig.json
│   │
│   └── db/                         # Database migrations & seeds
│       ├── migrations/
│       │   ├── 001_create_venues.sql
│       │   ├── 002_create_nominations.sql
│       │   └── 003_create_compliance_log.sql
│       └── seeds/
│           └── sample_venues.sql
│
├── scripts/
│   ├── dev.sh                      # Start all services in dev mode
│   └── seed-redis.ts               # Seed Redis with test data
│
└── docs/
    └── PRD_v2.1.pdf                # This PRD
```

---

## 4. SHARED TYPE DEFINITIONS

These are the exact types every service imports. Define these FIRST before writing any service logic.

### 4.1 Session Types
```typescript
// packages/shared/src/types/session.ts

export interface Session {
  sessionId: string;              // UUIDv4
  deviceFingerprint: string;      // Salted SHA-256 hash
  currentLocation: Coordinates | null;
  activeGeospace: string | null;   // geospace_id
  activeThreads: string[];         // thread_ids (max 5)
  interestTags: string[];          // max 10
  pairedFriends: string[];         // linked session_ids
  connectedAt: number;             // Unix ms
  lastHeartbeat: number;           // Unix ms
  attestationStatus: 'verified' | 'unverified' | 'suspicious';
}

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;   // meters
  speed?: number;      // m/s
}
```

### 4.2 GeoSpace Types
```typescript
// packages/shared/src/types/geospace.ts

export type RadiusTier = 'nearby' | 'around_me';

export const RADIUS_CONFIG: Record<RadiusTier, { meters: number; geohashPrecision: number }> = {
  nearby: { meters: 50, geohashPrecision: 7 },
  around_me: { meters: 200, geohashPrecision: 6 },
};

export interface GeoSpace {
  geospaceId: string;             // UUID derived from geohash + tier
  center: Coordinates;
  radiusTier: RadiusTier;
  geohash: string;
  activeUsers: number;
  historicalPeak: number;
  createdAt: number;
  ttl: number;                     // seconds, default 300
}
```

### 4.3 Thread Types
```typescript
// packages/shared/src/types/thread.ts

export type ThreadType = 'text' | 'poll' | 'qna' | 'countdown';

export interface Thread {
  threadId: string;                // UUID
  geospaceId: string;
  title: string;                   // max 120 chars
  threadType: ThreadType;
  tags: string[];                  // max 5
  creatorSession: string;
  activeUsers: number;
  messageCount: number;
  previewMessages: MessagePreview[];  // last 3
  createdAt: number;
  lastActivity: number;
  ttl: number;                     // seconds, default 1800
  maxUsers: number;                // default 500, overflow UX deferred
}

export interface MessagePreview {
  messageId: string;
  senderDisplayName: string;
  content: string;                 // truncated to 100 chars
  timestamp: number;
}

export interface ThreadDiscovery {
  hot: Thread[];
  forYou: Thread[];
  searchResults?: Thread[];
}

// Poll-specific metadata (stored in thread metadata JSONB or Redis hash)
export interface PollConfig {
  question: string;
  options: string[];               // 2-6 options
  votes: Record<string, number>;   // option -> count
  voterSessions: Set<string>;      // prevent double voting
}

// QnA-specific metadata
export interface QnAConfig {
  upvotes: Record<string, number>; // message_id -> upvote count
  answeredIds: string[];           // creator-marked answers
}
```

### 4.4 Message Types
```typescript
// packages/shared/src/types/message.ts

export type MessageType = 'text' | 'image' | 'system' | 'reaction' | 'poll_vote';

export interface Message {
  messageId: string;               // ULID (sortable, time-ordered)
  threadId: string;
  senderSession: string;
  senderDisplayName: string;
  content: string;                 // max 2000 chars
  type: MessageType;
  replyToMessageId: string | null; // null if not a reply
  replyPreview: string | null;     // first 100 chars of parent message (denormalized)
  timestamp: number;               // server-assigned Unix ms
  metadata: Record<string, any>;   // extensible
}
```

### 4.5 WebSocket Frame Types
```typescript
// packages/shared/src/types/ws-frames.ts

// ─── Client → Server ───
export type ClientFrame =
  | { type: 'location_update'; data: { lat: number; lng: number; accuracy: number; speed: number } }
  | { type: 'join_thread'; data: { threadId: string } }
  | { type: 'leave_thread'; data: { threadId: string } }
  | { type: 'send_message'; data: { threadId: string; content: string; msgType: MessageType; replyToMessageId?: string; metadata?: Record<string, any> } }
  | { type: 'create_thread'; data: { title: string; threadType: ThreadType; tags: string[]; geospaceId: string } }
  | { type: 'dm_request'; data: { targetSessionId: string } }
  | { type: 'dm_accept'; data: { requestId: string } }
  | { type: 'generate_pair_code'; data: {} }
  | { type: 'use_pair_code'; data: { code: string } }
  | { type: 'heartbeat'; data: {} }
  | { type: 'view_confirmed'; data: { mediaId: string } }
  | { type: 'nominate_venue'; data: { lat: number; lng: number; suggestedName: string } };

// ─── Server → Client ───
export type ServerFrame =
  | { type: 'geospace_update'; data: { geospaceId: string; threads: Thread[]; venueId?: string } }
  | { type: 'thread_list'; data: ThreadDiscovery }
  | { type: 'thread_preview'; data: { threadId: string; previewMessages: MessagePreview[]; count: number; age: number } }
  | { type: 'similar_threads'; data: { suggestedThreads: Thread[] } }
  | { type: 'new_message'; data: Message }
  | { type: 'missed_messages'; data: { threadId: string; messages: Message[]; totalMissed: number } }
  | { type: 'user_joined'; data: { threadId: string; displayName: string } }
  | { type: 'user_left'; data: { threadId: string; displayName: string } }
  | { type: 'exit_prompt'; data: { geospaceId: string; graceSeconds: number } }
  | { type: 'read_only_entered'; data: { geospaceId: string; travelDistance: number; travelTime: number } }
  | { type: 'dm_request_received'; data: { fromDisplayName: string; requestId: string } }
  | { type: 'pair_code_generated'; data: { code: string; expiresAt: number } }
  | { type: 'friend_paired'; data: { friendSessionId: string; friendDisplayNames: Record<string, string> } }
  | { type: 'moderation_action'; data: { messageId: string; action: string } }
  | { type: 'notification_push'; data: { notificationType: string; payload: any } }
  | { type: 'error'; data: { code: string; message: string } };
```

### 4.6 DM Types
```typescript
// packages/shared/src/types/dm.ts

export interface DMRequest {
  requestId: string;
  fromSession: string;
  toSession: string;
  fromDisplayName: string;
  threadId: string;                // source thread
  createdAt: number;
  ttl: number;                     // 300 seconds
}

export interface DMChat {
  chatId: string;                  // dm:{sorted_pair_id}
  participants: [string, string];  // session_ids
  displayNames: Record<string, string>;  // session_id -> name they're known by
  createdAt: number;
}
```

---

## 5. REDIS KEY SCHEMA

```typescript
// packages/shared/src/constants/redis-keys.ts

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
```

---

## 6. CONSTANTS & LIMITS

```typescript
// packages/shared/src/constants/limits.ts

export const LIMITS = {
  // Sessions
  SESSION_TTL: 300,                    // 5 minutes, refreshed on heartbeat
  HEARTBEAT_INTERVAL: 15_000,          // 15 seconds
  HEARTBEAT_MISS_THRESHOLD: 3,         // 3 misses = disconnect
  RECONNECT_GRACE: 60,                 // 60 seconds before cleanup

  // GeoSpaces
  GEOSPACE_EMPTY_TTL: 300,             // 5 min after last user

  // Threads
  MAX_CONCURRENT_THREADS: 5,           // per user
  THREAD_INACTIVITY_TTL: 1800,         // 30 minutes
  THREAD_MAX_USERS: 500,
  THREAD_TITLE_MAX_LENGTH: 120,
  THREAD_MAX_TAGS: 5,
  THREAD_CREATE_RATE_LIMIT: 3,         // per hour per fingerprint
  THREAD_DEDUP_SIMILARITY_THRESHOLD: 0.7,

  // Messages
  MESSAGE_MAX_LENGTH: 2000,
  MESSAGE_RATE_LIMIT: 1,               // per second per thread
  MESSAGE_BURST_LIMIT: 5,              // in 3 seconds
  RECONNECT_REPLAY_CAP: 50,            // max messages replayed on reconnect
  REPLY_PREVIEW_MAX_LENGTH: 100,

  // Grace period
  EXIT_GRACE_PERIOD: 600,              // 10 minutes

  // DMs
  DM_REQUEST_TTL: 300,                 // 5 minutes
  DM_AUTO_CLOSE_HOURS: 24,

  // Friend pairing
  PAIR_CODE_TTL: 300,                  // 5 minutes
  MAX_PAIRED_FRIENDS: 5,

  // Read-only
  MAX_REMOTE_THREADS: 3,

  // Peek
  PEEK_CACHE_TTL: 30,                 // seconds

  // Display names
  NAME_ADJECTIVE_POOL_SIZE: 500,
  NAME_NOUN_POOL_SIZE: 500,
} as const;
```

---

## 7. BUILD ORDER (Implementation Sequence)

Build in this exact order. Each step depends on the previous.

### Step 1: Project Scaffolding
- Initialize monorepo with pnpm workspaces
- Set up tsconfig, eslint, prettier
- Create docker-compose.yml with Redis, PostgreSQL (PostGIS), Kafka + Zookeeper
- Create the shared package with all types, constants, and utilities

### Step 2: Session Service
- `session-manager.ts`: createSession(), validateSession(), heartbeat(), destroySession()
- Redis operations: HSET for session data, EXPIRE for TTL, refresh on heartbeat
- Device fingerprint handling (accept from client, store hashed)
- This is the auth layer — every other service calls validateSession()

### Step 3: GeoSpace Service
- `spatial-index.ts`: coordinatesToGeohash(), getNeighborGeohashes()
- `geospace-manager.ts`: assignUserToGeospace(), transitionGeospace(), cleanupEmpty()
- Redis GEOADD for user positions, GEOSEARCH for proximity queries
- Geohash + radius tier → geospace_id derivation
- Handle boundary users (query cell + 8 neighbors + haversine filter)

### Step 4: Thread Service
- `thread-manager.ts`: createThread(), joinThread(), leaveThread(), closeThread()
- `discovery.ts`: getHotThreads(), getForYouThreads(), searchThreads()
- `dedup.ts`: findSimilarThreads() — Levenshtein distance on titles
- `preview.ts`: updatePreview() — cache last 3 messages
- Thread TTL management with Redis EXPIRE
- Rate limiting on thread creation (3/hr per fingerprint)

### Step 5: Message Service
- `message-handler.ts`: processMessage() — validate, assign ULID, inline filter, publish
- `inline-filter.ts`: basic keyword/regex filter (5ms budget, hardcoded blocklist for MVP)
- `fanout.ts`: publish to Redis Pub/Sub channel + Kafka topic
- `replay.ts`: replayMissedMessages() — XRANGE from last_seen_id, cap at 50
- Handle reply_to: lookup parent message, denormalize preview (100 chars)

### Step 6: WebSocket Gateway
- Express server with Socket.IO
- HTTP routes (REST endpoints)
- Socket.IO event handlers mapping to service calls
- Redis Pub/Sub subscriber: listen to thread channels, deliver to local clients
- Connection lifecycle: connect → authenticate → subscribe → heartbeat loop → disconnect cleanup
- This is the glue layer — it calls Session, GeoSpace, Thread, and Message services

### Step 7: Integration & Testing
- End-to-end flow: connect → location → geospace → discover threads → join → send message → receive
- Load testing with Artillery or k6 (target: 1K concurrent for MVP)
- Docker compose up should give a fully working local environment

---

## 8. DOCKER COMPOSE (Local Development)

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

  postgres:
    image: postgis/postgis:16-3.4
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: chatspaces
      POSTGRES_USER: chatspaces
      POSTGRES_PASSWORD: chatspaces_dev
    volumes:
      - pgdata:/var/lib/postgresql/data

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper

volumes:
  pgdata:
```

---

## 9. KEY IMPLEMENTATION NOTES

### Display Name Generation
```typescript
// Deterministic from seed, but unique per thread
function generateDisplayName(threadId: string, sessionId: string): string {
  const hash = createHash('sha256').update(`${threadId}:${sessionId}`).digest('hex');
  const adjIndex = parseInt(hash.slice(0, 8), 16) % ADJECTIVES.length;
  const nounIndex = parseInt(hash.slice(8, 16), 16) % NOUNS.length;
  return `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`;
}
```

### ULID for Message Ordering
Use the `ulid` npm package. ULIDs are lexicographically sortable and encode timestamp, giving you time-ordered message IDs without a separate sequence counter for MVP. At scale (multiple Message Service instances), switch to a shared Redis atomic counter for the random component.

### Redis Streams for Message History
```typescript
// Write message to stream
await redis.xadd(`thread:${threadId}:messages`, '*', 'data', JSON.stringify(message));

// Replay on reconnect (capped at 50)
const entries = await redis.xrange(`thread:${threadId}:messages`, lastSeenId, '+', 'COUNT', 50);
```

### Thread Deduplication (Levenshtein)
Use `fastest-levenshtein` npm package. On create_thread, compute normalized Levenshtein distance against all active thread titles in the GeoSpace. If any match < 0.3 distance (i.e., > 0.7 similarity), return similar_threads frame to client before confirming creation.

### Geohash
Use `ngeohash` npm package. Encode coordinates at the precision determined by radius tier. Decode neighbors for boundary handling.

---

## 10. API ENDPOINTS (REST)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | /api/v1/session | session.create | Create anonymous session, return token |
| GET | /api/v1/peek | geospace.peek | Peek mode aggregate data (coarse location) |
| GET | /api/v1/geospaces/discover | geospace.discover | Full discovery with threads |
| POST | /api/v1/threads | thread.create | Create thread (returns similar_threads if dedup match) |
| GET | /api/v1/threads/:id/preview | thread.preview | Thread preview (last 3 msgs) |
| GET | /api/v1/threads/:id/messages | message.history | Paginated message history (for scroll-to-load) |
| POST | /api/v1/dm/request | dm.request | Send DM request |
| POST | /api/v1/dm/:id/accept | dm.accept | Accept DM |
| GET | /api/v1/venues/nearby | venue.nearby | Discover nearby venues |
| POST | /api/v1/venues/nominate | venue.nominate | Nominate a venue |
| POST | /api/v1/report | moderation.report | Report message or thread |
| POST | /api/v1/notify-me | notification.subscribe | Set location activity alert |
| GET | /api/v1/gamification/me | gamification.stats | Get badges and streaks |

---

## 11. WebSocket Events (Socket.IO)

### Client emits:
- `location_update` → GeoSpace Service
- `join_thread` → Thread Service
- `leave_thread` → Thread Service
- `send_message` → Message Service
- `create_thread` → Thread Service (with dedup check)
- `dm_request` → DM handler
- `dm_accept` → DM handler
- `generate_pair_code` → Session Service (pairing)
- `use_pair_code` → Session Service (pairing)
- `heartbeat` → Session Service

### Server emits:
- `geospace_update` — when user's GeoSpace changes
- `thread_list` — three-tier discovery results
- `similar_threads` — dedup suggestions on create
- `new_message` — incoming message in joined thread
- `missed_messages` — reconnect replay (max 50)
- `user_joined` / `user_left` — presence updates
- `exit_prompt` — left GeoSpace boundary
- `moderation_action` — message flagged/removed
- `error` — error responses

---

## 12. WHAT TO BUILD FOR MVP vs DEFER

### MVP (Build Now):
- [x] Session creation and validation
- [x] GeoSpace assignment via geohash
- [x] Thread CRUD with text type
- [x] Real-time messaging via Socket.IO + Redis Pub/Sub
- [x] Random display names (per thread)
- [x] Message replies (reply_to_message_id)
- [x] Thread deduplication (pre-creation fuzzy matching)
- [x] Reconnect replay (50-msg cap)
- [x] Basic inline content filter (keyword blocklist)
- [x] Thread discovery (Hot Now ranking by activity)
- [x] Rate limiting (messages + thread creation)
- [x] Simple map-compatible API (return coordinates + counts)

### Phase 1-2 (Build Later):
- [ ] Peek Mode (coarse location, aggregate data)
- [ ] Interest tags + "For You" discovery tier
- [ ] Thread types (poll, qna, countdown)
- [ ] Thread previews (cached last 3 messages)
- [ ] Read-only remote access
- [ ] Geofencing integration (client-side)
- [ ] GeoSpace exit detection + grace period

### Phase 3+ (Build Much Later):
- [ ] DM system with mutual consent
- [ ] Friend pairing (QR + code)
- [ ] Ephemeral media (S3 + view-once)
- [ ] Venue system + nominations + QR bridge
- [ ] ML moderation (Kafka consumer)
- [ ] Gamification (streaks, badges)
- [ ] Push notifications
- [ ] Anti-spoofing (device attestation)
- [ ] Compliance logging

---

## 13. CRITICAL DESIGN DECISIONS (DO NOT OVERRIDE)

1. **Anonymous-first**: No user registration. No persistent identity. Session = UUIDv4, disposable.
2. **Ephemeral data**: Messages exist only during thread TTL. No long-term message storage.
3. **Random names per thread**: Different name in each thread. Never correlatable across threads.
4. **Mutual consent DMs**: Both parties must accept. No unsolicited contact.
5. **Physical presence required for participation**: Read-only for remote users. Must be physically present to send messages.
6. **Thread dedup before creation**: Always suggest similar threads. Soft nudge, not hard block.
7. **50-message reconnect cap**: Cap replay, show "missed X" indicator, paginated REST for older.
8. **500-user thread cap**: Defined but overflow UX deferred.
9. **No blockchain**: Standard WebSocket + Redis. E2E encryption for DMs in Phase 3 using Signal Protocol.
10. **No custom UDP protocol**: WebSocket + HTTP/3 readiness. Dropped from roadmap.

---

*This document is version-locked to PRD v2.1 (Final). All architecture and product decisions are settled. Start building from Step 1.*
