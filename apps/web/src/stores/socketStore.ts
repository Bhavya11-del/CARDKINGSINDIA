import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketStore {
  socket: Socket | null;
  connected: boolean;
  connect: (token?: string) => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  connected: false,

  connect: (token?: string) => {
    const existing = get().socket;
    if (existing?.connected) return;
    if (existing) existing.disconnect();

    const socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));
    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, connected: false });
  },

  emit: (event, data) => {
    get().socket?.emit(event, data);
  },
}));
