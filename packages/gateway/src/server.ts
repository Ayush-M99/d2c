import express, { type Express } from 'express';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { socketAuth } from './middleware/auth.js';
import sessionRoutes from './routes/session.js';
import geospaceRoutes from './routes/geospace.js';
import threadRoutes from './routes/thread.js';
import venueRoutes from './routes/venue.js';
import reportRoutes from './routes/report.js';
import { registerSocketHandlers } from './ws/handlers.js';
import { RedisFanout } from './ws/fanout.js';

const app: Express = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env['CORS_ORIGIN'] ?? '*' },
  // Allow up to 1 MB payloads (e.g. base64 image previews)
  maxHttpBufferSize: 1e6,
});

// ── Express middleware ────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Trust proxy headers (needed for correct req.ip behind load balancer)
app.set('trust proxy', 1);

// ── HTTP Routes ───────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gateway' });
});

app.use('/api/sessions', sessionRoutes);
app.use('/api/geospace', geospaceRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/report', reportRoutes);

// ── WebSocket ─────────────────────────────────────────────────────────────────

io.use(socketAuth);
registerSocketHandlers(io);

// ── Redis → Socket.IO fanout ─────────────────────────────────────────────────

const fanout = new RedisFanout(io);
fanout.start();

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

httpServer.listen(PORT, () => {
  console.log(`[gateway] Listening on :${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[gateway] SIGTERM received, shutting down...');
  httpServer.close(() => {
    fanout.stop();
    process.exit(0);
  });
});

export { app, httpServer, io };
