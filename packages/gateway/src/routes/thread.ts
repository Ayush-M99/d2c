import { Router, type Router as ExpressRouter } from 'express';
import {
  threadManager,
  threadDiscovery,
  threadDedup,
  messageReplayer,
} from '../config.js';
import { requireSession } from '../middleware/auth.js';
import type { ThreadType } from '@chatspaces/shared';

const router: ExpressRouter = Router();

/**
 * GET /api/threads?geospaceId=&tags=tag1,tag2
 * List threads in a GeoSpace. Uses forYou if tags are provided.
 */
router.get('/', requireSession, async (req, res) => {
  const geospaceId = req.query['geospaceId'] as string | undefined;
  if (!geospaceId) {
    res.status(400).json({ error: 'geospaceId is required' });
    return;
  }

  const rawTags = req.query['tags'] as string | undefined;
  const tags = rawTags ? rawTags.split(',').filter(Boolean) : [];

  const [hot, forYou] = await Promise.all([
    threadDiscovery.getHotThreads(geospaceId, 20),
    threadDiscovery.getForYouThreads(geospaceId, tags, 20),
  ]);

  res.json({ hot, forYou });
});

/**
 * GET /api/threads/search?geospaceId=&q=
 */
router.get('/search', requireSession, async (req, res) => {
  const geospaceId = req.query['geospaceId'] as string | undefined;
  const q = req.query['q'] as string | undefined;
  if (!geospaceId || !q) {
    res.status(400).json({ error: 'geospaceId and q are required' });
    return;
  }
  const results = await threadDiscovery.searchThreads(geospaceId, q);
  res.json({ results });
});

/**
 * POST /api/threads
 * Create a new thread. Checks for duplicates first.
 * Body: { geospaceId, title, threadType, tags }
 */
router.post('/', requireSession, async (req, res) => {
  const { geospaceId, title, threadType, tags } = req.body as {
    geospaceId?: string;
    title?: string;
    threadType?: ThreadType;
    tags?: string[];
  };

  if (!geospaceId || !title || !threadType) {
    res.status(400).json({ error: 'geospaceId, title, and threadType are required' });
    return;
  }

  // Dedup check
  const similar = await threadDedup.findSimilarThreads(geospaceId, title);
  if (similar.length > 0) {
    res.status(409).json({ error: 'Similar threads exist', suggestedThreads: similar });
    return;
  }

  // Rate limit check
  const fingerprint = req.session!.deviceFingerprint;
  const allowed = await threadManager.checkCreateRateLimit(fingerprint);
  if (!allowed) {
    res.status(429).json({ error: 'Thread creation rate limit exceeded' });
    return;
  }

  const thread = await threadManager.createThread(
    geospaceId,
    title,
    threadType,
    tags ?? [],
    req.sessionId!,
  );

  res.status(201).json({ thread });
});

/**
 * GET /api/threads/:id
 * Get a single thread by ID.
 */
router.get('/:id', requireSession, async (req, res) => {
  const thread = await threadManager.getThread(req.params['id']!);
  if (!thread) {
    res.status(404).json({ error: 'Thread not found' });
    return;
  }
  res.json({ thread });
});

/**
 * GET /api/threads/:id/messages?after=&limit=
 * Replay messages (for reconnect or pagination).
 */
router.get('/:id/messages', requireSession, async (req, res) => {
  const after = (req.query['after'] as string | undefined) ?? '0';
  const limit = Math.min(parseInt(req.query['limit'] as string ?? '50', 10), 50);
  const batch = await messageReplayer.replay(req.params['id']!, after, limit);
  res.json(batch);
});

export default router;
