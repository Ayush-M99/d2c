/**
 * Inline content filter — must complete within ~5 ms.
 *
 * Strategy: single-pass scan with a pre-compiled RegExp union.
 * The blocklist is intentionally minimal — heavy moderation runs
 * asynchronously via the Moderation Service (Kafka consumer).
 */

export interface FilterResult {
  allowed: boolean;
  reason?: string;
}

// Keyword list (lowercase). Add entries here for instant blocking.
const BLOCKED_TERMS: string[] = [
  // hate speech stubs — real list would be far longer and externally managed
  'slur1',
  'slur2',
  // spam patterns
  'buy now',
  'click here',
  'free money',
];

// Pre-compiled at module load to avoid per-message overhead
const BLOCKED_PATTERN = new RegExp(
  BLOCKED_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i',
);

// Hard-limit: messages shouldn't exceed 2000 chars (enforced in handler too)
const HARD_MAX_LENGTH = 2000;

// Minimum non-whitespace characters required
const MIN_CONTENT_LENGTH = 1;

export function filterMessage(content: string): FilterResult {
  if (content.length > HARD_MAX_LENGTH) {
    return { allowed: false, reason: 'Message exceeds maximum length' };
  }

  const trimmed = content.trim();
  if (trimmed.length < MIN_CONTENT_LENGTH) {
    return { allowed: false, reason: 'Message is empty' };
  }

  if (BLOCKED_PATTERN.test(content)) {
    return { allowed: false, reason: 'Message contains prohibited content' };
  }

  return { allowed: true };
}
