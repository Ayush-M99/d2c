import type { MessageType } from './message.js';
import type { ThreadType, Thread, ThreadDiscovery, MessagePreview } from './thread.js';
import type { Message } from './message.js';

// ─── Client → Server ───────────────────────────────────────────────────────
export type ClientFrame =
  | { type: 'location_update'; data: { lat: number; lng: number; accuracy: number; speed: number } }
  | { type: 'join_thread'; data: { threadId: string } }
  | { type: 'leave_thread'; data: { threadId: string } }
  | {
      type: 'send_message';
      data: {
        threadId: string;
        content: string;
        msgType: MessageType;
        replyToMessageId?: string;
        metadata?: Record<string, unknown>;
      };
    }
  | { type: 'create_thread'; data: { title: string; threadType: ThreadType; tags: string[]; geospaceId: string } }
  | { type: 'dm_request'; data: { targetSessionId: string } }
  | { type: 'dm_accept'; data: { requestId: string } }
  | { type: 'generate_pair_code'; data: Record<string, never> }
  | { type: 'use_pair_code'; data: { code: string } }
  | { type: 'heartbeat'; data: Record<string, never> }
  | { type: 'view_confirmed'; data: { mediaId: string } }
  | { type: 'nominate_venue'; data: { lat: number; lng: number; suggestedName: string } };

// ─── Server → Client ───────────────────────────────────────────────────────
export type ServerFrame =
  | { type: 'geospace_update'; data: { geospaceId: string; threads: Thread[]; venueId?: string } }
  | { type: 'thread_list'; data: ThreadDiscovery }
  | { type: 'thread_created'; data: { thread: Thread } }
  | { type: 'thread_joined'; data: { threadId: string; displayName: string } }
  | { type: 'thread_preview'; data: { threadId: string; previewMessages: MessagePreview[]; count: number; age: number } }
  | { type: 'similar_threads'; data: { suggestedThreads: Thread[] } }
  | { type: 'new_message'; data: Message }
  | { type: 'missed_messages'; data: { threadId: string; messages: Message[]; totalMissed: number } }
  | { type: 'user_joined'; data: { threadId: string; displayName: string } }
  | { type: 'user_left'; data: { threadId: string; displayName: string } }
  | { type: 'exit_prompt'; data: { geospaceId: string; graceSeconds: number } }
  | { type: 'read_only_entered'; data: { geospaceId: string; travelDistance: number; travelTime: number } }
  | { type: 'dm_request_received'; data: { fromDisplayName: string; requestId: string } }
  | { type: 'pair_code_generated'; data: { code: string; expiresAt: number } }
  | { type: 'friend_paired'; data: { friendSessionId: string; friendDisplayNames: Record<string, string> } }
  | { type: 'moderation_action'; data: { messageId: string; action: string } }
  | { type: 'notification_push'; data: { notificationType: string; payload: unknown } }
  | { type: 'error'; data: { code: string; message: string } };
