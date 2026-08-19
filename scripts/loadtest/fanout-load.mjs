#!/usr/bin/env node
/**
 * WebSocket fanout load harness.
 *
 * Measures end-to-end delivery latency of the real hot path:
 *
 *   client emit send_message
 *     -> gateway handleSendMessage
 *     -> MessageHandler (filter, rate limit, XADD to Redis Stream, XTRIM)
 *     -> FanoutPublisher (Redis PUBLISH + async Kafka produce)
 *     -> RedisFanout PSUBSCRIBE `thread:*:messages`
 *     -> io.to(`thread:{id}`).emit('new_message')
 *     -> every subscribed client receives
 *
 * Latency is measured client-side: the sender stamps Date.now() into the
 * message body and every receiver subtracts it on arrival. Senders and
 * receivers live in this same process, so the clock is identical on both
 * ends and the number covers the full server round trip plus Socket.IO
 * framing.
 *
 * Sessions and threads are seeded straight into Redis with the production
 * managers so the HTTP bootstrap rate limiter (60 req/min/IP) cannot
 * distort the WebSocket measurement.
 *
 * Env knobs:
 *   CLIENTS            total concurrent WebSocket connections   (default 200)
 *   THREADS            threads to spread clients across         (default 1)
 *   SENDERS_PER_THREAD publishers per thread                    (default 5)
 *   SEND_RATE          messages/sec per sender; keep <= 1 to
 *                      respect the 1/s + 5-per-3s server limit  (default 1)
 *   DURATION_S         steady-state send duration in seconds    (default 30)
 *   RAMP_BATCH         connections opened per ramp step         (default 50)
 *   RAMP_DELAY_MS      pause between ramp steps                 (default 100)
 *   GATEWAY_URL        default http://localhost:3000
 *   REDIS_URL          default redis://localhost:6379
 *   LABEL              tag used for the JSON result file
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRequire } from 'node:module';

// This harness is not a workspace package, so it borrows the already-installed
// copies from the gateway (server deps) and web (client deps).
const requireFromGateway = createRequire(new URL('../../packages/gateway/package.json', import.meta.url));
const requireFromWeb = createRequire(new URL('../../packages/web/package.json', import.meta.url));
const { Redis } = requireFromGateway('ioredis');
const { io } = requireFromWeb('socket.io-client');

import { SessionManager } from '../../packages/services/session/dist/index.js';
import { ThreadManager } from '../../packages/services/thread/dist/index.js';
import { computeGeospaceKey } from '../../packages/services/geospace/dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));

function int(name, dflt) {
  const v = process.env[name];
  return v ? parseInt(v, 10) : dflt;
}
function num(name, dflt) {
  const v = process.env[name];
  return v ? Number(v) : dflt;
}

const CFG = {
  clients: int('CLIENTS', 200),
  threads: int('THREADS', 1),
  sendersPerThread: int('SENDERS_PER_THREAD', 5),
  sendRate: num('SEND_RATE', 1),
  durationS: int('DURATION_S', 30),
  rampBatch: int('RAMP_BATCH', 50),
  rampDelayMs: int('RAMP_DELAY_MS', 100),
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:3000',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  label: process.env.LABEL || 'run',
};

// Identical coordinates for every client => same precision-7 geohash cell
// => one GeoSpace. Manipal, matching the demo dataset in the app.
const COORDS = { lat: 13.3525, lng: 74.7868 };

const redis = new Redis(CFG.redisUrl);
const sessionManager = new SessionManager(redis);
const threadManager = new ThreadManager(redis);

// -- Metrics -----------------------------------------------------------------

const latencies = [];
const connectMs = [];
let deliveries = 0;
let sent = 0;
let rejected = 0;
let connectErrors = 0;
let disconnects = 0;
let peakConnected = 0;
let connected = 0;

function pct(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

// -- Setup -------------------------------------------------------------------

async function seed() {
  const { geospaceId } = computeGeospaceKey(COORDS, 'nearby');

  const threads = [];
  for (let i = 0; i < CFG.threads; i++) {
    const suffix = Math.random().toString(36).slice(2, 8);
    const t = await threadManager.createThread(
      geospaceId,
      `loadtest ${CFG.label} lane ${i} ${suffix}`,
      'text',
      ['loadtest'],
      'loadtest-seed',
    );
    threads.push(t.threadId);
  }

  const sessions = [];
  const batch = 200;
  for (let i = 0; i < CFG.clients; i += batch) {
    const size = Math.min(batch, CFG.clients - i);
    const slice = await Promise.all(
      Array.from({ length: size }, (_, j) =>
        sessionManager.createSession(`loadtest-${CFG.label}-${i + j}-${Date.now()}`),
      ),
    );
    sessions.push(...slice);
  }

  return { geospaceId, threads, sessions };
}

// -- Client ------------------------------------------------------------------

function spawnClient(session, threadId) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const socket = io(CFG.gatewayUrl, {
      transports: ['websocket'],
      auth: { sessionId: session.sessionId },
      reconnection: false,
      timeout: 20000,
    });

    let settled = false;
    const settle = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok ? socket : null);
    };

    socket.on('connect', () => {
      connected++;
      if (connected > peakConnected) peakConnected = connected;
      connectMs.push(Date.now() - t0);

      // Enter the GeoSpace, then the thread room.
      socket.emit('location_update', { lat: COORDS.lat, lng: COORDS.lng, accuracy: 10, speed: 0 });
      socket.emit('join_thread', { threadId });
    });

    socket.on('thread_joined', () => settle(true));

    socket.on('new_message', (msg) => {
      const raw = msg && msg.content ? String(msg.content) : '';
      const stamp = Number(raw.split('|')[1]);
      if (Number.isFinite(stamp)) {
        latencies.push(Date.now() - stamp);
        deliveries++;
      }
    });

    socket.on('error', (e) => {
      if (e && (e.code === 'MESSAGE_REJECTED' || e.code === 'RATE_LIMITED')) rejected++;
    });

    socket.on('connect_error', () => {
      connectErrors++;
      settle(false);
    });

    socket.on('disconnect', () => {
      connected--;
      disconnects++;
    });

    // Never hang the ramp on a client that never reports thread_joined.
    setTimeout(() => settle(Boolean(socket.connected)), 20000);
  });
}

// -- Run ---------------------------------------------------------------------

async function main() {
  console.log(
    `[loadtest] ${CFG.label}: ${CFG.clients} clients / ${CFG.threads} thread(s) / ` +
      `${CFG.sendersPerThread} senders per thread / ${CFG.durationS}s`,
  );

  const { geospaceId, threads, sessions } = await seed();
  console.log(`[loadtest] seeded geospace ${geospaceId} with ${threads.length} thread(s)`);

  const sockets = [];
  const rampStart = Date.now();
  for (let i = 0; i < sessions.length; i += CFG.rampBatch) {
    const slice = sessions.slice(i, i + CFG.rampBatch);
    const opened = await Promise.all(
      slice.map((s, j) => spawnClient(s, threads[(i + j) % threads.length])),
    );
    for (const s of opened) if (s) sockets.push(s);
    if (i + CFG.rampBatch < sessions.length) await sleep(CFG.rampDelayMs);
  }
  const rampS = Number(((Date.now() - rampStart) / 1000).toFixed(1));
  console.log(
    `[loadtest] ${sockets.length}/${CFG.clients} joined in ${rampS}s ` +
      `(peak connected ${peakConnected}, connect errors ${connectErrors})`,
  );

  await sleep(1500); // let join churn settle before measuring

  const byThread = new Map();
  sockets.forEach((s, i) => {
    const tid = threads[i % threads.length];
    if (!byThread.has(tid)) byThread.set(tid, []);
    byThread.get(tid).push(s);
  });

  const senders = [];
  for (const [tid, group] of byThread) {
    for (const s of group.slice(0, CFG.sendersPerThread)) senders.push({ socket: s, threadId: tid });
  }
  console.log(
    `[loadtest] steady state: ${senders.length} senders x ${CFG.sendRate}/s for ` +
      `${CFG.durationS}s (fanout target ${sockets.length} sockets)`,
  );

  // Warm-up: the first publish pays one-off costs (Kafka topic metadata fetch,
  // Redis stream creation, V8 tiering). Send a few rounds, then reset counters.
  const warmupMs = int('WARMUP_MS', 4000);
  const warmupTimers = senders.map(({ socket, threadId }) =>
    setInterval(() => {
      if (socket.connected) {
        socket.emit('send_message', { threadId, content: `w|${Date.now()}`, msgType: 'text' });
      }
    }, 1000),
  );
  await sleep(warmupMs);
  warmupTimers.forEach(clearInterval);
  await sleep(1000);

  latencies.length = 0;
  deliveries = 0;
  sent = 0;
  rejected = 0;

  const intervalMs = Math.round(1000 / CFG.sendRate);
  let seq = 0;
  const timers = senders.map(({ socket, threadId }) =>
    setInterval(() => {
      if (!socket.connected) return;
      socket.emit('send_message', {
        threadId,
        content: `m${seq++}|${Date.now()}`,
        msgType: 'text',
      });
      sent++;
    }, intervalMs),
  );

  await sleep(CFG.durationS * 1000);
  timers.forEach(clearInterval);
  await sleep(3000); // drain in-flight deliveries

  const sortedLat = [...latencies].sort((a, b) => a - b);
  const sortedConn = [...connectMs].sort((a, b) => a - b);
  const fanoutFactor = sockets.length / Math.max(1, threads.length);
  const expected = sent * fanoutFactor;

  const result = {
    label: CFG.label,
    config: CFG,
    connections: {
      requested: CFG.clients,
      joined: sockets.length,
      peakConcurrent: peakConnected,
      connectErrors,
      disconnectsDuringRun: disconnects,
      rampSeconds: rampS,
      connectMsP50: pct(sortedConn, 50),
      connectMsP95: pct(sortedConn, 95),
    },
    messages: {
      sent,
      rejected,
      deliveries,
      expectedDeliveries: Math.round(expected),
      deliveryRatePct: expected ? Number(((deliveries / expected) * 100).toFixed(2)) : null,
      sendThroughputPerSec: Number((sent / CFG.durationS).toFixed(1)),
      deliveryThroughputPerSec: Number((deliveries / CFG.durationS).toFixed(1)),
    },
    latencyMs: {
      samples: sortedLat.length,
      min: sortedLat.length ? sortedLat[0] : null,
      p50: pct(sortedLat, 50),
      p95: pct(sortedLat, 95),
      p99: pct(sortedLat, 99),
      max: sortedLat.length ? sortedLat[sortedLat.length - 1] : null,
      mean: sortedLat.length
        ? Number((sortedLat.reduce((a, b) => a + b, 0) / sortedLat.length).toFixed(2))
        : null,
    },
    ranAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(result, null, 2));

  const outDir = join(HERE, 'results');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${CFG.label}.json`), JSON.stringify(result, null, 2));

  sockets.forEach((s) => s.disconnect());
  await redis.quit();
  process.exit(0);
}

main().catch((err) => {
  console.error('[loadtest] fatal:', err);
  process.exit(1);
});
