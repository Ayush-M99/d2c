import type { Request, Response, NextFunction } from 'express';
import { redis } from '../config.js';

/**
 * Simple Redis-backed IP rate limiter for HTTP endpoints.
 * Uses a per-minute sliding window.
 */
export function createRateLimiter(requestsPerMinute: number) {
  return async function rateLimiter(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const minute = Math.floor(Date.now() / 60_000);
    const key = `rate:http:${ip}:${minute}`;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 120); // 2 minutes to handle boundary
    }

    if (count > requestsPerMinute) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    next();
  };
}

/** Default: 60 requests per minute per IP */
export const defaultRateLimiter = createRateLimiter(60);
