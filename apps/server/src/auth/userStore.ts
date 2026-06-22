import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  avatar: string;
  elo: number;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  achievements: string[];
  friends: string[];
  createdAt: string;
  isGuest: boolean;
}

// Seed leaderboard with realistic Indian players
const SEED_PLAYERS = [
  { name: 'RajKing99', elo: 2350, wins: 487, losses: 112 },
  { name: 'MumbaiAce', elo: 2180, wins: 382, losses: 145 },
  { name: 'DelhiShark', elo: 2050, wins: 310, losses: 130 },
  { name: 'ChennaiBluff', elo: 1920, wins: 265, losses: 140 },
  { name: 'PuneTeen', elo: 1780, wins: 201, losses: 110 },
  { name: 'BengaluruBot', elo: 1650, wins: 178, losses: 105 },
  { name: 'HyderabadAce', elo: 1550, wins: 155, losses: 98 },
  { name: 'KolkataKing', elo: 1420, wins: 130, losses: 90 },
  { name: 'JaipurJoker', elo: 1310, wins: 112, losses: 88 },
  { name: 'AhmedabadAce', elo: 1190, wins: 95, losses: 80 },
];

class UserStore {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> id

  constructor() {
    this.seedUsers();
  }

  private seedUsers() {
    SEED_PLAYERS.forEach(p => {
      const id = uuidv4();
      const avatarNum = Math.floor(Math.random() * 8) + 1;
      const gamesPlayed = p.wins + p.losses;
      const user: User = {
        id,
        email: `${p.name.toLowerCase()}@cardkings.in`,
        name: p.name,
        passwordHash: '',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
        elo: p.elo,
        level: Math.floor(p.wins / 10) + 1,
        xp: p.wins * 100 + p.losses * 25,
        wins: p.wins,
        losses: p.losses,
        gamesPlayed,
        achievements: ['first_win', 'games_10'],
        friends: [],
        createdAt: new Date().toISOString(),
        isGuest: false,
      };
      this.users.set(id, user);
      this.emailIndex.set(user.email, id);
    });
  }

  async createUser(email: string, name: string, password: string): Promise<User | null> {
    if (this.emailIndex.has(email)) return null;
    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const user: User = {
      id, email, name, passwordHash,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      elo: 1000, level: 1, xp: 0, wins: 0, losses: 0, gamesPlayed: 0,
      achievements: [], friends: [],
      createdAt: new Date().toISOString(),
      isGuest: false,
    };
    this.users.set(id, user);
    this.emailIndex.set(email, id);
    return user;
  }

  createGuest(explicitId?: string): User {
    const id = explicitId || uuidv4();
    const num = Math.floor(Math.random() * 9999);
    const user: User = {
      id, email: `guest_${num}@guest.local`, name: `Guest${num}`, passwordHash: '',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=guest${num}`,
      elo: 1000, level: 1, xp: 0, wins: 0, losses: 0, gamesPlayed: 0,
      achievements: [], friends: [],
      createdAt: new Date().toISOString(),
      isGuest: true,
    };
    this.users.set(id, user);
    return user;
  }

  async findByEmail(email: string, password: string): Promise<User | null> {
    const id = this.emailIndex.get(email);
    if (!id) return null;
    const user = this.users.get(id)!;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  updateUser(id: string, updates: Partial<User>) {
    const user = this.users.get(id);
    if (user) this.users.set(id, { ...user, ...updates });
  }

  addXP(userId: string, xp: number) {
    const user = this.users.get(userId);
    if (!user) return;
    const newXp = user.xp + xp;
    const newLevel = Math.floor(newXp / 500) + 1;
    this.users.set(userId, { ...user, xp: newXp, level: newLevel });
  }

  updateElo(userId: string, delta: number) {
    const user = this.users.get(userId);
    if (!user || user.isGuest) return;
    this.users.set(userId, { ...user, elo: Math.max(100, user.elo + delta) });
  }
}

export const userStore = new UserStore();
