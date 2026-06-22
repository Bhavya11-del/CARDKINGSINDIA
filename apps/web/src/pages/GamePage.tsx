import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import { useGameStore } from '../stores/gameStore';
import PlayingCard from '../components/PlayingCard';
import toast from 'react-hot-toast';
import { MessageSquare, X, Send, RotateCcw, LogOut, Crown, Eye, EyeOff } from 'lucide-react';

const EMOTES = ['👍', '😄', '🎉', '😮', '👏', '🤔', '😎', '🃏'];
const SUIT_SYMBOLS: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const SUIT_COLORS: Record<string, string> = { spades: 'text-gray-900', hearts: 'text-red-600', diamonds: 'text-red-600', clubs: 'text-gray-900' };
const RANK_NAMES: Record<string, string> = {
  trail: '🎯 Trail (Three of a Kind)', pureSequence: '🌟 Pure Sequence', sequence: '📈 Sequence',
  color: '🎨 Color (Flush)', pair: '👥 Pair', highCard: '📊 High Card'
};

export default function GamePage() {
  const { gameType } = useParams<{ gameType: string }>();
  const navigate = useNavigate();
  const { user, loginAsGuest } = useAuthStore();
  const { socket, connect } = useSocketStore();
  const { gameState, room, roomId, setGameState, setRoom, setRoomId, addChatMessage, chatMessages, clearGame } = useGameStore();

  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showEmotes, setShowEmotes] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [bidValue, setBidValue] = useState(1);
  const [localRoomId, setLocalRoomId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Init: connect + join quick game
  useEffect(() => {
    const init = async () => {
      let u = user;
      if (!u) { await loginAsGuest(); return; }
      if (!socket) { connect(u.token); return; }

      // If no room yet, quick-join
      if (!roomId) {
        socket.emit('lobby:quickPlay', { game: gameType });
      }

      socket.on('room:joined', ({ room: r }: any) => {
        setRoom(r); setRoomId(r.id); setLocalRoomId(r.id);
      });
      socket.on('room:updated', ({ room: r }: any) => setRoom(r));
      socket.on('game:started', () => toast('🎮 Game started!', { icon: '🃏' }));
      socket.on('game:state', (state: any) => {
        setGameState(state);
        if (state.phase === 'RESULT' || state.phase === 'GAME_OVER' || state.phase === 'SCORING') {
          setShowResult(true);
        } else {
          setShowResult(false);
        }
      });
      socket.on('game:roundEnd', ({ state }: any) => { setGameState(state); setShowResult(true); });
      socket.on('game:finished', ({ state }: any) => { setGameState(state); setShowResult(true); });
      socket.on('chat:message', (msg: any) => addChatMessage(msg));
      socket.on('chat:emote', (data: any) => {
        toast(`${data.name}: ${data.emote}`, { duration: 2000, icon: undefined });
      });
      socket.on('error', ({ message }: any) => toast.error(message));

      return () => {
        socket.off('room:joined'); socket.off('room:updated');
        socket.off('game:started'); socket.off('game:state');
        socket.off('game:roundEnd'); socket.off('game:finished');
        socket.off('chat:message'); socket.off('chat:emote');
        socket.off('error');
      };
    };
    init();
  }, [user, socket, gameType]);

  const rid = localRoomId || roomId;
  const myPlayer = gameState?.players?.find((p: any) => p.id === user?.id);
  const isMyTurn = (() => {
    if (!gameState || !user) return false;
    if (gameType === 'call-break' && gameState.phase === 'BIDDING')
      return gameState.players[gameState.biddingPlayerIndex]?.id === user.id;
    return gameState.players[gameState.currentPlayerIndex]?.id === user.id;
  })();

  const sendAction = (action: any) => {
    if (!rid) return;
    socket?.emit('game:action', { roomId: rid, action });
  };

  const sendChat = () => {
    if (!chatInput.trim() || !rid) return;
    socket?.emit('chat:message', { roomId: rid, message: chatInput });
    setChatInput('');
  };

  const sendEmote = (emote: string) => {
    if (!rid) return;
    socket?.emit('chat:emote', { roomId: rid, emote });
    setShowEmotes(false);
  };

  const handleLeave = () => {
    if (rid) socket?.emit('game:leave', { roomId: rid });
    clearGame();
    navigate('/lobby');
  };

  const handleNextRound = () => {
    if (!rid) return;
    socket?.emit('game:nextRound', { roomId: rid });
    setShowResult(false);
  };

  // ── TEEN PATTI ACTIONS ──────────────────────────────────────
  const tpFold = () => sendAction({ type: 'fold' });
  const tpCall = () => sendAction({ type: 'call' });
  const tpRaise = (amount: number) => sendAction({ type: 'raise', amount });
  const tpShow = () => sendAction({ type: 'show' });
  const tpSeeCards = () => sendAction({ type: 'seeCards' });

  // ── CALL BREAK ACTIONS ──────────────────────────────────────
  const cbBid = (bid: number) => sendAction({ type: 'bid', bid });
  const cbPlayCard = (card: any) => sendAction({ type: 'playCard', card });

  // ── MENDICOT ACTIONS ────────────────────────────────────────
  const mPlayCard = (card: any) => sendAction({ type: 'playCard', card });

  if (!gameState && !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-float">🃏</div>
          <div className="font-cinzel text-xl text-gold mb-2">Finding a table...</div>
          <div className="thinking-dots"><span/><span/><span/></div>
        </div>
      </div>
    );
  }

  const players = gameState?.players || room?.players || [];

  return (
    <div className="min-h-screen pt-16 flex flex-col relative overflow-hidden">
      {/* Felt Table Background */}
      <div className="absolute inset-0 felt-table" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.4)_100%)]" />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2 border-b border-gold/10 bg-black/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="font-cinzel text-gold font-bold text-sm">
            {{  'teen-patti': '🃏 Teen Patti', 'call-break': '♠️ Call Break', 'mendicot': '🔟 Mendicot' }[gameType!]}
          </div>
          {rid && <div className="text-white/30 text-xs font-mono">#{rid.slice(0,8)}</div>}
          {gameState?.phase && (
            <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full border border-gold/30">
              {gameState.phase}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowChat(s => !s)} className="btn-ghost !px-3 !py-1.5 text-sm relative">
            <MessageSquare className="w-4 h-4" />
            {chatMessages.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-gold rounded-full"/>}
          </button>
          <button onClick={handleLeave} className="btn-danger !px-3 !py-1.5 text-sm">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Game Table */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between p-4 max-w-5xl mx-auto w-full">

        {/* Opponents (top) */}
        <div className="flex justify-center gap-4 w-full flex-wrap">
          {players.filter((p: any) => p.id !== user?.id).slice(0, 3).map((p: any, i: number) => (
            <PlayerSlot key={p.id} player={p} gameState={gameState} gameType={gameType!} position="top" index={i} />
          ))}
        </div>

        {/* Center - Trick/Pot/Game Info */}
        <div className="flex-1 flex items-center justify-center w-full my-4">
          <CenterArea gameState={gameState} gameType={gameType!} />
        </div>

        {/* My Hand (bottom) */}
        {myPlayer && (
          <div className="w-full">
            <MyHand
              player={myPlayer} gameState={gameState} gameType={gameType!}
              isMyTurn={isMyTurn}
              onTeenPattiAction={{ fold: tpFold, call: tpCall, raise: tpRaise, show: tpShow, see: tpSeeCards }}
              onCBBid={cbBid} onCBPlayCard={cbPlayCard} onMPlayCard={mPlayCard}
              bidValue={bidValue} setBidValue={setBidValue}
            />
          </div>
        )}
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && gameState && (
          <ResultModal gameState={gameState} gameType={gameType!} user={user} onNext={handleNextRound} onLeave={handleLeave} />
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 300, opacity: 0 }}
            className="fixed right-0 top-16 bottom-0 w-72 z-50 glass-dark border-l border-white/10 flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <span className="font-cinzel text-gold text-sm font-bold">Chat</span>
              <div className="flex gap-2">
                <button onClick={() => setShowEmotes(s => !s)} className="text-xl hover:scale-110 transition-transform">😊</button>
                <button onClick={() => setShowChat(false)}><X className="w-4 h-4 text-white/50" /></button>
              </div>
            </div>
            {showEmotes && (
              <div className="p-2 border-b border-white/10 flex flex-wrap gap-2">
                {EMOTES.map(e => (
                  <button key={e} onClick={() => sendEmote(e)} className="text-2xl hover:scale-125 transition-transform">{e}</button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map((msg: any) => (
                <div key={msg.id} className={`flex gap-2 ${msg.userId === user?.id ? 'flex-row-reverse' : ''}`}>
                  <img src={msg.avatar} className="w-6 h-6 rounded-full flex-shrink-0" alt="" />
                  <div className={`max-w-[80%] ${msg.userId === user?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                    <span className="text-white/40 text-xs">{msg.name}</span>
                    <div className={`px-3 py-1.5 rounded-xl text-sm ${msg.userId === user?.id ? 'bg-gold/20 text-white' : 'bg-white/10 text-white/80'}`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-white/10 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Say something..." className="input-field text-sm !py-2 flex-1" />
              <button onClick={sendChat} className="btn-gold !px-3 !py-2">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Player Slot Component ─────────────────────────────────────
function PlayerSlot({ player, gameState, gameType, position, index }: any) {
  const isCurrentTurn = (() => {
    if (!gameState) return false;
    if (gameType === 'call-break' && gameState.phase === 'BIDDING')
      return gameState.players[gameState.biddingPlayerIndex]?.id === player.id;
    return gameState.players?.[gameState.currentPlayerIndex]?.id === player.id;
  })();

  const cards = player.cards || [];
  const cardCount = cards.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
      className={`flex flex-col items-center gap-2 ${isCurrentTurn ? 'relative' : ''}`}
    >
      {isCurrentTurn && (
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full z-10" />
      )}
      {/* Cards (face down for opponents) */}
      <div className="flex gap-1">
        {Array.from({ length: Math.min(cardCount, 5) }).map((_, i) => (
          <div key={i} className="w-8 h-11 rounded-md card-back border border-gold/20"
            style={{ transform: `rotate(${(i - 2) * 3}deg)` }} />
        ))}
        {cardCount > 5 && <div className="text-white/40 text-xs self-end">+{cardCount - 5}</div>}
      </div>

      {/* Avatar + name */}
      <div className={`glass-panel px-3 py-2 flex items-center gap-2 ${isCurrentTurn ? 'border-gold/60 shadow-gold' : ''}`}>
        <div className="relative">
          <img src={player.avatar} className="w-8 h-8 rounded-full" alt="" />
          {player.isBot && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border border-felt-darker text-[6px] flex items-center justify-center text-white">AI</div>}
        </div>
        <div>
          <div className="text-white text-xs font-semibold leading-none">{player.name}</div>
          {gameType === 'teen-patti' && (
            <div className="text-xs text-white/40 mt-0.5">
              {player.status === 'packed' ? '❌ Packed' : player.status === 'blind' ? '🙈 Blind' : '👁 Seen'}
              {player.chips !== undefined && <span className="ml-2 text-gold">₹{player.chips}</span>}
            </div>
          )}
          {gameType === 'call-break' && player.bid > 0 && (
            <div className="text-xs text-gold mt-0.5">Bid: {player.bid} | Won: {player.tricksWon}</div>
          )}
          {gameType === 'mendicot' && (
            <div className="text-xs text-gold mt-0.5">Team {(player.teamId ?? 0) + 1}</div>
          )}
          {isCurrentTurn && <div className="thinking-dots mt-1"><span/><span/><span/></div>}
        </div>
      </div>
    </motion.div>
  );
}

// ── Center Area Component ──────────────────────────────────────
function CenterArea({ gameState, gameType }: any) {
  if (!gameState) return (
    <div className="glass-panel p-8 text-center">
      <div className="text-4xl animate-float">🃏</div>
      <div className="text-white/40 text-sm mt-2">Waiting for players...</div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg">
      {gameType === 'teen-patti' && (
        <div className="glass-panel p-6 text-center w-full">
          <div className="text-white/50 text-xs mb-1">POT</div>
          <div className="font-cinzel text-3xl font-bold text-gold">₹{gameState.pot || 0}</div>
          <div className="text-white/40 text-xs mt-1">Current Stake: ₹{gameState.currentStake || 0}</div>
          {gameState.lastAction && (
            <motion.div key={gameState.lastAction} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-white/60 text-xs bg-black/20 rounded-lg px-3 py-1.5 inline-block">
              {gameState.lastAction}
            </motion.div>
          )}
        </div>
      )}

      {(gameType === 'call-break' || gameType === 'mendicot') && (
        <div className="w-full">
          {/* Current trick cards */}
          <div className="glass-panel p-4 mb-3">
            <div className="text-white/40 text-xs text-center mb-3">Current Trick</div>
            <div className="flex justify-center gap-3 min-h-[80px] items-center flex-wrap">
              {(gameState.currentTrick?.cards || []).map((entry: any, i: number) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <PlayingCard
                    suit={entry.card.suit} rank={entry.card.rank}
                    size="sm" dealDelay={i * 0.1}
                  />
                  <div className="text-white/40 text-xs truncate max-w-[50px]">
                    {gameState.players.find((p: any) => p.id === entry.playerId)?.name?.split(' ')[0]}
                  </div>
                </div>
              ))}
              {(gameState.currentTrick?.cards || []).length === 0 && (
                <div className="text-white/20 text-sm">Play a card to start</div>
              )}
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-3">
            {gameType === 'call-break' && (
              <>
                <div className="glass-panel p-3 text-center">
                  <div className="text-white/40 text-xs">Round</div>
                  <div className="font-cinzel font-bold text-gold">{gameState.currentRound}/{gameState.totalRounds}</div>
                </div>
                <div className="glass-panel p-3 text-center">
                  <div className="text-white/40 text-xs">Trump</div>
                  <div className="font-bold text-2xl">♠</div>
                </div>
              </>
            )}
            {gameType === 'mendicot' && (
              <>
                <div className="glass-panel p-3 text-center">
                  <div className="text-white/40 text-xs mb-1">Team 1 Tens</div>
                  <div className="text-gold font-bold text-xl">{gameState.teams?.[0]?.tensWon || 0}</div>
                </div>
                <div className="glass-panel p-3 text-center">
                  <div className="text-white/40 text-xs mb-1">Team 2 Tens</div>
                  <div className="text-gold font-bold text-xl">{gameState.teams?.[1]?.tensWon || 0}</div>
                </div>
              </>
            )}
          </div>
          {gameState.trumpSuit && gameState.trumpRevealed && (
            <div className="glass-panel p-2 mt-2 text-center text-sm">
              <span className="text-white/50">Trump: </span>
              <span className={SUIT_COLORS[gameState.trumpSuit] + ' font-bold'}>
                {SUIT_SYMBOLS[gameState.trumpSuit]} {gameState.trumpSuit?.toUpperCase()}
              </span>
            </div>
          )}
          {gameState.lastAction && (
            <motion.div key={gameState.lastAction} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-2 text-white/50 text-xs text-center">
              {gameState.lastAction}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

// ── My Hand + Controls ──────────────────────────────────────────
function MyHand({ player, gameState, gameType, isMyTurn, onTeenPattiAction, onCBBid, onCBPlayCard, onMPlayCard, bidValue, setBidValue }: any) {
  const [seeCards, setSeeCards] = useState(false);
  const cards = player.cards || [];
  const isSeen = player.status === 'seen';

  const handleSee = () => { setSeeCards(true); onTeenPattiAction.see(); };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* My info */}
      <div className={`glass-panel px-4 py-2 flex items-center gap-3 ${isMyTurn ? 'border-gold/60 shadow-gold animate-pulse-gold' : ''}`}>
        <img src={player.avatar} className="w-8 h-8 rounded-full" alt="" />
        <div>
          <div className="text-white font-semibold text-sm">You {isMyTurn && '• Your Turn!'}</div>
          {gameType === 'teen-patti' && (
            <div className="text-xs text-gold">₹{player.chips} chips · {player.status === 'blind' ? '🙈 Blind' : '👁 Seen'}</div>
          )}
          {gameType === 'call-break' && player.bid > 0 && (
            <div className="text-xs text-gold">Bid: {player.bid} | Won: {player.tricksWon} | Score: {player.totalScore?.toFixed(1)}</div>
          )}
          {gameType === 'mendicot' && (
            <div className="text-xs text-gold">Team {(player.teamId ?? 0) + 1} · {player.tricksWon} tricks</div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-wrap justify-center gap-1 md:gap-2 max-w-2xl">
        {cards.map((card: any, i: number) => {
          const isHidden = card.id === 'hidden' || (gameType === 'teen-patti' && !seeCards && player.status === 'blind');
          const canPlay = isMyTurn && (gameType === 'call-break' || gameType === 'mendicot') && gameState?.phase !== 'BIDDING';
          return (
            <PlayingCard
              key={card.id + i}
              suit={isHidden ? undefined : card.suit}
              rank={isHidden ? undefined : card.rank}
              faceDown={isHidden}
              dealDelay={i * 0.06}
              size="md"
              disabled={!canPlay}
              onClick={canPlay ? () => { gameType === 'call-break' ? onCBPlayCard(card) : onMPlayCard(card); } : undefined}
            />
          );
        })}
      </div>

      {/* Controls */}
      {isMyTurn && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap justify-center gap-2 mt-1">

          {/* Teen Patti Controls */}
          {gameType === 'teen-patti' && player.status !== 'packed' && (
            <>
              {!isSeen && (
                <button onClick={handleSee} className="btn-ghost text-sm !py-2 !px-4 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" /> See Cards
                </button>
              )}
              <button onClick={onTeenPattiAction.fold} className="btn-danger text-sm !py-2 !px-4">❌ Pack</button>
              <button onClick={onTeenPattiAction.call} className="btn-ghost text-sm !py-2 !px-5">
                ✅ Chaal (₹{isSeen ? gameState.currentStake * 2 : gameState.currentStake})
              </button>
              <button onClick={() => onTeenPattiAction.raise(gameState.currentStake * (isSeen ? 4 : 2))} className="btn-gold text-sm !py-2 !px-4">
                📈 Raise
              </button>
              {isSeen && (
                <button onClick={onTeenPattiAction.show} className="btn-gold text-sm !py-2 !px-4">👁 Show</button>
              )}
            </>
          )}

          {/* Call Break Bid */}
          {gameType === 'call-break' && gameState?.phase === 'BIDDING' && (
            <div className="flex items-center gap-3 glass-panel px-5 py-3">
              <span className="text-white/70 text-sm">Your Bid:</span>
              <button onClick={() => setBidValue((v: number) => Math.max(1, v - 1))} className="w-8 h-8 bg-black/30 rounded-lg text-white hover:bg-black/50 text-lg">-</button>
              <span className="font-cinzel font-bold text-gold text-xl w-8 text-center">{bidValue}</span>
              <button onClick={() => setBidValue((v: number) => Math.min(13, v + 1))} className="w-8 h-8 bg-black/30 rounded-lg text-white hover:bg-black/50 text-lg">+</button>
              <button onClick={() => onCBBid(bidValue)} className="btn-gold text-sm !py-1.5">Confirm Bid</button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ── Result Modal ─────────────────────────────────────────────
function ResultModal({ gameState, gameType, user, onNext, onLeave }: any) {
  const winner = gameState?.winner ? gameState.players?.find((p: any) => p.id === gameState.winner) : null;
  const iWon = winner?.id === user?.id;

  let title = '', subtitle = '', emoji = '';

  if (gameType === 'teen-patti') {
    title = iWon ? 'You Win! 🎉' : `${winner?.name || 'Someone'} Wins!`;
    subtitle = gameState.winnerHand ? RANK_NAMES[gameState.winnerHand] || '' : '';
    emoji = iWon ? '🏆' : '😔';
  } else if (gameType === 'call-break') {
    if (gameState.phase === 'GAME_OVER') {
      const top = [...(gameState.players || [])].sort((a: any, b: any) => b.totalScore - a.totalScore)[0];
      title = top?.id === user?.id ? 'Game Over — You Win! 🏆' : `Game Over — ${top?.name} Wins!`;
      emoji = top?.id === user?.id ? '🏆' : '📊';
    } else {
      title = 'Round Complete!';
      emoji = '📊';
    }
    subtitle = gameState.players?.map((p: any) => `${p.name}: ${p.totalScore?.toFixed(1)}`).join(' | ') || '';
  } else if (gameType === 'mendicot') {
    const w = gameState.roundWinner;
    const myTeam = gameState.players?.find((p: any) => p.id === user?.id)?.teamId;
    title = gameState.mendicot ? '🎊 MENDICOT!' : w === myTeam ? 'Your Team Wins!' : `Team ${(w ?? 0) + 1} Wins!`;
    subtitle = gameState.mendicot ? 'All 4 tens captured!' : `Team 1: ${gameState.teams?.[0]?.tensWon || 0} tens | Team 2: ${gameState.teams?.[1]?.tensWon || 0} tens`;
    emoji = gameState.mendicot ? '🎊' : w === myTeam ? '🏆' : '🎯';
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="glass-panel gold-border p-8 text-center max-w-md w-full mx-4">
        <div className="text-7xl mb-4 animate-bounce-in">{emoji}</div>
        <h2 className="font-cinzel text-2xl font-bold text-shimmer mb-2">{title}</h2>
        {subtitle && <p className="text-white/60 text-sm mb-6">{subtitle}</p>}

        {/* Player scores */}
        {gameType === 'call-break' && gameState.players && (
          <div className="mb-6 space-y-2">
            {[...gameState.players].sort((a: any, b: any) => b.totalScore - a.totalScore).map((p: any, i: number) => (
              <div key={p.id} className={`flex items-center justify-between px-4 py-2 rounded-xl ${p.id === user?.id ? 'bg-gold/20 border border-gold/30' : 'bg-black/20'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gold">{i + 1}.</span>
                  <img src={p.avatar} className="w-6 h-6 rounded-full" alt="" />
                  <span className="text-sm text-white">{p.name}</span>
                </div>
                <span className="text-gold font-bold">{p.totalScore?.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          {gameState.phase !== 'GAME_OVER' && (
            <button onClick={onNext} className="btn-gold flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              {gameType === 'teen-patti' ? 'Next Round' : 'Continue'}
            </button>
          )}
          <button onClick={onLeave} className="btn-ghost">Leave Table</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
