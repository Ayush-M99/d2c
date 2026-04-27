export interface Session {
  sessionId: string; // UUIDv4
  deviceFingerprint: string; // Salted SHA-256 hash
  currentLocation: Coordinates | null;
  activeGeospace: string | null; // geospace_id
  activeThreads: string[]; // thread_ids (max 5)
  interestTags: string[]; // max 10
  pairedFriends: string[]; // linked session_ids
  connectedAt: number; // Unix ms
  lastHeartbeat: number; // Unix ms
  attestationStatus: 'verified' | 'unverified' | 'suspicious';
}

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number; // meters
  speed?: number; // m/s
}
