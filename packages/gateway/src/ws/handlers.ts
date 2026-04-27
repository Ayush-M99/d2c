import type { Socket, Server as SocketIOServer } from 'socket.io';
import {
  sessionManager,
  presenceTracker,
  pairingManager,
  geospaceManager,
  venueChecker,
  threadManager,
  threadDiscovery,
  threadDedup,
  messageHandler,
  messageReplayer,
} from '../config.js';
import { computeGeospaceKey } from '@chatspaces/service-geospace';
import type { ClientFrame, ServerFrame } from '@chatspaces/shared';
import type { Session } from '@chatspaces/shared';

function emit(socket: Socket, frame: ServerFrame): void {
  socket.emit(frame.type, frame.data);
}

function emitError(socket: Socket, code: string, message: string): void {
  emit(socket, { type: 'error', data: { code, message } });
}

// ── location_update ──────────────────────────────────────────────────────────

async function handleLocationUpdate(
  socket: Socket,
  _io: SocketIOServer,
  data: Extract<ClientFrame, { type: 'location_update' }>['data'],
): Promise<void> {
  const sessionId: string = socket.data['sessionId'];
  const session: Session = socket.data['session'];
  const coords = { lat: data.lat, lng: data.lng };

  await sessionManager.updateLocation(sessionId, coords);

  // Determine GeoSpace for each tier and notify on tier change
  const { geospaceId } = computeGeospaceKey(coords, 'nearby');
  const prevGeospaceId = session.activeGeospace;

  if (geospaceId !== prevGeospaceId) {
    // Leave old geospace
    if (prevGeospaceId) {
      await socket.leave(`geospace:${prevGeospaceId}`);
      await presenceTracker.leaveGeospace(sessionId, prevGeospaceId);
      await geospaceManager.userLeft(prevGeospaceId);
    }

    // Enter new geospace
    await socket.join(`geospace:${geospaceId}`);
    await presenceTracker.enterGeospace(sessionId, geospaceId);
    await geospaceManager.userEntered(geospaceId);
    await sessionManager.setActiveGeospace(sessionId, geospaceId);
    socket.data['session'] = { ...session, activeGeospace: geospaceId };

    // Check for venue (optional — don't block geospace_update if venue lookup fails)
    let venueId: string | undefined;
    try {
      const venue = await venueChecker.getNearestVenue(coords);
      venueId = venue?.venueId;
    } catch (err) {
      console.warn('[location_update] venue lookup failed:', (err as any).message);
    }

    // Fetch threads for the new geospace
    const threads = await threadDiscovery.getHotThreads(geospaceId);

    emit(socket, {
      type: 'geospace_update',
      data: { geospaceId, threads, venueId },
    });
  } else {
    await socket.join(`geospace:${geospaceId}`);

    // Check for venue (optional — don't block geospace_update if venue lookup fails)
    let venueId: string | undefined;
    try {
      const venue = await venueChecker.getNearestVenue(coords);
      venueId = venue?.venueId;
    } catch (err) {
      console.warn('[location_update] venue lookup failed:', (err as any).message);
    }

    const threads = await threadDiscovery.getHotThreads(geospaceId);

    emit(socket, {
      type: 'geospace_update',
      data: { geospaceId, threads, venueId },
    });
  }
}

// ── join_thread ──────────────────────────────────────────────────────────────

async function handleJoinThread(
  socket: Socket,
  _io: SocketIOServer,
  data: Extract<ClientFrame, { type: 'join_thread' }>['data'],
): Promise<void> {
  const sessionId: string = socket.data['sessionId'];
  const { threadId } = data;

  const result = await threadManager.joinThread(threadId, sessionId);
  if (!result) {
    emitError(socket, 'JOIN_FAILED', 'Thread not found or at capacity');
    return;
  }

  const thread = await threadManager.getThread(threadId);
  if (!thread) {
    emitError(socket, 'JOIN_FAILED', 'Thread not found');
    return;
  }

  // Join Socket.IO room for real-time message delivery
  await socket.join(`thread:${threadId}`);
  await socket.join(`geospace:${thread.geospaceId}`);
  await sessionManager.joinThread(sessionId, threadId);
  await sessionManager.setActiveGeospace(sessionId, thread.geospaceId);
  await presenceTracker.enterThread(sessionId, threadId);
  const session: Session = socket.data['session'];
  const activeThreads = Array.from(new Set([...(session.activeThreads ?? []), threadId]));
  socket.data['session'] = { ...session, activeGeospace: thread.geospaceId, activeThreads };

  emit(socket, {
    type: 'thread_joined',
    data: { threadId, displayName: result.displayName },
  });

  // Notify other members
  socket.to(`thread:${threadId}`).emit('user_joined', {
    threadId,
    displayName: result.displayName,
  });

  // Replay missed messages (last 50)
  const replay = await messageReplayer.replay(threadId, '0');
  if (replay.messages.length > 0) {
    emit(socket, {
      type: 'missed_messages',
      data: {
        threadId,
        messages: replay.messages,
        totalMissed: replay.messages.length,
      },
    });
  }
}

