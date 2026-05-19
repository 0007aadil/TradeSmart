let io = null;

export function setIo(server) { io = server; }

export function notifyUser(userId, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit('user-notification', { ts: Date.now(), ...payload });
}
