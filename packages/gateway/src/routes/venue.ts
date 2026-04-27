import { Router, type Router as ExpressRouter } from 'express';
import { venueChecker } from '../config.js';
import { requireSession } from '../middleware/auth.js';
import { defaultRateLimiter } from '../middleware/rate-limiter.js';

const router: ExpressRouter = Router();

/**
 * GET /api/venues?lat=&lng=&radius=
 * Get approved venues near a location.
 */
router.get('/', requireSession, async (req, res) => {
  const lat = parseFloat(req.query['lat'] as string);
  const lng = parseFloat(req.query['lng'] as string);
  const radius = parseFloat((req.query['radius'] as string | undefined) ?? '500');

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'lat and lng are required' });
    return;
  }

  const venues = await venueChecker.getNearbyVenues({ lat, lng }, radius);
  res.json({ venues });
});

/**
 * POST /api/venues/nominate
 * Submit a venue nomination for review.
 * Body: { lat, lng, name }
 */
router.post('/nominate', requireSession, defaultRateLimiter, async (req, res) => {
  const { lat, lng, name } = req.body as { lat?: number; lng?: number; name?: string };

  if (typeof lat !== 'number' || typeof lng !== 'number' || !name) {
    res.status(400).json({ error: 'lat, lng, and name are required' });
    return;
  }

  const nominationId = await venueChecker.nominateVenue(
    { lat, lng },
    name,
    req.session!.deviceFingerprint,
  );

  res.status(201).json({ nominationId });
});

export default router;
