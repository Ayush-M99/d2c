export type MessageType = 'text' | 'image' | 'system' | 'reaction' | 'poll_vote';

export interface Message {
  messageId: string; // ULID (sortable, time-ordered)
  threadId: string;
  senderSession: string;
  senderDisplayName: string;
  content: string; // max 2000 chars
  type: MessageType;
  replyToMessageId: string | null;
  replyPreview: string | null; // first 100 chars of parent message (denormalized)
  timestamp: number; // server-assigned Unix ms
  metadata: Record<string, unknown>;
}
