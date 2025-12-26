import { type User, type InsertUser, type Room, type GameState, type LeaderboardEntry, type Player, type Card, type ActionCard, type RoundState, getRoundTime, TOTAL_ROUNDS, getEliminationRank } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Room management
  createRoom(hostId: string, hostName: string): Room;
  getRoom(roomId: string): Room | undefined;
  getRoomByCode(code: string): Room | undefined;
  updateRoom(room: Room): void;
  deleteRoom(roomId: string): void;
  
  // Leaderboard
  getTopLeaderboard(limit: number): LeaderboardEntry[];
  addLeaderboardEntry(playerName: string, score: number): LeaderboardEntry;
}

// Helper functions for card generation
function generateDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const deck: Card[] = [];
  
  for (const suit of suits) {
    for (let value = 1; value <= 13; value++) {
      deck.push({
        id: randomUUID(),
        value,
        suit
      });
    }
  }
  
  return shuffleArray(deck);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateActionHand(count: number = 6): ActionCard[] {
  const hand: ActionCard[] = [];
  for (let i = 0; i < count; i++) {
    hand.push({
      id: randomUUID(),
      type: Math.random() > 0.5 ? 'plus' : 'minus'
    });
  }
  return hand;
}

function generateTower(size: number = 5): Card[] {
  const deck = generateDeck();
  return deck.slice(0, size);
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private rooms: Map<string, Room>;
  private leaderboard: LeaderboardEntry[];

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.leaderboard = [];
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Room management
  createRoom(hostId: string, hostName: string): Room {
    let code = generateRoomCode();
    // Ensure unique code
    while (this.getRoomByCode(code)) {
      code = generateRoomCode();
    }

    const hostPlayer: Player = {
      id: hostId,
      name: hostName,
      score: 0,
      combo: 0,
      isEliminated: false,
      isReady: false,
      tower: [],
      hand: []
    };

    const room: Room = {
      id: randomUUID(),
      code,
      hostId,
      players: [hostPlayer],
      createdAt: Date.now()
    };

    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByCode(code: string): Room | undefined {
    return Array.from(this.rooms.values()).find(
      (room) => room.code === code.toUpperCase()
    );
  }

  updateRoom(room: Room): void {
    this.rooms.set(room.id, room);
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  // Leaderboard
  getTopLeaderboard(limit: number = 10): LeaderboardEntry[] {
    return this.leaderboard
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  addLeaderboardEntry(playerName: string, score: number): LeaderboardEntry {
    const entry: LeaderboardEntry = {
      id: randomUUID(),
      playerName,
      score,
      createdAt: new Date()
    };
    this.leaderboard.push(entry);
    return entry;
  }
}

// Game logic helpers
export function initializeGameState(room: Room): GameState {
  const roundTime = getRoundTime(1);
  
  const players: Player[] = room.players.map(p => ({
    ...p,
    score: 0,
    combo: 0,
    isEliminated: false,
    tower: generateTower(5),
    hand: generateActionHand(6)
  }));

  return {
    roomId: room.id,
    phase: 'playing',
    round: {
      roundNumber: 1,
      timeRemaining: roundTime,
      totalTime: roundTime,
      isActive: true
    },
    players,
    eliminatedPlayerIds: []
  };
}

export function processCardPlay(
  gameState: GameState, 
  playerId: string, 
  actionCardId: string, 
  towerCardId: string
): { success: boolean; comboTriggered: boolean; newCombo: number } {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player || player.isEliminated) {
    return { success: false, comboTriggered: false, newCombo: 0 };
  }

  const actionCard = player.hand.find(c => c.id === actionCardId);
  const towerCard = player.tower.find(c => c.id === towerCardId);
  
  if (!actionCard || !towerCard) {
    return { success: false, comboTriggered: false, newCombo: 0 };
  }

  // Check if the play is valid
  const targetValue = actionCard.type === 'plus' 
    ? (towerCard.value % 13) + 1 
    : towerCard.value === 1 ? 13 : towerCard.value - 1;

  // Find a matching card in the tower
  const matchIndex = player.tower.findIndex(c => c.value === targetValue && c.id !== towerCardId);
  
  if (matchIndex !== -1) {
    // Valid play - remove the tower card that matches
    player.tower.splice(matchIndex, 1);
    
    // Remove the action card
    const actionIndex = player.hand.findIndex(c => c.id === actionCardId);
    player.hand.splice(actionIndex, 1);
    
    // Add a new action card
    player.hand.push({
      id: randomUUID(),
      type: Math.random() > 0.5 ? 'plus' : 'minus'
    });
    
    // Update combo and score
    player.combo++;
    const points = 10 * player.combo;
    player.score += points;
    
    player.lastAction = {
      type: actionCard.type,
      timestamp: Date.now()
    };
    
    return { success: true, comboTriggered: true, newCombo: player.combo };
  } else {
    // Invalid play - reset combo
    player.combo = 0;
    return { success: false, comboTriggered: false, newCombo: 0 };
  }
}

export function advanceRound(gameState: GameState): { eliminated?: Player } {
  const currentRound = gameState.round.roundNumber;
  
  // Check for elimination
  let eliminated: Player | undefined;
  const eliminationRank = getEliminationRank(currentRound);
  
  if (eliminationRank !== null) {
    const activePlayers = gameState.players.filter(p => !p.isEliminated);
    if (activePlayers.length >= eliminationRank) {
      // Sort by score ascending, eliminate lowest
      const sorted = [...activePlayers].sort((a, b) => a.score - b.score);
      eliminated = sorted[0];
      if (eliminated) {
        eliminated.isEliminated = true;
        gameState.eliminatedPlayerIds.push(eliminated.id);
      }
    }
  }
  
  // Check if game is over
  if (currentRound >= TOTAL_ROUNDS) {
    gameState.phase = 'game_over';
    const activePlayers = gameState.players.filter(p => !p.isEliminated);
    if (activePlayers.length > 0) {
      gameState.winner = activePlayers.reduce((prev, curr) => 
        curr.score > prev.score ? curr : prev
      );
    }
    return { eliminated };
  }
  
  // Setup next round
  const nextRound = currentRound + 1;
  const roundTime = getRoundTime(nextRound);
  
  gameState.round = {
    roundNumber: nextRound,
    timeRemaining: roundTime,
    totalTime: roundTime,
    isActive: true
  };
  
  // Generate new cards for all active players
  gameState.players.forEach(player => {
    if (!player.isEliminated) {
      player.tower = generateTower(5);
      player.hand = generateActionHand(6);
      player.combo = 0;
    }
  });
  
  gameState.phase = 'playing';
  
  return { eliminated };
}

export const storage = new MemStorage();
