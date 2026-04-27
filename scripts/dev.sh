#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Starting ChatSpaces development environment"
echo ""

# ── 1. Verify Docker is running ───────────────────────────────────────────────
if ! docker info &>/dev/null; then
  echo "ERROR: Docker is not running. Please start Docker Desktop and retry."
  exit 1
fi

# ── 2. Start infrastructure ───────────────────────────────────────────────────
echo "==> Bringing up infrastructure (Redis, Postgres, Kafka, Zookeeper)..."
docker compose -f "${ROOT_DIR}/docker-compose.yml" up -d

# ── 3. Wait for Redis ─────────────────────────────────────────────────────────
echo "==> Waiting for Redis..."
until docker exec chatspaces_redis redis-cli ping &>/dev/null; do
  sleep 1
done
echo "    Redis ready."

# ── 4. Wait for Postgres ──────────────────────────────────────────────────────
echo "==> Waiting for PostgreSQL..."
until docker exec chatspaces_postgres pg_isready -U chatspaces &>/dev/null; do
  sleep 1
done
echo "    PostgreSQL ready."

# ── 5. Wait for Kafka ─────────────────────────────────────────────────────────
echo "==> Waiting for Kafka..."
until docker exec chatspaces_kafka kafka-broker-api-versions \
  --bootstrap-server localhost:9092 &>/dev/null; do
  sleep 2
done
echo "    Kafka ready."

# ── 6. Install deps if node_modules is missing ────────────────────────────────
if [ ! -d "${ROOT_DIR}/node_modules" ]; then
  echo "==> Installing dependencies..."
  cd "${ROOT_DIR}" && pnpm install
fi

# ── 7. Build shared first (all services import from it) ───────────────────────
echo "==> Building @chatspaces/shared..."
pnpm --filter @chatspaces/shared build

# ── 8. Start all packages in parallel dev/watch mode ─────────────────────────
echo "==> Starting services in watch mode..."
pnpm -r --filter "!@chatspaces/shared" --parallel dev &
DEV_PID=$!

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ChatSpaces is running                   ║"
echo "║  Gateway    →  http://localhost:3000      ║"
echo "║  Redis      →  localhost:6379             ║"
echo "║  PostgreSQL →  localhost:5432             ║"
echo "║  Kafka      →  localhost:9092             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop all services."

# ── Graceful shutdown ─────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "==> Shutting down..."
  kill "$DEV_PID" 2>/dev/null || true
  docker compose -f "${ROOT_DIR}/docker-compose.yml" stop
  echo "==> Done."
}
trap cleanup SIGINT SIGTERM

wait "$DEV_PID"
