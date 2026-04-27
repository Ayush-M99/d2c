import type { Server as SocketIOServer } from 'socket.io';
import { redisSub } from '../config.js';
import type { Message } from '@chatspaces/shared';

/**
 * RedisFanout subscribes to all thread Pub/Sub channels and forwards
 * arriving messages to the corresponding Socket.IO room.
 *
 * Pattern: `thread:*:messages`
 * Room name: `thread:{threadId}`
 *
 * Using PSUBSCRIBE (pattern subscribe) so new threads are automatically
 * covered without re-subscribing.
 */
export class RedisFanout {
  constructor(private readonly io: SocketIOServer) {}

  start(): void {
    redisSub.psubscribe('thread:*:messages', (err) => {
      if (err) {
        console.error('[fanout] PSUBSCRIBE failed:', err);
      }
    });

    redisSub.on('pmessage', (_pattern: string, channel: string, rawMessage: string) => {
      // channel format: thread:{threadId}:messages
      const parts = channel.split(':');
      if (parts.length < 3) return;
      const threadId = parts[1];
      if (!threadId) return;

      let message: Message;
      try {
        message = JSON.parse(rawMessage) as Message;
      } catch {
        return;
      }

      // Emit to all sockets in the thread's Socket.IO room
      this.io.to(`thread:${threadId}`).emit('new_message', message);
    });
  }

  stop(): void {
    redisSub.punsubscribe('thread:*:messages');
  }
}