// ── leave_thread ─────────────────────────────────────────────────────────────

async function handleLeaveThread(
  socket: Socket,
  _io: SocketIOServer,
  data: Extract<ClientFrame, { type: 'leave_thread' }>['data'],
): Promise<void> {
  const sessionId: string = socket.data['sessionId'];
  const { threadId } = data;

  const displayName = await threadManager.getDisplayName(threadId, sessionId);
  await threadManager.leaveThread(threadId, sessionId);
  await sessionManager.leaveThread(sessionId, threadId);
  await presenceTracker.leaveThread(sessionId, threadId);
  await socket.leave(`thread:${threadId}`);
  const session: Session = socket.data['session'];
  socket.data['session'] = {
    ...session,
    activeThreads: (session.activeThreads ?? []).filter((id) => id !== threadId),
  };

  socket.to(`thread:${threadId}`).emit('user_left', { threadId, displayName });
}

// ── create_thread ─────────────────────────────────────────────────────────────

async function handleCreateThread(
  socket: Socket,
  _io: SocketIOServer,
  data: Extract<ClientFrame, { type: 'create_thread' }>['data'],
): Promise<void> {
  const sessionId: string = socket.data['sessionId'];
  const session: Session = socket.data['session'];
  const { geospaceId, title, threadType, tags } = data;

  if (!geospaceId || session.activeGeospace !== geospaceId) {
    emitError(socket, 'CREATE_THREAD_REJECTED', 'Join a geospace before creating a thread');
    return;
  }

  // Dedup check
  const similar = await threadDedup.findSimilarThreads(geospaceId, title);
  if (similar.length > 0) {
    emit(socket, { type: 'similar_threads', data: { suggestedThreads: similar } });
    return;
  }

  // Rate limit
  const allowed = await threadManager.checkCreateRateLimit(session.deviceFingerprint);
  if (!allowed) {
    emitError(socket, 'RATE_LIMITED', 'Thread creation rate limit exceeded');
    return;
  }

  const thread = await threadManager.createThread(
    geospaceId,
    title,
    threadType,
    tags,
    sessionId,
  );

  emit(socket, { type: 'thread_created', data: { thread } });

  // Auto-join the creator
  await handleJoinThread(socket, _io, { threadId: thread.threadId });

  // Broadcast updated thread list to geospace
  const threads = await threadDiscovery.getHotThreads(geospaceId);
  _io.to(`geospace:${geospaceId}`).emit('thread_list', {
    hot: threads,
    forYou: threads,
  });
}

// ── send_message ─────────────────────────────────────────────────────────────

async function handleSendMessage(
  socket: Socket,
  _io: SocketIOServer,
  data: Extract<ClientFrame, { type: 'send_message' }>['data'],
): Promise<void> {
  const sessionId: string = socket.data['sessionId'];
  const session: Session = socket.data['session'];
  const geospaceId = session.activeGeospace;

  if (!geospaceId) {
    emitError(socket, 'MESSAGE_REJECTED', 'Join a geospace before sending messages');
    return;
  }

  if (!socket.rooms.has(`thread:${data.threadId}`)) {
    emitError(socket, 'MESSAGE_REJECTED', 'Join the thread before sending messages');
    return;
  }

  const outcome = await messageHandler.process({
    threadId: data.threadId,
    geospaceId,
    senderSession: sessionId,
    content: data.content,
    type: data.msgType,
    replyToMessageId: data.replyToMessageId ?? null,
    metadata: data.metadata ?? {},
  });

  if (!outcome.ok) {
    emitError(socket, 'MESSAGE_REJECTED', outcome.reason);
  }
  // On success, fanout.publish already fired — no need to echo back
}

