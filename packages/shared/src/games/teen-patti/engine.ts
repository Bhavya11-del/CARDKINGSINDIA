// ============================================================
// TEEN PATTI GAME ENGINE
// ============================================================

import { Card, RANK_ORDER, Rank, Suit } from '../../cards/deck';

export type TeenPattiPhase = 'WAITING' | 'ANTE' | 'DEAL' | 'BETTING' | 'SHOWDOWN' | 'RESULT';
export type PlayerStatus = 'active' | 'blind' | 'seen' | 'packed' | 'allin';
export type HandRank = 'trail' | 'pureSequence' | 'sequence' | 'color' | 'pair' | 'highCard';

export interface TeenPattiPlayer {
  id: string;
  name: string;
  cards: Card[];
  chips: number;
  bet: number;
  status: PlayerStatus;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  avatar?: string;
}

export interface TeenPattiState {
  phase: TeenPattiPhase;
  players: TeenPattiPlayer[];
  pot: number;
  currentStake: number;
  currentPlayerIndex: number;
  dealerIndex: number;
  winner?: string;
  winnerHand?: HandRank;
  lastAction?: string;
  roundNumber: number;
  bootAmount: number;
  sideshowPending?: { requesterId: string; targetId: string };
}

// Hand ranking values
const HAND_RANK_VALUE: Record<HandRank, number> = {
  trail: 6, pureSequence: 5, sequence: 4, color: 3, pair: 2, highCard: 1
};

export function evaluateHand(cards: Card[]): { rank: HandRank; score: number } {
  if (cards.length !== 3) return { rank: 'highCard', score: 0 };

  const sorted = [...cards].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
  const ranks = sorted.map(c => RANK_ORDER[c.rank]);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);
  const isSeq = isSequence(ranks);
  const isTrio = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const isPair = ranks[0] === ranks[1] || ranks[1] === ranks[2];

  let rank: HandRank;
  if (isTrio) rank = 'trail';
  else if (isFlush && isSeq) rank = 'pureSequence';
  else if (isSeq) rank = 'sequence';
  else if (isFlush) rank = 'color';
  else if (isPair) rank = 'pair';
  else rank = 'highCard';

  const score = HAND_RANK_VALUE[rank] * 10000 + ranks[0] * 100 + ranks[1] * 10 + ranks[2];
  return { rank, score };
}

function isSequence(ranks: number[]): boolean {
  const sorted = [...ranks].sort((a, b) => a - b);
  // Normal sequence
  if (sorted[2] - sorted[1] === 1 && sorted[1] - sorted[0] === 1) return true;
  // A-2-3 sequence
  if (sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 14) return true;
  return false;
}

export function initTeenPattiGame(players: Omit<TeenPattiPlayer, 'cards' | 'bet' | 'status'>[], bootAmount = 10): TeenPattiState {
  return {
    phase: 'WAITING',
    players: players.map(p => ({ ...p, cards: [], bet: 0, status: 'active' })),
    pot: 0,
    currentStake: bootAmount,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    roundNumber: 1,
    bootAmount,
  };
}

export function dealCards(state: TeenPattiState, deck: Card[]): TeenPattiState {
  const players = state.players.map((p, i) => ({
    ...p,
    cards: deck.slice(i * 3, i * 3 + 3),
    bet: state.bootAmount,
    status: 'blind' as PlayerStatus,
  }));
  const pot = players.length * state.bootAmount;
  const chips = players.map(p => ({ ...p, chips: p.chips - state.bootAmount }));

  return {
    ...state,
    phase: 'BETTING',
    players: chips,
    pot,
    currentStake: state.bootAmount,
    currentPlayerIndex: (state.dealerIndex + 1) % players.length,
  };
}

export interface TeenPattiAction {
  type: 'fold' | 'call' | 'raise' | 'show' | 'sideshow' | 'seeCards';
  amount?: number;
  playerId: string;
}

export function applyAction(state: TeenPattiState, action: TeenPattiAction): TeenPattiState {
  const newState = { ...state, players: state.players.map(p => ({ ...p })) };
  const playerIdx = newState.players.findIndex(p => p.id === action.playerId);
  if (playerIdx === -1) return state;
  const player = newState.players[playerIdx];
  const isSeen = player.status === 'seen';
  const callAmount = isSeen ? newState.currentStake * 2 : newState.currentStake;

  switch (action.type) {
    case 'seeCards':
      player.status = 'seen';
      newState.lastAction = `${player.name} sees cards`;
      break;

    case 'fold':
      player.status = 'packed';
      newState.lastAction = `${player.name} packed`;
      break;

    case 'call': {
      const bet = callAmount;
      player.chips -= bet;
      player.bet += bet;
      newState.pot += bet;
      newState.lastAction = `${player.name} called ₹${bet}`;
      break;
    }

    case 'raise': {
      const raiseAmt = action.amount || callAmount * 2;
      player.chips -= raiseAmt;
      player.bet += raiseAmt;
      newState.pot += raiseAmt;
      newState.currentStake = isSeen ? raiseAmt / 2 : raiseAmt;
      newState.lastAction = `${player.name} raised to ₹${raiseAmt}`;
      break;
    }

    case 'show': {
      newState.phase = 'SHOWDOWN';
      newState.lastAction = `${player.name} called Show!`;
      break;
    }

    case 'sideshow': {
      const prevIdx = getPreviousActivePlayer(newState, playerIdx);
      if (prevIdx !== -1) {
        newState.sideshowPending = { requesterId: player.id, targetId: newState.players[prevIdx].id };
        newState.lastAction = `${player.name} requested sideshow`;
      }
      break;
    }
  }

  // Check if only one player left active
  const activePlayers = newState.players.filter(p => p.status !== 'packed');
  if (activePlayers.length === 1) {
    newState.winner = activePlayers[0].id;
    newState.phase = 'RESULT';
    return newState;
  }

  // Advance turn
  if (newState.phase === 'BETTING') {
    newState.currentPlayerIndex = getNextActivePlayer(newState, playerIdx);
  }

  return newState;
}

function getNextActivePlayer(state: TeenPattiState, currentIdx: number): number {
  let next = (currentIdx + 1) % state.players.length;
  let attempts = 0;
  while (state.players[next].status === 'packed' && attempts < state.players.length) {
    next = (next + 1) % state.players.length;
    attempts++;
  }
  return next;
}

function getPreviousActivePlayer(state: TeenPattiState, currentIdx: number): number {
  let prev = (currentIdx - 1 + state.players.length) % state.players.length;
  let attempts = 0;
  while (state.players[prev].status === 'packed' && attempts < state.players.length) {
    prev = (prev - 1 + state.players.length) % state.players.length;
    attempts++;
  }
  return prev === currentIdx ? -1 : prev;
}

export function resolveShowdown(state: TeenPattiState): TeenPattiState {
  const activePlayers = state.players.filter(p => p.status !== 'packed');
  if (activePlayers.length === 0) return state;

  let bestScore = -1;
  let winner = activePlayers[0];
  let winnerHandRank: HandRank = 'highCard';

  for (const player of activePlayers) {
    const { score, rank } = evaluateHand(player.cards);
    if (score > bestScore) {
      bestScore = score;
      winner = player;
      winnerHandRank = rank;
    }
  }

  const updatedPlayers = state.players.map(p =>
    p.id === winner.id ? { ...p, chips: p.chips + state.pot } : p
  );

  return {
    ...state,
    phase: 'RESULT',
    winner: winner.id,
    winnerHand: winnerHandRank,
    players: updatedPlayers,
  };
}
