import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { userStore } from '../auth/userStore';
import {
  createDeck, shuffleDeck,
  initTeenPattiGame, dealCards as dealTeenPatti, applyAction as applyTeenPattiAction, resolveShowdown,
  initCallBreak, dealCallBreak, placeBid, playCard,
  initMendicot, dealMendicot, playMendicotCard,
  getTeenPattiBotAction, getCallBreakBotBid, getCallBreakBotCard, getMendicotBotCard,
} from '../../../../packages/shared/src/index';

export type GameType = 'teen-patti' | 'call-break' | 'mendicot';

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  elo: number;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  connected: boolean;
}

export interface Room {
  id: string;
  code: string;
  game: GameType;
  players: RoomPlayer[];
  maxPlayers: number;
  isPrivate: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'waiting' | 'playing' | 'finished';
  hostId: string;
  createdAt: string;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function makeBotPlayer(difficulty: 'easy' | 'medium' | 'hard', index: number): RoomPlayer {
  const BOT_NAMES = [
    ['Lucky Raju', 'Priya Bot', 'Vikram AI', 'Ananya Pro'],
    ['Sharma Bot', 'Patel AI', 'Singh Pro', 'Gupta Bot'],
    ['Expert Raj', 'Master Dev', 'Pro Arjun', 'Ace Kavya'],
  ];
  const diffIdx = { easy: 0, medium: 1, hard: 2 }[difficulty];
  const name = BOT_NAMES[diffIdx][index % 4];
  const id = `bot_${uuidv4()}`;
  return {
    id, name, isBot: true, botDifficulty: difficulty, connected: true,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
    elo: { easy: 800, medium: 1200, hard: 1800 }[difficulty],
  };
}

export class GameManager {
  private rooms: Map<string, Room> = new Map();
  private gameStates: Map<string, any> = new Map();
  private botTimers: Map<string, NodeJS.Timeout> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  createRoom(hostId: string, options: { game: string; maxPlayers: number; isPrivate: boolean; difficulty: string }): Room {
    const host = userStore.findById(hostId);
    const maxP = Math.min(options.maxPlayers, this.getMaxPlayersForGame(options.game as GameType));

    const room: Room = {
      id: uuidv4(),
      code: generateCode(),
      game: options.game as GameType,
      players: [{
        id: hostId, name: host?.name || 'Player',
        avatar: host?.avatar || '', elo: host?.elo || 1000,
        isBot: false, connected: true,
      }],
      maxPlayers: maxP,
      isPrivate: options.isPrivate,
      difficulty: (options.difficulty as any) || 'medium',
      status: 'waiting',
      hostId,
      createdAt: new Date().toISOString(),
    };

    // Fill remaining slots with bots
    while (room.players.length < room.maxPlayers) {
      room.players.push(makeBotPlayer(room.difficulty, room.players.length - 1));
    }

    this.rooms.set(room.id, room);
    return room;
  }

  joinRoom(userId: string, roomId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting') return null;
    if (room.players.find(p => p.id === userId)) return room;

    const user = userStore.findById(userId);
    if (!user) return null;

    // Replace a bot slot
    const botIdx = room.players.findIndex(p => p.isBot);
    if (botIdx !== -1) {
      room.players[botIdx] = { id: userId, name: user.name, avatar: user.avatar, elo: user.elo, isBot: false, connected: true };
    } else if (room.players.length < room.maxPlayers) {
      room.players.push({ id: userId, name: user.name, avatar: user.avatar, elo: user.elo, isBot: false, connected: true });
    } else {
      return null;
    }
    return room;
  }

  joinByCode(userId: string, code: string): Room | null {
    for (const room of this.rooms.values()) {
      if (room.code === code) return this.joinRoom(userId, room.id);
    }
    return null;
  }

  joinMatchmaking(userId: string, game: string): Room | null {
    // Find waiting public room for same game
    for (const room of this.rooms.values()) {
      if (room.game === game && !room.isPrivate && room.status === 'waiting') {
        return this.joinRoom(userId, room.id);
      }
    }
    return this.createRoom(userId, { game, maxPlayers: this.getMaxPlayersForGame(game as GameType), isPrivate: false, difficulty: 'medium' });
  }

  quickPlay(userId: string, elo: number, game: string): Room | null {
    return this.joinMatchmaking(userId, game);
  }

  getPublicRooms(): Room[] {
    return Array.from(this.rooms.values()).filter(r => !r.isPrivate && r.status === 'waiting');
  }

  startGame(roomId: string, io: Server) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.status = 'playing';

