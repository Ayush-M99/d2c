import { Router, type Router as ExpressRouter } from 'express';
import { requireSession } from '../middleware/auth.js';
import { defaultRateLimiter } from '../middleware/rate-limiter.js';
import { redis } from '../config.js';

const router: ExpressRouter = Router();

/**
 * POST /api/report
 * Submit a content report. Enqueued in Redis for the Moderation Service.
 * Body: { messageId, threadId, reason }
 *
 * Note: Full moderation pipeline (Kafka consumer, classifier) is out of scope
 * for Step 6. Reports are stored in a Redis list for async processing.
 */
router.post('/', requireSession, defaultRateLimiter, async (req, res) => {
  const { messageId, threadId, reason } = req.body as {
    messageId?: string;
    threadId?: string;
    reason?: string;
  };

  if (!messageId || !threadId || !reason) {
    res.status(400).json({ error: 'messageId, threadId, and reason are required' });
    return;
  }

  const report = {
    messageId,
    threadId,
    reason,
    reporterSession: req.sessionId,
    reportedAt: Date.now(),
  };

  await redis.lpush('moderation:reports', JSON.stringify(report));
  // Trim to avoid unbounded growth until Moderation Service consumes them
  await redis.ltrim('moderation:reports', 0, 9999);

  res.status(202).json({ ok: true });
});

export default router;
