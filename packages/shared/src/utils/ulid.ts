import { ulid as generateUlid, decodeTime } from 'ulid';

/**
 * Generate a new ULID. ULIDs are lexicographically sortable and encode
 * a millisecond-precision timestamp in the first 10 characters.
 */
export function ulid(): string {
  return generateUlid();
}

/**
 * Extract the Unix millisecond timestamp embedded in a ULID.
 */
export function ulidToTimestamp(id: string): number {
  return decodeTime(id);
}