    let state: any;
    const playerDefs = room.players.map(p => ({
      id: p.id, name: p.name, isBot: p.isBot,
      botDifficulty: p.botDifficulty,
      avatar: p.avatar, chips: 2000,
      teamId: (room.players.indexOf(p) % 2) as 0 | 1,
    }));

    if (room.game === 'teen-patti') {
      state = initTeenPattiGame(playerDefs, 10);
      const deck = shuffleDeck(createDeck());
      state = dealTeenPatti(state, deck);
    } else if (room.game === 'call-break') {
      state = initCallBreak(playerDefs, 5);
      state = dealCallBreak(state);
    } else if (room.game === 'mendicot') {
      state = initMendicot(playerDefs);
      state = dealMendicot(state);
    }

    this.gameStates.set(roomId, state);
    io.to(roomId).emit('game:started', { roomId, game: room.game });
    this.broadcastState(roomId, io);
    this.scheduleBotTurn(roomId, io);
  }

  handleAction(roomId: string, userId: string, action: any, io: Server) {
    const room = this.rooms.get(roomId);
    const state = this.gameStates.get(roomId);
    if (!room || !state) return;

    let newState = state;
    try {
      if (room.game === 'teen-patti') {
        newState = applyTeenPattiAction(state, { ...action, playerId: userId });
        if (newState.phase === 'SHOWDOWN') newState = resolveShowdown(newState);
      } else if (room.game === 'call-break') {
        if (action.type === 'bid') newState = placeBid(state, userId, action.bid);
        else if (action.type === 'playCard') newState = playCard(state, userId, action.card);
      } else if (room.game === 'mendicot') {
        if (action.type === 'playCard') newState = playMendicotCard(state, userId, action.card);
      }
    } catch (e) {
      console.error('Action error:', e);
      return;
    }

    this.gameStates.set(roomId, newState);
    this.broadcastState(roomId, io);

    if (newState.phase === 'RESULT' || newState.phase === 'GAME_OVER' || newState.phase === 'SCORING') {
      this.handleGameEnd(roomId, newState, room, io);
    } else {
      this.scheduleBotTurn(roomId, io);
    }
  }

  nextRound(roomId: string, io: Server) {
    const room = this.rooms.get(roomId);
    const state = this.gameStates.get(roomId);
    if (!room || !state) return;

    let newState = state;
    if (room.game === 'call-break' && state.phase === 'SCORING') {
      newState = dealCallBreak({ ...state, dealerIndex: (state.dealerIndex + 1) % 4 });
    } else if (room.game === 'mendicot' && state.phase === 'SCORING') {
      newState = dealMendicot({ ...state, dealerIndex: (state.dealerIndex + 1) % 4, currentRound: state.currentRound + 1 });
    } else if (room.game === 'teen-patti' && state.phase === 'RESULT') {
      const deck = shuffleDeck(createDeck());
      const activePlayers = state.players.filter((p: any) => p.chips > 0);
      if (activePlayers.length < 2) { io.to(roomId).emit('game:finished', { state }); return; }
      const resetState = initTeenPattiGame(
        activePlayers.map((p: any) => ({ id: p.id, name: p.name, isBot: p.isBot, botDifficulty: p.botDifficulty, chips: p.chips, avatar: p.avatar })),
        state.bootAmount
      );
      newState = dealTeenPatti(resetState, deck);
    }

    this.gameStates.set(roomId, newState);
    this.broadcastState(roomId, io);
    this.scheduleBotTurn(roomId, io);
  }

  private scheduleBotTurn(roomId: string, io: Server) {
    const existing = this.botTimers.get(roomId);
    if (existing) clearTimeout(existing);

    const state = this.gameStates.get(roomId);
    const room = this.rooms.get(roomId);
    if (!state || !room) return;

    const currentPlayer = this.getCurrentPlayer(state, room.game);
    if (!currentPlayer?.isBot) return;

    const delay = this.getBotDelay(currentPlayer.botDifficulty || 'medium');
    const timer = setTimeout(() => {
      this.executeBotTurn(roomId, currentPlayer, io);
    }, delay);

    this.botTimers.set(roomId, timer);
  }

