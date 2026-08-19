#!/usr/bin/env node
/**
 * Seed the local stack with demo threads and messages.
 *
 * Everything goes through the real WebSocket path — sessions, create_thread,
 * join_thread, send_message — so Redis ends up in exactly the state a live
 * app would produce. Used to populate the app before capturing screenshots.
 *
 * Requires the gateway on :3000 and Redis on :6379.
 *
 *   node scripts/seed-demo.mjs
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createRequire } from 'node:module';

const requireFromGateway = createRequire(new URL('../packages/gateway/package.json', import.meta.url));
const requireFromWeb = createRequire(new URL('../packages/web/package.json', import.meta.url));
const { Redis } = requireFromGateway('ioredis');
const { io } = requireFromWeb('socket.io-client');

import { SessionManager } from '../packages/services/session/dist/index.js';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Matches YOU_LAT / YOU_LNG in packages/web/src/lib/mapData.ts
const COORDS = { lat: 13.3525, lng: 74.7928, accuracy: 75, speed: 0 };

const THREADS = [
  {
    title: 'Filter coffee run at Tiger Circle, anyone up?',
    tags: ['food', 'latenight'],
    messages: [
      'heading down in ten if anyone wants to join',
      'which place is still open at this hour',
      'the one next to the bakery, they shut at 1',
      'on my way, save a seat',
      'got a table by the window',
    ],
  },
  {
    title: 'Library till 2am again, who else is here',
    tags: ['campus', 'study'],
    messages: [
      'third floor is completely full already',
      'second floor has space near the windows',
      'thanks, moving there now',
      'someone bring snacks, vending machine is empty',
    ],
  },
  {
    title: 'Badminton court free at 6, need two more players',
    tags: ['sports'],
    messages: [
      'court 3, bring your own shuttle',
      'i am in, reaching by 5:45',
      'that makes three, one more',
      'count me in as well',
      'perfect, see everyone there',
    ],
  },
  {
    title: 'Sharing an auto to Udupi bus stand around 7',
    tags: ['transit'],
    messages: [
      'splitting four ways works out cheap',
      'i can join, where are we meeting',
      'main gate, near the guard post',
      'reaching in five',
    ],
  },
  {
    title: 'Live music happening tonight near the old market',
    tags: ['music', 'evening'],
    messages: [
      'starts around 8, no cover charge',
      'is it the same band as last month',
      'different one, they play mostly covers',
      'sounds good, heading over after dinner',
    ],
  },
];

const redis = new Redis(REDIS_URL);
const sessionManager = new SessionManager(redis);

function connect(sessionId) {
  return new Promise((resolve, reject) => {
    const socket = io(GATEWAY_URL, {
      transports: ['websocket'],
      auth: { sessionId },
      reconnection: false,
      timeout: 15000,
    });
    socket.on('connect', () => {
      socket.emit('location_update', COORDS);
      // Wait for the gateway to confirm the GeoSpace before doing anything else.
      socket.once('geospace_update', (data) => resolve({ socket, geospaceId: data.geospaceId }));
    });
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('geospace_update timed out')), 15000);
  });
}

function createThread(socket, geospaceId, spec) {
  return new Promise((resolve, reject) => {
    socket.once('thread_created', (data) => resolve(data.thread));
    // Re-running the seeder hits the dedup check; reuse the existing thread.
    socket.once('similar_threads', (data) => {
      const existing = data?.suggestedThreads?.[0];
      if (existing) resolve(existing);
      else reject(new Error(`deduped with no suggestion: ${spec.title}`));
    });
    socket.once('error', (e) => reject(new Error(e?.message ?? 'create_thread failed')));
    socket.emit('create_thread', {
      title: spec.title,
      threadType: 'text',
      tags: spec.tags,
      geospaceId,
    });
  });
}

function joinThread(socket, threadId) {
  return new Promise((resolve, reject) => {
    socket.once('thread_joined', resolve);
    socket.once('error', (e) => reject(new Error(e?.message ?? 'join_thread failed')));
    socket.emit('join_thread', { threadId });
  });
}

async function main() {
  console.log('[seed] connecting participants');

  // One creator per thread (thread creation is capped at 3/hour per fingerprint),
  // plus a pool of repliers who join every thread.
  const creators = [];
  for (let i = 0; i < THREADS.length; i++) {
    const s = await sessionManager.createSession(`demo-creator-${i}-${Date.now()}`);
    creators.push(await connect(s.sessionId));
  }

  const repliers = [];
  for (let i = 0; i < 4; i++) {
    const s = await sessionManager.createSession(`demo-replier-${i}-${Date.now()}`);
    repliers.push(await connect(s.sessionId));
  }

  const geospaceId = creators[0].geospaceId;
  console.log(`[seed] geospace ${geospaceId}`);

  for (let i = 0; i < THREADS.length; i++) {
    const spec = THREADS[i];
    const creator = creators[i];

    const thread = await createThread(creator.socket, geospaceId, spec);
    console.log(`[seed] created "${spec.title}" -> ${thread.threadId}`);

    // A few repliers join so the thread shows real participant counts.
    const joiners = repliers.slice(0, 2 + (i % 3));
    for (const r of joiners) {
      await joinThread(r.socket, thread.threadId);
      await sleep(80);
    }

    // Alternate speakers; the server allows 1 msg/s per session per thread.
    const speakers = [creator, ...joiners];
    for (let m = 0; m < spec.messages.length; m++) {
      const speaker = speakers[m % speakers.length];
      speaker.socket.emit('send_message', {
        threadId: thread.threadId,
        content: spec.messages[m],
        msgType: 'text',
      });
      await sleep(350);
    }

    // Repliers can only hold MAX_CONCURRENT_THREADS (5) at once, so drop out
    // of everything but the last thread before moving on.
    if (i < THREADS.length - 1) {
      for (const r of joiners) {
        r.socket.emit('leave_thread', { threadId: thread.threadId });
        await sleep(50);
      }
    }
    await sleep(300);
  }

  // HOLD_MS keeps every participant connected so active-user counts stay live
  // (useful when capturing screenshots of a populated app).
  const holdMs = Number(process.env.HOLD_MS ?? 0);
  if (holdMs > 0) {
    console.log(`[seed] holding ${creators.length + repliers.length} participants online for ${holdMs}ms`);
    const beats = setInterval(() => {
      for (const c of [...creators, ...repliers]) c.socket.emit('heartbeat');
    }, 10000);
    await sleep(holdMs);
    clearInterval(beats);
  }

  console.log('[seed] done');
  for (const c of [...creators, ...repliers]) c.socket.disconnect();
  await redis.quit();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] fatal:', err);
  process.exit(1);
});
