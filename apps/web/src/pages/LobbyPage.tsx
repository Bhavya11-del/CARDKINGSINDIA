import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import { useGameStore } from '../stores/gameStore';
import { Plus, Users, Lock, Unlock, Zap, Hash, Bot, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const GAMES = [
  { id: 'teen-patti', name: 'Teen Patti', emoji: '🃏', maxPlayers: 6 },
  { id: 'call-break', name: 'Call Break', emoji: '♠️', maxPlayers: 4 },
  { id: 'mendicot', name: 'Mendicot', emoji: '🔟', maxPlayers: 4 },
];

export default function LobbyPage() {
  const navigate = useNavigate();
  const { user, loginAsGuest } = useAuthStore();
  const { socket, connect } = useSocketStore();
  const { setRoom, setRoomId } = useGameStore();

  const [rooms, setRooms] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedGame, setSelectedGame] = useState('teen-patti');
  const [difficulty, setDifficulty] = useState<'easy'|'medium'|'hard'>('medium');
  const [isPrivate, setIsPrivate] = useState(false);
  const [filterGame, setFilterGame] = useState('all');

  useEffect(() => {
    const showWelcome = localStorage.getItem("showWelcome");
    if (showWelcome === "true") {
      toast.success("Welcome, Guest! Play and enjoy! 👑");
      localStorage.removeItem("showWelcome");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!user) {
        await loginAsGuest();
        return;
      }
      if (!socket) { connect(user.token); return; }
      socket.emit('lobby:getRooms');
      socket.on('lobby:rooms', setRooms);
      socket.on('lobby:roomCreated', (room: any) => setRooms(prev => [...prev, room]));
      socket.on('room:joined', ({ room }: any) => {
        setRoom(room);
        setRoomId(room.id);
        navigate(`/game/${room.game}`);
      });
      socket.on('error', ({ message }: any) => toast.error(message));
      return () => {
        socket.off('lobby:rooms');
        socket.off('lobby:roomCreated');
        socket.off('room:joined');
        socket.off('error');
      };
    };
    init();
  }, [user, socket]);

  const handleCreate = () => {
    if (!socket) return;
    const game = GAMES.find(g => g.id === selectedGame)!;
    socket.emit('lobby:createRoom', {
      game: selectedGame,
      maxPlayers: game.maxPlayers,
      isPrivate,
      difficulty,
    });
  };

  const handleJoinCode = () => {
    if (!joinCode.trim() || !socket) return;
    socket.emit('lobby:joinRoom', { code: joinCode.toUpperCase() });
  };

  const handleJoinRoom = (roomId: string) => {
    if (!socket) return;
    socket.emit('lobby:joinRoom', { roomId });
  };

  const handleQuickPlay = (gameId: string) => {
    if (!socket) return;
    socket.emit('lobby:quickPlay', { game: gameId });
  };

  const filtered = filterGame === 'all' ? rooms : rooms.filter(r => r.game === filterGame);

  return (
    <div className="min-h-screen pt-20 px-4 pb-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-cinzel text-3xl font-bold text-white">🎮 Game Lobby</h1>
          <p className="text-white/40 mt-1">Find a room or create your own table</p>
        </motion.div>

        {/* Quick Play + Create + Join Code */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Quick Play */}
          <div className="glass-panel gold-border p-5">
            <h3 className="font-cinzel font-bold text-gold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Quick Play
            </h3>
            <div className="space-y-2">
              {GAMES.map(g => (
                <button key={g.id} onClick={() => handleQuickPlay(g.id)}
                  className="w-full flex items-center gap-2 py-2.5 px-3 bg-black/20 hover:bg-black/40 rounded-xl transition-all text-sm text-white/80 hover:text-white">
                  <span>{g.emoji}</span> {g.name}
                  <span className="ml-auto text-gold text-xs">Play →</span>
                </button>
              ))}
            </div>
          </div>

          {/* Create Room */}
          <div className="glass-panel gold-border p-5">
            <h3 className="font-cinzel font-bold text-gold mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Room
            </h3>
            <div className="space-y-3">
              <select value={selectedGame} onChange={e => setSelectedGame(e.target.value)}
                className="input-field text-sm py-2">
                {GAMES.map(g => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
              </select>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)}
                className="input-field text-sm py-2">
                <option value="easy">🟢 Easy Bots</option>
                <option value="medium">🟡 Medium Bots</option>
                <option value="hard">🔴 Hard Bots</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 accent-yellow-500" />
                {isPrivate ? <><Lock className="w-3.5 h-3.5" /> Private room</> : <><Unlock className="w-3.5 h-3.5" /> Public room</>}
              </label>
              <button onClick={handleCreate} className="btn-gold w-full text-sm !py-2.5">
                Create Table
              </button>
            </div>
          </div>

          {/* Join by Code */}
          <div className="glass-panel gold-border p-5">
            <h3 className="font-cinzel font-bold text-gold mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4" /> Join by Code
            </h3>
            <div className="space-y-3">
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter room code..." maxLength={6}
                className="input-field text-center text-xl font-bold tracking-widest uppercase"
                onKeyDown={e => e.key === 'Enter' && handleJoinCode()} />
              <button onClick={handleJoinCode} disabled={!joinCode.trim()}
                className="btn-gold w-full text-sm !py-2.5">
                Join Room
              </button>
              <p className="text-white/30 text-xs text-center">Get the code from your friend</p>
            </div>
          </div>
        </div>

        {/* Public Rooms */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-cinzel font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-gold" /> Public Rooms
              <span className="text-gold text-sm ml-1">({filtered.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-white/40" />
              <select value={filterGame} onChange={e => setFilterGame(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-white text-sm outline-none">
                <option value="all">All Games</option>
                {GAMES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <div className="text-5xl mb-4">🃏</div>
              <p className="text-white/40">No public rooms right now.</p>
              <p className="text-white/25 text-sm mt-1">Create one or use Quick Play!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((room, i) => (
                <motion.div key={room.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }} className="glass-panel p-4 hover:border-gold/30 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-cinzel font-bold text-white text-sm">
                        {GAMES.find(g => g.id === room.game)?.emoji} {GAMES.find(g => g.id === room.game)?.name}
                      </div>
                      <div className="text-white/40 text-xs mt-0.5">Code: <span className="text-gold font-mono">{room.code}</span></div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      room.difficulty === 'hard' ? 'border-red-500/40 text-red-400' :
                      room.difficulty === 'medium' ? 'border-yellow-500/40 text-yellow-400' :
                      'border-green-500/40 text-green-400'}`}>
                      {room.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {room.players?.map((p: any, j: number) => (
                        <div key={j} title={p.name} className={`w-7 h-7 rounded-full overflow-hidden border-2 ${p.isBot ? 'border-blue-400/50' : 'border-gold/50'}`}>
                          <img src={p.avatar} className="w-full h-full" alt="" />
                        </div>
                      ))}
                      <span className="text-white/40 text-xs">{room.players?.length}/{room.maxPlayers}</span>
                    </div>
                    <button onClick={() => handleJoinRoom(room.id)}
                      className="btn-gold !py-1.5 !px-4 text-xs">
                      Join
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
