// Browser-safe entry point — excludes server-only utils (name-generator uses node:crypto)

export type { Session, Coordinates } from './types/session.js';
export type { GeoSpace, RadiusTier } from './types/geospace.js';
export { RADIUS_CONFIG } from './types/geospace.js';
export type {
  Thread,
  ThreadType,
  ThreadDiscovery,
  MessagePreview,
  PollConfig,
  QnAConfig,
} from './types/thread.js';
export type { Message, MessageType } from './types/message.js';
export type { ClientFrame, ServerFrame } from './types/ws-frames.js';
export type { DMRequest, DMChat } from './types/dm.js';
export type { Venue, VenueCategory, VenueNomination } from './types/venue.js';

export { LIMITS } from './constants/limits.js';
export { GEOHASH_PRECISION, GEOHASH_CELL_SIZE_METERS } from './constants/geohash.js';

export { haversineDistance, isWithinRadius } from './utils/haversine.js';
