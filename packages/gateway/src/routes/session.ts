import { Router, type Router as ExpressRouter } from 'express';
import { sessionManager, pairingManager } from '../config.js';
import { requireSession } from '../middleware/auth.js';
import { defaultRateLimiter } from '../middleware/rate-limiter.js';

const router: ExpressRouter = Router();

/**
 * POST /api/sessions
 * Create a new anonymous session.
 * Body: { fingerprint: string, interestTags?: string[] }
 */
router.post('/', defaultRateLimiter, async (req, res) => {
  const { fingerprint, interestTags } = req.body as {
    fingerprint?: string;
    interestTags?: string[];
  };

  if (!fingerprint || typeof fingerprint !== 'string') {
    res.status(400).json({ error: 'fingerprint is required' });
    return;
  }

  const session = await sessionManager.createSession(fingerprint, interestTags);
  res.status(201).json({ session });
});

/**
 * GET /api/sessions/:id
 * Retrieve a session by ID.
 */
router.get('/:id', requireSession, async (req, res) => {
  // requireSession already validated; just return what's attached
  res.json({ session: req.session });
});

/**
 * POST /api/sessions/:id/heartbeat
 * Refresh session TTL.
 */
router.post('/:id/heartbeat', requireSession, async (req, res) => {
  const alive = await sessionManager.heartbeat(req.sessionId!);
  if (!alive) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({ ok: true });
});

/**
 * PUT /api/sessions/:id/tags
 * Update interest tags.
 * Body: { tags: string[] }
 */
router.put('/:id/tags', requireSession, async (req, res) => {
  const { tags } = req.body as { tags?: string[] };
  if (!Array.isArray(tags)) {
    res.status(400).json({ error: 'tags must be an array' });
    return;
  }
  await sessionManager.setInterestTags(req.sessionId!, tags);
  res.json({ ok: true });
});

/**
 * POST /api/sessions/:id/pair-code
 * Generate a 6-digit pairing code.
 */
router.post('/:id/pair-code', requireSession, async (req, res) => {
  const result = await pairingManager.generatePairCode(req.sessionId!);
  if (!result) {
    res.status(429).json({ error: 'Could not generate a unique code, try again' });
    return;
  }
  res.json(result);
});

/**
 * POST /api/sessions/:id/pair
 * Consume a pairing code.
 * Body: { code: string }
 */
router.post('/:id/pair', requireSession, async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'code is required' });
    return;
  }
  const result = await pairingManager.usePairCode(req.sessionId!, code);
  if (!result.success || !result.friendSessionId) {
    res.status(400).json({ error: result.reason });
    return;
  }
  res.json({ friendSessionId: result.friendSessionId });
});

export default router;
