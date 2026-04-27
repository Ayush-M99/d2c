# d2c

Proximity-based anonymous chat for people sharing the same place.

d2c drops users into a location-backed space, surfaces active nearby threads, and lets them move from discovery into live conversation with a lightweight real-time stack. The current app includes a React web client, an Express + Socket.IO gateway, Redis-backed live thread/message state, and supporting services for sessions, geospaces, and thread discovery.

## App Screens

### Explore

![Explore screen](docs/screenshots/explore.png)

### Create Thread

![Create thread mobile screen](docs/screenshots/create-thread-mobile.png)

## Stack

- Frontend: React, Vite, Zustand, Socket.IO client, Leaflet, Framer Motion
- Gateway: Express, Socket.IO, TypeScript
- Live state: Redis
- Persistent / infra-ready pieces: PostgreSQL, Kafka, Docker Compose
- Workspace: pnpm monorepo

## Project Layout

```text
packages/
  gateway/           Express + Socket.IO gateway
  services/
    session/         Session + presence logic
    geospace/        Location-to-space resolution
    thread/          Thread lifecycle and discovery
    message/         Message validation, replay, fanout
    moderation/      Moderation service scaffold
  shared/            Shared types, constants, utilities
  web/               React frontend
  db/                SQL migrations and seeds
scripts/             Local dev scripts
```

## Local Development

### 1. Install dependencies

```powershell
pnpm install
```

### 2. Start infrastructure

```powershell
docker compose up -d
```

### 3. Start the app

Frontend:

```powershell
pnpm --filter @chatspaces/web dev
```

Gateway:

```powershell
pnpm --filter @chatspaces/gateway dev
```

Or use the bundled startup script:

```powershell
pnpm run dev:start
```

## Useful Commands

```powershell
pnpm -r typecheck
pnpm --filter @chatspaces/web build
pnpm --filter @chatspaces/gateway build
```

## Environment

Use `.env.example` at the repo root as the starting point for shared config. The gateway also supports a local `packages/gateway/.env` for machine-specific values.

## Status

This repo contains the current working d2c codebase, including the latest frontend/backend integration fixes and the Manipal/Udupi demo location setup used in the app screenshots above.
