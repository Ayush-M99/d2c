import type { Request, Response, NextFunction } from 'express';
import type { Socket } from 'socket.io';
import { sessionManager } from '../config.js';
import type { Session } from '@chatspaces/shared';

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      session?: Session;
      sessionId?: string;
    }
  }
}

/**
 * Express middleware: reads X-Session-Id header, validates the session,
 * and attaches it to `req.session`. Responds 401 if invalid.
 */
export async function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || typeof sessionId !== 'string') {
    res.status(401).json({ error: 'Missing X-Session-Id header' });
    return;
  }

  const session = await sessionManager.validateSession(sessionId);
  if (!session) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  req.session = session;
  req.sessionId = sessionId;
  next();
}

/**
 * Socket.IO middleware: validates session from handshake auth.
 * Disconnects the socket if the session is invalid.
 */
export async function socketAuth(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  const sessionId = socket.handshake.auth['sessionId'] as string | undefined;
  if (!sessionId) {
    next(new Error('AUTH_REQUIRED'));
    return;
  }

  const session = await sessionManager.validateSession(sessionId);
  if (!session) {
    next(new Error('INVALID_SESSION'));
    return;
  }

  // Attach to socket data for use in handlers
  socket.data['sessionId'] = sessionId;
  socket.data['session'] = session;
  next();
}
