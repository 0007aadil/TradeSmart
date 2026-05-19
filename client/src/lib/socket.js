import { io } from 'socket.io-client';
import { API_BASE } from './api.js';

let socket = null;

export function getSocket(token) {
  if (!socket) {
    socket = io(API_BASE || undefined, { auth: { token } });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