  private executeBotTurn(roomId: string, bot: any, io: Server) {
    const room = this.rooms.get(roomId);
    const state = this.gameStates.get(roomId);
    if (!room || !state) return;

    let newState = state;
    const diff = bot.botDifficulty || 'medium';

    try {
      if (room.game === 'teen-patti') {
        const action = getTeenPattiBotAction(state, bot.id, diff);
        newState = applyTeenPattiAction(state, action);
        if (newState.phase === 'SHOWDOWN') newState = resolveShowdown(newState);
      } else if (room.game === 'call-break') {
        if (state.phase === 'BIDDING') {
          const botter = state.players.find((p: any) => p.id === bot.id);
          const bid = getCallBreakBotBid(botter?.cards || [], diff);
          newState = placeBid(state, bot.id, bid);
        } else if (state.phase === 'TRICK_PLAY') {
          const card = getCallBreakBotCard(state, bot.id, diff);
          if (card) newState = playCard(state, bot.id, card);
        }
      } else if (room.game === 'mendicot') {
        const card = getMendicotBotCard(state, bot.id, diff);
        if (card) newState = playMendicotCard(state, bot.id, card);
      }
    } catch (e) {
      console.error('Bot error:', e);
      return;
    }

    this.gameStates.set(roomId, newState);
    this.broadcastState(roomId, io);

    if (newState.phase === 'RESULT' || newState.phase === 'GAME_OVER' || newState.phase === 'SCORING') {
      this.handleGameEnd(roomId, newState, room, io);
    } else {
      this.scheduleBotTurn(roomId, io);
    }
  }

  private getCurrentPlayer(state: any, game: GameType): RoomPlayer | null {
    if (game === 'teen-patti') {
      return state.players[state.currentPlayerIndex] || null;
    } else if (game === 'call-break') {
      if (state.phase === 'BIDDING') return state.players[state.biddingPlayerIndex] || null;
      return state.players[state.currentPlayerIndex] || null;
    } else if (game === 'mendicot') {
      return state.players[state.currentPlayerIndex] || null;
    }
    return null;
  }

  private getBotDelay(difficulty: string): number {
    const ranges: Record<string, [number, number]> = {
      easy: [1500, 3000], medium: [800, 1800], hard: [400, 1000],
    };
    const [min, max] = ranges[difficulty] || [1000, 2000];
    return min + Math.random() * (max - min);
  }

  private broadcastState(roomId: string, io: Server) {
    const state = this.gameStates.get(roomId);
    const room = this.rooms.get(roomId);
    if (!state || !room) return;

    // Send each player their own masked state (hide opponents' cards for Teen Patti)
    const sockets = this.io.sockets.adapter.rooms.get(roomId);
    if (!sockets) {
      io.to(roomId).emit('game:state', this.maskState(state, null, room.game));
      return;
    }

    for (const socketId of sockets) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) continue;
      const userId = (socket as any).userId;
      const masked = this.maskState(state, userId, room.game);
      socket.emit('game:state', masked);
    }
  }

  private maskState(state: any, viewerId: string | null, game: GameType): any {
    if (game !== 'teen-patti') return state;
    return {
      ...state,
      players: state.players.map((p: any) => ({
        ...p,
        cards: p.id === viewerId || p.status === 'seen' || state.phase === 'RESULT' || state.phase === 'SHOWDOWN'
          ? p.cards
          : p.cards.map(() => ({ id: 'hidden', suit: 'hidden', rank: '?' })),
      })),
    };
  }

  private handleGameEnd(roomId: string, state: any, room: Room, io: Server) {
    io.to(roomId).emit('game:roundEnd', { state });

    // Update ELO
    if (room.game === 'teen-patti' && state.winner) {
      const winner = state.players.find((p: any) => p.id === state.winner);
      if (winner && !winner.isBot) {
        userStore.updateElo(winner.id, +25);
        userStore.addXP(winner.id, 100);
        userStore.updateUser(winner.id, {
          wins: (userStore.findById(winner.id)?.wins || 0) + 1,
          gamesPlayed: (userStore.findById(winner.id)?.gamesPlayed || 0) + 1,
        });
      }
    }

    if (state.phase === 'GAME_OVER') {
      room.status = 'finished';
      io.to(roomId).emit('game:finished', { state });
    }
  }

  handleDisconnect(userId: string, io: Server) {
    for (const [roomId, room] of this.rooms.entries()) {
      const player = room.players.find(p => p.id === userId);
      if (player) {
        player.connected = false;
        io.to(roomId).emit('room:playerDisconnected', { userId, name: player.name });
      }
    }
  }

  leaveRoom(userId: string, roomId: string, io: Server) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.players = room.players.filter(p => p.id !== userId);
    if (room.players.length === 0) this.rooms.delete(roomId);
    else io.to(roomId).emit('room:updated', { room });
  }

  getGameState(roomId: string, userId: string): any {
    const state = this.gameStates.get(roomId);
    const room = this.rooms.get(roomId);
    if (!state || !room) return null;
    return this.maskState(state, userId, room.game);
  }

  private getMaxPlayersForGame(game: GameType): number {
    return game === 'teen-patti' ? 6 : 4;
  }
}
