# Graph Report - d:/chatspaces  (2026-04-20)

## Corpus Check
- Corpus is ~15,757 words - fits in a single context window. You may not need a graph.

## Summary
- 230 nodes · 333 edges · 29 communities detected
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Architecture Overview|Architecture Overview]]
- [[_COMMUNITY_Location & Presence Tracking|Location & Presence Tracking]]
- [[_COMMUNITY_Core Platform Concepts|Core Platform Concepts]]
- [[_COMMUNITY_Thread Management|Thread Management]]
- [[_COMMUNITY_WebSocket Event Handlers|WebSocket Event Handlers]]
- [[_COMMUNITY_Message Pipeline|Message Pipeline]]
- [[_COMMUNITY_Geospatial Engine|Geospatial Engine]]
- [[_COMMUNITY_Session & Auth|Session & Auth]]
- [[_COMMUNITY_Gateway Config & Routes|Gateway Config & Routes]]
- [[_COMMUNITY_GeoSpace Manager|GeoSpace Manager]]
- [[_COMMUNITY_Message Replay|Message Replay]]
- [[_COMMUNITY_Thread Discovery|Thread Discovery]]
- [[_COMMUNITY_Shared Type Definitions|Shared Type Definitions]]
- [[_COMMUNITY_Service Exports|Service Exports]]
- [[_COMMUNITY_Service Exports|Service Exports]]
- [[_COMMUNITY_Service Exports|Service Exports]]
- [[_COMMUNITY_Service Exports|Service Exports]]
- [[_COMMUNITY_Service Exports|Service Exports]]
- [[_COMMUNITY_Service Exports|Service Exports]]
- [[_COMMUNITY_System Limits|System Limits]]
- [[_COMMUNITY_Redis Key Schema|Redis Key Schema]]
- [[_COMMUNITY_DM Types|DM Types]]
- [[_COMMUNITY_ngeohash Types|ngeohash Types]]
- [[_COMMUNITY_Venue Types|Venue Types]]
- [[_COMMUNITY_Dev Scripts|Dev Scripts]]
- [[_COMMUNITY_Node.js Runtime|Node.js Runtime]]
- [[_COMMUNITY_pnpm Monorepo|pnpm Monorepo]]
- [[_COMMUNITY_Docker Infrastructure|Docker Infrastructure]]
- [[_COMMUNITY_Testing Framework|Testing Framework]]

## God Nodes (most connected - your core abstractions)
1. `PresenceTracker` - 13 edges
2. `SessionManager` - 13 edges
3. `ThreadManager` - 13 edges
4. `Thread` - 12 edges
5. `Shared Package` - 12 edges
6. `emit()` - 11 edges
7. `handleLocationUpdate()` - 11 edges
8. `GeoSpaceManager` - 10 edges
9. `Session` - 9 edges
10. `Message Service` - 9 edges

## Surprising Connections (you probably didn't know these)
- `handleLocationUpdate()` --calls--> `computeGeospaceKey()`  [INFERRED]
  d:\chatspaces\packages\gateway\src\ws\handlers.ts → d:\chatspaces\packages\services\geospace\src\spatial-index.ts
- `computeGeospaceKey()` --calls--> `coordinatesToGeohash()`  [INFERRED]
  d:\chatspaces\packages\services\geospace\src\spatial-index.ts → d:\chatspaces\packages\shared\src\utils\geohash.ts
- `getBoundaryCandidates()` --calls--> `coordinatesToGeohash()`  [INFERRED]
  d:\chatspaces\packages\services\geospace\src\spatial-index.ts → d:\chatspaces\packages\shared\src\utils\geohash.ts
- `getBoundaryCandidates()` --calls--> `getNeighborGeohashes()`  [INFERRED]
  d:\chatspaces\packages\services\geospace\src\spatial-index.ts → d:\chatspaces\packages\shared\src\utils\geohash.ts

## Hyperedges (group relationships)
- **ChatSpaces Core Services** — handoff_session_service, handoff_geospace_service, handoff_thread_service, handoff_message_service [EXTRACTED 1.00]
- **ChatSpaces Critical Design Principles** — handoff_anonymous_first, handoff_ephemeral_data, handoff_physical_presence, handoff_mutual_consent_dm, handoff_reconnect_replay [EXTRACTED 1.00]
- **ChatSpaces Technology Stack** — handoff_nodejs, handoff_socketio, handoff_express, handoff_redis, handoff_postgresql, handoff_kafka, handoff_pnpm, handoff_docker, handoff_vitest [EXTRACTED 1.00]
- **ChatSpaces Shared Type Definitions** — handoff_session, handoff_geospace, handoff_thread, handoff_message, handoff_dm, handoff_ws_frames [EXTRACTED 1.00]

## Communities

