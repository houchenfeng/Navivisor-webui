/**
 * Socket.io client singleton for real-time Codex events.
 */
import { io, Socket } from 'socket.io-client';
import { withBasePath } from './base-path';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/ws', {
      path: withBasePath('/socket.io'),
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}

/** Disconnects and recreates the socket (e.g. after login with new token). */
export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