// ── heartbeat ─────────────────────────────────────────────────────────────────

async function handleHeartbeat(socket: Socket): Promise<void> {
  const sessionId: string = socket.data['sessionId'];
  await sessionManager.heartbeat(sessionId);
  socket.emit('heartbeat_ack', { timestamp: Date.now() });
}

// ── generate_pair_code ────────────────────────────────────────────────────────

async function handleGeneratePairCode(socket: Socket): Promise<void> {
  const sessionId: string = socket.data['sessionId'];
  const result = await pairingManager.generatePairCode(sessionId);
  if (!result) {
    emitError(socket, 'PAIR_CODE_FAILED', 'Could not generate a unique code');
    return;
  }
  emit(socket, { type: 'pair_code_generated', data: result });
}

// ── use_pair_code ─────────────────────────────────────────────────────────────

async function handleUsePairCode(
  socket: Socket,
  data: Extract<ClientFrame, { type: 'use_pair_code' }>['data'],
): Promise<void> {
  const sessionId: string = socket.data['sessionId'];
  const result = await pairingManager.usePairCode(sessionId, data.code);
  if (!result.success || !result.friendSessionId) {
    emitError(socket, 'PAIR_FAILED', result.reason ?? 'Pairing failed');
    return;
  }
  emit(socket, {
    type: 'friend_paired',
    data: { friendSessionId: result.friendSessionId, friendDisplayNames: {} },
  });
}

// ── nominate_venue ────────────────────────────────────────────────────────────

async function handleNominateVenue(
  socket: Socket,
  data: Extract<ClientFrame, { type: 'nominate_venue' }>['data'],
): Promise<void> {
  const session: Session = socket.data['session'];
  await venueChecker.nominateVenue(
    { lat: data.lat, lng: data.lng },
    data.suggestedName,
    session.deviceFingerprint,
  );
  socket.emit('nomination_received', { ok: true });
}

// ── Disconnect cleanup ────────────────────────────────────────────────────────

async function handleDisconnect(socket: Socket): Promise<void> {
  const sessionId: string | undefined = socket.data['sessionId'];
  if (!sessionId) return;

  const session: Session | undefined = socket.data['session'];
  const geospaceId = session?.activeGeospace ?? null;
  const threadIds: string[] = session?.activeThreads ?? [];

  // Notify thread members of departure
  for (const threadId of threadIds) {
    const displayName = await threadManager.getDisplayName(threadId, sessionId);
    await threadManager.leaveThread(threadId, sessionId);
    socket.to(`thread:${threadId}`).emit('user_left', { threadId, displayName });
  }

  await presenceTracker.removeFromAll(sessionId, geospaceId, threadIds);
  if (geospaceId) {
    await geospaceManager.userLeft(geospaceId);
    await sessionManager.setActiveGeospace(sessionId, null);
  }
}

// ── Main registration ─────────────────────────────────────────────────────────

export function registerSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    socket.on('location_update', (data) =>
      handleLocationUpdate(socket, io, data).catch(console.error),
    );
    socket.on('join_thread', (data) =>
      handleJoinThread(socket, io, data).catch(console.error),
    );
    socket.on('leave_thread', (data) =>
      handleLeaveThread(socket, io, data).catch(console.error),
    );
    socket.on('create_thread', (data) =>
      handleCreateThread(socket, io, data).catch(console.error),
    );
    socket.on('send_message', (data) =>
      handleSendMessage(socket, io, data).catch(console.error),
    );
    socket.on('heartbeat', () => handleHeartbeat(socket).catch(console.error));
    socket.on('generate_pair_code', () =>
      handleGeneratePairCode(socket).catch(console.error),
    );
    socket.on('use_pair_code', (data) =>
      handleUsePairCode(socket, data).catch(console.error),
    );
    socket.on('nominate_venue', (data) =>
      handleNominateVenue(socket, data).catch(console.error),
    );
    socket.on('disconnect', () => handleDisconnect(socket).catch(console.error));
  });
}