### Community 0 - "Architecture Overview"
Cohesion: 0.1
Nodes (27): 3-Tier Thread Discovery, Build Order Implementation Sequence, Database Migrations, Express.js, Friend Pairing, Gateway Package (WebSocket + HTTP), Geohash Spatial Indexing, GeoSpace Service (+19 more)

### Community 1 - "Location & Presence Tracking"
Cohesion: 0.09
Nodes (4): handleDisconnect(), handleLocationUpdate(), PresenceTracker, VenueChecker

### Community 2 - "Core Platform Concepts"
Cohesion: 0.16
Nodes (24): Anonymous-First Design Principle, ChatSpaces Platform, Display Name Generation, DM (Direct Message), Ephemeral Data Design Principle, Gamification, GeoSpace, GeoSpace Exit Grace Period (+16 more)

### Community 3 - "Thread Management"
Cohesion: 0.11
Nodes (5): ThreadDedup, generateDisplayName(), hashToThread(), ThreadManager, threadToHash()

### Community 4 - "WebSocket Event Handlers"
Cohesion: 0.18
Nodes (12): emit(), emitError(), handleCreateThread(), handleGeneratePairCode(), handleHeartbeat(), handleJoinThread(), handleLeaveThread(), handleNominateVenue() (+4 more)

### Community 5 - "Message Pipeline"
Cohesion: 0.14
Nodes (4): FanoutPublisher, filterMessage(), MessageHandler, ulid()

### Community 6 - "Geospatial Engine"
Cohesion: 0.14
Nodes (8): coordinatesToGeohash(), getNeighborGeohashes(), haversineDistance(), isWithinRadius(), PeekAggregator, computeGeospaceKey(), geospaceIdFromGeohash(), getBoundaryCandidates()

### Community 7 - "Session & Auth"
Cohesion: 0.17
Nodes (6): requireSession(), socketAuth(), hashFingerprint(), hashToSession(), SessionManager, sessionToHash()

### Community 8 - "Gateway Config & Routes"
Cohesion: 0.27
Nodes (1): RedisFanout

### Community 9 - "GeoSpace Manager"
Cohesion: 0.21
Nodes (3): GeoSpaceManager, geospaceToHash(), hashToGeospace()

### Community 10 - "Message Replay"
Cohesion: 0.5
Nodes (2): incrementStreamId(), MessageReplayer

### Community 11 - "Thread Discovery"
Cohesion: 0.5
Nodes (1): ThreadDiscovery

### Community 12 - "Shared Type Definitions"
Cohesion: 0.67
Nodes (0): 

### Community 13 - "Service Exports"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Service Exports"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Service Exports"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Service Exports"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Service Exports"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Service Exports"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "System Limits"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Redis Key Schema"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "DM Types"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "ngeohash Types"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Venue Types"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Dev Scripts"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Node.js Runtime"
Cohesion: 1.0
Nodes (1): Node.js 20+ with TypeScript

### Community 26 - "pnpm Monorepo"
Cohesion: 1.0
Nodes (1): pnpm Monorepo

### Community 27 - "Docker Infrastructure"
Cohesion: 1.0
Nodes (1): Docker + docker-compose

### Community 28 - "Testing Framework"
Cohesion: 1.0
Nodes (1): Vitest Testing

## Knowledge Gaps
- **23 isolated node(s):** `Constants and Limits`, `Moderation Service`, `Node.js 20+ with TypeScript`, `Express.js`, `pnpm Monorepo` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Service Exports`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Service Exports`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Service Exports`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Service Exports`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Service Exports`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Service Exports`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `System Limits`** (1 nodes): `limits.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Redis Key Schema`** (1 nodes): `redis-keys.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DM Types`** (1 nodes): `dm.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ngeohash Types`** (1 nodes): `ngeohash.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Venue Types`** (1 nodes): `venue.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dev Scripts`** (1 nodes): `dev.ps1`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Node.js Runtime`** (1 nodes): `Node.js 20+ with TypeScript`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `pnpm Monorepo`** (1 nodes): `pnpm Monorepo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Docker Infrastructure`** (1 nodes): `Docker + docker-compose`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Testing Framework`** (1 nodes): `Vitest Testing`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handleLocationUpdate()` connect `Location & Presence Tracking` to `GeoSpace Manager`, `Thread Discovery`, `WebSocket Event Handlers`, `Geospatial Engine`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **Why does `computeGeospaceKey()` connect `Geospatial Engine` to `Location & Presence Tracking`, `GeoSpace Manager`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `handleSendMessage()` connect `WebSocket Event Handlers` to `Message Pipeline`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **What connects `Constants and Limits`, `Moderation Service`, `Node.js 20+ with TypeScript` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Architecture Overview` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Location & Presence Tracking` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Thread Management` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._