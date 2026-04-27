import { io, Socket } from 'socket.io-client'
import { GATEWAY_URL } from './constants'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export function connectSocket(sessionId: string): Socket {
  if (socket?.connected) return socket

  socket = io(GATEWAY_URL, {
    auth: { sessionId },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Typed emitters
export function emit(event: string, data?: any) {
  socket?.emit(event, data ?? {})
}
