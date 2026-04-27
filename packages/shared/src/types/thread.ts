export type ThreadType = 'text' | 'poll' | 'qna' | 'countdown';

export interface MessagePreview {
  messageId: string;
  senderDisplayName: string;
  content: string; // truncated to 100 chars
  timestamp: number;
}

export interface Thread {
  threadId: string; // UUID
  geospaceId: string;
  title: string; // max 120 chars
  threadType: ThreadType;
  tags: string[]; // max 5
  creatorSession: string;
  activeUsers: number;
  messageCount: number;
  previewMessages: MessagePreview[];
  createdAt: number;
  lastActivity: number;
  ttl: number; // seconds, default 1800
  maxUsers: number; // default 500
}

export interface ThreadDiscovery {
  hot: Thread[];
  forYou: Thread[];
  searchResults?: Thread[];
}

export interface PollConfig {
  question: string;
  options: string[]; // 2-6 options
  votes: Record<string, number>; // option -> count
  voterSessions: Set<string>; // prevent double voting
}

export interface QnAConfig {
  upvotes: Record<string, number>; // message_id -> upvote count
  answeredIds: string[]; // creator-marked answers
}
