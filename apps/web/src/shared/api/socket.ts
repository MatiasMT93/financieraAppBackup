import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth-store.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;
    socket = io(API_BASE, {
      auth: { token },
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) s.connect();
}

/**
 * Actualiza el token usado en el handshake del socket. Hay que llamarlo tras
 * un refresh de token: si no, al reconectar (caída de red) el socket usaría el
 * token viejo y el servidor rechazaría la autenticación.
 */
export function updateSocketToken(token: string | null): void {
  if (socket) {
    (socket.auth as { token?: string | null }).token = token;
  }
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
