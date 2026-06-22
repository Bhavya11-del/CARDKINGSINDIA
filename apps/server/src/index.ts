import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { authRouter } from './auth/authRoutes';
import { setupSocketHandlers } from './socket/handlers';
import { GameManager } from './games/GameManager';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// REST API
app.use('/api/auth', authRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/leaderboard', (_req, res) => {
  const { userStore } = require('./auth/userStore');
  const users = userStore.getAllUsers()
    .sort((a: any, b: any) => b.elo - a.elo)
    .slice(0, 50)
    .map((u: any, i: number) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      elo: u.elo,
      level: u.level,
      wins: u.wins,
      gamesPlayed: u.gamesPlayed,
      tier: getEloTier(u.elo),
    }));
  res.json(users);
});

function getEloTier(elo: number) {
  if (elo >= 2100) return 'diamond';
  if (elo >= 1800) return 'platinum';
  if (elo >= 1500) return 'gold';
  if (elo >= 1200) return 'silver';
  return 'bronze';
}

// Socket.io
const gameManager = new GameManager(io);
setupSocketHandlers(io, gameManager);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🃏 Card Kings India Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready`);
});
