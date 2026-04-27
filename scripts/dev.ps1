#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$ROOT_DIR = Split-Path -Parent $SCRIPT_DIR

Write-Host "==> Starting ChatSpaces development environment" -ForegroundColor Cyan
Write-Host ""

# ── 1. Verify Docker is running ───────────────────────────────────────────────
Write-Host "==> Checking Docker..." -ForegroundColor Cyan
try {
  docker info *>$null
} catch {
  Write-Host "ERROR: Docker is not running. Please start Docker Desktop and retry." -ForegroundColor Red
  exit 1
}

# ── 2. Start infrastructure ───────────────────────────────────────────────────
Write-Host "==> Bringing up infrastructure (Redis, Postgres, Kafka, Zookeeper)..." -ForegroundColor Cyan
& docker compose -f "$ROOT_DIR/docker-compose.yml" up -d

# ── 3. Wait for Redis ─────────────────────────────────────────────────────────
Write-Host "==> Waiting for Redis..." -ForegroundColor Cyan
$redis_ready = $false
$max_attempts = 60
$attempt = 0
while (-not $redis_ready -and $attempt -lt $max_attempts) {
  try {
    docker exec chatspaces_redis redis-cli ping *>$null
    $redis_ready = $true
  } catch {
    Start-Sleep -Seconds 1
    $attempt++
  }
}
if ($redis_ready) {
  Write-Host "    Redis ready." -ForegroundColor Green
} else {
  Write-Host "ERROR: Redis failed to start." -ForegroundColor Red
  exit 1
}

# ── 4. Wait for Postgres ──────────────────────────────────────────────────────
Write-Host "==> Waiting for PostgreSQL..." -ForegroundColor Cyan
$pg_ready = $false
$attempt = 0
while (-not $pg_ready -and $attempt -lt $max_attempts) {
  try {
    docker exec chatspaces_postgres pg_isready -U chatspaces *>$null
    $pg_ready = $true
  } catch {
    Start-Sleep -Seconds 1
    $attempt++
  }
}
if ($pg_ready) {
  Write-Host "    PostgreSQL ready." -ForegroundColor Green
} else {
  Write-Host "ERROR: PostgreSQL failed to start." -ForegroundColor Red
  exit 1
}

# ── 5. Wait for Kafka ─────────────────────────────────────────────────────────
Write-Host "==> Waiting for Kafka..." -ForegroundColor Cyan
$kafka_ready = $false
$attempt = 0
while (-not $kafka_ready -and $attempt -lt $max_attempts) {
  try {
    docker exec chatspaces_kafka kafka-broker-api-versions --bootstrap-server localhost:9092 *>$null
    $kafka_ready = $true
  } catch {
    Start-Sleep -Seconds 2
    $attempt++
  }
}
if ($kafka_ready) {
  Write-Host "    Kafka ready." -ForegroundColor Green
} else {
  Write-Host "ERROR: Kafka failed to start." -ForegroundColor Red
  exit 1
}

# ── 6. Install / re-link workspace dependencies ──────────────────────────────
Write-Host "==> Installing dependencies..." -ForegroundColor Cyan
Push-Location $ROOT_DIR
& pnpm install
Pop-Location

# ── 7. Build all packages (shared first, then services, then gateway) ────────
Write-Host "==> Building all packages..." -ForegroundColor Cyan
& pnpm --filter @chatspaces/shared build
& pnpm --filter "@chatspaces/service-*" --parallel build
& pnpm --filter @chatspaces/gateway build

# ── 8. Start all packages in parallel dev/watch mode ─────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ChatSpaces is running                   ║" -ForegroundColor Green
Write-Host "║  Gateway    →  http://localhost:3000      ║" -ForegroundColor Green
Write-Host "║  Redis      →  localhost:6379             ║" -ForegroundColor Green
Write-Host "║  PostgreSQL →  localhost:5432             ║" -ForegroundColor Green
Write-Host "║  Kafka      →  localhost:9092             ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Logs streaming below. Press Ctrl+C to stop." -ForegroundColor Cyan
Write-Host ""

# Run inline — output streams directly to this terminal
& pnpm.cmd -r --filter "!@chatspaces/shared" --filter "!chatspaces" --parallel dev
