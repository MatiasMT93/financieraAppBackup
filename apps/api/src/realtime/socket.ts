import type { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env, corsOrigins } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { AuthUser } from '../middleware/auth.js';

let io: SocketServer | null = null;

export function initializeSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: corsOrigins, methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Token requerido'));

    try {
      const user = jwt.verify(token, env.JWT_SECRET) as AuthUser;
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthUser;
    logger.debug({ userId: user.id, role: user.role }, 'Socket connected');

    // Each user joins their own room for targeted events
    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);

    socket.on('disconnect', () => {
      logger.debug({ userId: user.id }, 'Socket disconnected');
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

/** Emit to all connected clients with a given role */
export function emitToRole(role: string, event: string, data: unknown): void {
  getIO().to(`role:${role}`).emit(event, data);
}

/** Emit to a specific user */
export function emitToUser(userId: string, event: string, data: unknown): void {
  getIO().to(`user:${userId}`).emit(event, data);
}

/** Broadcast to all connected clients */
export function broadcast(event: string, data: unknown): void {
  getIO().emit(event, data);
}
