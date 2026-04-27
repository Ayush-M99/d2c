export interface DMRequest {
  requestId: string;
  fromSession: string;
  toSession: string;
  fromDisplayName: string;
  threadId: string; // source thread
  createdAt: number;
  ttl: number; // 300 seconds
}

export interface DMChat {
  chatId: string; // dm:{sorted_pair_id}
  participants: [string, string]; // session_ids
  displayNames: Record<string, string>; // session_id -> name they're known by
  createdAt: number;
}
