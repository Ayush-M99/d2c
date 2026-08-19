# d2c

**Proximity-based anonymous chat for people sharing the same place.**

d2c drops you into a location-backed room called a **GeoSpace**, shows the conversations
happening around you right now, and lets you jump into any of them without an account, a
profile, or a persistent identity. Threads are ephemeral: they live while people are
talking and expire when they go quiet.

Built as a pnpm monorepo — React client, Express + Socket.IO gateway, five TypeScript
domain services, Redis for live state, PostgreSQL/PostGIS for venue data, and Kafka for
asynchronous processing.

<p align="left">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white">
  <img alt="Node" src="https://img.shields.io/badge/Node-20%2B-339933?logo=node.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socketdotio&logoColor=white">
  <img alt="Redis" src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white">
  <img alt="Kafka" src="https://img.shields.io/badge/Kafka-7.5-231F20?logo=apachekafka&logoColor=white">
  <img alt="PostGIS" src="https://img.shields.io/badge/PostGIS-16--3.4-336791?logo=postgresql&logoColor=white">
</p>

---

## Table of contents

- [The app](#the-app)
- [How it works](#how-it-works)
- [Architecture](#architecture)
- [The message path](#the-message-path)
- [GeoSpaces: turning coordinates into rooms](#geospaces-turning-coordinates-into-rooms)
- [Data model](#data-model)
- [Real-time protocol](#real-time-protocol)
- [HTTP API](#http-api)
- [Limits and lifecycle](#limits-and-lifecycle)
- [Performance](#performance)
- [Repository layout](#repository-layout)
- [Running it locally](#running-it-locally)
- [Environment](#environment)
- [Current state](#current-state)

---

## The app

### Explore — the map and what's active around you

The map renders live zones around your position; the sheet below lists threads in your
GeoSpace ranked by recent activity, with `nearby` / `hot` / `for you` filters.

![Explore screen](docs/screenshots/explore.png)

### A live thread

Everyone in a thread gets a per-thread anonymous display name — deterministic per
`(threadId, sessionId)`, so you are "Gray Alpaca" consistently inside one conversation
and someone else entirely in the next one.

![Thread screen](docs/screenshots/thread.png)

### Mobile

The client is built mobile-first; the same views at a 390 px viewport.

<p align="left">
  <img alt="Explore on mobile" src="docs/screenshots/explore-mobile.png" width="270">
  <img alt="Thread on mobile" src="docs/screenshots/thread-mobile.png" width="270">
  <img alt="Create thread on mobile" src="docs/screenshots/create-thread-mobile.png" width="270">
</p>

### Pairing and profile

Friends pair through a 6-digit code with a 5-minute TTL. Identity is a device
fingerprint hashed with a server-side salt — no email, no username, no password.

<p align="left">
  <img alt="Pair with a friend" src="docs/screenshots/pair.png" width="420">
  <img alt="Profile" src="docs/screenshots/profile.png" width="420">
</p>

### Landing

![Landing screen](docs/screenshots/landing.png)

> Screenshots are captured from a production build running against the local stack, with
> demo content seeded by [`scripts/seed-demo.mjs`](scripts/seed-demo.mjs).

---

## How it works

1. **You get a session, not an account.** The client generates a device fingerprint and
   `POST /api/sessions` returns an anonymous session. The fingerprint is stored SHA-256
   hashed with a server salt; the session itself is a Redis hash with a 5-minute TTL that
   the client refreshes by heartbeat.
2. **Your coordinates become a room.** The gateway hashes your position into a geohash
   cell and derives a deterministic GeoSpace ID from it. Everyone standing in the same
   cell resolves to the same ID without any coordination.
3. **Threads live inside a GeoSpace.** Creating a thread indexes it in a Redis sorted set
   scored by last activity, which is what powers the "hot threads" list.
4. **Messages fan out through Redis.** A message is appended to a Redis Stream, published
   on a Pub/Sub channel, and pushed to a Kafka topic. The gateway subscribes to the
   Pub/Sub pattern and relays into the matching Socket.IO room.
5. **Everything expires.** Sessions, GeoSpaces, threads, pair codes, and preview caches
   all carry TTLs. Silence cleans itself up.

---

## Architecture

```mermaid
flowchart TB
    subgraph client["Browser — React 19 + Vite"]
        UI["Pages: Explore · Thread · Create · Pair · Profile"]
        ST["Zustand stores<br/>session · location · thread · message"]
        SIO["Socket.IO client"]
        MAP["Leaflet map + Three.js overlays"]
        UI --- ST --- SIO
        UI --- MAP
    end

    subgraph gw["Gateway — Express + Socket.IO"]
        AUTH["socketAuth<br/>session check on handshake"]
        HANDLERS["WS handlers<br/>location_update · join · create · send"]
        REST["REST routes<br/>/api/sessions /threads /geospace /venues /report"]
        FANOUT["RedisFanout<br/>PSUBSCRIBE thread:*:messages"]
        RL["IP rate limiter<br/>60 req/min"]
    end

    subgraph svc["Domain services — TypeScript packages"]
        SESSION["session<br/>SessionManager · PresenceTracker · PairingManager"]
        GEO["geospace<br/>GeoSpaceManager · spatial index · VenueChecker · Peek"]
        THREAD["thread<br/>ThreadManager · Discovery · Dedup"]
        MSG["message<br/>MessageHandler · FanoutPublisher · Replayer · filter"]
        MOD["moderation<br/>(scaffold)"]
    end

    subgraph data["Infrastructure — Docker Compose"]
        REDIS[("Redis 7<br/>sessions · geospaces · threads<br/>Streams · Pub/Sub · rate limits")]
        PG[("PostgreSQL 16 + PostGIS<br/>venues · nominations · compliance log")]
        KAFKA[("Kafka 7.5<br/>topic: thread.messages")]
    end

    SIO <-->|"WebSocket"| AUTH
    UI -->|"HTTP"| RL --> REST
    AUTH --> HANDLERS
    HANDLERS --> SESSION & GEO & THREAD & MSG
    REST --> SESSION & GEO & THREAD
    SESSION & GEO & THREAD & MSG --> REDIS
    GEO --> PG
    MSG -->|"produce"| KAFKA
    KAFKA -.->|"consume (planned)"| MOD
    REDIS -->|"pmessage"| FANOUT --> SIO
```

**Why the gateway holds no state.** Thread membership lives in Redis and delivery happens
over Redis Pub/Sub, so a gateway process is a pure relay. Any process subscribed to the
pattern can serve any socket, which is what makes horizontal scale-out a deployment
concern rather than a code change.

**Why Kafka is off the critical path.** `FanoutPublisher.publish()` awaits the Redis
`PUBLISH` — that is the delivery guarantee — and fires the Kafka produce without awaiting
it. A slow or dead broker delays moderation and analytics, never chat.

---

## The message path

```mermaid
sequenceDiagram
    autonumber
    participant C as Sender (client)
    participant G as Gateway
    participant M as MessageHandler
    participant R as Redis
    participant K as Kafka
    participant F as RedisFanout
    participant O as Everyone in the thread

    C->>G: send_message { threadId, content, msgType }
    G->>G: session valid? in room thread:{id}?
    G->>M: process(message)
    M->>M: inline filter (~5 ms budget, precompiled regex union)
    M->>R: INCR rate:{session}:{thread}:{sec} — 1/s, burst 5 per 3 s
    M->>R: XADD thread:{id}:messages  (ULID, server timestamp, display name)
    M->>R: XTRIM MAXLEN ~1000
    M->>R: PUBLISH thread:{id}:messages
    M--)K: produce thread.messages (fire and forget)
    R--)F: pmessage on thread:*:messages
    F->>O: io.to("thread:{id}").emit("new_message")
    Note over M,R: HSET lastActivity · HINCRBY messageCount · ZADD geospace ZSET · refresh preview
```

**Reconnects.** Each client keeps the Redis Stream entry ID of the last message it saw.
On rejoin, `MessageReplayer` runs `XRANGE` from the next ID and returns up to 50 missed
messages — a cursor, not a full history refetch.

---

## GeoSpaces: turning coordinates into rooms

A GeoSpace is a geohash cell plus a radius tier. Its ID is derived, not allocated:

```
geospaceId = uuid_shape( sha256( `${geohash}:${tier}` ) )
```

Two clients in the same cell compute the same ID independently — no registry, no
coordination, no write to create a room.

| Tier | Radius | Geohash precision | Cell size |
|---|---|---|---|
| `nearby` | 50 m | 7 | ~153 m |
| `around_me` | 200 m | 6 | ~610 m |

```mermaid
flowchart LR
    A["GPS fix<br/>lat, lng"] --> B["geohash at tier precision"]
    B --> C["sha256(geohash:tier)<br/>→ deterministic GeoSpace ID"]
    B --> D["3×3 neighbour cells"]
    D --> E["haversine filter<br/>keep cells within 2× tier radius"]
    C --> F["Redis: geospace:{id}:meta + :users"]
    E --> F
    F --> G["Thread ZSET<br/>geospace:{id}:threads"]
    F --> H["PostGIS venue lookup<br/>ST_DWithin on GEOGRAPHY"]
```

**Boundary straddling.** Standing on a cell edge would otherwise hide the conversation
happening three metres away. `getBoundaryCandidates()` takes the primary cell plus its
eight neighbours and keeps any whose centre is within twice the tier radius, measured by
haversine distance.

**Venues.** If PostGIS finds an approved venue within 100 m (`ST_DWithin` over a
GiST-indexed `GEOGRAPHY(Point, 4326)` column), the GeoSpace update carries a `venueId`.
The lookup is wrapped so a database problem degrades the response instead of failing it.

---

## Data model

### Redis — everything live

| Key | Type | Holds |
|---|---|---|
| `session:{id}` | hash | session record, TTL 300 s |
| `session:{id}:friends` | set | paired friends |
| `geospace:{id}:meta` | hash | centre, tier, geohash, active users, historical peak |
| `geospace:{id}:users` | set | present sessions |
| `geospace:{id}:threads` | zset | thread IDs scored by last activity |
| `geospace:{id}:peek` | string | cached peek payload, TTL 30 s |
| `thread:{id}:meta` | hash | title, type, tags, counts, TTL 1800 s |
| `thread:{id}:members` | set | joined sessions |
| `thread:{id}:messages` | **stream** | message history, trimmed to ~1000 |
| `thread:{id}:messages` | **channel** | Pub/Sub fanout (separate namespace) |
| `thread:{id}:names` | hash | session → per-thread display name |
| `thread:{id}:preview` | string | last 3 messages for list cards |
| `user:{session}:threads` | set | reverse index |
| `rate:{session}:{thread}:{sec}` | string | message rate window |
| `rate:thread_create:{fp}` | string | thread creation window |
| `pair_code:{code}` | string | pairing code, TTL 300 s |
| `grace:{session}:{geospace}` | string | exit grace timer |

### PostgreSQL + PostGIS — durable records

| Table | Purpose |
|---|---|
| `venues` | approved places: `GEOGRAPHY(Point, 4326)`, GiST index, radius, category |
| `venue_nominations` | user-submitted venues awaiting review |
| `compliance_log` | moderation and reporting audit trail, indexed by session and action |

---

## Real-time protocol

Typed in [`packages/shared/src/types/ws-frames.ts`](packages/shared/src/types/ws-frames.ts)
as discriminated unions, shared verbatim by client and server.

**Client → server**

| Event | Payload |
|---|---|
| `location_update` | `{ lat, lng, accuracy, speed }` |
| `join_thread` / `leave_thread` | `{ threadId }` |
| `create_thread` | `{ title, threadType, tags, geospaceId }` |
| `send_message` | `{ threadId, content, msgType, replyToMessageId?, metadata? }` |
| `heartbeat` | `{}` |
| `generate_pair_code` / `use_pair_code` | `{}` / `{ code }` |
| `dm_request` / `dm_accept` | `{ targetSessionId }` / `{ requestId }` |
| `nominate_venue` | `{ lat, lng, suggestedName }` |

**Server → client**

| Event | Meaning |
|---|---|
| `geospace_update` | you entered a GeoSpace; carries its threads and optional venue |
| `thread_list` | refreshed discovery lists for the GeoSpace |
| `thread_created` / `thread_joined` | creation and join acknowledgements |
| `similar_threads` | dedup hit — join one of these instead of creating a duplicate |
| `new_message` | fanned-out message |
| `missed_messages` | cursor replay after reconnect |
| `user_joined` / `user_left` | presence changes |
| `thread_preview` | preview refresh for list cards |
| `exit_prompt` / `read_only_entered` | you left the area; grace period or read-only mode |
| `pair_code_generated` / `friend_paired` | pairing flow |
| `dm_request_received`, `moderation_action`, `notification_push` | side channels |
| `error` | `{ code, message }` |

---

## HTTP API

Every route except session creation requires an `X-Session-Id` header.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | liveness |
| `POST` | `/api/sessions` | create anonymous session |
| `GET` | `/api/sessions/:id` | fetch session |
| `POST` | `/api/sessions/:id/heartbeat` | refresh TTL |
| `PUT` | `/api/sessions/:id/tags` | update interest tags |
| `POST` | `/api/sessions/:id/pair-code` | generate 6-digit pair code |
| `POST` | `/api/sessions/:id/pair` | consume pair code |
| `GET` | `/api/geospace` | resolve current GeoSpace |
| `GET` | `/api/geospace/peek` | cached activity peek |
| `GET` | `/api/threads` | discovery lists |
| `GET` | `/api/threads/search` | search within GeoSpace |
| `POST` | `/api/threads` | create thread |
| `GET` | `/api/threads/:id` | thread metadata |
| `GET` | `/api/threads/:id/messages` | stream replay by cursor |
| `GET` | `/api/venues` | nearby approved venues |
| `POST` | `/api/venues/nominate` | nominate a venue |
| `POST` | `/api/report` | report content |

---

## Limits and lifecycle

Single source of truth: [`packages/shared/src/constants/limits.ts`](packages/shared/src/constants/limits.ts).

| Concern | Rule |
|---|---|
| Session | 300 s TTL, heartbeat every 15 s, 3 missed beats = disconnect, 60 s reconnect grace |
| GeoSpace | expires 300 s after the last user leaves |
| Thread | 30 min inactivity TTL, max 500 users, max 5 concurrent per user, title ≤ 120 chars, ≤ 5 tags |
| Thread creation | 3 per hour per device fingerprint |
| Dedup | rejected at ≥ 0.7 normalised Levenshtein similarity within the GeoSpace |
| Messages | ≤ 2000 chars, 1/s per thread with a 5-in-3-s burst allowance |
| Replay | ≤ 50 messages per reconnect |
| HTTP | 60 requests/min per IP |
| Pairing | 6-digit code, 300 s TTL, ≤ 5 paired friends |
| Peek cache | 30 s |

---

## Performance

Load tested end-to-end against the real stack — real gateway, real Redis, real Kafka
produce, real Socket.IO framing. Latency is measured client-side: the sender stamps a
timestamp into the message body and every receiver subtracts it on arrival, so the number
is a full round trip, not a server-internal timer.

| Concurrent connections | Deliveries | Delivered | p50 | p95 | p99 | Aggregate |
|---|---|---|---|---|---|---|
| 500 | 72,500 | 100% | 26 ms | 41 ms | 46 ms | 2,417/s |
| 1,000 | 145,000 | 100% | 44 ms | 77 ms | 88 ms | 4,833/s |
| 3,000 | 435,000 | 100% | 41–44 ms | 74–78 ms | 87–90 ms | 14,500/s |
| **5,000** | **725,000** | **100%** | **41–45 ms** | **72–74 ms** | **80–90 ms** | **24,167/s** |
| 8,000 | 1,160,000 | 100% | 41–80 ms | 71–155 ms | 80–187 ms | 38,667/s |

Zero connect errors and zero mid-run disconnects at every tier. At 5,000 concurrent
connections a single gateway process held **531 MB RSS at roughly a third of one CPU
core** — Socket.IO encodes each frame once per room and the gateway keeps no thread
state, so fanout width is cheap.

Method, hardware, per-run JSON, and the caveats (single host, loopback, one gateway
process) are in **[`scripts/loadtest/RESULTS.md`](scripts/loadtest/RESULTS.md)**.

```powershell
# one harness process per 1,000 connections
$env:CLIENTS='1000'; $env:THREADS='3'; $env:DURATION_S='30'; $env:LABEL='run1'
node --max-old-space-size=4096 scripts/loadtest/fanout-load.mjs
```

---

## Repository layout

```text
packages/
  gateway/              Express + Socket.IO gateway (HTTP routes, WS handlers, fanout)
  services/
    session/            SessionManager, PresenceTracker, PairingManager
    geospace/           GeoSpaceManager, spatial index, VenueChecker, PeekAggregator
    thread/             ThreadManager, ThreadDiscovery, ThreadDedup
    message/            MessageHandler, FanoutPublisher, MessageReplayer, inline filter
    moderation/         scaffold for the Kafka consumer
  shared/               types, constants, geohash + haversine + ULID + name generator
  web/                  React 19 client (Vite, Zustand, Leaflet, Three.js, Framer Motion)
  db/                   SQL migrations (PostGIS)
scripts/
  seed-demo.mjs         seeds demo threads and messages through the real WebSocket path
  loadtest/             fanout load harness, results, and methodology
docs/screenshots/       app screenshots used in this README
docker-compose.yml      Redis, PostGIS, Kafka, Zookeeper
```

---

## Running it locally

**Requirements:** Node 20+, pnpm 9+, Docker.

```powershell
# 1. dependencies
pnpm install

# 2. infrastructure (Redis, PostgreSQL/PostGIS, Kafka, Zookeeper)
docker compose up -d

# 3. build the workspace packages the gateway depends on
pnpm -r build

# 4. gateway
pnpm --filter @chatspaces/gateway dev

# 5. web client (separate shell)
pnpm --filter @chatspaces/web dev
```

The client is served at `http://localhost:5173` and proxies `/api` and `/socket.io` to the
gateway on port 3000. `vite preview` (port 4173) proxies the same way, so a production
build can be exercised against the local gateway.

Optional — populate the app with demo threads and messages:

```powershell
node scripts/seed-demo.mjs
# keep the seeded participants online (useful for screenshots)
$env:HOLD_MS='150000'; node scripts/seed-demo.mjs
```

Useful commands:

```powershell
pnpm -r typecheck
pnpm lint
pnpm --filter @chatspaces/web build
docker compose down
```

---

## Environment

Copy `.env.example` to `.env`. The gateway also reads `packages/gateway/.env` for
machine-specific overrides.

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | gateway port |
| `REDIS_URL` | `redis://localhost:6379` | required |
| `DATABASE_URL` | `postgresql://chatspaces:chatspaces_dev@localhost:5432/chatspaces` | PostGIS |
| `KAFKA_BROKERS` | `localhost:9092` | comma-separated; failures are non-fatal |
| `FINGERPRINT_SALT` | `chatspaces_dev_salt` | **change in production** — salts fingerprint hashes |
| `CORS_ORIGIN` | `*` | tighten in production |
| `SESSION_SECRET` | — | reserved |

---

## Current state

**Working end to end:** anonymous sessions, GeoSpace resolution with boundary handling,
thread creation with dedup, discovery (`hot` / `for you` / search), live messaging with
fanout, cursor-based reconnect replay, per-thread anonymous display names, presence,
friend pairing, venue lookup and nomination, reporting, and the full React client.

**Deliberately partial:**

- **Moderation** — the inline filter is a small hardcoded blocklist, and the Kafka
  consumer that would do real asynchronous moderation is still a scaffold. The producer
  side and the topic are in place.
- **Horizontal scale-out** — the design carries no in-process thread state, so multiple
  gateway pods behind a load balancer should work; only a single process has been
  measured.
- **DMs** — types, request/accept frames, and the client page exist; storage is Redis-only
  with a 24-hour auto-close and no durable history.
- **Persistence** — chat lives in Redis Streams trimmed to ~1000 messages per thread.
  PostgreSQL currently holds venues, nominations, and the compliance log, not messages.
