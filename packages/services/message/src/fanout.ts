import type { Redis } from 'ioredis';
import type { Kafka, Producer } from 'kafkajs';
import { REDIS_KEYS } from '@chatspaces/shared';
import type { Message } from '@chatspaces/shared';

const KAFKA_TOPIC = 'thread.messages';

/**
 * FanoutPublisher is responsible for two delivery paths:
 *
 * 1. **Sync** — Redis PUBLISH on `thread:{id}:messages`. The Gateway's
 *    Pub/Sub subscriber receives this and delivers to connected sockets
 *    within the same process (or other gateway pods via Redis fan-out).
 *
 * 2. **Async** — Kafka produce to `thread.messages`. Consumed by the
 *    Moderation Service and the Analytics pipeline.
 *
 * Kafka failures are non-fatal: the message is already stored in the Stream
 * and delivered via Pub/Sub. Kafka is best-effort for async processing.
 */
export class FanoutPublisher {
  private producer: Producer | null = null;

  constructor(
    private readonly redis: Redis,
    private readonly kafka: Kafka | null = null,
  ) {}

  async connect(): Promise<void> {
    if (this.kafka) {
      this.producer = this.kafka.producer();
      await this.producer.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }
  }

  /**
   * Publish a message to all delivery channels.
   * Returns the Redis subscriber count (informational).
   */
  async publish(message: Message): Promise<number> {
    const payload = JSON.stringify(message);
    const channel = REDIS_KEYS.threadChannel(message.threadId);

    // Synchronous Redis Pub/Sub — awaited so caller knows delivery happened
    const subscriberCount = await this.redis.publish(channel, payload);

    // Async Kafka — fire-and-forget, don't let failures bubble up
    if (this.producer) {
      this.producer
        .send({
          topic: KAFKA_TOPIC,
          messages: [
            {
              key: message.threadId,
              value: payload,
              timestamp: String(message.timestamp),
            },
          ],
        })
        .catch((err: unknown) => {
          // Non-fatal: moderation/analytics will lag but messages still delivered
          console.error('[fanout] Kafka produce failed:', err);
        });
    }

    return subscriberCount;
  }
}
