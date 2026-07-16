import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (!socket) {
    const token = await AsyncStorage.getItem('accessToken');
    socket = io(API_BASE, {
      auth: { token },
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  return socket;
}

export async function connectSocket(): Promise<void> {
  const s = await getSocket();
  if (!s.connected) s.connect();
}

export async function disconnectSocket(): Promise<void> {
  socket?.disconnect();
  socket = null;
}
