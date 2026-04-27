import { Router, type Router as ExpressRouter } from 'express';
import { geospaceManager, peekAggregator, threadDiscovery } from '../config.js';
import { requireSession } from '../middleware/auth.js';
import { computeGeospaceKey } from '@chatspaces/service-geospace';
import type { RadiusTier } from '@chatspaces/shared';

const router: ExpressRouter = Router();

/**
 * GET /api/geospace?lat=&lng=&tier=
 * Resolve the GeoSpace for the given coordinates and tier.
 * Returns the GeoSpace + current threads.
 */
router.get('/', requireSession, async (req, res) => {
  const lat = parseFloat(req.query['lat'] as string);
  const lng = parseFloat(req.query['lng'] as string);
  const tier = (req.query['tier'] as RadiusTier | undefined) ?? 'nearby';

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'lat and lng are required' });
    return;
  }

  if (tier !== 'nearby' && tier !== 'around_me') {
    res.status(400).json({ error: 'tier must be "nearby" or "around_me"' });
    return;
  }

  const coords = { lat, lng };
  const { geospaceId } = computeGeospaceKey(coords, tier);
  const geospace = await geospaceManager.getOrCreate(coords, tier);
  const threads = await threadDiscovery.getHotThreads(geospaceId);

  res.json({ geospace, threads });
});

/**
 * GET /api/peek?lat=&lng=
 * Coarse activity data for Peek Mode (no auth required — public-facing).
 */
router.get('/peek', async (req, res) => {
  const lat = parseFloat(req.query['lat'] as string);
  const lng = parseFloat(req.query['lng'] as string);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'lat and lng are required' });
    return;
  }

  const data = await peekAggregator.getPeekData({ lat, lng });
  res.json(data);
});

export default router;
