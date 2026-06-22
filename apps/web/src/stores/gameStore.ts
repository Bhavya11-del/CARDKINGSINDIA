import { create } from 'zustand';

interface GameStore {
  gameState: any;
  room: any;
  chatMessages: any[];
  roomId: string | null;
  setGameState: (state: any) => void;
  setRoom: (room: any) => void;
  setRoomId: (id: string) => void;
  addChatMessage: (msg: any) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  room: null,
  chatMessages: [],
  roomId: null,

  setGameState: (state) => set({ gameState: state }),
  setRoom: (room) => set({ room }),
  setRoomId: (id) => set({ roomId: id }),
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages.slice(-50), msg] })),
  clearGame: () => set({ gameState: null, room: null, chatMessages: [], roomId: null }),
}));
