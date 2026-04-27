import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { Kafka } from 'kafkajs';

import { SessionManager } from '@chatspaces/service-session';
import { PresenceTracker } from '@chatspaces/service-session';
import { PairingManager } from '@chatspaces/service-session';
import { GeoSpaceManager } from '@chatspaces/service-geospace';
import { VenueChecker } from '@chatspaces/service-geospace';
import { PeekAggregator } from '@chatspaces/service-geospace';
import { ThreadManager } from '@chatspaces/service-thread';
import { ThreadDiscovery } from '@chatspaces/service-thread';
import { ThreadDedup } from '@chatspaces/service-thread';
import { MessageHandler } from '@chatspaces/service-message';
import { FanoutPublisher } from '@chatspaces/service-message';
import { MessageReplayer } from '@chatspaces/service-message';

// ── Infrastructure ────────────────────────────────────────────────────────────

export const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379');

// Separate subscriber connection — a Redis client in subscribe mode
// cannot issue regular commands.
export const redisSub = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379');

export const db = new Pool({
  connectionString: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/chatspaces',
  max: 10,
});

const kafkaBrokers = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
export const kafka = new Kafka({
  clientId: 'chatspaces-gateway',
  brokers: kafkaBrokers,
});

// ── Services ──────────────────────────────────────────────────────────────────

export const sessionManager = new SessionManager(redis);
export const presenceTracker = new PresenceTracker(redis);
export const pairingManager = new PairingManager(redis);

export const geospaceManager = new GeoSpaceManager(redis);
export const venueChecker = new VenueChecker(db);
export const peekAggregator = new PeekAggregator(redis);

export const threadManager = new ThreadManager(redis);
export const threadDiscovery = new ThreadDiscovery(redis);
export const threadDedup = new ThreadDedup(redis);

export const fanoutPublisher = new FanoutPublisher(redis, kafka);
export const messageHandler = new MessageHandler(redis, fanoutPublisher);
export const messageReplayer = new MessageReplayer(redis);

// Connect Kafka producer on startup (non-fatal if Kafka is unavailable in dev)
fanoutPublisher.connect().catch((err: unknown) => {
  console.warn('[config] Kafka producer connection failed (non-fatal in dev):', err);
});
