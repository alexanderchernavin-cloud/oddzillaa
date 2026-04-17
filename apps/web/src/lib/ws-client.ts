'use client';

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './auth-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      auth: () => {
        const token = getAccessToken();
        return token ? { token } : {};
      },
    });
  }
  return socket;
}
